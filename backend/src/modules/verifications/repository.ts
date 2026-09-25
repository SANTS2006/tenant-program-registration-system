import { and, count, countDistinct, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { documentVerifications, registrations, users } from "../../db/schema/index.js";
import { toOffsetLimit, type PaginationInput } from "../../lib/pagination.js";

export type VerificationDocument = (typeof documentVerifications.$inferInsert)["documentType"];
export type NewVerification = typeof documentVerifications.$inferInsert;

// Reloading the verification page (or a phone opening it twice) shouldn't count as a new scan.
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export async function recordVerification(values: NewVerification): Promise<void> {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const conditions = [
    eq(documentVerifications.registrationId, values.registrationId),
    eq(documentVerifications.documentType, values.documentType),
    gte(documentVerifications.createdAt, since),
  ];
  if (values.ipAddress) conditions.push(eq(documentVerifications.ipAddress, values.ipAddress));

  const [recent] = await db
    .select({ id: documentVerifications.id })
    .from(documentVerifications)
    .where(and(...conditions))
    .limit(1);
  if (recent) return;

  await db.insert(documentVerifications).values(values);
}

export interface VerificationFilters {
  search?: string;
  documentType?: VerificationDocument;
  valid?: boolean;
  registrationId?: string;
}

function buildWhere(programId: string, filters: VerificationFilters) {
  const conditions = [eq(documentVerifications.programId, programId)];
  if (filters.documentType) conditions.push(eq(documentVerifications.documentType, filters.documentType));
  if (filters.valid !== undefined) conditions.push(eq(documentVerifications.valid, filters.valid));
  if (filters.registrationId) conditions.push(eq(documentVerifications.registrationId, filters.registrationId));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(registrations.registrationNumber, term),
        ilike(registrations.applicantName, term),
        ilike(registrations.applicantEmail, term),
      )!,
    );
  }
  return and(...conditions);
}

export async function listVerifications(programId: string, filters: VerificationFilters, pagination: PaginationInput) {
  const where = buildWhere(programId, filters);
  const { limit, offset } = toOffsetLimit(pagination);

  const [items, totalRow] = await Promise.all([
    db
      .select({
        id: documentVerifications.id,
        registrationId: documentVerifications.registrationId,
        documentType: documentVerifications.documentType,
        valid: documentVerifications.valid,
        registrationStatus: documentVerifications.registrationStatus,
        createdAt: documentVerifications.createdAt,
        registrationNumber: registrations.registrationNumber,
        applicantName: registrations.applicantName,
        applicantEmail: registrations.applicantEmail,
        currentStatus: registrations.status,
        verifiedByName: users.name,
      })
      .from(documentVerifications)
      .innerJoin(registrations, eq(registrations.id, documentVerifications.registrationId))
      .leftJoin(users, eq(users.id, documentVerifications.verifiedBy))
      .where(where)
      .orderBy(desc(documentVerifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(documentVerifications)
      .innerJoin(registrations, eq(registrations.id, documentVerifications.registrationId))
      .where(where),
  ]);

  return { items, total: Number(totalRow[0]?.value ?? 0) };
}

/** Headline numbers for a program's verifications tab. */
export async function getVerificationSummary(programId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      total: count(),
      registrationsVerified: countDistinct(documentVerifications.registrationId),
      today: sql<number>`count(*) filter (where ${documentVerifications.createdAt} >= ${startOfToday})`,
      idCards: sql<number>`count(*) filter (where ${documentVerifications.documentType} = 'id_card')`,
      tickets: sql<number>`count(*) filter (where ${documentVerifications.documentType} = 'ticket')`,
      invalid: sql<number>`count(*) filter (where ${documentVerifications.valid} = false)`,
    })
    .from(documentVerifications)
    .where(eq(documentVerifications.programId, programId));

  return {
    total: Number(row?.total ?? 0),
    registrationsVerified: Number(row?.registrationsVerified ?? 0),
    today: Number(row?.today ?? 0),
    idCards: Number(row?.idCards ?? 0),
    tickets: Number(row?.tickets ?? 0),
    invalid: Number(row?.invalid ?? 0),
  };
}
