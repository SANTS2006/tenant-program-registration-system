import { and, eq, isNull } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { pollMembers, polls } from "../../db/schema/index.js";
import { AppError } from "../../lib/errors.js";
import type { AuthenticatedUser, ProgramRole } from "../users/types.js";

/**
 * The same rules as programs: the platform super_admin sees everything, a tenant admin sees
 * every poll in their own account, and anyone else needs a poll_members row. A poll in another
 * account resolves the same as one that doesn't exist.
 */
export async function getPollRole(user: AuthenticatedUser, pollId: string): Promise<ProgramRole | null> {
  if (user.role === "super_admin") return "admin";
  if (user.role === "admin") {
    const [poll] = await db.select({ tenantId: polls.tenantId }).from(polls).where(eq(polls.id, pollId)).limit(1);
    return poll && poll.tenantId === user.tenantId ? "admin" : null;
  }
  const [membership] = await db
    .select({ role: pollMembers.roleOnPoll })
    .from(pollMembers)
    .where(and(eq(pollMembers.userId, user.id), eq(pollMembers.pollId, pollId)))
    .limit(1);
  return membership?.role ?? null;
}

export async function assertPollAccess(user: AuthenticatedUser, pollId: string, minRole: ProgramRole = "viewer") {
  const role = await getPollRole(user, pollId);
  if (!role) throw AppError.forbidden("You do not have access to this poll");
  if (minRole === "admin" && role !== "admin") throw AppError.forbidden("You need admin access to this poll to do this");
  return role;
}

export async function listAccessiblePollIds(user: AuthenticatedUser): Promise<string[] | "all"> {
  if (user.role === "super_admin") return "all";
  if (user.role === "admin") {
    const rows = await db
      .select({ id: polls.id })
      .from(polls)
      .where(and(eq(polls.tenantId, user.tenantId!), isNull(polls.deletedAt)));
    return rows.map((r) => r.id);
  }
  const rows = await db.select({ pollId: pollMembers.pollId }).from(pollMembers).where(eq(pollMembers.userId, user.id));
  return rows.map((r) => r.pollId);
}

/** Route guard: the signed-in user needs at least `minRole` on the poll in :pollId. */
export function requirePollAccess(minRole: ProgramRole = "viewer") {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    if (!request.user) throw AppError.unauthorized();
    const { pollId } = request.params as { pollId?: string };
    if (!pollId) throw AppError.validation("pollId route parameter is required");
    await assertPollAccess(request.user, pollId, minRole);
  };
}
