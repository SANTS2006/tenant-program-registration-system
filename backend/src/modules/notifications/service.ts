import { env } from "../../config/env.js";
import { sendEmail } from "../email/service.js";
import { documentVerifiedNotificationEmail, newRegistrationNotificationEmail } from "../email/templates.js";
import * as programsRepo from "../programs/repository.js";
import { formatCellValue, withOtherText } from "../registrations/exportService.js";
import type * as registrationsRepo from "../registrations/repository.js";
import { otherTextKey } from "../registrations/validation.js";

const MAX_ANSWER_LENGTH = 300;
const MAX_ANSWERS = 40;

type Program = programsRepo.ProgramRow;
type Registration = registrationsRepo.RegistrationRow;

function appUrl(path: string) {
  return `${env.APP_URL.replace(/\/+$/, "")}${path}`;
}

/** Sends one email to each person on the program's team. Never throws. */
async function emailTeam(program: Program, build: () => { subject: string; html: string }) {
  try {
    const recipients = await programsRepo.listNotificationRecipients(program);
    if (recipients.length === 0) return;
    const { subject, html } = build();
    await Promise.all(recipients.map((r) => sendEmail({ to: r.email, toName: r.name, subject, html })));
  } catch (err) {
    console.error(`Could not send team notification for program ${program.id}:`, err);
  }
}

/** Tells the program's team about a new registration, with the answers the registrant gave. */
export async function notifyNewRegistration(
  program: Program,
  registration: Registration,
  fields: { fieldKey: string; label: string; type: string }[],
  files: { fieldKey: string; filename?: string | null }[],
) {
  if (!program.notifyOnRegistration) return;
  const responses = (registration.responses as Record<string, unknown>) ?? {};

  const answers: { label: string; value: string }[] = [];
  for (const field of fields) {
    if (field.type === "consent") continue;
    const value = field.type.endsWith("_upload")
      ? files
          .filter((f) => f.fieldKey === field.fieldKey)
          .map((f) => f.filename || "file")
          .join(", ")
      : formatCellValue(withOtherText(responses[field.fieldKey], responses[otherTextKey(field.fieldKey)]));
    if (!value) continue;
    answers.push({ label: field.label, value: value.length > MAX_ANSWER_LENGTH ? `${value.slice(0, MAX_ANSWER_LENGTH)}...` : value });
    if (answers.length >= MAX_ANSWERS) break;
  }

  await emailTeam(program, () =>
    newRegistrationNotificationEmail({
      programName: program.name,
      registrationNumber: registration.registrationNumber,
      applicantName: registration.applicantName,
      submittedAt: registration.submittedAt,
      answers,
      detailsUrl: appUrl(`/admin/programs/${program.id}/registrations/${registration.id}`),
      settingsUrl: appUrl(`/admin/programs/${program.id}`),
    }),
  );
}

/** Tells the program's team that a registrant's ID card or ticket was checked in for the first time. */
export async function notifyDocumentVerified(
  program: Program,
  registration: Registration,
  params: { documentType: "id_card" | "ticket"; valid: boolean; verifiedAt: Date; verifiedBy: string | null },
) {
  if (!program.notifyOnVerification) return;
  await emailTeam(program, () =>
    documentVerifiedNotificationEmail({
      programName: program.name,
      documentLabel: params.documentType === "ticket" ? "Ticket" : "ID card",
      registrationNumber: registration.registrationNumber,
      applicantName: registration.applicantName,
      valid: params.valid,
      status: registration.status.replace(/_/g, " "),
      verifiedAt: params.verifiedAt,
      verifiedBy: params.verifiedBy ?? "Someone who wasn't signed in to the program team",
      detailsUrl: appUrl(`/admin/programs/${program.id}/registrations/${registration.id}`),
      settingsUrl: appUrl(`/admin/programs/${program.id}`),
    }),
  );
}
