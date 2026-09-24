import { z } from "zod";

export const fieldTypeValues = [
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
] as const;

export const fieldConfigSchema = z
  .object({
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(0).optional(),
    minNumber: z.number().optional(),
    maxNumber: z.number().optional(),
    regex: z.string().optional(),
    options: z.array(z.string().min(1)).optional(),
    allowMultiple: z.boolean().optional(),
    maxFileSizeMb: z.number().positive().optional(),
    allowedFileTypes: z.array(z.string()).optional(),
    defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
    currencyCode: z.string().length(3).optional(),
    maxRating: z.number().int().min(2).max(10).optional(),
  })
  .catchall(z.unknown());

export const conditionalRuleSchema = z.object({
  fieldKey: z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains", "is_empty", "is_not_empty"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const sectionInputSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  orderIndex: z.number().int().min(0),
});

export const fieldInputSchema = z.object({
  fieldKey: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, "fieldKey must be lowercase letters, numbers, and underscores only"),
  sectionKey: z.string().min(1).nullable(),
  type: z.enum(fieldTypeValues),
  label: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(1000).optional(),
  required: z.boolean().default(false),
  orderIndex: z.number().int().min(0),
  config: fieldConfigSchema.default({}),
  conditionalLogic: z.array(conditionalRuleSchema).optional(),
});

export const formLayoutModeValues = ["stepped", "single"] as const;

export const upsertFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  instructions: z.string().max(5000).optional(),
  confirmationMessage: z.string().max(2000).optional(),
  requireConsent: z.boolean().default(false),
  consentText: z.string().max(3000).optional(),
  layoutMode: z.enum(formLayoutModeValues).default("stepped"),
  sections: z.array(sectionInputSchema),
  fields: z.array(fieldInputSchema),
});

export type UpsertFormInput = z.infer<typeof upsertFormSchema>;
export type FieldInput = z.infer<typeof fieldInputSchema>;
export type SectionInput = z.infer<typeof sectionInputSchema>;
