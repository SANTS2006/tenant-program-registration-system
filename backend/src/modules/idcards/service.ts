import { env } from "../../config/env.js";
import { participantFileName } from "../../lib/downloadName.js";
import { AppError } from "../../lib/errors.js";
import * as formsRepo from "../forms/repository.js";
import * as programsRepo from "../programs/repository.js";
import * as registrationsRepo from "../registrations/repository.js";
import { DEFAULT_ID_CARD_CONFIG, type IdCardConfig } from "./schemas.js";
import { generateIdCardPdf } from "./pdf.js";

export function resolveConfig(raw: unknown): IdCardConfig {
  const config = (raw as Partial<IdCardConfig>) ?? {};
  return {
    visibleFields: config.visibleFields ?? DEFAULT_ID_CARD_CONFIG.visibleFields,
    primaryColor: config.primaryColor ?? DEFAULT_ID_CARD_CONFIG.primaryColor,
    secondaryColor: config.secondaryColor ?? DEFAULT_ID_CARD_CONFIG.secondaryColor,
    showQrCode: config.showQrCode ?? DEFAULT_ID_CARD_CONFIG.showQrCode,
    backgroundImageUrl: config.backgroundImageUrl,
    photoFieldKey: config.photoFieldKey,
    showOnConfirmation: config.showOnConfirmation ?? DEFAULT_ID_CARD_CONFIG.showOnConfirmation,
  };
}

export interface GeneratedDocument {
  pdf: Buffer;
  fileName: string;
}

/** Label/value pairs for the chosen form fields, taken from the form version the registrant submitted. */
export async function resolveExtraFields(
  registration: registrationsRepo.RegistrationRow,
  visibleFields: string[],
): Promise<{ label: string; value: string }[]> {
  const formVersion = await formsRepo.findFormById(registration.formId);
  const fields = formVersion ? (await formsRepo.getContent(formVersion.id)).fields : [];
  const fieldsByKey = new Map(fields.map((f) => [f.fieldKey, f]));
  const responses = (registration.responses as Record<string, unknown>) ?? {};

  return visibleFields
    .map((key) => {
      const field = fieldsByKey.get(key);
      const value = responses[key];
      if (!field || value === null || value === undefined || value === "") return null;
      return { label: field.label, value: Array.isArray(value) ? value.join(", ") : String(value) };
    })
    .filter((f): f is { label: string; value: string } => f !== null);
}

export function verifyUrlFor(program: programsRepo.ProgramRow, registration: registrationsRepo.RegistrationRow): string {
  return `${env.APP_URL}/verify/${encodeURIComponent(program.slug)}/${encodeURIComponent(registration.registrationNumber)}`;
}

export async function findPublicRegistration(slug: string, registrationNumber: string) {
  const program = await programsRepo.findProgramBySlug(slug);
  if (!program) throw AppError.notFound("Program not found");
  const registration = await registrationsRepo.findRegistrationByNumber(program.id, registrationNumber);
  if (!registration) throw AppError.notFound("Registration not found");
  return { program, registration };
}

export async function findAdminRegistration(programId: string, registrationId: string) {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  const registration = await registrationsRepo.findRegistrationInProgram(programId, registrationId);
  if (!registration) throw AppError.notFound("Registration not found");
  return { program, registration };
}

export async function getConfig(programId: string): Promise<{ idCardEnabled: boolean; config: IdCardConfig }> {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  return { idCardEnabled: program.idCardEnabled, config: resolveConfig(program.idCardConfig) };
}

export async function updateConfig(programId: string, config: IdCardConfig) {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  const updated = await programsRepo.updateProgramRow(programId, { idCardConfig: config });
  return resolveConfig(updated.idCardConfig);
}

async function buildCard(
  program: programsRepo.ProgramRow,
  registration: registrationsRepo.RegistrationRow,
): Promise<GeneratedDocument> {
  if (!program.idCardEnabled) {
    throw AppError.conflict("ID cards are not enabled for this program");
  }

  const config = resolveConfig(program.idCardConfig);
  const extraFields = await resolveExtraFields(registration, config.visibleFields);

  let photoUrl: string | undefined;
  if (config.photoFieldKey) {
    const files = await registrationsRepo.getRegistrationFiles(registration.id);
    photoUrl = files.find((f) => f.fieldKey === config.photoFieldKey)?.secureUrl;
  }

  const pdf = await generateIdCardPdf({
    programName: program.name,
    registrationNumber: registration.registrationNumber,
    applicantName: registration.applicantName ?? "Registered Participant",
    extraFields,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    verifyUrl: config.showQrCode ? verifyUrlFor(program, registration) : undefined,
    validUntil: program.endDate ? new Date(program.endDate).toLocaleDateString() : undefined,
    backgroundImageUrl: config.backgroundImageUrl,
    photoUrl,
  });
  return { pdf, fileName: participantFileName(registration.applicantName, `id-card:${registration.id}`) };
}

export async function generateForRegistrationInProgram(programId: string, registrationId: string) {
  const { program, registration } = await findAdminRegistration(programId, registrationId);
  return buildCard(program, registration);
}

export async function generateForPublicRegistration(slug: string, registrationNumber: string) {
  const { program, registration } = await findPublicRegistration(slug, registrationNumber);
  // Hidden from the success page means no public download either, not just a hidden button.
  if (!resolveConfig(program.idCardConfig).showOnConfirmation) throw AppError.notFound("ID card not available");
  return buildCard(program, registration);
}

export interface VerificationResult {
  registrationNumber: string;
  programName: string;
  applicantName: string | null;
  status: string;
  valid: boolean;
}

export async function verifyRegistration(slug: string, registrationNumber: string): Promise<VerificationResult> {
  const program = await programsRepo.findProgramBySlug(slug);
  if (!program) throw AppError.notFound("Registration not found");
  const registration = await registrationsRepo.findRegistrationByNumber(program.id, registrationNumber);
  if (!registration) throw AppError.notFound("Registration not found");

  return {
    registrationNumber: registration.registrationNumber,
    programName: program.name,
    applicantName: registration.applicantName,
    status: registration.status,
    valid: registration.status !== "rejected" && registration.status !== "cancelled",
  };
}
