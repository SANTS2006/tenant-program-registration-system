import type { FastifyReply, FastifyRequest } from "fastify";
import { attachmentDisposition } from "../../lib/downloadName.js";
import { sendSuccess } from "../../lib/response.js";
import * as idCardService from "./service.js";
import { idCardConfigSchema } from "./schemas.js";

export async function getConfigHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId } = request.params as { programId: string };
  const result = await idCardService.getConfig(programId);
  return sendSuccess(reply, result);
}

export async function updateConfigHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId } = request.params as { programId: string };
  const input = idCardConfigSchema.parse(request.body);
  const config = await idCardService.updateConfig(programId, input);
  return sendSuccess(reply, config, "ID card design updated");
}

export function sendPdf(reply: FastifyReply, { pdf, fileName }: idCardService.GeneratedDocument) {
  reply.header("Content-Type", "application/pdf");
  reply.header("Content-Disposition", attachmentDisposition(fileName));
  return reply.send(pdf);
}

export async function downloadAdminIdCardHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId, registrationId } = request.params as { programId: string; registrationId: string };
  return sendPdf(reply, await idCardService.generateForRegistrationInProgram(programId, registrationId));
}

export async function downloadPublicIdCardHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug, registrationNumber } = request.params as { slug: string; registrationNumber: string };
  return sendPdf(reply, await idCardService.generateForPublicRegistration(slug, registrationNumber));
}

export async function verifyHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug, registrationNumber } = request.params as { slug: string; registrationNumber: string };
  const result = await idCardService.verifyRegistration(slug, registrationNumber);
  return sendSuccess(reply, result);
}
