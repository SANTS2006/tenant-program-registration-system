import { env } from "../../config/env.js";
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
  };
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

async function buildCardData(program: programsRepo.ProgramRow, registration: registrationsRepo.RegistrationRow) {
  if (!program.idCardEnabled) {
    throw AppError.conflict("ID cards are not enabled for this program");
  }

  const config = resolveConfig(program.idCardConfig);
  const formVersion = await formsRepo.findFormById(registration.formId);
  const fields = formVersion ? (await formsRepo.getContent(formVersion.id)).fields : [];
  const fieldsByKey = new Map(fields.map((f) => [f.fieldKey, f]));
  const responses = (registration.responses as Record<string, unknown>) ?? {};

  const extraFields = config.visibleFields
    .map((key) => {
      const field = fieldsByKey.get(key);
      const value = responses[key];
      if (!field || value === null || value === undefined || value === "") return null;
      return { label: field.label, value: Array.isArray(value) ? value.join(", ") : String(value) };
    })
    .filter((f): f is { label: string; value: string } => f !== null);

  const verifyUrl = config.showQrCode
    ? `${env.APP_URL}/verify/${encodeURIComponent(program.slug)}/${encodeURIComponent(registration.registrationNumber)}`
    : undefined;

  let photoUrl: string | undefined;
  if (config.photoFieldKey) {
    const files = await registrationsRepo.getRegistrationFiles(registration.id);
    photoUrl = files.find((f) => f.fieldKey === config.photoFieldKey)?.secureUrl;
  }

  return generateIdCardPdf({
    programName: program.name,
    registrationNumber: registration.registrationNumber,
    applicantName: registration.applicantName ?? "Registered Participant",
    extraFields,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    verifyUrl,
    validUntil: program.endDate ? new Date(program.endDate).toLocaleDateString() : undefined,
    backgroundImageUrl: config.backgroundImageUrl,
    photoUrl,
  });
}

export async function generateForRegistrationInProgram(programId: string, registrationId: string): Promise<Buffer> {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  const registration = await registrationsRepo.findRegistrationInProgram(programId, registrationId);
  if (!registration) throw AppError.notFound("Registration not found");
  return buildCardData(program, registration);
}

export async function generateForPublicRegistration(slug: string, registrationNumber: string): Promise<Buffer> {
  const program = await programsRepo.findProgramBySlug(slug);
  if (!program) throw AppError.notFound("Program not found");
  const registration = await registrationsRepo.findRegistrationByNumber(program.id, registrationNumber);
  if (!registration) throw AppError.notFound("Registration not found");
  return buildCardData(program, registration);
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
