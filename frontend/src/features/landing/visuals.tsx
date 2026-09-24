import * as React from "react";
import { CheckCircle2, GripVertical, ListChecks, QrCode, Users2 } from "lucide-react";
import { DEFAULT_ID_CARD_TERMS, ID_CARD_DESIGNS, idCardDesign, ticketDesign, TICKET_DESIGNS } from "@designs";
import { cn } from "@/lib/utils";
import { IdCardPreview, type IdCardPreviewContext } from "../idcards/IdCardPreview";
import type { IdCardConfig } from "../idcards/api";
import { TicketPreview, type TicketPreviewContext } from "../tickets/TicketPreview";
import type { TicketConfig } from "../tickets/api";
import { Tilt, useScrollProgress } from "./motion";

const BRAND_PRIMARY = "#1d4ed8";
const BRAND_SECONDARY = "#0ea5e9";

export function sampleTicket(template: string): TicketConfig {
  const { defaults } = ticketDesign(template);
  return {
    template,
    primaryColor: defaults.primary,
    secondaryColor: defaults.secondary,
    tagline: "Ideas, people, and partnerships",
    eventDate: "14 Nov 2026",
    eventTime: "09:00 AM - 05:00 PM",
    venue: "City Conference Hall",
    contactPhone: "+232 76 000 000",
    website: "www.brightfutures.org",
    visibleFields: [],
    textColor: "light",
    overlayOpacity: 0.35,
    showQrCode: true,
    showOnConfirmation: true,
  };
}

export function sampleIdCard(template: string): IdCardConfig {
  const { defaults } = idCardDesign(template);
  return {
    template,
    primaryColor: defaults.primary,
    secondaryColor: defaults.secondary,
    roleText: "Participant",
    visibleFields: [],
    showQrCode: true,
    terms: DEFAULT_ID_CARD_TERMS.join("\n"),
    contactPhone: "+232 76 000 000",
    contactEmail: "hello@brightfutures.org",
    contactWebsite: "www.brightfutures.org",
    signatureLabel: "Program Director",
    showOnConfirmation: true,
  };
}

export const SAMPLE_TICKET_CONTEXT: TicketPreviewContext = {
  organizationName: "Bright Futures",
  programName: "Leadership Summit 2026",
};

export const SAMPLE_ID_CONTEXT: IdCardPreviewContext = {
  organizationName: "Bright Futures",
  programName: "Youth Leadership Program",
  fieldLabels: ["District", "Phone"],
  validUntil: "30 Nov 2026",
};

const STATUS_STYLES: Record<string, string> = {
  Approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "Under review": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  Submitted: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
};

function BrowserFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl shadow-blue-500/10", className)}>
      <div className="flex items-center gap-1.5 border-b border-border/70 bg-muted/50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-3 hidden truncate rounded-md bg-background/80 px-3 py-0.5 text-[10px] text-muted-foreground sm:block">
          {typeof window !== "undefined" ? window.location.host : "your-workspace"}/admin
        </span>
      </div>
      {children}
    </div>
  );
}

/** A stylised dashboard: KPI tiles, a weekly chart, and the latest registrations. */
export function HeroDashboard() {
  const bars = [38, 52, 45, 70, 62, 88, 76];
  const rows = [
    { name: "Aminata K.", program: "Youth Service", status: "Approved" },
    { name: "Daniel O.", program: "Scholarship", status: "Under review" },
    { name: "Grace M.", program: "Bootcamp", status: "Submitted" },
  ];
  return (
    <BrowserFrame>
      <div className="grid grid-cols-[44px_1fr] sm:grid-cols-[120px_1fr]">
        <aside className="flex flex-col gap-2 border-r border-border/70 p-2 sm:p-3">
          {["Dashboard", "Programs", "Team", "Settings"].map((item, i) => (
            <div
              key={item}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] font-medium",
                i === 0 ? "bg-gradient-brand text-white" : "text-muted-foreground",
              )}
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-sm", i === 0 ? "bg-white/80" : "bg-muted-foreground/40")} />
              <span className="hidden sm:inline">{item}</span>
            </div>
          ))}
        </aside>
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Registrations", value: "1,284" },
              { label: "Approved", value: "862" },
              { label: "This week", value: "146" },
            ].map((tile) => (
              <div key={tile.label} className="rounded-lg border border-border/70 p-2">
                <p className="truncate text-[9px] uppercase tracking-wide text-muted-foreground">{tile.label}</p>
                <p className="text-sm font-bold sm:text-base">{tile.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border/70 p-3">
            <p className="mb-2 text-[10px] font-semibold text-muted-foreground">Registrations this week</p>
            <div className="flex h-16 items-end gap-1.5 sm:h-20">
              {bars.map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-t-[4px]"
                  style={{ height: `${h}%`, backgroundColor: i === bars.length - 2 ? BRAND_PRIMARY : `${BRAND_SECONDARY}99` }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col divide-y divide-border/70 rounded-lg border border-border/70">
            {rows.map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold">{row.name}</p>
                  <p className="truncate text-[9px] text-muted-foreground">{row.program}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold", STATUS_STYLES[row.status])}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function RegistrationToast({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-xl", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-success text-white">
        <CheckCircle2 className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold">New registration</p>
        <p className="text-[11px] text-muted-foreground">REG-2026-000128 · just now</p>
      </div>
    </div>
  );
}

export function ShareCardMock({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-xl", className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-border/70 bg-white">
        <QrCode className="h-10 w-10 text-slate-900" />
      </span>
      <div>
        <p className="text-xs font-semibold">Share your form</p>
        <p className="text-[11px] text-muted-foreground">Link · QR code · WhatsApp</p>
      </div>
    </div>
  );
}

/** Form builder: sections, draggable fields, and a field-type palette. */
export function FormBuilderMock() {
  const fields = [
    { label: "Full name", type: "Short text", required: true },
    { label: "District", type: "Dropdown", required: true },
    { label: "Chiefdom", type: "Dropdown · depends on District", required: true },
    { label: "Passport photo", type: "Image upload", required: true },
    { label: "Preferred sector", type: "Multiple choice · Other (please specify)", required: false },
  ];
  const palette = ["Short text", "Email", "Phone", "Dropdown", "Date of birth", "File upload", "Yes / No", "Rating"];
  return (
    <BrowserFrame>
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_150px]">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold">Personal information</p>
          {fields.map((field) => (
            <div key={field.label} className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2">
              <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold">
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </p>
                <p className="truncate text-[9px] text-muted-foreground">{field.type}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden flex-col gap-1.5 sm:flex">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Add a field</p>
          {palette.map((item) => (
            <span key={item} className="rounded-md bg-gradient-brand-soft px-2 py-1 text-[10px] font-medium text-primary">
              + {item}
            </span>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

/** An ID card that turns over in 3D as the page scrolls past it, front to back. */
function FlipCard({ template }: { template: string }) {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();
  const config = React.useMemo(() => sampleIdCard(template), [template]);
  // Hold the front, turn through the middle of the scroll, then hold the back.
  const turn = Math.min(1, Math.max(0, (progress - 0.3) / 0.35));
  return (
    <div ref={ref} className="[perspective:1200px]">
      <div
        className="relative w-44 transition-transform duration-150 ease-out [transform-style:preserve-3d] sm:w-52"
        style={{ transform: `rotateY(${turn * 180}deg) rotateZ(-3deg)` }}
      >
        <div className="face">
          <IdCardPreview config={config} context={SAMPLE_ID_CONTEXT} side="front" className="max-w-none" />
        </div>
        <div className="face absolute inset-0 [transform:rotateY(180deg)]">
          <IdCardPreview config={config} context={SAMPLE_ID_CONTEXT} side="back" className="max-w-none" />
        </div>
      </div>
    </div>
  );
}

/** ID card and ticket, drawn by the same renderer the downloads use. */
export function DocumentsShowcase() {
  const ticket = React.useMemo(() => sampleTicket("horizon"), []);
  return (
    <div className="relative mx-auto flex w-full max-w-xl flex-col items-center gap-8">
      <Tilt className="w-full" innerClassName="rounded-xl">
        <TicketPreview config={ticket} context={SAMPLE_TICKET_CONTEXT} />
      </Tilt>
      <div className="flex w-full items-center justify-center gap-6">
        <FlipCard template="business" />
        <p className="hidden max-w-[12rem] text-sm text-muted-foreground sm:block">
          Two-sided ID cards: photo and details on the front, terms, contacts, and QR code on the back.
        </p>
      </div>
    </div>
  );
}

/** Every built-in ID card design on a slowly turning 3D ring, with the ticket designs below. */
export function DesignCarousel() {
  const cards = React.useMemo(() => ID_CARD_DESIGNS.map((d) => ({ id: d.id, name: d.name, config: sampleIdCard(d.id) })), []);
  const tickets = React.useMemo(() => TICKET_DESIGNS.map((d) => ({ id: d.id, name: d.name, config: sampleTicket(d.id) })), []);
  const step = 360 / cards.length;

  return (
    <div className="flex flex-col gap-14">
      <div className="carousel-wrap relative mx-auto h-[330px] w-full overflow-hidden [perspective:1400px] sm:h-[420px]">
        <div className="absolute left-1/2 top-6 h-[270px] w-[170px] -translate-x-1/2 [--radius:230px] sm:h-[330px] sm:w-[208px] sm:[--radius:340px]">
          <div className="carousel-ring relative h-full w-full">
            {cards.map((card, i) => (
              <div
                key={card.id}
                className="carousel-item absolute inset-0 flex flex-col items-center gap-2"
                style={{ "--angle": `${i * step}deg` } as React.CSSProperties}
              >
                <IdCardPreview config={card.config} context={SAMPLE_ID_CONTEXT} className="max-w-none shadow-2xl" />
                <span className="rounded-full bg-card/90 px-3 py-0.5 text-xs font-semibold shadow">{card.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {tickets.map((t) => (
          <Tilt key={t.id} innerClassName="rounded-xl">
            <TicketPreview config={t.config} context={SAMPLE_TICKET_CONTEXT} />
            <p className="mt-2 text-center text-xs font-semibold text-muted-foreground">{t.name} ticket</p>
          </Tilt>
        ))}
      </div>
    </div>
  );
}

/** Analytics: a status breakdown and a per-question chart. */
export function AnalyticsMock() {
  const statuses = [
    { label: "Approved", value: 62, color: "#10b981" },
    { label: "Under review", value: 24, color: "#f59e0b" },
    { label: "Waitlisted", value: 14, color: "#6366f1" },
  ];
  const question = [
    { label: "Education", value: 86 },
    { label: "Health", value: 64 },
    { label: "Agriculture", value: 42 },
    { label: "ICT", value: 38 },
  ];
  return (
    <BrowserFrame>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 p-3">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold">
            <ListChecks className="h-3.5 w-3.5 text-primary" />
            Status breakdown
          </p>
          <div className="flex h-3 overflow-hidden rounded-full">
            {statuses.map((s) => (
              <span key={s.label} style={{ width: `${s.value}%`, backgroundColor: s.color }} className="h-full" />
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {statuses.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border/70 p-3">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold">
            <Users2 className="h-3.5 w-3.5 text-primary" />
            Preferred sector
          </p>
          <div className="flex flex-col gap-2">
            {question.map((q) => (
              <div key={q.label} className="flex items-center gap-2">
                <span className="w-16 shrink-0 truncate text-[10px] text-muted-foreground">{q.label}</span>
                <span className="h-2.5 rounded-r" style={{ width: `${q.value}%`, backgroundColor: BRAND_PRIMARY }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}
