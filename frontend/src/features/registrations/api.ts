import { apiFetch, downloadAuthenticatedFile } from "@/lib/api";
import type {
  PaginatedResult,
  ProgramStats,
  Registration,
  RegistrationFile,
  RegistrationHistoryEntry,
  RegistrationStatus,
  FormWithContent,
} from "@/types/api";

export interface ListRegistrationsParams {
  page?: number;
  pageSize?: number;
  status?: RegistrationStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "submittedAt" | "registrationNumber" | "status";
  sortDir?: "asc" | "desc";
}

function toQuery(params: object) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const str = query.toString();
  return str ? `?${str}` : "";
}

export function listRegistrations(programId: string, params: ListRegistrationsParams) {
  return apiFetch<PaginatedResult<Registration>>(`/programs/${programId}/registrations${toQuery(params)}`);
}

export interface RegistrationDetail {
  registration: Registration;
  files: RegistrationFile[];
  history: RegistrationHistoryEntry[];
  form: FormWithContent;
}

export function getRegistration(programId: string, registrationId: string) {
  return apiFetch<RegistrationDetail>(`/programs/${programId}/registrations/${registrationId}`);
}

export function updateRegistrationStatus(
  programId: string,
  registrationId: string,
  status: RegistrationStatus,
  note?: string,
) {
  return apiFetch<Registration>(`/programs/${programId}/registrations/${registrationId}/status`, {
    method: "PATCH",
    body: { status, note },
  });
}

export function getProgramStats(programId: string) {
  return apiFetch<ProgramStats>(`/programs/${programId}/registrations/stats`);
}

export interface ExportParams {
  format: "csv" | "xlsx";
  status?: RegistrationStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function exportRegistrations(programId: string, programName: string, params: ExportParams) {
  const query = toQuery(params);
  // The server names the file too; this is only used if its header can't be read.
  const fallbackName = `${programName} ${new Date().toISOString().slice(0, 10)}.${params.format}`;
  return downloadAuthenticatedFile(`/programs/${programId}/registrations/export${query}`, fallbackName);
}

export function downloadRegistrationFile(programId: string, registrationId: string, file: RegistrationFile) {
  return downloadAuthenticatedFile(
    `/programs/${programId}/registrations/${registrationId}/files/${file.id}/download`,
    file.originalFilename,
  );
}

export interface ImportPreview {
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  maxRows: number;
  /** Column number -> question key, as guessed from the header text. */
  mapping: Record<string, string>;
  fields: { fieldKey: string; label: string; type: string; required: boolean }[];
}

export interface ImportRowIssue {
  row: number;
  messages: string[];
}

export interface ImportResult {
  dryRun: boolean;
  total: number;
  valid: number;
  imported: number;
  updated: number;
  willCreate: number;
  willUpdate: number;
  skipped: ImportRowIssue[];
  errors: ImportRowIssue[];
}

export function previewRegistrationImport(programId: string, filename: string, content: string) {
  return apiFetch<ImportPreview>(`/programs/${programId}/registrations/import/preview`, { method: "POST", body: { filename, content } });
}

export type ExistingRows = "skip" | "update" | "update_only";

export function importRegistrations(
  programId: string,
  filename: string,
  content: string,
  mapping: Record<string, string>,
  dryRun: boolean,
  existing: ExistingRows = "skip",
) {
  return apiFetch<ImportResult>(`/programs/${programId}/registrations/import`, {
    method: "POST",
    body: { filename, content, mapping, dryRun, existing },
  });
}
