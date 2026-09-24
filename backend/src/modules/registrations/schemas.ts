import { z } from "zod";
import { paginationSchema } from "../../lib/pagination.js";

export const registrationStatusValues = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "waitlisted",
  "cancelled",
] as const;

export const updateStatusSchema = z.object({
  status: z.enum(registrationStatusValues),
  note: z.string().max(1000).optional(),
});

export const listRegistrationsQuerySchema = paginationSchema.extend({
  status: z.enum(registrationStatusValues).optional(),
  search: z.string().trim().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(["submittedAt", "registrationNumber", "status"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export const exportRegistrationsQuerySchema = z.object({
  format: z.enum(["csv", "xlsx"]).default("csv"),
  status: z.enum(registrationStatusValues).optional(),
  search: z.string().trim().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const submittedFileSchema = z.object({
  fieldKey: z.string().min(1),
  url: z.string().url(),
  publicId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export const submitRegistrationSchema = z.object({
  responses: z.record(z.string(), z.unknown()),
  files: z.array(submittedFileSchema).optional().default([]),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListRegistrationsQuery = z.infer<typeof listRegistrationsQuerySchema>;
export type ExportRegistrationsQuery = z.infer<typeof exportRegistrationsQuerySchema>;
export type SubmitRegistrationInput = z.infer<typeof submitRegistrationSchema>;
