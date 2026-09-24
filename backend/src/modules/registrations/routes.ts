import type { FastifyInstance } from "fastify";
import { requireProgramAccess } from "../../middleware/authorize.js";
import {
  exportRegistrationsHandler,
  getProgramStatsHandler,
  getRegistrationHandler,
  listRegistrationsHandler,
  updateRegistrationStatusHandler,
} from "./controller.js";

export async function registrationRoutes(app: FastifyInstance) {
  app.get(
    "/:programId/registrations",
    { preHandler: requireProgramAccess("viewer") },
    listRegistrationsHandler,
  );
  app.get(
    "/:programId/registrations/stats",
    { preHandler: requireProgramAccess("viewer") },
    getProgramStatsHandler,
  );
  app.get(
    "/:programId/registrations/export",
    { preHandler: requireProgramAccess("viewer") },
    exportRegistrationsHandler,
  );
  app.get(
    "/:programId/registrations/:registrationId",
    { preHandler: requireProgramAccess("viewer") },
    getRegistrationHandler,
  );
  app.patch(
    "/:programId/registrations/:registrationId/status",
    { preHandler: requireProgramAccess("admin") },
    updateRegistrationStatusHandler,
  );
}
