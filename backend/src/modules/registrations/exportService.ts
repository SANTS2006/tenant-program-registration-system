import ExcelJS from "exceljs";
import * as formsRepo from "../forms/repository.js";
import type { RegistrationFilters, RegistrationRow } from "./repository.js";
import { listRegistrationsForExport } from "./repository.js";

export type ExportFormat = "csv" | "xlsx";

interface ExportColumn {
  key: string;
  label: string;
}

const BUILT_IN_COLUMNS: ExportColumn[] = [
  { key: "registrationNumber", label: "Registration Number" },
  { key: "status", label: "Status" },
  { key: "submittedAt", label: "Submitted At" },
  { key: "applicantName", label: "Name" },
  { key: "applicantEmail", label: "Email" },
  { key: "applicantPhone", label: "Phone" },
];

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object") {
      return value.map((v: { filename?: string; url?: string }) => v.filename ?? v.url ?? "file").join("; ");
    }
    return value.join("; ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function buildFieldColumns(programId: string): Promise<ExportColumn[]> {
  const versions = await formsRepo.listFormVersions(programId);
  const { fields } = await formsRepo.getContentForForms(versions.map((v) => v.id));

  const labelByKey = new Map<string, string>();
  // Versions are returned newest-first; iterate in reverse so the most recent
  // label for a given key wins without needing an extra sort pass.
  for (const field of [...fields].reverse()) {
    labelByKey.set(field.fieldKey, field.label);
  }

  return [...labelByKey.entries()].map(([key, label]) => ({ key, label }));
}

async function buildRows(programId: string, filters: RegistrationFilters) {
  const [registrationsList, fieldColumns] = await Promise.all([
    listRegistrationsForExport(programId, filters),
    buildFieldColumns(programId),
  ]);

  const columns = [...BUILT_IN_COLUMNS, ...fieldColumns];

  const rows = registrationsList.map((registration: RegistrationRow) => {
    const responses = (registration.responses as Record<string, unknown>) ?? {};
    const row: Record<string, string> = {
      registrationNumber: registration.registrationNumber,
      status: registration.status,
      submittedAt: registration.submittedAt.toISOString(),
      applicantName: registration.applicantName ?? "",
      applicantEmail: registration.applicantEmail ?? "",
      applicantPhone: registration.applicantPhone ?? "",
    };
    for (const field of fieldColumns) {
      row[field.key] = formatCellValue(responses[field.key]);
    }
    return row;
  });

  return { columns, rows };
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function generateCsvExport(programId: string, filters: RegistrationFilters): Promise<string> {
  const { columns, rows } = await buildRows(programId, filters);
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key] ?? "")).join(","));
  return [header, ...lines].join("\r\n");
}

export async function generateXlsxExport(programId: string, filters: RegistrationFilters): Promise<Buffer> {
  const { columns, rows } = await buildRows(programId, filters);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Registrations");

  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: Math.max(14, c.label.length + 4) }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };
  sheet.addRows(rows);
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
