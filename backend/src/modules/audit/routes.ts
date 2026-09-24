import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/authorize.js";
import { paginationSchema } from "../../lib/pagination.js";
import { sendSuccess } from "../../lib/response.js";
import { listAuditLogs } from "./service.js";

export async function auditRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: requireRole("super_admin") }, async (request, reply) => {
    const query = paginationSchema.extend({}).parse(request.query);
    const { entityType } = request.query as { entityType?: string };
    const result = await listAuditLogs({ entityType }, { page: query.page, pageSize: query.pageSize });
    return sendSuccess(reply, result);
  });
}
