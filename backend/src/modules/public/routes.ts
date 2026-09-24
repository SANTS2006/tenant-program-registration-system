import type { FastifyInstance } from "fastify";
import { publicUploadSignatureHandler } from "../uploads/controller.js";
import {
  getPublicFormHandler,
  getPublicProgramHandler,
  listPublicProgramsHandler,
  submitPublicRegistrationHandler,
} from "./controller.js";

const submissionRateLimit = { rateLimit: { max: 20, timeWindow: "1 minute" } };

export async function publicRoutes(app: FastifyInstance) {
  app.get("/programs", listPublicProgramsHandler);
  app.get("/programs/:slug", getPublicProgramHandler);
  app.get("/programs/:slug/form", getPublicFormHandler);
  app.post(
    "/programs/:slug/registrations",
    { config: submissionRateLimit },
    submitPublicRegistrationHandler,
  );
  app.post("/uploads/signature", { config: submissionRateLimit }, publicUploadSignatureHandler);
}
