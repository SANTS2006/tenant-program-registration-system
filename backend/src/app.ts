import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { env, isProduction } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authenticate } from "./middleware/authenticate.js";
import { AppError } from "./lib/errors.js";
import { authRoutes } from "./modules/auth/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { programRoutes } from "./modules/programs/routes.js";
import { formRoutes } from "./modules/forms/routes.js";
import { registrationRoutes } from "./modules/registrations/routes.js";
import { publicRoutes } from "./modules/public/routes.js";
import { dashboardRoutes } from "./modules/dashboard/routes.js";
import { auditRoutes } from "./modules/audit/routes.js";
import { idCardRoutes } from "./modules/idcards/routes.js";
import { publicIdCardRoutes } from "./modules/idcards/publicRoutes.js";
import { analyticsRoutes } from "./modules/analytics/routes.js";
import { platformRoutes } from "./modules/platform/routes.js";
import { publicTicketRoutes, ticketRoutes } from "./modules/tickets/routes.js";


// Resolves to <repo>/frontend/dist from both src/ (tsx) and dist/ (built bundle).
const FRONTEND_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/dist");

export function buildApp() {
  const app = Fastify({
    logger: isProduction
      ? { level: "info" }
      : { level: "debug", transport: { target: "pino-pretty", options: { colorize: true } } },
    trustProxy: true,
  });

  app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // The same server also serves the web app in production, so the CSP must
    // allow what the frontend loads: Cloudinary-hosted images and direct
    // browser-to-Cloudinary uploads.
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://api.cloudinary.com"],
      },
    },
  });
  app.register(cors, { origin: env.APP_URL, credentials: true });
  app.register(cookie);
  app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    // Page assets aren't worth rate limiting and would eat into the API budget.
    allowList: (request) => !request.url.startsWith("/api/"),
  });

  if (isProduction && existsSync(FRONTEND_DIST)) {
    app.register(fastifyStatic, {
      root: FRONTEND_DIST,
      wildcard: false,
      // Off so the plugin's default "max-age=0" doesn't override setHeaders below.
      cacheControl: false,
      setHeaders: (res, filePath) => {
        // Vite fingerprints everything under assets/, so it can be cached forever;
        // index.html must always be revalidated so new deploys are picked up.
        res.setHeader(
          "Cache-Control",
          filePath.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
        );
      },
    });
    // Client-side routes (/admin, /programs/:slug, ...) all boot from index.html.
    app.setNotFoundHandler((request, reply) => {
      if ((request.method === "GET" || request.method === "HEAD") && !request.url.startsWith("/api/")) {
        return reply.sendFile("index.html");
      }
      return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } });
    });
  }

  app.setErrorHandler(errorHandler);

  app.get("/health", async () => ({ success: true, data: { status: "ok" } }));

  // Every non-public, non-auth route requires a valid access token.
  app.register(
    async (protectedApp) => {
      protectedApp.addHook("preHandler", authenticate);
      // Unverified accounts can only reach /api/auth/* (registered outside this
      // block) until they confirm their email address.
      protectedApp.addHook("preHandler", async (request) => {
        if (request.user && !request.user.emailVerified) throw AppError.emailNotVerified();
      });
      protectedApp.register(userRoutes, { prefix: "/users" });
      protectedApp.register(programRoutes, { prefix: "/programs" });
      protectedApp.register(formRoutes, { prefix: "/programs" });
      protectedApp.register(registrationRoutes, { prefix: "/programs" });
      protectedApp.register(idCardRoutes, { prefix: "/programs" });
      protectedApp.register(ticketRoutes, { prefix: "/programs" });
      protectedApp.register(analyticsRoutes, { prefix: "/programs" });
      protectedApp.register(dashboardRoutes, { prefix: "/dashboard" });
      protectedApp.register(auditRoutes, { prefix: "/audit-logs" });
      protectedApp.register(platformRoutes, { prefix: "/platform" });
    },
    { prefix: "/api" },
  );

  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(publicRoutes, { prefix: "/api/public" });
  app.register(publicIdCardRoutes, { prefix: "/api/public" });
  app.register(publicTicketRoutes, { prefix: "/api/public" });

  return app;
}
