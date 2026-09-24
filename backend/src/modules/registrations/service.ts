import { AppError } from "../../lib/errors.js";
import type { PaginationInput } from "../../lib/pagination.js";
import { buildPaginatedResult } from "../../lib/pagination.js";
import { sendEmail } from "../email/service.js";
import { registrationConfirmationEmail } from "../email/templates.js";
import * as formsService from "../forms/service.js";
import * as programsRepo from "../programs/repository.js";
import * as registrationsRepo from "./repository.js";
import type { ListRegistrationsQuery, SubmitRegistrationInput, UpdateStatusInput } from "./schemas.js";
import { extractApplicantContact, validateAndNormalizeResponses } from "./validation.js";

function isRegistrationWindowOpen(program: programsRepo.ProgramRow): boolean {
  const now = new Date();
  if (program.registrationStartDate && now < program.registrationStartDate) return false;
  if (program.registrationEndDate && now > program.registrationEndDate) return false;
  return true;
}

export async function submitRegistration(slug: string, input: SubmitRegistrationInput) {
  const program = await programsRepo.findProgramBySlug(slug);
  if (!program) throw AppError.notFound("Program not found");
  if (program.status !== "published" || !program.registrationEnabled) {
    throw AppError.conflict("Registration is not currently open for this program");
  }
  if (!isRegistrationWindowOpen(program)) {
    throw AppError.conflict("Registration is not currently open for this program");
  }

  const published = await formsService.getPublishedFormWithContent(program.id);
  if (!published) throw AppError.conflict("This program does not have a registration form available yet");

  const files = input.files.map((f) => ({
    fieldKey: f.fieldKey,
    url: f.url,
    publicId: f.publicId,
    filename: f.filename,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
  }));

  const cleanedResponses = validateAndNormalizeResponses(published.fields, input.responses, files);
  const contact = extractApplicantContact(published.fields, cleanedResponses);

  const year = new Date().getFullYear();
  const sequence = await registrationsRepo.nextRegistrationSequence(program.id, year);
  const registrationNumber = registrationsRepo.formatRegistrationNumber(year, sequence);

  const registration = await registrationsRepo.createRegistration({
    programId: program.id,
    formId: published.form.id,
    registrationNumber,
    applicantName: contact.name,
    applicantEmail: contact.email,
    applicantPhone: contact.phone,
    responses: cleanedResponses,
    files,
  });

  if (contact.email) {
    try {
      await sendEmail({
        to: contact.email,
        toName: contact.name ?? contact.email,
        subject: `Registration confirmed - ${program.name}`,
        html: registrationConfirmationEmail({
          programName: program.name,
          registrationNumber,
          applicantName: contact.name ?? "there",
        }),
      });
    } catch (err) {
      console.error("Failed to send registration confirmation email", err);
    }
  }

  return {
    registration,
    confirmationMessage: published.form.confirmationMessage,
    idCardEnabled: program.idCardEnabled,
  };
}

export async function listRegistrations(programId: string, query: ListRegistrationsQuery) {
  const pagination: PaginationInput = { page: query.page, pageSize: query.pageSize };
  const { items, total } = await registrationsRepo.listRegistrations(
    programId,
    {
      status: query.status,
      search: query.search,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    },
    pagination,
  );
  return buildPaginatedResult(items, total, pagination);
}

export async function getRegistrationDetail(programId: string, registrationId: string) {
  const registration = await registrationsRepo.findRegistrationInProgram(programId, registrationId);
  if (!registration) throw AppError.notFound("Registration not found");

  const [files, history, formVersion] = await Promise.all([
    registrationsRepo.getRegistrationFiles(registration.id),
    registrationsRepo.getRegistrationHistory(registration.id),
    formsService.getFormVersionWithContent(registration.formId),
  ]);

  return { registration, files, history, form: formVersion };
}

export async function updateRegistrationStatus(
  programId: string,
  registrationId: string,
  changedBy: string,
  input: UpdateStatusInput,
) {
  const registration = await registrationsRepo.findRegistrationInProgram(programId, registrationId);
  if (!registration) throw AppError.notFound("Registration not found");

  return registrationsRepo.updateRegistrationStatus(
    registration.id,
    registration.status,
    input.status,
    changedBy,
    input.note,
  );
}

export async function getProgramStats(programId: string) {
  return registrationsRepo.getProgramStats(programId);
}
