import { and, asc, count, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import { programMembers, programs, tenants } from "../../db/schema/index.js";
import type { PaginationInput } from "../../lib/pagination.js";
import { toOffsetLimit } from "../../lib/pagination.js";
import type { ProgramRole } from "../users/types.js";

export type ProgramRow = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;

export async function insertProgram(values: NewProgram): Promise<ProgramRow> {
  const [row] = await db.insert(programs).values(values).returning();
  return row!;
}

export async function addProgramMember(userId: string, programId: string, role: ProgramRole) {
  await db.insert(programMembers).values({ userId, programId, roleOnProgram: role });
}

export async function findProgramById(id: string): Promise<ProgramRow | null> {
  const [row] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.id, id), isNull(programs.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function findProgramBySlug(slug: string): Promise<ProgramRow | null> {
  const [row] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.slug, slug), isNull(programs.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function tenantExists(tenantId: string): Promise<boolean> {
  const [row] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return !!row;
}

export async function findTenantName(tenantId: string): Promise<string | null> {
  const [row] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row?.name ?? null;
}

export async function slugExists(slug: string): Promise<boolean> {
  const [row] = await db.select({ id: programs.id }).from(programs).where(eq(programs.slug, slug)).limit(1);
  return !!row;
}

interface ListFilters {
  accessibleProgramIds: string[] | "all";
  status?: (typeof programs.status.enumValues)[number];
  search?: string;
}

export async function listPrograms(filters: ListFilters, pagination: PaginationInput) {
  const conditions = [isNull(programs.deletedAt)];

  if (filters.accessibleProgramIds !== "all") {
    if (filters.accessibleProgramIds.length === 0) {
      return { items: [] as ProgramRow[], total: 0 };
    }
    conditions.push(inArray(programs.id, filters.accessibleProgramIds));
  }
  if (filters.status) {
    conditions.push(eq(programs.status, filters.status));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(ilike(programs.name, term), ilike(programs.slug, term))!);
  }

  const where = and(...conditions);
  const { limit, offset } = toOffsetLimit(pagination);

  const [items, totalRow] = await Promise.all([
    db.select().from(programs).where(where).orderBy(desc(programs.createdAt)).limit(limit).offset(offset),
    db.select({ value: count() }).from(programs).where(where),
  ]);

  return { items, total: Number(totalRow[0]?.value ?? 0) };
}

export async function updateProgramRow(id: string, values: Partial<NewProgram>): Promise<ProgramRow> {
  const [row] = await db
    .update(programs)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(programs.id, id))
    .returning();
  return row!;
}

export async function softDeleteProgram(id: string): Promise<void> {
  await db.update(programs).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(programs.id, id));
}

export async function listAccessibleProgramIdsForUser(userId: string): Promise<string[]> {
  const rows = await db
    .select({ programId: programMembers.programId })
    .from(programMembers)
    .where(eq(programMembers.userId, userId))
    .orderBy(asc(programMembers.createdAt));
  return rows.map((r) => r.programId);
}
