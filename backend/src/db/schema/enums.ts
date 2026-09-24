import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "program_admin", "viewer"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const programRoleEnum = pgEnum("program_role", ["admin", "viewer"]);
export const emailVerificationPurposeEnum = pgEnum("email_verification_purpose", ["signup", "email_change"]);

export const programStatusEnum = pgEnum("program_status", [
  "draft",
  "published",
  "closed",
  "archived",
]);

export const formStatusEnum = pgEnum("form_status", ["draft", "published", "archived"]);
export const formLayoutModeEnum = pgEnum("form_layout_mode", ["stepped", "single"]);

export const fieldTypeEnum = pgEnum("field_type", [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "date",
  "time",
  "datetime",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "yes_no",
  "image_upload",
  "pdf_upload",
  "document_upload",
  "address",
  "country",
  "gender",
  "date_of_birth",
  "url",
  "currency",
  "rating",
  "consent",
]);

export const registrationStatusEnum = pgEnum("registration_status", [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "waitlisted",
  "cancelled",
]);
