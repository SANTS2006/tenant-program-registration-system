import QRCode from "qrcode";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import * as programsRepo from "../programs/repository.js";
import * as formsRepo from "./repository.js";
import type { UpsertFormInput } from "./schemas.js";

async function getOrCreateDraft(programId: string): Promise<formsRepo.FormRow> {
  const existingDraft = await formsRepo.findDraftForm(programId);
  if (existingDraft) return existingDraft;

  const latestVersion = await formsRepo.getLatestVersionNumber(programId);
  const published = await formsRepo.findPublishedForm(programId);

  const draft = await formsRepo.createDraftForm(programId, latestVersion + 1, {
    title: published?.title ?? "Registration Form",
    description: published?.description ?? undefined,
    instructions: published?.instructions ?? undefined,
    confirmationMessage: published?.confirmationMessage ?? "Thank you for registering!",
    requireConsent: published?.requireConsent ?? false,
    consentText: published?.consentText ?? undefined,
    layoutMode: published?.layoutMode ?? "stepped",
  });

  if (published) {
    await formsRepo.copyFormContent(published.id, draft.id);
  }

  return draft;
}

export async function getAdminForm(programId: string) {
  const draft = await getOrCreateDraft(programId);
  const content = await formsRepo.getContent(draft.id);
  const versions = await formsRepo.listFormVersions(programId);
  return { form: draft, ...content, versions };
}

export async function saveDraft(programId: string, input: UpsertFormInput) {
  const draft = await getOrCreateDraft(programId);

  const fieldKeys = new Set<string>();
  for (const field of input.fields) {
    if (fieldKeys.has(field.fieldKey)) {
      throw AppError.validation(`Duplicate field key: ${field.fieldKey}`);
    }
    fieldKeys.add(field.fieldKey);
  }
  const sectionKeys = new Set(input.sections.map((s) => s.key));
  for (const field of input.fields) {
    if (field.sectionKey && !sectionKeys.has(field.sectionKey)) {
      throw AppError.validation(`Field ${field.fieldKey} references unknown section ${field.sectionKey}`);
    }
  }

  await formsRepo.updateFormMeta(draft.id, {
    title: input.title,
    description: input.description,
    instructions: input.instructions,
    confirmationMessage: input.confirmationMessage,
    requireConsent: input.requireConsent,
    consentText: input.consentText,
    layoutMode: input.layoutMode,
  });
  await formsRepo.replaceDraftContent(draft.id, input.sections, input.fields);

  const content = await formsRepo.getContent(draft.id);
  return {
    form: {
      ...draft,
      title: input.title,
      description: input.description,
      requireConsent: input.requireConsent,
      consentText: input.consentText ?? null,
      layoutMode: input.layoutMode,
    },
    ...content,
  };
}

export async function publishForm(programId: string) {
  const draft = await formsRepo.findDraftForm(programId);
  if (!draft) throw AppError.validation("No draft form to publish");

  const { fields } = await formsRepo.getContent(draft.id);
  if (fields.length === 0) {
    throw AppError.validation("Cannot publish a form with no fields");
  }

  await formsRepo.archivePublishedForm(programId);
  return formsRepo.publishFormRow(draft.id);
}

export async function getPublishedFormWithContent(programId: string) {
  const form = await formsRepo.findPublishedForm(programId);
  if (!form) return null;
  const content = await formsRepo.getContent(form.id);
  return { form, ...content };
}

export async function getFormVersionWithContent(formId: string) {
  const form = await formsRepo.findFormById(formId);
  if (!form) throw AppError.notFound("Form version not found");
  const content = await formsRepo.getContent(form.id);
  return { form, ...content };
}

export async function duplicateFormForProgram(sourceProgramId: string, targetProgramId: string) {
  const source = await formsRepo.findPublishedForm(sourceProgramId) ?? (await formsRepo.findDraftForm(sourceProgramId));
  if (!source) return;

  const draft = await formsRepo.createDraftForm(targetProgramId, 1, {
    title: source.title,
    description: source.description ?? undefined,
    instructions: source.instructions ?? undefined,
    confirmationMessage: source.confirmationMessage ?? undefined,
    requireConsent: source.requireConsent,
    consentText: source.consentText ?? undefined,
    layoutMode: source.layoutMode,
  });
  await formsRepo.copyFormContent(source.id, draft.id);
}

export interface FormShareInfo {
  published: boolean;
  publicUrl: string;
  qrCodeDataUrl: string | null;
}

/**
 * The shareable link is the program's public registration page -- there is one
 * durable link per program (keyed by slug), not a separate one per form version,
 * so republishing a form never breaks a link an admin already shared.
 */
export async function getShareInfo(programId: string): Promise<FormShareInfo> {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");

  const published = await formsRepo.findPublishedForm(programId);
  const publicUrl = `${env.APP_URL}/programs/${program.slug}/register`;

  if (!published || program.status !== "published") {
    return { published: false, publicUrl, qrCodeDataUrl: null };
  }

  const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 320 });
  return { published: true, publicUrl, qrCodeDataUrl };
}
