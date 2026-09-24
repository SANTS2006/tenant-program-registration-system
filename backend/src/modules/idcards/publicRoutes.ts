import type { FastifyInstance } from "fastify";
import { downloadPublicIdCardHandler, verifyHandler } from "./controller.js";

const idCardRateLimit = { rateLimit: { max: 30, timeWindow: "1 minute" } };

export async function publicIdCardRoutes(app: FastifyInstance) {
  app.get(
    "/programs/:slug/registrations/:registrationNumber/id-card",
    { config: idCardRateLimit },
    downloadPublicIdCardHandler,
  );
  app.get("/verify/:slug/:registrationNumber", { config: idCardRateLimit }, verifyHandler);
}
