import * as React from "react";
import { code128, renderTicket, sampleQrMatrix } from "@designs";
import { cn } from "@/lib/utils";
import { DesignSvg } from "../designs/DesignSvg";
import type { TicketConfig } from "./api";

const SAMPLE_QR = sampleQrMatrix();
const SAMPLE_BARCODE = code128("REG-2026-000123");
const SAMPLE_VALUES = ["Freetown", "Youth Leader"];

export interface TicketPreviewContext {
  organizationName: string;
  programName: string;
  programDates?: string;
  shortDescription?: string | null;
  fieldLabels?: string[];
}

/** The ticket exactly as the PDF draws it, filled with a sample registrant. */
export function TicketPreview({
  config,
  context,
  className,
}: {
  config: TicketConfig;
  context: TicketPreviewContext;
  className?: string;
}) {
  const svg = React.useMemo(
    () =>
      renderTicket(
        config.template,
        {
          logo: { image: config.logoUrl ?? null, orgName: context.organizationName, tagline: context.programName },
          kicker: config.kicker || context.organizationName,
          title: config.eventTitle || context.programName,
          subtitle: config.tagline || context.shortDescription || "",
          date: config.eventDate || context.programDates,
          time: config.eventTime || undefined,
          venue: config.venue || undefined,
          participantName: "Jordan Avery",
          registrationNumber: "REG-2026-000123",
          fields: (context.fieldLabels ?? []).map((label, i) => ({ label, value: SAMPLE_VALUES[i] ?? "Sample" })),
          phone: config.contactPhone || undefined,
          website: config.website || undefined,
          terms: config.terms || undefined,
          qr: config.showQrCode ? SAMPLE_QR : null,
          barcode: SAMPLE_BARCODE,
          background: config.template === "custom" ? (config.backgroundImageUrl ?? null) : null,
          textColor: config.textColor,
          overlayOpacity: config.overlayOpacity,
        },
        { primary: config.primaryColor, secondary: config.secondaryColor },
      ),
    [config, context],
  );

  return <DesignSvg svg={svg} label="Ticket preview" className={cn("w-full rounded-xl shadow-lg ring-1 ring-black/5", className)} />;
}
