import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { isProduction } from "../config/env.js";
import { AppError } from "../lib/errors.js";

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    request.log.warn({ err: error }, error.message);
    return reply.status(error.statusCode).send({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.flatten() },
    });
  }

  const fastifyErr = error as FastifyError;

  if (fastifyErr.validation) {
    return reply.status(400).send({
      success: false,
      error: { code: "VALIDATION_ERROR", message: fastifyErr.message, details: fastifyErr.validation },
    });
  }

  if (fastifyErr.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
    });
  }

  request.log.error({ err: error }, "Unhandled error");
  return reply.status(500).send({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction ? "An unexpected error occurred" : error.message,
    },
  });
}
