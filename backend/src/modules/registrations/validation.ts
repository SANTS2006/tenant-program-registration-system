import { AppError } from "../../lib/errors.js";
import type { FieldRow } from "../forms/repository.js";

export interface SubmittedFile {
  fieldKey: string;
  url: string;
  publicId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface ConditionalRule {
  fieldKey: string;
  operator: "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
  value?: string | number | boolean;
}

const FILE_FIELD_TYPES = new Set(["image_upload", "pdf_upload", "document_upload"]);

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function evaluateRule(rule: ConditionalRule, responses: Record<string, unknown>): boolean {
  const actual = responses[rule.fieldKey];
  switch (rule.operator) {
    case "equals":
      // Coerce both sides to string: form values may be booleans/numbers while the
      // admin-configured condition value is always typed in as a string.
      return String(actual) === String(rule.value);
    case "not_equals":
      return String(actual) !== String(rule.value);
    case "contains":
      return Array.isArray(actual) ? actual.includes(rule.value) : String(actual ?? "").includes(String(rule.value ?? ""));
    case "is_empty":
      return isEmptyValue(actual);
    case "is_not_empty":
      return !isEmptyValue(actual);
    default:
      return true;
  }
}

function isFieldVisible(field: FieldRow, responses: Record<string, unknown>): boolean {
  const rules = (field.conditionalLogic as ConditionalRule[] | null) ?? [];
  if (rules.length === 0) return true;
  return rules.every((rule) => evaluateRule(rule, responses));
}

function validateFieldValue(field: FieldRow, value: unknown, errors: string[]): unknown {
  const config = (field.config as Record<string, unknown>) ?? {};
  const label = field.label;

  if (isEmptyValue(value)) {
    if (field.required) errors.push(`${label} is required`);
    return null;
  }

  switch (field.type) {
    case "short_text":
    case "long_text":
    case "address": {
      const str = String(value);
      if (typeof config.minLength === "number" && str.length < config.minLength) {
        errors.push(`${label} must be at least ${config.minLength} characters`);
      }
      if (typeof config.maxLength === "number" && str.length > config.maxLength) {
        errors.push(`${label} must be at most ${config.maxLength} characters`);
      }
      if (typeof config.regex === "string" && config.regex) {
        try {
          if (!new RegExp(config.regex).test(str)) errors.push(`${label} is not in a valid format`);
        } catch {
          /* ignore invalid stored regex */
        }
      }
      return str;
    }
    case "email": {
      const str = String(value);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) errors.push(`${label} must be a valid email address`);
      return str.toLowerCase();
    }
    case "phone": {
      const str = String(value);
      if (!/^[0-9+()\-\s]{6,20}$/.test(str)) errors.push(`${label} must be a valid phone number`);
      return str;
    }
    case "url": {
      const str = String(value);
      try {
        new URL(str);
      } catch {
        errors.push(`${label} must be a valid URL`);
      }
      return str;
    }
    case "number":
    case "currency":
    case "rating": {
      const num = Number(value);
      if (Number.isNaN(num)) {
        errors.push(`${label} must be a number`);
        return null;
      }
      if (typeof config.minNumber === "number" && num < config.minNumber) {
        errors.push(`${label} must be at least ${config.minNumber}`);
      }
      if (typeof config.maxNumber === "number" && num > config.maxNumber) {
        errors.push(`${label} must be at most ${config.maxNumber}`);
      }
      return num;
    }
    case "date":
    case "date_of_birth":
    case "datetime": {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) errors.push(`${label} must be a valid date`);
      return String(value);
    }
    case "time": {
      const str = String(value);
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(str)) errors.push(`${label} must be a valid time (HH:MM)`);
      return str;
    }
    case "single_choice":
    case "dropdown":
    case "gender":
    case "country": {
      const str = String(value);
      const options = config.options as string[] | undefined;
      if (options && options.length > 0 && !options.includes(str)) {
        errors.push(`${label} must be one of the allowed options`);
      }
      return str;
    }
    case "multiple_choice": {
      const arr = Array.isArray(value) ? value.map(String) : [String(value)];
      const options = config.options as string[] | undefined;
      if (options && options.length > 0) {
        for (const item of arr) {
          if (!options.includes(item)) errors.push(`${label} contains an invalid option`);
        }
      }
      return arr;
    }
    case "yes_no": {
      if (typeof value === "boolean") return value;
      if (value === "yes" || value === "true") return true;
      if (value === "no" || value === "false") return false;
      errors.push(`${label} must be yes or no`);
      return null;
    }
    case "consent": {
      if (value !== true && value !== "true") {
        errors.push(`You must agree to ${label}`);
        return false;
      }
      return true;
    }
    case "image_upload":
    case "pdf_upload":
    case "document_upload":
      // handled via the files array, not the responses value
      return value;
    default:
      return value;
  }
}

export function validateAndNormalizeResponses(
  fields: FieldRow[],
  rawResponses: Record<string, unknown>,
  files: SubmittedFile[],
): Record<string, unknown> {
  const errors: string[] = [];
  const cleaned: Record<string, unknown> = {};
  const filesByField = new Map<string, SubmittedFile[]>();
  for (const file of files) {
    filesByField.set(file.fieldKey, [...(filesByField.get(file.fieldKey) ?? []), file]);
  }

  for (const field of fields) {
    const visible = isFieldVisible(field, rawResponses);
    if (!visible) {
      cleaned[field.fieldKey] = null;
      continue;
    }

    if (FILE_FIELD_TYPES.has(field.type)) {
      const uploaded = filesByField.get(field.fieldKey) ?? [];
      if (field.required && uploaded.length === 0) {
        errors.push(`${field.label} requires a file upload`);
      }
      cleaned[field.fieldKey] = uploaded.map((f) => ({ url: f.url, filename: f.filename }));
      continue;
    }

    cleaned[field.fieldKey] = validateFieldValue(field, rawResponses[field.fieldKey], errors);
  }

  if (errors.length > 0) {
    throw AppError.validation("Registration form has validation errors", errors);
  }

  return cleaned;
}

export function extractApplicantContact(
  fields: FieldRow[],
  responses: Record<string, unknown>,
): { name: string | null; email: string | null; phone: string | null } {
  let name: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;

  for (const field of fields) {
    const value = responses[field.fieldKey];
    if (value === null || value === undefined) continue;

    if (field.type === "email" && !email) email = String(value);
    if (field.type === "phone" && !phone) phone = String(value);
    if (!name && field.type === "short_text" && /name/i.test(field.fieldKey)) {
      name = String(value);
    }
  }

  return { name, email, phone };
}
