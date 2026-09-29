import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendSuccess } from "../../lib/response.js";
import { verifyGoogleCredential } from "./google.js";
import * as votersService from "./service.js";

const authLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };
const voteLimit = { config: { rateLimit: { max: 40, timeWindow: "1 minute" } } };

const pollSlug = z.string().trim().min(1).max(200);
const email = z.string().trim().email("Enter a valid email address").max(254);

const registerSchema = z.object({
  pollSlug,
  name: z.string().trim().min(2, "Enter your full name").max(200),
  email,
  password: z.string().min(8, "Use at least 8 characters").max(128),
});
const loginSchema = z.object({ pollSlug, email, password: z.string().min(1).max(128) });
const verifySchema = z.object({ pollSlug, email, code: z.string().trim().min(4).max(12) });
const resendSchema = z.object({ pollSlug, email });
const googleSchema = z.object({ pollSlug, credential: z.string().min(20).max(5000) });
const voteSchema = z.object({ candidateId: z.string().uuid() });

type SlugParams = { slug: string };

/**
 * Everything a voter touches: the public poll, its live results, voter sign-up/sign-in (a
 * separate account system from staff), and casting votes. Mounted at /api/voter.
 */
export async function voterRoutes(app: FastifyInstance) {
  app.get<{ Params: SlugParams }>("/polls/:slug", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    return sendSuccess(reply, await votersService.getPublicPoll(request.params.slug));
  });

  app.get<{ Params: SlugParams }>("/polls/:slug/results", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    return sendSuccess(reply, await votersService.getPublicResults(request.params.slug));
  });

  app.get<{ Params: SlugParams }>("/polls/:slug/session", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    return sendSuccess(reply, await votersService.session(request, request.params.slug));
  });

  app.post<{ Params: SlugParams & { positionId: string } }>(
    "/polls/:slug/positions/:positionId/vote",
    voteLimit,
    async (request, reply) => {
      const { candidateId } = voteSchema.parse(request.body);
      const result = await votersService.castVote(request, {
        slug: request.params.slug,
        positionId: request.params.positionId,
        candidateId,
      });
      return sendSuccess(reply, result, "Your vote has been recorded");
    },
  );

  app.post("/auth/register", authLimit, async (request, reply) => {
    return sendSuccess(reply, await votersService.register(registerSchema.parse(request.body)), "Check your email for a code");
  });

  app.post("/auth/login", authLimit, async (request, reply) => {
    return sendSuccess(reply, await votersService.login(reply, loginSchema.parse(request.body)));
  });

  app.post("/auth/verify", authLimit, async (request, reply) => {
    return sendSuccess(reply, await votersService.verifyEmail(reply, verifySchema.parse(request.body)), "Email confirmed");
  });

  app.post("/auth/resend", authLimit, async (request, reply) => {
    return sendSuccess(reply, await votersService.resendCode(resendSchema.parse(request.body)), "A new code is on its way");
  });

  app.post("/auth/google", authLimit, async (request, reply) => {
    const input = googleSchema.parse(request.body);
    const profile = await verifyGoogleCredential(input.credential);
    return sendSuccess(reply, await votersService.googleSignIn(reply, { pollSlug: input.pollSlug, profile }));
  });

  app.post("/auth/logout", async (_request, reply) => {
    votersService.clearSession(reply);
    return sendSuccess(reply, null, "Signed out");
  });
}
