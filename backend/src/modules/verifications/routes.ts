import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { buildPaginatedResult, paginationSchema } from "../../lib/pagination.js";
import { sendSuccess } from "../../lib/response.js";
import { requireProgramAccess } from "../../middleware/authorize.js";
import * as verificationsRepo from "./repository.js";

const listQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  documentType: z.enum(["id_card", "ticket", "link"]).optional(),
  result: z.enum(["valid", "invalid"]).optional(),
  registrationId: z.string().uuid().optional(),
});

async function listVerificationsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { programId } = request.params as { programId: string };
  const query = listQuerySchema.parse(request.query);
  const filters = {
    search: query.search || undefined,
    documentType: query.documentType,
    valid: query.result === undefined ? undefined : query.result === "valid",
    registrationId: query.registrationId,
  };

  const [{ items, total }, summary] = await Promise.all([
    verificationsRepo.listVerifications(programId, filters, query),
    verificationsRepo.getVerificationSummary(programId),
  ]);
  return sendSuccess(reply, { ...buildPaginatedResult(items, total, query), summary });
}

export async function verificationRoutes(app: FastifyInstance) {
  app.get("/:programId/verifications", { preHandler: requireProgramAccess("viewer") }, listVerificationsHandler);
}
