import { participantFileName } from "../../lib/downloadName.js";
import { AppError } from "../../lib/errors.js";
import { code128, renderTicket } from "../../shared/designs/index.js";
import { BACKGROUND_TRANSFORM, cardDate, fetchImageDataUri, LOGO_TRANSFORM, qrMatrix, svgPagesToPdf } from "../idcards/pdf.js";
import {
  findAdminRegistration,
  findPublicRegistration,
  organizationName,
  resolveExtraFields,
  verifyUrlFor,
  type GeneratedDocument,
} from "../idcards/service.js";
import * as programsRepo from "../programs/repository.js";
import type * as registrationsRepo from "../registrations/repository.js";
import { resolveTicketConfig, type TicketConfig, type TicketConfigInput } from "./schemas.js";

// 7.5in x 2.5in landscape ticket in PDF points.
const TICKET_WIDTH_PT = 540;
const TICKET_HEIGHT_PT = 180;

export async function getConfig(
  programId: string,
): Promise<{ ticketEnabled: boolean; config: TicketConfig; organizationName: string }> {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  return {
    ticketEnabled: program.ticketEnabled,
    config: resolveTicketConfig(program.ticketConfig),
    organizationName: await organizationName(program),
  };
}

export async function updateConfig(programId: string, config: TicketConfigInput): Promise<TicketConfig> {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  const updated = await programsRepo.updateProgramRow(programId, { ticketConfig: config });
  return resolveTicketConfig(updated.ticketConfig);
}

function formatProgramDate(program: programsRepo.ProgramRow): string | undefined {
  const start = cardDate(program.startDate);
  if (!start) return undefined;
  const end = cardDate(program.endDate);
  return !end || start === end ? start : `${start} - ${end}`;
}

async function renderProgramTicket(program: programsRepo.ProgramRow, registration: registrationsRepo.RegistrationRow) {
  if (!program.ticketEnabled) throw AppError.conflict("Tickets are not enabled for this program");

  const config = resolveTicketConfig(program.ticketConfig);
  const [orgName, fields, logoImage, background] = await Promise.all([
    organizationName(program),
    resolveExtraFields(registration, config.visibleFields),
    fetchImageDataUri(config.logoUrl, LOGO_TRANSFORM),
    config.template === "custom" ? fetchImageDataUri(config.backgroundImageUrl, BACKGROUND_TRANSFORM) : null,
  ]);

  return renderTicket(
    config.template,
    {
      logo: { image: logoImage, orgName, tagline: program.name },
      kicker: config.kicker ?? orgName,
      title: config.eventTitle ?? program.name,
      subtitle: config.tagline ?? program.shortDescription ?? "",
      date: config.eventDate ?? formatProgramDate(program),
      time: config.eventTime,
      venue: config.venue,
      priceLabel: config.admissionLabel,
      price: config.priceText,
      participantName: registration.applicantName ?? "Registered Participant",
      registrationNumber: registration.registrationNumber,
      fields,
      phone: config.contactPhone,
      website: config.website,
      terms: config.terms,
      qr: config.showQrCode ? qrMatrix(verifyUrlFor(program, registration)) : null,
      barcode: code128(registration.registrationNumber),
      background,
      textColor: config.textColor,
      overlayOpacity: config.overlayOpacity,
    },
    { primary: config.primaryColor, secondary: config.secondaryColor },
  );
}

async function buildTicketPdf(
  program: programsRepo.ProgramRow,
  registration: registrationsRepo.RegistrationRow,
): Promise<GeneratedDocument> {
  const svg = await renderProgramTicket(program, registration);
  const pdf = await svgPagesToPdf([svg], TICKET_WIDTH_PT, TICKET_HEIGHT_PT);
  return { pdf, fileName: participantFileName(registration.applicantName, `ticket:${registration.id}`) };
}

async function publicRegistrationWithTicket(slug: string, registrationNumber: string) {
  const found = await findPublicRegistration(slug, registrationNumber);
  if (!resolveTicketConfig(found.program.ticketConfig).showOnConfirmation) throw AppError.notFound("Ticket not available");
  return found;
}

export async function generateForRegistrationInProgram(programId: string, registrationId: string) {
  const { program, registration } = await findAdminRegistration(programId, registrationId);
  return buildTicketPdf(program, registration);
}

export async function generateForPublicRegistration(slug: string, registrationNumber: string) {
  const { program, registration } = await publicRegistrationWithTicket(slug, registrationNumber);
  return buildTicketPdf(program, registration);
}

export async function svgForRegistrationInProgram(programId: string, registrationId: string) {
  const { program, registration } = await findAdminRegistration(programId, registrationId);
  return renderProgramTicket(program, registration);
}

export async function svgForPublicRegistration(slug: string, registrationNumber: string) {
  const { program, registration } = await publicRegistrationWithTicket(slug, registrationNumber);
  return renderProgramTicket(program, registration);
}
