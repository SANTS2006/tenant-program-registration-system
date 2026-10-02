import { AppError } from "../../lib/errors.js";
import * as formsService from "../forms/service.js";
import type { FieldRow } from "../forms/repository.js";
import * as programsRepo from "../programs/repository.js";
import * as registrationsRepo from "./repository.js";
import { convertCell, importableFields, parseImportFile, suggestMapping, MAX_IMPORT_ROWS } from "./importParser.js";
import { createRegistrationWithNumber } from "./service.js";
import { extractApplicantContact, validateAndNormalizeResponses } from "./validation.js";

const REPORT_LIMIT = 200;
const FILE_TYPES = new Set(["image_upload", "pdf_upload", "document_upload"]);

async function loadProgramForm(programId: string) {
  const program = await programsRepo.findProgramById(programId);
  if (!program) throw AppError.notFound("Program not found");
  const published = await formsService.getPublishedFormWithContent(program.id);
  if (!published) throw AppError.conflict("Publish this program's registration form first. Imported rows are matched to its questions.");
  return { program, published };
}

/** Reads the uploaded document and shows what is in it, with a first guess at which column answers which question. */
export async function previewImport(programId: string, filename: string, content: Buffer) {
  const { published } = await loadProgramForm(programId);
  const table = await parseImportFile(filename, content);
  const fields = importableFields(published.fields);
  return {
    headers: table.headers,
    sampleRows: table.rows.slice(0, 5),
    totalRows: table.rows.length,
    maxRows: MAX_IMPORT_ROWS,
    mapping: suggestMapping(table.headers, fields),
    fields: fields
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((f) => ({ fieldKey: f.fieldKey, label: f.label, type: f.type, required: f.required })),
  };
}

export interface ImportRowIssue {
  /** The row as numbered in the document (the header is row 1). */
  row: number;
  messages: string[];
}

export interface ImportResult {
  dryRun: boolean;
  total: number;
  /** Rows that passed every check (and, unless it was a check only, were saved). */
  valid: number;
  imported: number;
  skipped: ImportRowIssue[];
  errors: ImportRowIssue[];
}

/**
 * Checks every row of the document against the form and, unless `dryRun`, saves the good ones as
 * registrations. Rows with problems are left out and reported; nothing is emailed.
 */
export async function runImport(
  programId: string,
  filename: string,
  content: Buffer,
  mapping: Record<string, string>,
  dryRun: boolean,
): Promise<ImportResult> {
  const { program, published } = await loadProgramForm(programId);
  const table = await parseImportFile(filename, content);

  const fieldsByKey = new Map(importableFields(published.fields).map((f) => [f.fieldKey, f] as const));
  const columns: { index: number; field: FieldRow }[] = [];
  const usedFields = new Set<string>();
  for (const [columnIndex, fieldKey] of Object.entries(mapping)) {
    const index = Number(columnIndex);
    const field = fieldsByKey.get(fieldKey);
    if (!Number.isInteger(index) || index < 0 || index >= table.headers.length || !field) {
      throw AppError.validation("The column matching is not valid. Choose the columns again.");
    }
    if (usedFields.has(fieldKey)) throw AppError.validation(`"${field.label}" is matched to more than one column.`);
    usedFields.add(fieldKey);
    columns.push({ index, field });
  }
  if (columns.length === 0) throw AppError.validation("Match at least one column to a question before importing.");

  // A document can't carry uploaded files, so an upload question never blocks a row.
  const checkFields = published.fields.map((f) => (FILE_TYPES.has(f.type) ? { ...f, required: false } : f));
  const knownEmails = program.oneRegistrationPerEmail ? await registrationsRepo.listRegisteredEmails(program.id) : new Set<string>();

  const result: ImportResult = { dryRun, total: table.rows.length, valid: 0, imported: 0, skipped: [], errors: [] };
  const note = `Imported from ${filename.slice(0, 120)}`;
  const addIssue = (list: ImportRowIssue[], row: number, messages: string[]) => {
    if (list.length < REPORT_LIMIT) list.push({ row, messages });
  };

  for (let i = 0; i < table.rows.length; i++) {
    const rowNumber = i + 2;
    const cells = table.rows[i]!;
    const responses: Record<string, unknown> = {};
    for (const { index, field } of columns) {
      const value = convertCell(field, cells[index] ?? "");
      if (value !== undefined) responses[field.fieldKey] = value;
    }

    let cleaned: Record<string, unknown>;
    try {
      cleaned = validateAndNormalizeResponses(checkFields, responses, [], published.sections);
    } catch (err) {
      const details = err instanceof AppError && Array.isArray(err.details) ? (err.details as string[]) : [err instanceof Error ? err.message : "Invalid row"];
      addIssue(result.errors, rowNumber, details);
      continue;
    }

    const contact = extractApplicantContact(published.fields, cleaned);
    const emailKey = contact.email?.trim().toLowerCase();
    if (program.oneRegistrationPerEmail && emailKey && knownEmails.has(emailKey)) {
      addIssue(result.skipped, rowNumber, [`${contact.email} is already registered for this program`]);
      continue;
    }

    if (dryRun) {
      result.valid++;
      if (program.oneRegistrationPerEmail && emailKey) knownEmails.add(emailKey);
      continue;
    }

    try {
      await createRegistrationWithNumber(program, published.form.id, contact, cleaned, [], note);
      result.valid++;
      result.imported++;
      if (program.oneRegistrationPerEmail && emailKey) knownEmails.add(emailKey);
    } catch (err) {
      addIssue(result.errors, rowNumber, [err instanceof AppError ? err.message : "This row could not be saved"]);
    }
  }
  return result;
}
