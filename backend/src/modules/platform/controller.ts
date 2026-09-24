import type { FastifyReply, FastifyRequest } from "fastify";
import { sendSuccess } from "../../lib/response.js";
import { paginationSchema } from "../../lib/pagination.js";
import * as platformService from "./service.js";

export async function listTenantsHandler(request: FastifyRequest, reply: FastifyReply) {
  const pagination = paginationSchema.parse(request.query);
  const result = await platformService.listTenants(pagination);
  return sendSuccess(reply, result);
}

export async function getTenantHandler(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.params as { tenantId: string };
  const tenant = await platformService.getTenant(tenantId);
  return sendSuccess(reply, tenant);
}

export async function listTenantUsersHandler(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.params as { tenantId: string };
  const users = await platformService.getTenantUsers(tenantId);
  return sendSuccess(reply, users);
}

export async function listTenantProgramsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.params as { tenantId: string };
  const programs = await platformService.getTenantPrograms(tenantId);
  return sendSuccess(reply, programs);
}
