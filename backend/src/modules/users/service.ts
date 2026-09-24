import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import type { PaginationInput } from "../../lib/pagination.js";
import { buildPaginatedResult } from "../../lib/pagination.js";
import { hashPassword } from "../../lib/password.js";
import { sendEmail } from "../email/service.js";
import { invitationEmail } from "../email/templates.js";
import * as usersRepo from "./repository.js";
import type { AddProgramMembershipInput, CreateUserInput, UpdateUserInput } from "./schemas.js";

export async function createUser(tenantId: string, input: CreateUserInput, inviter: { name: string }) {
  const existing = await usersRepo.findUserByEmail(input.email);
  if (existing) throw AppError.conflict("A user with this email already exists");

  const passwordHash = await hashPassword(input.password);
  const user = await usersRepo.insertUser(tenantId, { ...input, passwordHash });

  const organizationName = (await usersRepo.findTenantName(tenantId)) ?? "your organization";
  const message = invitationEmail({
    name: user.name,
    email: user.email,
    inviterName: inviter.name,
    organizationName,
    role: user.role,
    temporaryPassword: input.password,
    loginUrl: `${env.APP_URL}/login`,
  });
  await sendEmail({ to: user.email, toName: user.name, subject: message.subject, html: message.html });

  return sanitize(user);
}

export async function listUsers(tenantId: string, search: string | undefined, pagination: PaginationInput) {
  const { items, total } = await usersRepo.listUsers(tenantId, search, pagination);
  return buildPaginatedResult(items, total, pagination);
}

export async function getUser(tenantId: string, id: string) {
  const user = await usersRepo.findUserByIdInTenant(id, tenantId);
  // A cross-tenant id resolves the same as a nonexistent one -- callers must
  // never be able to tell the two apart.
  if (!user) throw AppError.notFound("User not found");
  return sanitize(user);
}

export async function updateUser(tenantId: string, id: string, input: UpdateUserInput) {
  await getUser(tenantId, id);
  const user = await usersRepo.updateUser(id, tenantId, input);
  return sanitize(user);
}

export async function listMemberships(tenantId: string, userId: string) {
  await getUser(tenantId, userId);
  return usersRepo.listMembershipsForUser(userId);
}

export async function addMembership(tenantId: string, userId: string, input: AddProgramMembershipInput) {
  await getUser(tenantId, userId);
  const programInTenant = await usersRepo.programBelongsToTenant(input.programId, tenantId);
  if (!programInTenant) throw AppError.notFound("Program not found");
  await usersRepo.upsertMembership(userId, input.programId, input.roleOnProgram);
  return usersRepo.listMembershipsForUser(userId);
}

export async function removeMembership(tenantId: string, userId: string, programId: string) {
  await getUser(tenantId, userId);
  await usersRepo.removeMembership(userId, programId);
}

function sanitize(user: { passwordHash?: string } & Record<string, unknown>) {
  const { passwordHash, ...rest } = user;
  return rest;
}
