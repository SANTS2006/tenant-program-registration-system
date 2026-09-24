import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/authorize.js";
import {
  getTenantHandler,
  listTenantProgramsHandler,
  listTenantUsersHandler,
  listTenantsHandler,
  updateUserStatusHandler,
} from "./controller.js";

// Cross-account administration for the platform super_admin. Program, form and
// registration management goes through the normal /programs routes, where the
// super_admin resolves to admin on every program.
export async function platformRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireRole("super_admin"));

  app.get("/tenants", listTenantsHandler);
  app.get("/tenants/:tenantId", getTenantHandler);
  app.get("/tenants/:tenantId/users", listTenantUsersHandler);
  app.get("/tenants/:tenantId/programs", listTenantProgramsHandler);
  app.patch("/users/:userId/status", updateUserStatusHandler);
}
