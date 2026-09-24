import {
  BarChart3,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileSpreadsheet,
  FileUp,
  Fingerprint,
  GitBranch,
  Hash,
  IdCard,
  KeyRound,
  LayoutTemplate,
  Link2,
  Lock,
  MailCheck,
  Moon,
  QrCode,
  Rocket,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  UserCog,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal, Tilt } from "./motion";
import { AnalyticsMock, DocumentsShowcase, FormBuilderMock } from "./visuals";

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex max-w-2xl flex-col items-center gap-3 text-center", className)}>
      <Reveal>
        <span className="rounded-full bg-gradient-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </span>
      </Reveal>
      <Reveal delay={100}>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      </Reveal>
      {description && (
        <Reveal delay={200}>
          <p className="text-base text-muted-foreground sm:text-lg">{description}</p>
        </Reveal>
      )}
    </div>
  );
}

export const CAPABILITIES = [
  { value: "23", label: "question types, from text to file uploads" },
  { value: "10", label: "ready-made ID card and ticket designs" },
  { value: "3", label: "team roles with per-program access" },
  { value: "Excel", label: "& CSV exports, ready to share" },
];

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Wand2,
    title: "Drag-and-drop form builder",
    description: "Build a registration form for every program with 23 question types, sections, and step-by-step or single-page layouts.",
  },
  {
    icon: GitBranch,
    title: "Smart form logic",
    description: "Show questions only when they apply, narrow choices by earlier answers (like district, then chiefdom), and pre-fill defaults.",
  },
  {
    icon: Link2,
    title: "Shareable links & QR codes",
    description: "Every published program gets its own link and QR code. Share it to WhatsApp, Facebook, X, LinkedIn, or email in one click.",
  },
  {
    icon: FileUp,
    title: "Document uploads",
    description: "Collect photos, certificates, IDs, and CVs with the form, then open or download any file straight from the registration.",
  },
  {
    icon: ClipboardCheck,
    title: "Registration management",
    description: "Search, filter, and move applicants through statuses (submitted, under review, approved, waitlisted) with a full history.",
  },
  {
    icon: IdCard,
    title: "Participant ID cards",
    description: "Choose from eight two-sided card designs in your colors, with each participant's photo, details, and a QR code anyone can scan to verify.",
  },
  {
    icon: Ticket,
    title: "Event tickets",
    description: "Pick a ticket design or upload your own artwork. Each ticket carries the registrant's name, number, barcode, and QR code.",
  },
  {
    icon: Hash,
    title: "Custom registration numbers",
    description: "Choose your own format: a prefix such as NYS, the year, the number length, and where numbering starts.",
  },
  {
    icon: BarChart3,
    title: "Analytics for every question",
    description: "Track daily registrations and statuses, and see how applicants answered each question: choices, ages, numbers, and text.",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel & CSV exports",
    description: "Download every registration, filtered or complete, as a spreadsheet named after the program and date.",
  },
  {
    icon: Users,
    title: "Teams & roles",
    description: "Invite teammates as program admins or viewers and decide exactly which programs each person can see or manage.",
  },
  {
    icon: BellRing,
    title: "Branded email",
    description: "Registrants get a confirmation with their number; your team gets polished invitation, verification, and security emails.",
  },
];

export function FeaturesGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature, i) => (
        <Reveal key={feature.title} delay={(i % 3) * 110} variant="tilt" className="h-full">
          <Tilt className="h-full" innerClassName="h-full rounded-2xl" max={8}>
            <div className="group h-full rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur-sm transition-colors duration-300 hover:border-primary/40 hover:shadow-glow">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-glow transition-transform duration-300 group-hover:scale-110">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          </Tilt>
        </Reveal>
      ))}
    </div>
  );
}

const STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Sparkles,
    title: "Create your account",
    description: "Sign up and verify your email. You become the admin of your own private workspace.",
  },
  {
    icon: LayoutTemplate,
    title: "Build your program",
    description: "Add program details, design the registration form, and set up ID cards or tickets if you need them.",
  },
  {
    icon: Share2,
    title: "Publish & share",
    description: "Publish the form and share its link or QR code wherever your applicants are.",
  },
  {
    icon: Rocket,
    title: "Review & report",
    description: "Review applications as they arrive, update statuses, issue documents, and export your data.",
  },
];

export function Steps() {
  return (
    <ol className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
      <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10 md:block" />
      {STEPS.map((step, i) => (
        <li key={step.title} className="relative">
          <Reveal delay={i * 150} variant="zoom" className="flex flex-col items-center gap-3 text-center">
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow">
            <step.icon className="h-6 w-6" />
            <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-card text-xs font-bold text-primary">
              {i + 1}
            </span>
          </span>
          <h3 className="text-lg font-semibold">{step.title}</h3>
          <p className="max-w-xs text-sm text-muted-foreground">{step.description}</p>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={item}>
          <Reveal delay={i * 80} variant="left" className="flex items-start gap-3 text-sm sm:text-base">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span className="text-muted-foreground">{item}</span>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

function Spotlight({
  id,
  eyebrow,
  title,
  description,
  points,
  visual,
  reverse,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div id={id} className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn("flex flex-col gap-5", reverse && "lg:order-2")}>
        <Reveal variant={reverse ? "right" : "left"}>
          <span className="w-fit rounded-full bg-gradient-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </span>
        </Reveal>
        <Reveal variant={reverse ? "right" : "left"} delay={100}>
          <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h3>
        </Reveal>
        <Reveal variant={reverse ? "right" : "left"} delay={200}>
          <p className="text-base text-muted-foreground sm:text-lg">{description}</p>
        </Reveal>
        <CheckList items={points} />
      </div>
      <Reveal variant="tilt" delay={150} className={cn(reverse && "lg:order-1")}>
        {visual}
      </Reveal>
    </div>
  );
}

export function Spotlights() {
  return (
    <div className="flex flex-col gap-24">
      <Spotlight
        id="form-builder"
        eyebrow="Form builder"
        title="Forms that fit every program, no code required"
        description="Start from a blank form and add exactly the questions you need. Reorder by dragging, group questions into sections, and preview on desktop, tablet, or phone before you publish."
        points={[
          "23 question types: text, email, phone, dates, choices, ratings, currency, file uploads, consent, and more",
          "Conditional questions and dependent choices, e.g. only the chiefdoms of the selected district",
          "Default answers, required fields, length and format rules",
          "“Other (please specify)” answers captured automatically",
          "Consent statement with an “I have read and agree” checkbox before applicants start",
        ]}
        visual={
          <Tilt max={6} innerClassName="rounded-2xl">
            <FormBuilderMock />
          </Tilt>
        }
      />
      <Spotlight
        id="documents"
        eyebrow="ID cards & tickets"
        title="Professional documents, generated for every registrant"
        description="Turn on ID cards or tickets for a program and every registrant gets a ready-to-print PDF, named after them and carrying a QR code that proves it's genuine."
        points={[
          "Eight two-sided ID card designs and two ticket designs, recolored to your brand",
          "Upload your own logo, or your own card or ticket artwork",
          "Participant photos, chosen form answers, venue, dates, terms, and a barcode",
          "Scan any QR code to check a registration's status instantly",
          "Choose whether registrants can download them right after registering",
        ]}
        visual={<DocumentsShowcase />}
        reverse
      />
      <Spotlight
        id="analytics"
        eyebrow="Analytics & exports"
        title="Understand your applicants at a glance"
        description="Every program has its own analytics. See how registrations are trending, where applicants stand, and how they answered each question, then export everything in one click."
        points={[
          "Daily registration trend and status breakdown",
          "Per-question analysis: choices, age groups, number ranges, and common answers",
          "Most common “Other” answers surfaced automatically",
          "Excel and CSV exports with filters by status, date range, and search",
        ]}
        visual={
          <Tilt max={6} innerClassName="rounded-2xl">
            <AnalyticsMock />
          </Tilt>
        }
      />
    </div>
  );
}

const ROLES: { icon: LucideIcon; name: string; summary: string; can: string[] }[] = [
  {
    icon: UserCog,
    name: "Admin",
    summary: "The account owner, with full control of the workspace.",
    can: ["Create and publish programs", "Build forms, ID cards, and tickets", "Manage every registration", "Invite and manage the team"],
  },
  {
    icon: ClipboardCheck,
    name: "Program admin",
    summary: "Runs the programs they're given access to.",
    can: ["Edit assigned programs and forms", "Review and update registrations", "Download documents and exports", "Create new programs"],
  },
  {
    icon: Eye,
    name: "Viewer",
    summary: "Read-only access for stakeholders.",
    can: ["View assigned programs", "Browse registrations and files", "See analytics", "Export registrations"],
  },
];

export function Roles() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {ROLES.map((role, i) => (
        <Reveal key={role.name} delay={i * 130} className="h-full">
        <div className="flex h-full flex-col gap-4 rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm transition-shadow duration-300 hover:shadow-glow">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand-soft text-primary">
              <role.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold">{role.name}</h3>
              <p className="text-xs text-muted-foreground">{role.summary}</p>
            </div>
          </div>
          <CheckList items={role.can} />
        </div>
        </Reveal>
      ))}
    </div>
  );
}

const SECURITY: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Lock,
    title: "Private workspaces",
    description: "Each account's programs, registrations, and team are completely separate from every other account.",
  },
  {
    icon: MailCheck,
    title: "Verified email addresses",
    description: "New accounts and email changes are confirmed with a one-time code sent to the inbox.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    description: "People only see, and can only change, what their role and program access allow.",
  },
  {
    icon: KeyRound,
    title: "Secure sign-in",
    description: "Strong password hashing, short-lived sessions, and self-service password reset by email.",
  },
  {
    icon: Fingerprint,
    title: "Verifiable documents",
    description: "QR codes on ID cards and tickets link to a live verification page for each registration.",
  },
  {
    icon: Download,
    title: "Your data, exportable",
    description: "Export registrations at any time and download every uploaded file from its registration.",
  },
];

export function Security() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {SECURITY.map((item, i) => (
        <Reveal key={item.title} delay={(i % 3) * 110} variant="zoom" className="h-full">
        <div className="flex h-full gap-4 rounded-2xl border border-border/70 bg-card/60 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand-soft text-primary">
            <item.icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </div>
        </div>
        </Reveal>
      ))}
    </div>
  );
}

export const USE_CASES = [
  "National & youth service programs",
  "Scholarships & grants",
  "Training & bootcamps",
  "Conferences & events",
  "Recruitment drives",
  "Community & NGO programs",
];

export const EXPERIENCE: { icon: LucideIcon; label: string }[] = [
  { icon: Smartphone, label: "Works on any phone" },
  { icon: Moon, label: "Light & dark mode" },
  { icon: QrCode, label: "Scan-to-register" },
];

const FAQS = [
  {
    q: "Who can see the registrations we collect?",
    a: "Only the people in your account you've given access to, plus the platform administrators who run the service. Every account is a private workspace, and other organizations on the platform can't see your programs, registrations, or team.",
  },
  {
    q: "Can applicants register from their phones?",
    a: "Yes. Registration forms are fully mobile-friendly, support file and photo uploads from the phone, and follow the device's light or dark mode.",
  },
  {
    q: "Can we run several programs at the same time?",
    a: "Yes. Each program has its own form, link, QR code, registration numbers, ID cards, tickets, analytics, and exports.",
  },
  {
    q: "What kinds of questions can a form include?",
    a: "23 types: short and long text, email, phone, numbers, currency, ratings, dates and times, date of birth, single and multiple choice, dropdowns, yes/no, country, gender, address, website links, consent, and image, PDF, or document uploads.",
  },
  {
    q: "How do ID card and ticket QR codes work?",
    a: "Each code links to a verification page for that registration. Scanning it shows who it belongs to and whether the registration is still valid.",
  },
  {
    q: "How do I give my team access?",
    a: "Invite teammates from the Team page as a program admin or viewer. They receive an email with their sign-in details, and you choose which programs each person can access.",
  },
  {
    q: "Can I get my data out?",
    a: "Anytime. Export registrations to Excel or CSV, either all of them or filtered by status, date, or search, and download any uploaded file.",
  },
];

export function Faq() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      {FAQS.map((item, i) => (
        <Reveal key={item.q} delay={i * 70}>
        <details
          className="group rounded-2xl border border-border/70 bg-card/80 px-5 py-4 shadow-sm open:border-primary/40 open:shadow-glow"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
            {item.q}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-brand-soft text-primary transition-transform duration-200 group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </details>
        </Reveal>
      ))}
    </div>
  );
}
