import { apiFetch } from "@/lib/api";

export interface TicketConfig {
  template: string;
  primaryColor: string;
  secondaryColor: string;
  eventTitle?: string;
  tagline?: string;
  kicker?: string;
  admissionLabel: string;
  priceText: string;
  eventDate?: string;
  eventTime?: string;
  venue?: string;
  terms?: string;
  contactPhone?: string;
  website?: string;
  visibleFields: string[];
  logoUrl?: string;
  backgroundImageUrl?: string;
  textColor: "light" | "dark";
  overlayOpacity: number;
  showQrCode: boolean;
  showOnConfirmation: boolean;
}

export interface TicketConfigResponse {
  ticketEnabled: boolean;
  config: TicketConfig;
  organizationName: string;
}

export function getTicketConfig(programId: string) {
  return apiFetch<TicketConfigResponse>(`/programs/${programId}/ticket/config`);
}

export function updateTicketConfig(programId: string, config: TicketConfig) {
  // Blank optional text means "use the program's own details", so don't send empty strings.
  const body = Object.fromEntries(Object.entries(config).filter(([, v]) => v !== "" && v !== undefined));
  return apiFetch<TicketConfig>(`/programs/${programId}/ticket/config`, { method: "PATCH", body });
}
