import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #2563eb");

export const idCardConfigSchema = z.object({
  visibleFields: z.array(z.string()).max(6).default([]),
  primaryColor: hexColor.default("#2563eb"),
  secondaryColor: hexColor.default("#0ea5e9"),
  showQrCode: z.boolean().default(true),
  backgroundImageUrl: z.string().url().optional(),
  photoFieldKey: z.string().optional(),
  // Offer the card on the public registration success page (and allow its public download).
  showOnConfirmation: z.boolean().default(true),
});

export type IdCardConfig = z.infer<typeof idCardConfigSchema>;

export const DEFAULT_ID_CARD_CONFIG: IdCardConfig = {
  visibleFields: [],
  primaryColor: "#2563eb",
  secondaryColor: "#0ea5e9",
  showQrCode: true,
  showOnConfirmation: true,
};
