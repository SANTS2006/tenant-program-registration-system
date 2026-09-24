import { env } from "../../config/env.js";
import { participantFileName } from "../../lib/downloadName.js";
import { AppError } from "../../lib/errors.js";
import { code128, renderIdCard, type IdCardContent } from "../../shared/designs/index.js";
import * as formsRepo from "../forms/repository.js";
import * as programsRepo from "../programs/repository.js";
import * as registrationsRepo from "../registrations/repository.js";
import {
  BACKGROUND_TRANSFORM,
  cardDate,
  fetchImageDataUri,
  LOGO_TRANSFORM,
  PHOTO_TRANSFORM,
  qrMatrix,
  svgPagesToPdf,
} from "./pdf.js";
import { resolveIdCardConfig, type IdCardConfig, type ResolvedIdCardConfig } from "./schemas.js";

// Portrait CR-80 card, 2.125in x 3.375in, in PDF points.
const CARD_WIDTH_PT = 153;
const CARD_HEIGHT_PT = 243;

export interface GeneratedDocument {
  pdf: Buffer;
  fileName: string;
}

export type DocumentSide = "front" | "back";

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

export async function organizationName(program: programsRepo.ProgramRow): Promise<string> {
  return (await programsRepo.findTenantName(program.tenantId)) ?? program.name;
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

export async function getConfig(
  programId: string,
): Promise<{ idCardEnabled: boolean; config: ResolvedIdCardConfig; organizationName: string }> {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  return {
    idCardEnabled: program.idCardEnabled,
    config: resolveIdCardConfig(program.idCardConfig),
    organizationName: await organizationName(program),
  };
}

export async function updateConfig(programId: string, config: IdCardConfig) {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  const updated = await programsRepo.updateProgramRow(programId, { idCardConfig: config });
  return resolveIdCardConfig(updated.idCardConfig);
}

async function renderCard(program: programsRepo.ProgramRow, registration: registrationsRepo.RegistrationRow) {
  if (!program.idCardEnabled) throw AppError.conflict("ID cards are not enabled for this program");

  const config = resolveIdCardConfig(program.idCardConfig);
  const responses = (registration.responses as Record<string, unknown>) ?? {};
  const roleAnswer = config.roleFieldKey ? responses[config.roleFieldKey] : undefined;

  let photoUrl: string | undefined;
  if (config.photoFieldKey) {
    const files = await registrationsRepo.getRegistrationFiles(registration.id);
    photoUrl = files.find((f) => f.fieldKey === config.photoFieldKey)?.secureUrl;
  }

  const [orgName, fields, photo, logoImage, background] = await Promise.all([
    organizationName(program),
    resolveExtraFields(registration, config.visibleFields),
    fetchImageDataUri(photoUrl, PHOTO_TRANSFORM),
    fetchImageDataUri(config.logoUrl, LOGO_TRANSFORM),
    config.template === "custom" ? fetchImageDataUri(config.backgroundImageUrl, BACKGROUND_TRANSFORM) : null,
  ]);

  const content: IdCardContent = {
    logo: { image: logoImage, orgName, tagline: program.name },
    name: registration.applicantName ?? "Registered Participant",
    role: typeof roleAnswer === "string" && roleAnswer.trim() ? roleAnswer.trim() : config.roleText,
    registrationNumber: registration.registrationNumber,
    fields,
    issued: cardDate(registration.createdAt),
    validUntil: cardDate(program.endDate),
    // Without a photo field the card shows the neutral silhouette, as in the preview.
    photo,
    qr: config.showQrCode ? qrMatrix(verifyUrlFor(program, registration)) : null,
    barcode: code128(registration.registrationNumber),
    terms: config.termsList,
    contact: {
      phone: config.contactPhone,
      email: config.contactEmail,
      website: config.contactWebsite,
      address: config.contactAddress,
    },
    signatureLabel: config.signatureLabel,
    background,
  };

  return renderIdCard(config.template, content, { primary: config.primaryColor, secondary: config.secondaryColor });
}

async function buildCardPdf(
  program: programsRepo.ProgramRow,
  registration: registrationsRepo.RegistrationRow,
): Promise<GeneratedDocument> {
  const { front, back } = await renderCard(program, registration);
  const pdf = await svgPagesToPdf([front, back], CARD_WIDTH_PT, CARD_HEIGHT_PT);
  return { pdf, fileName: participantFileName(registration.applicantName, `id-card:${registration.id}`) };
}

async function publicRegistrationWithCard(slug: string, registrationNumber: string) {
  const found = await findPublicRegistration(slug, registrationNumber);
  // Hidden from the success page means no public download either, not just a hidden button.
  if (!resolveIdCardConfig(found.program.idCardConfig).showOnConfirmation) throw AppError.notFound("ID card not available");
  return found;
}

export async function generateForRegistrationInProgram(programId: string, registrationId: string) {
  const { program, registration } = await findAdminRegistration(programId, registrationId);
  return buildCardPdf(program, registration);
}

export async function generateForPublicRegistration(slug: string, registrationNumber: string) {
  const { program, registration } = await publicRegistrationWithCard(slug, registrationNumber);
  return buildCardPdf(program, registration);
}

export async function svgForRegistrationInProgram(programId: string, registrationId: string, side: DocumentSide) {
  const { program, registration } = await findAdminRegistration(programId, registrationId);
  return (await renderCard(program, registration))[side];
}

export async function svgForPublicRegistration(slug: string, registrationNumber: string, side: DocumentSide) {
  const { program, registration } = await publicRegistrationWithCard(slug, registrationNumber);
  return (await renderCard(program, registration))[side];
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
