import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { registrationStatusEnum } from "./enums";
import { programs } from "./programs";
import { forms } from "./forms";
import { users } from "./users";

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "restrict" }),
    registrationNumber: text("registration_number").notNull(),
    status: registrationStatusEnum("status").notNull().default("submitted"),
    applicantName: text("applicant_name"),
    applicantEmail: text("applicant_email"),
    applicantPhone: text("applicant_phone"),
    responses: jsonb("responses").notNull().default({}),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    unique("registrations_program_number_unique").on(table.programId, table.registrationNumber),
    index("registrations_program_status_idx").on(table.programId, table.status),
    index("registrations_program_submitted_idx").on(table.programId, table.submittedAt),
    index("registrations_email_idx").on(table.applicantEmail),
    index("registrations_phone_idx").on(table.applicantPhone),
  ],
);

export const registrationFiles = pgTable(
  "registration_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    cloudinaryPublicId: text("cloudinary_public_id").notNull(),
    secureUrl: text("secure_url").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("registration_files_registration_id_idx").on(table.registrationId)],
);

export const registrationStatusHistory = pgTable(
  "registration_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    fromStatus: registrationStatusEnum("from_status"),
    toStatus: registrationStatusEnum("to_status").notNull(),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("registration_status_history_registration_id_idx").on(table.registrationId)],
);
