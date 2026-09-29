import { AppError } from "../../lib/errors.js";
import type { PaginationInput } from "../../lib/pagination.js";
import { buildPaginatedResult } from "../../lib/pagination.js";
import { sendEmail } from "../email/service.js";
import { registrationConfirmationEmail } from "../email/templates.js";
import * as formsService from "../forms/service.js";
import { notifyCustomer, notifyNewRegistration } from "../notifications/service.js";
import * as programsRepo from "../programs/repository.js";
import * as registrationsRepo from "./repository.js";
import { orderStatusChoices, programStatusChoices, type ListRegistrationsQuery, type SubmitRegistrationInput, type UpdateStatusInput } from "./schemas.js";
import { counterBucket, formatRegistrationNumber, resolveNumberingConfig } from "./numbering.js";
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
  if (published.form.requireConsent && input.consentAccepted !== true) {
    throw AppError.validation("You must agree to the consent statement to register");
  }

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

  if (program.oneRegistrationPerEmail && contact.email && (await registrationsRepo.emailAlreadyRegistered(program.id, contact.email))) {
    throw AppError.conflict(
      "Registration failed: this email address has already been used to register for this program. You cannot submit more than one registration.",
    );
  }

  const numbering = resolveNumberingConfig(program.registrationNumberConfig);
  const year = new Date().getFullYear();

  // An admin can change the format or starting number after numbers were issued,
  // so a generated number may already be taken -- skip ahead instead of failing.
  let registration: registrationsRepo.RegistrationRow | undefined;
  for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS && !registration; attempt++) {
    const sequence = await registrationsRepo.nextRegistrationSequence(program.id, counterBucket(numbering, year));
    try {
      registration = await registrationsRepo.createRegistration({
        programId: program.id,
        formId: published.form.id,
        registrationNumber: formatRegistrationNumber(numbering, year, sequence),
        applicantName: contact.name,
        applicantEmail: contact.email,
        applicantPhone: contact.phone,
        responses: cleanedResponses,
        files,
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  if (!registration) throw AppError.conflict("Could not allocate a registration number, please try again");
  const registrationNumber = registration.registrationNumber;

  if (program.kind === "order_form") {
    // Customers get an order confirmation branded with the business instead.
    void notifyCustomer(program, registration, { isNew: true, fields: published.fields, files });
  } else if (contact.email) {
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

  // Sent in the background so the registrant isn't kept waiting on the team's emails.
  void notifyNewRegistration(program, registration, published.fields, files);

  return {
    registration,
    confirmationMessage: published.form.confirmationMessage,
    showRegistrationNumber: published.form.showRegistrationNumber,
    idCardAvailable: program.idCardEnabled && showsOnConfirmation(program.idCardConfig),
    ticketAvailable: program.ticketEnabled && showsOnConfirmation(program.ticketConfig),
  };
}

const MAX_NUMBER_ATTEMPTS = 25;

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

/** ID cards and tickets are offered on the success page unless the admin turned that off. */
export function showsOnConfirmation(config: unknown): boolean {
  return (config as { showOnConfirmation?: boolean } | null)?.showOnConfirmation !== false;
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

export async function getRegistrationFile(programId: string, registrationId: string, fileId: string) {
  const registration = await registrationsRepo.findRegistrationInProgram(programId, registrationId);
  if (!registration) throw AppError.notFound("Registration not found");
  const file = await registrationsRepo.findRegistrationFile(registration.id, fileId);
  if (!file) throw AppError.notFound("File not found");
  return file;
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
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  const allowed: readonly string[] = program.kind === "order_form" ? orderStatusChoices : programStatusChoices;
  if (!allowed.includes(input.status)) throw AppError.validation(`"${input.status}" isn't a valid ${program.kind === "order_form" ? "order" : "registration"} status`);

  const updated = await registrationsRepo.updateRegistrationStatus(
    registration.id,
    registration.status,
    input.status,
    changedBy,
    input.note,
  );

  if (program.kind === "order_form" && input.status !== registration.status) {
    const [{ fields }, files] = await Promise.all([
      formsService.getFormVersionWithContent(registration.formId),
      registrationsRepo.getRegistrationFiles(registration.id),
    ]);
    void notifyCustomer(program, { ...registration, status: input.status }, {
      isNew: false,
      note: input.note,
      fields,
      files: files.map((f) => ({ fieldKey: f.fieldKey, filename: f.originalFilename })),
    });
  }
  return updated;
}

export async function getProgramStats(programId: string) {
  return registrationsRepo.getProgramStats(programId);
}
