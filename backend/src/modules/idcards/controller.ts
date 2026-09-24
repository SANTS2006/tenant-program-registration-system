import type { FastifyReply, FastifyRequest } from "fastify";
import { attachmentDisposition } from "../../lib/downloadName.js";
import { sendSuccess } from "../../lib/response.js";
import * as idCardService from "./service.js";
import { idCardConfigSchema } from "./schemas.js";

interface DocumentQuery {
  format?: string;
  side?: string;
}

/** `?format=svg` returns the rendered card or ticket as an image instead of the PDF download. */
export function wantsSvg(request: FastifyRequest): { svg: boolean; side: idCardService.DocumentSide } {
  const { format, side } = (request.query ?? {}) as DocumentQuery;
  return { svg: format === "svg", side: side === "back" ? "back" : "front" };
}

export function sendSvg(reply: FastifyReply, svg: string) {
  reply.header("Content-Type", "image/svg+xml; charset=utf-8");
  reply.header("Cache-Control", "private, max-age=60");
  // Opened on its own, the image may only show itself: no scripts, no outside requests.
  reply.header("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'");
  return reply.send(svg);
}

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
  const { svg, side } = wantsSvg(request);
  if (svg) return sendSvg(reply, await idCardService.svgForRegistrationInProgram(programId, registrationId, side));
  return sendPdf(reply, await idCardService.generateForRegistrationInProgram(programId, registrationId));
}

export async function downloadPublicIdCardHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug, registrationNumber } = request.params as { slug: string; registrationNumber: string };
  const { svg, side } = wantsSvg(request);
  if (svg) return sendSvg(reply, await idCardService.svgForPublicRegistration(slug, registrationNumber, side));
  return sendPdf(reply, await idCardService.generateForPublicRegistration(slug, registrationNumber));
}

export async function verifyHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug, registrationNumber } = request.params as { slug: string; registrationNumber: string };
  const result = await idCardService.verifyRegistration(slug, registrationNumber);
  return sendSuccess(reply, result);
}
