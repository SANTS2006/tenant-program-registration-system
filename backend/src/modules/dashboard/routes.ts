import type { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors.js";
import { sendSuccess } from "../../lib/response.js";
import { getDashboardTrendHandler } from "../analytics/controller.js";
import { getOverview } from "./service.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/overview", async (request, reply) => {
    if (!request.user) throw AppError.unauthorized();
    const overview = await getOverview(request.user);
    return sendSuccess(reply, overview);
  });
  app.get("/analytics/trend", getDashboardTrendHandler);
}
