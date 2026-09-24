import { AppError } from "../../lib/errors.js";
import type { PaginationInput } from "../../lib/pagination.js";
import { buildPaginatedResult } from "../../lib/pagination.js";
import * as platformRepo from "./repository.js";

export async function listTenants(pagination: PaginationInput) {
  const { items, total } = await platformRepo.listTenants(pagination);
  return buildPaginatedResult(items, total, pagination);
}

export async function getTenant(tenantId: string) {
  const tenant = await platformRepo.findTenantById(tenantId);
  if (!tenant) throw AppError.notFound("Account not found");
  return tenant;
}

export async function getTenantUsers(tenantId: string) {
  await getTenant(tenantId);
  return platformRepo.listUsersForTenant(tenantId);
}

export async function getTenantPrograms(tenantId: string) {
  await getTenant(tenantId);
  return platformRepo.listProgramsForTenant(tenantId);
}
