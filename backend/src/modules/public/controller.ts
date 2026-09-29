import type { FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { businesses } from "../../db/schema/index.js";
import { AppError } from "../../lib/errors.js";
import { sendSuccess } from "../../lib/response.js";
import * as formsService from "../forms/service.js";
import * as programsRepo from "../programs/repository.js";
import * as registrationsService from "../registrations/service.js";
import { submitRegistrationSchema } from "../registrations/schemas.js";
import { signSubmissionToken, submissionPdfByToken, submissionSummaryByToken } from "../registrations/summary.js";
import { attachmentDisposition } from "../../lib/downloadName.js";

function isRegistrationOpen(program: programsRepo.ProgramRow): boolean {
  if (program.status !== "published" || !program.registrationEnabled) return false;
  const now = new Date();
  if (program.registrationStartDate && now < program.registrationStartDate) return false;
  if (program.registrationEndDate && now > program.registrationEndDate) return false;
  return true;
}

async function businessFor(program: programsRepo.ProgramRow) {
  if (program.kind !== "order_form" || !program.businessId) return null;
  const [business] = await db.select().from(businesses).where(eq(businesses.id, program.businessId)).limit(1);
  if (!business || business.deletedAt) return null;
  return {
    name: business.name,
    logoUrl: business.logoUrl,
    description: business.description,
    email: business.email,
    phone: business.phone,
    address: business.address,
    website: business.website,
  };
}

async function toPublicProgram(program: programsRepo.ProgramRow) {
  return {
    kind: program.kind,
    // An order form is shown as its business's order page.
    business: await businessFor(program),
    id: program.id,
    name: program.name,
    slug: program.slug,
    description: program.description,
    shortDescription: program.shortDescription,
    thumbnailUrl: program.thumbnailUrl,
    startDate: program.startDate,
    endDate: program.endDate,
    registrationStartDate: program.registrationStartDate,
    registrationEndDate: program.registrationEndDate,
    registrationOpen: isRegistrationOpen(program),
  };
}

export async function getPublicProgramHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = request.params as { slug: string };
  const program = await programsRepo.findProgramBySlug(slug);
  if (!program || program.status !== "published") throw AppError.notFound("Program not found");
  return sendSuccess(reply, await toPublicProgram(program));
}

export async function getPublicFormHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = request.params as { slug: string };
  const program = await programsRepo.findProgramBySlug(slug);
  if (!program || program.status !== "published") throw AppError.notFound("Program not found");

  const published = await formsService.getPublishedFormWithContent(program.id);
  if (!published) throw AppError.notFound("This program does not have a published registration form");

  return sendSuccess(reply, published);
}

export async function submitPublicRegistrationHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = request.params as { slug: string };
  const input = submitRegistrationSchema.parse(request.body);
  const result = await registrationsService.submitRegistration(slug, input);
  return sendSuccess(
    reply,
    {
      registrationNumber: result.registration.registrationNumber,
      status: result.registration.status,
      confirmationMessage: result.confirmationMessage,
      showRegistrationNumber: result.showRegistrationNumber,
      idCardAvailable: result.idCardAvailable,
      ticketAvailable: result.ticketAvailable,
      // Lets the registrant view and download what they submitted from the success page.
      receiptToken: signSubmissionToken(result.registration.id),
    },
    "Registration submitted successfully",
    201,
  );
}

export async function getSubmissionSummaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const { token } = request.params as { token: string };
  reply.header("Cache-Control", "no-store");
  return sendSuccess(reply, await submissionSummaryByToken(token));
}

export async function downloadSubmissionPdfHandler(request: FastifyRequest, reply: FastifyReply) {
  const { token } = request.params as { token: string };
  const { buffer, fileName } = await submissionPdfByToken(token);
  return reply
    .header("Content-Type", "application/pdf")
    .header("Content-Disposition", attachmentDisposition(fileName))
    .header("X-Download-Name", encodeURIComponent(fileName))
    .header("Cache-Control", "no-store")
    .send(buffer);
}
