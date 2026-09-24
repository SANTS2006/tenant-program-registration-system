import type { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/authorize.js";
import {
  getTenantHandler,
  listTenantProgramsHandler,
  listTenantUsersHandler,
  listTenantsHandler,
} from "./controller.js";

// Platform-level oversight for the one true super_admin: read-only by design
// (no mutation routes exist in this module at all -- a structural guarantee
// on top of the global write-block hook in app.ts).
export async function platformRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireRole("super_admin"));

  app.get("/tenants", listTenantsHandler);
  app.get("/tenants/:tenantId", getTenantHandler);
  app.get("/tenants/:tenantId/users", listTenantUsersHandler);
  app.get("/tenants/:tenantId/programs", listTenantProgramsHandler);
}
