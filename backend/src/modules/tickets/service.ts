import { participantFileName } from "../../lib/downloadName.js";
import { AppError } from "../../lib/errors.js";
import {
  findAdminRegistration,
  findPublicRegistration,
  resolveExtraFields,
  verifyUrlFor,
  type GeneratedDocument,
} from "../idcards/service.js";
import * as programsRepo from "../programs/repository.js";
import type * as registrationsRepo from "../registrations/repository.js";
import { generateTicketPdf } from "./pdf.js";
import { resolveTicketConfig, type TicketConfig } from "./schemas.js";

export async function getConfig(programId: string): Promise<{ ticketEnabled: boolean; config: TicketConfig }> {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  return { ticketEnabled: program.ticketEnabled, config: resolveTicketConfig(program.ticketConfig) };
}

export async function updateConfig(programId: string, config: TicketConfig): Promise<TicketConfig> {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  const updated = await programsRepo.updateProgramRow(programId, { ticketConfig: config });
  return resolveTicketConfig(updated.ticketConfig);
}

function formatProgramDate(program: programsRepo.ProgramRow): string | undefined {
  if (!program.startDate) return undefined;
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const start = new Date(program.startDate).toLocaleDateString("en-GB", opts);
  if (!program.endDate) return start;
  const end = new Date(program.endDate).toLocaleDateString("en-GB", opts);
  return start === end ? start : `${start} – ${end}`;
}

async function buildTicket(
  program: programsRepo.ProgramRow,
  registration: registrationsRepo.RegistrationRow,
): Promise<GeneratedDocument> {
  if (!program.ticketEnabled) throw AppError.conflict("Tickets are not enabled for this program");

  const config = resolveTicketConfig(program.ticketConfig);
  const pdf = await generateTicketPdf(
    {
      eventTitle: config.eventTitle || program.name,
      admissionLabel: config.admissionLabel || "General Admission",
      participantName: registration.applicantName ?? "Registered Participant",
      registrationNumber: registration.registrationNumber,
      eventDate: config.eventDate || formatProgramDate(program),
      venue: config.venue || undefined,
      terms: config.terms || undefined,
      extraFields: await resolveExtraFields(registration, config.visibleFields),
      verifyUrl: config.showQrCode ? verifyUrlFor(program, registration) : undefined,
    },
    config,
  );
  return { pdf, fileName: participantFileName(registration.applicantName, `ticket:${registration.id}`) };
}

export async function generateForRegistrationInProgram(programId: string, registrationId: string) {
  const { program, registration } = await findAdminRegistration(programId, registrationId);
  return buildTicket(program, registration);
}

export async function generateForPublicRegistration(slug: string, registrationNumber: string) {
  const { program, registration } = await findPublicRegistration(slug, registrationNumber);
  if (!resolveTicketConfig(program.ticketConfig).showOnConfirmation) throw AppError.notFound("Ticket not available");
  return buildTicket(program, registration);
}
