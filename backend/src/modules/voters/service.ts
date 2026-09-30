import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { env, isProduction } from "../../config/env.js";
import { db } from "../../db/client.js";
import { voterAccounts, voterEmailCodes } from "../../db/schema/index.js";
import { AppError } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { generateVerificationCode, hashToken } from "../../lib/tokens.js";
import { sendEmail } from "../email/service.js";
import { newVoteNotificationEmail, VERIFICATION_CODE_TTL_MINUTES, voterCodeEmail } from "../email/templates.js";
import * as pollsRepo from "../polls/repository.js";
import { allowedDomains, buildResults, emailAllowed, pollState } from "../polls/service.js";

type Voter = typeof voterAccounts.$inferSelect;
type Poll = pollsRepo.PollRow;

// ---------------------------------------------------------------------------
// Session cookie: separate key and audience from staff sign-in, so the two never mix.

const SESSION_COOKIE = "voterSession";
const SESSION_PATH = "/api/voter";
const SESSION_KEY = `${env.JWT_SECRET}:voter-session`;
const SESSION_DAYS = 30;

function setSession(reply: FastifyReply, voterId: string) {
  const token = jwt.sign({ sub: voterId }, SESSION_KEY, { audience: "voter", expiresIn: `${SESSION_DAYS}d` });
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: SESSION_PATH,
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSession(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: SESSION_PATH });
}

async function currentVoter(request: FastifyRequest): Promise<Voter | null> {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return null;
  try {
    const { sub } = jwt.verify(token, SESSION_KEY, { audience: "voter" }) as { sub: string };
    const [voter] = await db.select().from(voterAccounts).where(eq(voterAccounts.id, sub)).limit(1);
    return voter?.emailVerifiedAt ? voter : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers

const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function findPoll(slug: string): Promise<Poll> {
  const poll = await pollsRepo.findPollBySlug(slug);
  if (!poll) throw AppError.notFound("This poll doesn't exist or has been removed");
  return poll;
}

function assertEmailAllowed(poll: Poll, email: string) {
  if (!emailAllowed(poll, email)) {
    const domains = allowedDomains(poll).map((d) => `@${d}`).join(" or ");
    throw new AppError(
      "FORBIDDEN",
      `You can't vote with the email you entered. This poll only accepts email addresses ending in ${domains}.`,
      403,
      { reason: "domain_not_allowed", domains: allowedDomains(poll) },
    );
  }
}

async function findVoterByEmail(email: string) {
  const [voter] = await db.select().from(voterAccounts).where(eq(voterAccounts.email, normalizeEmail(email))).limit(1);
  return voter ?? null;
}

function publicVoter(voter: Voter) {
  return { id: voter.id, name: voter.name, email: voter.email };
}

/** Signs the voter in and adds them to this poll's voters. */
async function startSession(reply: FastifyReply, voter: Voter, poll: Poll) {
  await Promise.all([
    pollsRepo.addPollVoter(poll.id, voter.id),
    db.update(voterAccounts).set({ lastLoginAt: new Date() }).where(eq(voterAccounts.id, voter.id)),
  ]);
  setSession(reply, voter.id);
  return { status: "signed_in" as const, voter: publicVoter(voter) };
}

async function sendCode(voter: Voter, poll: Poll, purpose: "confirm" | "reset" = "confirm") {
  const [latest] = await db
    .select({ createdAt: voterEmailCodes.createdAt })
    .from(voterEmailCodes)
    .where(and(eq(voterEmailCodes.voterId, voter.id), isNull(voterEmailCodes.consumedAt)))
    .orderBy(desc(voterEmailCodes.createdAt))
    .limit(1);
  // One code a minute is plenty and keeps the email quota safe.
  if (latest && Date.now() - latest.createdAt.getTime() < 60_000) return;

  const code = generateVerificationCode();
  await db.insert(voterEmailCodes).values({
    voterId: voter.id,
    codeHash: hashToken(code),
    expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60_000),
  });
  const email = voterCodeEmail({ pollName: poll.name, pollImageUrl: poll.imageUrl, name: voter.name, code, purpose });
  await sendEmail({ to: voter.email, toName: voter.name, subject: email.subject, html: email.html });
}

// ---------------------------------------------------------------------------
// Public poll data

export function pollForVoters(poll: Poll, ballot: Awaited<ReturnType<typeof pollsRepo.getBallot>>) {
  return {
    id: poll.id,
    slug: poll.slug,
    name: poll.name,
    description: poll.description,
    imageUrl: poll.imageUrl,
    state: pollState(poll),
    closesAt: poll.closesAt,
    onePerEmail: poll.onePerEmail,
    allowedDomains: allowedDomains(poll),
    showResults: poll.showResults,
    googleClientId: env.GOOGLE_CLIENT_ID || null,
    positions: ballot.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      imageUrl: p.imageUrl,
      candidates: p.candidates.map((c) => ({ id: c.id, name: c.name, description: c.description, imageUrl: c.imageUrl })),
    })),
  };
}

export async function getPublicPoll(slug: string) {
  const poll = await findPoll(slug);
  return pollForVoters(poll, await pollsRepo.getBallot(poll.id));
}

export async function getPublicResults(slug: string) {
  const poll = await findPoll(slug);
  if (!poll.showResults) throw AppError.forbidden("Results for this poll aren't public");
  return buildResults(poll.id);
}

/** Who is signed in on this browser, and which positions of this poll they've already voted for. */
export async function session(request: FastifyRequest, slug: string) {
  const poll = await findPoll(slug);
  const voter = await currentVoter(request);
  if (!voter) return { voter: null, votedPositionIds: [] as string[], emailAllowed: true };
  // Signing in to a new poll with an existing account makes you one of its voters.
  await pollsRepo.addPollVoter(poll.id, voter.id);
  return {
    voter: publicVoter(voter),
    votedPositionIds: await pollsRepo.votedPositionIds(poll.id, voter.id),
    emailAllowed: emailAllowed(poll, voter.email),
  };
}

// ---------------------------------------------------------------------------
// Sign-up and sign-in

export async function register(input: { pollSlug: string; name: string; email: string; password: string }) {
  const poll = await findPoll(input.pollSlug);
  const email = normalizeEmail(input.email);
  assertEmailAllowed(poll, email);

  let voter: Voter | null | undefined = await findVoterByEmail(email);
  if (voter?.emailVerifiedAt) {
    throw AppError.conflict(
      voter.passwordHash
        ? "You already have a voter account with this email. Sign in instead."
        : "This email signs in with Google. Use Continue with Google instead.",
    );
  }
  const passwordHash = await hashPassword(input.password);
  if (voter) {
    // An earlier sign-up that was never confirmed: start again with the new details.
    [voter] = await db.update(voterAccounts).set({ name: input.name.trim(), passwordHash }).where(eq(voterAccounts.id, voter.id)).returning();
  } else {
    [voter] = await db.insert(voterAccounts).values({ name: input.name.trim(), email, passwordHash }).returning();
  }
  await sendCode(voter!, poll);
  return { status: "verify" as const, email };
}

export async function login(reply: FastifyReply, input: { pollSlug: string; email: string; password: string }) {
  const poll = await findPoll(input.pollSlug);
  const email = normalizeEmail(input.email);
  const voter = await findVoterByEmail(email);
  const ok = voter?.passwordHash ? await verifyPassword(voter.passwordHash, input.password) : false;
  if (!voter || !ok) {
    throw AppError.unauthorized(
      voter && !voter.passwordHash ? "This email signs in with Google. Use Continue with Google instead." : "Incorrect email or password",
    );
  }
  assertEmailAllowed(poll, email);
  if (!voter.emailVerifiedAt) {
    await sendCode(voter, poll);
    return { status: "verify" as const, email };
  }
  return startSession(reply, voter, poll);
}

/** Checks a 6-character code against the voter's latest unused one, and uses it up. */
async function consumeCode(voter: Voter, code: string) {
  const [row] = await db
    .select()
    .from(voterEmailCodes)
    .where(and(eq(voterEmailCodes.voterId, voter.id), isNull(voterEmailCodes.consumedAt)))
    .orderBy(desc(voterEmailCodes.createdAt))
    .limit(1);
  if (!row || row.expiresAt < new Date() || row.attempts >= 5) {
    throw AppError.validation("That code has expired. Ask for a new one.");
  }
  if (row.codeHash !== hashToken(code.trim().toUpperCase())) {
    await db.update(voterEmailCodes).set({ attempts: row.attempts + 1 }).where(eq(voterEmailCodes.id, row.id));
    throw AppError.validation("That code isn't right. Check the email and try again.");
  }
  await db.update(voterEmailCodes).set({ consumedAt: new Date() }).where(eq(voterEmailCodes.id, row.id));
}

export async function verifyEmail(reply: FastifyReply, input: { pollSlug: string; email: string; code: string }) {
  const poll = await findPoll(input.pollSlug);
  const voter = await findVoterByEmail(input.email);
  if (!voter) throw AppError.validation("That code isn't right. Check the email and try again.");
  await consumeCode(voter, input.code);
  const [verified] = await db.update(voterAccounts).set({ emailVerifiedAt: new Date() }).where(eq(voterAccounts.id, voter.id)).returning();
  assertEmailAllowed(poll, verified!.email);
  return startSession(reply, verified!, poll);
}

export async function resendCode(input: { pollSlug: string; email: string }) {
  const poll = await findPoll(input.pollSlug);
  const voter = await findVoterByEmail(input.email);
  // Same answer whether or not the address has an account, so this can't be used to probe emails.
  if (voter && !voter.emailVerifiedAt) await sendCode(voter, poll);
  return { status: "verify" as const, email: normalizeEmail(input.email) };
}

/** Emails a reset code. The answer is the same whether or not the address has an account. */
export async function forgotPassword(input: { pollSlug: string; email: string }) {
  const poll = await findPoll(input.pollSlug);
  const voter = await findVoterByEmail(input.email);
  if (voter?.emailVerifiedAt) await sendCode(voter, poll, "reset");
  return { status: "reset_sent" as const, email: normalizeEmail(input.email) };
}

export async function resetPassword(input: { pollSlug: string; email: string; code: string; password: string }) {
  await findPoll(input.pollSlug);
  const voter = await findVoterByEmail(input.email);
  if (!voter?.emailVerifiedAt) throw AppError.validation("That code isn't right. Check the email and try again.");
  await consumeCode(voter, input.code);
  await db.update(voterAccounts).set({ passwordHash: await hashPassword(input.password) }).where(eq(voterAccounts.id, voter.id));
  return { status: "password_reset" as const };
}

export async function googleSignIn(reply: FastifyReply, input: { pollSlug: string; profile: { googleId: string; email: string; name: string } }) {
  const poll = await findPoll(input.pollSlug);
  const { googleId, email, name } = input.profile;
  assertEmailAllowed(poll, email);

  const [byGoogle] = await db.select().from(voterAccounts).where(eq(voterAccounts.googleId, googleId)).limit(1);
  let voter: Voter | null | undefined = byGoogle ?? (await findVoterByEmail(email));
  if (voter) {
    // Google has confirmed the address, so an account with that email is linked and confirmed.
    [voter] = await db
      .update(voterAccounts)
      .set({ googleId, emailVerifiedAt: voter.emailVerifiedAt ?? new Date() })
      .where(eq(voterAccounts.id, voter.id))
      .returning();
  } else {
    [voter] = await db.insert(voterAccounts).values({ name, email, googleId, emailVerifiedAt: new Date() }).returning();
  }
  return startSession(reply, voter!, poll);
}

// ---------------------------------------------------------------------------
// Voting

export async function castVote(
  request: FastifyRequest,
  input: { slug: string; positionId: string; candidateId: string },
) {
  const poll = await findPoll(input.slug);
  const voter = await currentVoter(request);
  if (!voter) throw AppError.unauthorized("Sign in to vote");

  const state = pollState(poll);
  if (state === "closed") throw new AppError("CONFLICT", "Voting has closed for this poll.", 409, { reason: "closed" });
  if (state === "draft") throw new AppError("CONFLICT", "Voting hasn't opened yet for this poll.", 409, { reason: "not_open" });
  assertEmailAllowed(poll, voter.email);

  const [position, candidate] = await Promise.all([
    pollsRepo.findPosition(poll.id, input.positionId),
    pollsRepo.findCandidate(poll.id, input.positionId, input.candidateId),
  ]);
  if (!position || !candidate) throw AppError.notFound("That choice isn't on this ballot any more. Please reload the page.");

  const recorded = await pollsRepo.insertVote({
    pollId: poll.id,
    positionId: position.id,
    candidateId: candidate.id,
    voterId: voter.id,
    ballotKey: poll.onePerEmail ? `${position.id}:${voter.id}` : randomUUID(),
    ipAddress: request.ip,
  });
  if (!recorded) {
    throw new AppError("CONFLICT", `You have already voted for ${position.title}. Each email address can vote only once.`, 409, {
      reason: "already_voted",
    });
  }
  await pollsRepo.addPollVoter(poll.id, voter.id);

  const results = await buildResults(poll.id);
  if (poll.notifyOnVote) void notifyTeam(poll, voter, position.title, results.positions.find((p) => p.id === position.id)?.totalVotes ?? 0);
  return {
    votedPositionIds: await pollsRepo.votedPositionIds(poll.id, voter.id),
    results: poll.showResults ? results : null,
  };
}

async function notifyTeam(poll: Poll, voter: Voter, positionTitle: string, totalVotesForPosition: number) {
  try {
    const recipients = await pollsRepo.listPollNotificationRecipients(poll);
    if (!recipients.length) return;
    const base = env.APP_URL.replace(/\/+$/, "");
    const { subject, html } = newVoteNotificationEmail({
      pollName: poll.name,
      voterName: voter.name,
      voterEmail: voter.email,
      positionTitle,
      votedAt: new Date(),
      totalVotesForPosition,
      resultsUrl: `${base}/admin/polls/${poll.id}/results`,
      settingsUrl: `${base}/admin/polls/${poll.id}`,
    });
    await Promise.all(recipients.map((r) => sendEmail({ to: r.email, toName: r.name, subject, html })));
  } catch (err) {
    console.error(`Could not send vote notification for poll ${poll.id}:`, err);
  }
}
