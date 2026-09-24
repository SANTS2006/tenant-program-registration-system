import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/authorize.js";
import {
  addMembershipHandler,
  createUserHandler,
  getUserHandler,
  listMembershipsHandler,
  listUsersHandler,
  removeMembershipHandler,
  updateUserHandler,
} from "./controller.js";

// Tenant admins' own team-management surface -- the platform super_admin
// does not use this router at all (see modules/platform for its read-only
// cross-tenant equivalent).
export async function userRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireRole("admin"));

  app.get("/", listUsersHandler);
  app.post("/", createUserHandler);
  app.get("/:userId", getUserHandler);
  app.patch("/:userId", updateUserHandler);
  app.get("/:userId/programs", listMembershipsHandler);
  app.post("/:userId/programs", addMembershipHandler);
  app.delete("/:userId/programs/:programId", removeMembershipHandler);
}
