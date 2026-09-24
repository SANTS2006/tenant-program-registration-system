import type { FastifyReply, FastifyRequest } from "fastify";
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

export async function downloadAdminIdCardHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId, registrationId } = request.params as { programId: string; registrationId: string };
  const pdf = await idCardService.generateForRegistrationInProgram(programId, registrationId);
  reply.header("Content-Type", "application/pdf");
  reply.header("Content-Disposition", `attachment; filename="id-card-${registrationId}.pdf"`);
  return reply.send(pdf);
}

export async function downloadPublicIdCardHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug, registrationNumber } = request.params as { slug: string; registrationNumber: string };
  const pdf = await idCardService.generateForPublicRegistration(slug, registrationNumber);
  reply.header("Content-Type", "application/pdf");
  reply.header("Content-Disposition", `attachment; filename="id-card-${registrationNumber}.pdf"`);
  return reply.send(pdf);
}

export async function verifyHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug, registrationNumber } = request.params as { slug: string; registrationNumber: string };
  const result = await idCardService.verifyRegistration(slug, registrationNumber);
  return sendSuccess(reply, result);
}
