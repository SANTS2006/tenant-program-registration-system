import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { renderDetailsPdf, type DetailsSection } from "../../lib/detailsPdf.js";
import { participantFileName } from "../../lib/downloadName.js";
import { AppError } from "../../lib/errors.js";
import * as formsRepo from "../forms/repository.js";
import { fetchImageDataUri, LOGO_TRANSFORM } from "../idcards/pdf.js";
import * as programsRepo from "../programs/repository.js";
import { formatCellValue, withOtherText } from "./exportService.js";
import * as registrationsRepo from "./repository.js";
import { otherTextKey } from "./validation.js";

// A separate key from sign-in tokens, so neither kind of token can stand in for the other.
const SUBMISSION_KEY = `${env.JWT_SECRET}:submission-receipt`;
const SUBMISSION_TTL = "30d";

/** A private link token that lets the registrant see what they submitted, without an account. */
export function signSubmissionToken(registrationId: string): string {
  return jwt.sign({ sub: registrationId }, SUBMISSION_KEY, { expiresIn: SUBMISSION_TTL, audience: "submission" });
}

function readSubmissionToken(token: string): string {
  try {
    const payload = jwt.verify(token, SUBMISSION_KEY, { audience: "submission" }) as { sub?: string };
    if (!payload.sub) throw new Error("missing subject");
    return payload.sub;
  } catch {
    throw AppError.notFound("This link has expired or isn't valid");
  }
}

export interface SubmissionSummary {
  programName: string;
  registrationNumber: string;
  applicantName: string | null;
  status: string;
  submittedAt: string;
  sections: { title: string; rows: { label: string; value: string }[] }[];
}

async function summarize(program: programsRepo.ProgramRow, registration: registrationsRepo.RegistrationRow): Promise<SubmissionSummary> {
  const [{ sections, fields }, files] = await Promise.all([
    formsRepo.getContent(registration.formId),
    registrationsRepo.getRegistrationFiles(registration.id),
  ]);
  const responses = (registration.responses as Record<string, unknown>) ?? {};

  const answer = (field: formsRepo.FieldRow): string => {
    if (field.type.endsWith("_upload")) {
      return files
        .filter((f) => f.fieldKey === field.fieldKey)
        .map((f) => f.originalFilename)
        .join(", ");
    }
    if (field.type === "consent") return responses[field.fieldKey] === true ? "Agreed" : "";
    return formatCellValue(withOtherText(responses[field.fieldKey], responses[otherTextKey(field.fieldKey)]));
  };

  const rowsFor = (list: formsRepo.FieldRow[]) =>
    list
      .map((field) => ({ label: field.label, value: answer(field) }))
      // Questions that were hidden or skipped are left out.
      .filter((row) => row.value !== "");

  const grouped = sections.map((s) => ({ title: s.title, rows: rowsFor(fields.filter((f) => f.sectionId === s.id)) }));
  const loose = rowsFor(fields.filter((f) => !f.sectionId || !sections.some((s) => s.id === f.sectionId)));
  if (loose.length) grouped.push({ title: sections.length ? "Additional information" : "Your answers", rows: loose });

  return {
    programName: program.name,
    registrationNumber: registration.registrationNumber,
    applicantName: registration.applicantName,
    status: registration.status,
    submittedAt: registration.submittedAt.toISOString(),
    sections: grouped.filter((g) => g.rows.length > 0),
  };
}

async function loadByToken(token: string) {
  const registrationId = readSubmissionToken(token);
  const registration = await registrationsRepo.findRegistrationById(registrationId);
  if (!registration) throw AppError.notFound("Registration not found");
  const program = await programsRepo.findProgramById(registration.programId);
  if (!program) throw AppError.notFound("Registration not found");
  return { program, registration };
}

export async function submissionSummaryByToken(token: string) {
  const { program, registration } = await loadByToken(token);
  return summarize(program, registration);
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

async function summaryPdf(program: programsRepo.ProgramRow, registration: registrationsRepo.RegistrationRow) {
  const [summary, logo] = await Promise.all([summarize(program, registration), fetchImageDataUri(program.thumbnailUrl ?? undefined, LOGO_TRANSFORM)]);
  const submitted = new Date(summary.submittedAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const sections: DetailsSection[] = summary.sections;
  const buffer = await renderDetailsPdf({
    title: program.name,
    subtitle: "Registration details",
    logo,
    facts: [
      { label: "Registration number", value: summary.registrationNumber },
      { label: "Submitted", value: `${submitted} UTC` },
      ...(summary.applicantName ? [{ label: "Name", value: summary.applicantName }] : []),
      { label: "Status", value: statusLabel(summary.status) },
    ],
    sections,
    footer: `${program.name} - ${summary.registrationNumber}`,
  });
  return { buffer, fileName: participantFileName(registration.applicantName, `summary:${registration.id}`, "pdf", "Registration") };
}

export async function submissionPdfByToken(token: string) {
  const { program, registration } = await loadByToken(token);
  return summaryPdf(program, registration);
}

export async function submissionPdfForAdmin(programId: string, registrationId: string) {
  const registration = await registrationsRepo.findRegistrationInProgram(programId, registrationId);
  if (!registration) throw AppError.notFound("Registration not found");
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  return summaryPdf(program, registration);
}
