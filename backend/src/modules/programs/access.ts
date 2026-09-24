import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/client.js";
import { programMembers, programs } from "../../db/schema/index.js";
import { AppError } from "../../lib/errors.js";
import type { AuthenticatedUser, ProgramRole } from "../users/types.js";

/**
 * Never trust a programId or role supplied by the client. This is the single
 * enforcement point for per-program data isolation -- every registration/form
 * service call must route through here before touching data.
 *
 * Tenant boundary: the platform super_admin bypasses everything (read-only is
 * enforced globally elsewhere, not here); a tenant "admin" bypasses
 * program_members the same way, but only for programs inside their OWN
 * tenant -- a program in another tenant resolves to "no access", identically
 * to "not a member", so a caller can never tell the difference between "this
 * program doesn't exist" and "this program belongs to someone else".
 */
export async function getProgramRole(
  user: AuthenticatedUser,
  programId: string,
): Promise<ProgramRole | null> {
  if (user.role === "super_admin") return "admin";

  if (user.role === "admin") {
    const [program] = await db
      .select({ tenantId: programs.tenantId })
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);
    return program && program.tenantId === user.tenantId ? "admin" : null;
  }

  const [membership] = await db
    .select({ roleOnProgram: programMembers.roleOnProgram })
    .from(programMembers)
    .where(and(eq(programMembers.userId, user.id), eq(programMembers.programId, programId)))
    .limit(1);

  return membership?.roleOnProgram ?? null;
}

export async function assertProgramAccess(
  user: AuthenticatedUser,
  programId: string,
  minRole: ProgramRole = "viewer",
): Promise<ProgramRole> {
  const role = await getProgramRole(user, programId);
  if (!role) {
    throw AppError.forbidden("You do not have access to this program");
  }
  if (minRole === "admin" && role !== "admin") {
    throw AppError.forbidden("You need admin access to this program to perform this action");
  }
  return role;
}

/** Returns "all" for the platform super_admin, or the explicit list of program IDs the user may see. */
export async function listAccessibleProgramIds(user: AuthenticatedUser): Promise<string[] | "all"> {
  if (user.role === "super_admin") return "all";

  if (user.role === "admin") {
    const rows = await db
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.tenantId, user.tenantId!), isNull(programs.deletedAt)));
    return rows.map((r) => r.id);
  }

  const rows = await db
    .select({ programId: programMembers.programId })
    .from(programMembers)
    .where(eq(programMembers.userId, user.id));

  return rows.map((r) => r.programId);
}
