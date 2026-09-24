import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #2563eb");

export const ticketTemplateValues = ["classic", "modern", "minimal"] as const;

export const ticketConfigSchema = z.object({
  template: z.enum(ticketTemplateValues).default("classic"),
  primaryColor: hexColor.default("#1d4ed8"),
  secondaryColor: hexColor.default("#0ea5e9"),
  // All optional text falls back to the program's own details when blank.
  eventTitle: z.string().trim().max(120).optional(),
  admissionLabel: z.string().trim().max(60).default("General Admission"),
  eventDate: z.string().trim().max(100).optional(),
  venue: z.string().trim().max(200).optional(),
  terms: z.string().trim().max(300).optional(),
  visibleFields: z.array(z.string()).max(3).default([]),
  // An uploaded design sample used as the ticket's background, with program details laid over it.
  backgroundImageUrl: z.string().url().optional(),
  textColor: z.enum(["light", "dark"]).default("light"),
  overlayOpacity: z.number().min(0).max(0.8).default(0.35),
  showQrCode: z.boolean().default(true),
  showOnConfirmation: z.boolean().default(true),
});

export type TicketConfig = z.infer<typeof ticketConfigSchema>;

export function resolveTicketConfig(raw: unknown): TicketConfig {
  const parsed = ticketConfigSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : ticketConfigSchema.parse({});
}
