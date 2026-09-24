import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { auditLogs } from "../../db/schema/index.js";
import type { PaginationInput } from "../../lib/pagination.js";
import { buildPaginatedResult, toOffsetLimit } from "../../lib/pagination.js";

export interface RecordAuditInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
      ipAddress: input.ipAddress ?? null,
    });
  } catch (err) {
    // Auditing must never break the primary operation it is observing.
    console.error("Failed to record audit log", err);
  }
}

export async function listAuditLogs(
  filters: { entityType?: string; actorUserId?: string },
  pagination: PaginationInput,
) {
  const conditions = [];
  if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters.actorUserId) conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const { limit, offset } = toOffsetLimit(pagination);

  const [items, totalRow] = await Promise.all([
    db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset),
    db.select({ value: count() }).from(auditLogs).where(where),
  ]);

  return buildPaginatedResult(items, Number(totalRow[0]?.value ?? 0), pagination);
}
