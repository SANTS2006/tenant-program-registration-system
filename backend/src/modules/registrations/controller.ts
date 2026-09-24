import { Readable } from "node:stream";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isOwnCloudinaryUrl } from "../../lib/cloudinaryUrl.js";
import { attachmentDisposition } from "../../lib/downloadName.js";
import { AppError } from "../../lib/errors.js";
import { sendSuccess } from "../../lib/response.js";
import { recordAudit } from "../audit/service.js";
import * as programsRepo from "../programs/repository.js";
import { generateCsvExport, generateXlsxExport } from "./exportService.js";
import * as registrationsService from "./service.js";
import { exportRegistrationsQuerySchema, listRegistrationsQuerySchema, updateStatusSchema } from "./schemas.js";

export async function listRegistrationsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId } = request.params as { programId: string };
  const query = listRegistrationsQuerySchema.parse(request.query);
  const result = await registrationsService.listRegistrations(programId, query);
  return sendSuccess(reply, result);
}

export async function getRegistrationHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId, registrationId } = request.params as { programId: string; registrationId: string };
  const result = await registrationsService.getRegistrationDetail(programId, registrationId);
  return sendSuccess(reply, result);
}

export async function updateRegistrationStatusHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) throw AppError.unauthorized();
  const { programId, registrationId } = request.params as { programId: string; registrationId: string };
  const input = updateStatusSchema.parse(request.body);
  const registration = await registrationsService.updateRegistrationStatus(
    programId,
    registrationId,
    request.user.id,
    input,
  );
  await recordAudit({
    actorUserId: request.user.id,
    action: "registration.status_change",
    entityType: "registration",
    entityId: registrationId,
    metadata: { programId, toStatus: input.status, note: input.note },
    ipAddress: request.ip,
  });
  return sendSuccess(reply, registration, "Registration status updated");
}

export async function getProgramStatsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId } = request.params as { programId: string };
  const stats = await registrationsService.getProgramStats(programId);
  return sendSuccess(reply, stats);
}

export async function exportRegistrationsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId } = request.params as { programId: string };
  const query = exportRegistrationsQuerySchema.parse(request.query);
  const filters = { status: query.status, search: query.search, dateFrom: query.dateFrom, dateTo: query.dateTo };
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  const baseName = `${program.name.replace(/[\\/:*?"<>|]+/g, " ").trim()} ${new Date().toISOString().slice(0, 10)}`;

  await recordAudit({
    actorUserId: request.user?.id,
    action: "registrations.export",
    entityType: "program",
    entityId: programId,
    metadata: { format: query.format, filters },
    ipAddress: request.ip,
  });

  if (query.format === "xlsx") {
    const buffer = await generateXlsxExport(programId, filters);
    reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    reply.header("Content-Disposition", attachmentDisposition(`${baseName}.xlsx`));
    return reply.send(buffer);
  }

  const csv = await generateCsvExport(programId, filters);
  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", attachmentDisposition(`${baseName}.csv`));
  return reply.send(csv);
}

export async function downloadRegistrationFileHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId, registrationId, fileId } = request.params as {
    programId: string;
    registrationId: string;
    fileId: string;
  };
  const file = await registrationsService.getRegistrationFile(programId, registrationId, fileId);

  const upstream = isOwnCloudinaryUrl(file.secureUrl) ? await fetch(file.secureUrl).catch(() => null) : null;
  if (!upstream?.ok || !upstream.body) throw AppError.notFound("This file is no longer available");

  reply.header("Content-Type", file.mimeType || upstream.headers.get("content-type") || "application/octet-stream");
  reply.header("Content-Disposition", attachmentDisposition(file.originalFilename));
  const length = upstream.headers.get("content-length");
  if (length) reply.header("Content-Length", length);
  return reply.send(Readable.fromWeb(upstream.body as import("node:stream/web").ReadableStream));
}
