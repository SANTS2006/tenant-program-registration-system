import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../lib/errors.js";
import { paginationSchema } from "../../lib/pagination.js";
import { buildPaginatedResult } from "../../lib/pagination.js";
import { sendSuccess } from "../../lib/response.js";
import * as formsService from "../forms/service.js";
import * as programsRepo from "../programs/repository.js";
import * as registrationsService from "../registrations/service.js";
import { submitRegistrationSchema } from "../registrations/schemas.js";

function isRegistrationOpen(program: programsRepo.ProgramRow): boolean {
  if (program.status !== "published" || !program.registrationEnabled) return false;
  const now = new Date();
  if (program.registrationStartDate && now < program.registrationStartDate) return false;
  if (program.registrationEndDate && now > program.registrationEndDate) return false;
  return true;
}

function toPublicProgram(program: programsRepo.ProgramRow) {
  return {
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

export async function listPublicProgramsHandler(request: FastifyRequest, reply: FastifyReply) {
  const pagination = paginationSchema.parse(request.query);
  const { items, total } = await programsRepo.listPublicPrograms(pagination);
  const result = buildPaginatedResult(items.map(toPublicProgram), total, pagination);
  return sendSuccess(reply, result);
}

export async function getPublicProgramHandler(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = request.params as { slug: string };
  const program = await programsRepo.findProgramBySlug(slug);
  if (!program || program.status !== "published") throw AppError.notFound("Program not found");
  return sendSuccess(reply, toPublicProgram(program));
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
    },
    "Registration submitted successfully",
    201,
  );
}
