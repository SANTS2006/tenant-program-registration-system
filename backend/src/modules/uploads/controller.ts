import type { FastifyReply, FastifyRequest } from "fastify";
import { sendSuccess } from "../../lib/response.js";
import { createUploadSignature } from "./service.js";

export async function programUploadSignatureHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId } = request.params as { programId: string };
  const signature = createUploadSignature(`programs/${programId}`);
  return sendSuccess(reply, signature);
}

export async function publicUploadSignatureHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = request.query as { slug?: string };
  const signature = createUploadSignature(`registrations/${slug ?? "misc"}`);
  return sendSuccess(reply, signature);
}
