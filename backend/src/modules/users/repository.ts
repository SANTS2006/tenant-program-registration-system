import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { programMembers, programs, tenants, users } from "../../db/schema/index.js";
import type { PaginationInput } from "../../lib/pagination.js";
import { toOffsetLimit } from "../../lib/pagination.js";
import type { CreateUserInput, UpdateUserInput } from "./schemas.js";

export async function insertUser(tenantId: string, input: CreateUserInput & { passwordHash: string }) {
  const [row] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
      tenantId,
    })
    .returning();
  return row!;
}

export async function listUsers(tenantId: string, search: string | undefined, pagination: PaginationInput) {
  const conditions = [eq(users.tenantId, tenantId)];
  if (search) {
    const term = `%${search}%`;
    conditions.push(or(ilike(users.name, term), ilike(users.email, term))!);
  }
  const where = and(...conditions);
  const { limit, offset } = toOffsetLimit(pagination);

  const [items, totalRow] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(users).where(where),
  ]);

  return { items, total: Number(totalRow[0]?.value ?? 0) };
}

export async function findUserByIdInTenant(id: string, tenantId: string) {
  const [row] = await db.select().from(users).where(and(eq(users.id, id), eq(users.tenantId, tenantId))).limit(1);
  return row ?? null;
}

export async function findTenantName(tenantId: string): Promise<string | null> {
  const [row] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row?.name ?? null;
}

export async function findUserByEmail(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return row ?? null;
}

export async function updateUser(id: string, tenantId: string, input: UpdateUserInput) {
  const [row] = await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
    .returning();
  return row!;
}

export async function listMembershipsForUser(userId: string) {
  return db
    .select({
      programId: programMembers.programId,
      roleOnProgram: programMembers.roleOnProgram,
      programName: programs.name,
      programSlug: programs.slug,
    })
    .from(programMembers)
    .innerJoin(programs, eq(programs.id, programMembers.programId))
    .where(eq(programMembers.userId, userId));
}

export async function programBelongsToTenant(programId: string, tenantId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.id, programId), eq(programs.tenantId, tenantId)))
    .limit(1);
  return !!row;
}

export async function upsertMembership(userId: string, programId: string, roleOnProgram: "admin" | "viewer") {
  await db
    .insert(programMembers)
    .values({ userId, programId, roleOnProgram })
    .onConflictDoUpdate({
      target: [programMembers.userId, programMembers.programId],
      set: { roleOnProgram },
    });
}

export async function removeMembership(userId: string, programId: string) {
  await db
    .delete(programMembers)
    .where(and(eq(programMembers.userId, userId), eq(programMembers.programId, programId)));
}
