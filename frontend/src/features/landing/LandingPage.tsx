import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutDashboard, Menu, X } from "lucide-react";
import { useAuth } from "@/app/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";
import { IdCardPreview } from "../idcards/IdCardPreview";
import { TicketPreview } from "../tickets/TicketPreview";
import { CountUp, Reveal, Stage } from "./motion";
import {
  CAPABILITIES,
  EXPERIENCE,
  Faq,
  FeaturesGrid,
  Roles,
  SectionHeading,
  Security,
  Spotlights,
  Steps,
  USE_CASES,
} from "./sections";
import {
  DesignCarousel,
  HeroDashboard,
  RegistrationToast,
  SAMPLE_ID_CONTEXT,
  SAMPLE_TICKET_CONTEXT,
  sampleIdCard,
  sampleTicket,
  ShareCardMock,
} from "./visuals";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#designs", label: "Designs" },
  { href: "#analytics", label: "Analytics" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

function AuthButtons({ stacked }: { stacked?: boolean }) {
  const { user } = useAuth();
  if (user) {
    return (
      <LinkButton to="/admin" variant="default" size={stacked ? "lg" : "default"} className="rounded-full">
        <LayoutDashboard className="h-4 w-4" />
        Go to dashboard
      </LinkButton>
    );
  }
  return (
    <div className={cn("flex gap-2", stacked && "flex-col")}>
      <LinkButton to="/login" variant="outline" size={stacked ? "lg" : "default"} className="rounded-full">
        Sign in
      </LinkButton>
      <LinkButton to="/register" variant="default" size={stacked ? "lg" : "default"} className="rounded-full">
        Get started
      </LinkButton>
    </div>
  );
}

function Header() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-300",
        scrolled || open ? "border-b border-border/70 bg-background/80 backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
          <BrandLogo className="h-9" />
          <span className="gradient-text whitespace-nowrap text-base sm:text-lg">Program Registration</span>
        </a>

        <nav className="hidden items-center gap-1 xl:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-gradient-brand-soft hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden sm:block">
            <AuthButtons />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-border/70 px-4 pb-6 pt-3 xl:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-gradient-brand-soft hover:text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 sm:hidden">
            <AuthButtons stacked />
          </div>
        </div>
      )}
    </header>
  );
}

/** Soft blurred color fields drifting behind a section. */
function Orbs({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="float absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div
        className="float absolute right-[-6rem] top-40 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl"
        style={{ "--float-delay": "-3s" } as React.CSSProperties}
      />
      <div
        className="float absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
        style={{ "--float-delay": "-5s" } as React.CSSProperties}
      />
    </div>
  );
}

/** A floating layer in the hero scene: raised to `depth` and bobbing on its own rhythm. */
function Layer({
  depth,
  delay,
  className,
  children,
}: {
  depth: number;
  delay: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("depth absolute", className)} style={{ "--depth": `${depth}px` } as React.CSSProperties}>
      <div className="float" style={{ "--float-delay": `${-delay}s` } as React.CSSProperties}>
        {children}
      </div>
    </div>
  );
}

function Hero() {
  const { user } = useAuth();
  const ticket = React.useMemo(() => sampleTicket("orbit"), []);
  const card = React.useMemo(() => sampleIdCard("aurora"), []);

  return (
    <section id="top" className="relative overflow-hidden">
      <Orbs />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-12 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-20">
        <div className="flex flex-col items-start gap-6">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-brand-soft px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Registration management for every program
            </span>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              From sign-up form to <span className="gradient-text">approved participant</span>, in one place.
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <p className="max-w-xl text-lg text-muted-foreground">
              Build registration forms, share them with a link or QR code, review every application, and issue ID cards
              and tickets from a single, secure workspace for your organization.
            </p>
          </Reveal>
          <Reveal delay={360} className="flex flex-wrap gap-3">
            {user ? (
              <LinkButton to="/admin" variant="default" size="lg" className="h-12 rounded-full px-7">
                <LayoutDashboard className="h-4 w-4" />
                Go to dashboard
              </LinkButton>
            ) : (
              <>
                <LinkButton to="/register" variant="default" size="lg" className="group h-12 rounded-full px-7">
                  Create your account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </LinkButton>
                <LinkButton to="/login" variant="outline" size="lg" className="h-12 rounded-full px-7">
                  Sign in
                </LinkButton>
              </>
            )}
          </Reveal>
          <Reveal delay={480} className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {EXPERIENCE.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </span>
            ))}
          </Reveal>
        </div>

        <Reveal variant="zoom" delay={200}>
          <Stage className="relative">
            <div className="depth" style={{ "--depth": "0px" } as React.CSSProperties}>
              <HeroDashboard />
            </div>
            <Layer depth={90} delay={0} className="-right-3 -top-7 hidden sm:block lg:-right-8">
              <RegistrationToast />
            </Layer>
            <Layer depth={70} delay={2} className="-bottom-10 -left-6 hidden md:block xl:hidden">
              <ShareCardMock />
            </Layer>
            <Layer depth={140} delay={4} className="-right-10 bottom-[-4.5rem] hidden w-72 xl:block">
              <TicketPreview config={ticket} context={SAMPLE_TICKET_CONTEXT} className="shadow-2xl" />
            </Layer>
            <Layer depth={120} delay={1} className="-bottom-16 -left-10 hidden w-28 xl:block">
              <IdCardPreview config={card} context={SAMPLE_ID_CONTEXT} className="shadow-2xl" />
            </Layer>
          </Stage>
        </Reveal>
      </div>
    </section>
  );
}

function CapabilityStrip() {
  return (
    <section className="border-y border-border/70 bg-card/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
        {CAPABILITIES.map((item, i) => (
          <Reveal key={item.label} delay={i * 120} variant="zoom" className="flex flex-col gap-1 text-center">
            <CountUp value={item.value} className="gradient-text text-3xl font-extrabold sm:text-4xl" />
            <span className="text-sm text-muted-foreground">{item.label}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn("relative scroll-mt-20 py-20 sm:py-24", className)}>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">{children}</div>
    </section>
  );
}

function FinalCta() {
  const { user } = useAuth();
  return (
    <section className="px-4 pb-20 sm:px-6">
      <Reveal variant="tilt">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-brand px-6 py-14 text-center text-white shadow-glow-lg sm:px-12">
          <div className="float pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div
            className="float pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10"
            style={{ "--float-delay": "-3s" } as React.CSSProperties}
          />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to open registration?</h2>
            <p className="text-lg text-white/85">
              Create your workspace, build your first form, and share it with applicants today.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {user ? (
                <Link
                  to="/admin"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-blue-700 shadow-lg transition hover:bg-white/90"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-blue-700 shadow-lg transition hover:bg-white/90"
                  >
                    Create your account
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex h-12 items-center rounded-full border border-white/40 px-7 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/70 bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <BrandLogo className="h-9" />
            <span className="gradient-text text-lg">Program Registration</span>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            The all-in-one platform for running program registrations: forms, applicants, documents, and insights.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">Product</p>
          {NAV.slice(0, 6).map((item) => (
            <a key={item.href} href={item.href} className="text-muted-foreground transition-colors hover:text-primary">
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold">Account</p>
          <Link to="/register" className="text-muted-foreground transition-colors hover:text-primary">
            Create an account
          </Link>
          <Link to="/login" className="text-muted-foreground transition-colors hover:text-primary">
            Sign in
          </Link>
          <Link to="/forgot-password" className="text-muted-foreground transition-colors hover:text-primary">
            Reset your password
          </Link>
          <a href="#faq" className="text-muted-foreground transition-colors hover:text-primary">
            FAQ
          </a>
        </div>
      </div>
      <div className="border-t border-border/70 py-5 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Program Registration Platform. All rights reserved.
      </div>
    </footer>
  );
}

export function LandingPage() {
  React.useEffect(() => {
    document.title = "Program Registration Platform | Registration forms, applicants, ID cards and tickets";
    document.getElementById("robots-meta")?.setAttribute("content", "index, follow");
  }, []);

  return (
    <div className="min-h-screen scroll-smooth overflow-x-clip bg-transparent">
      <Header />
      <main>
        <Hero />
        <CapabilityStrip />

        <Section id="features">
          <SectionHeading
            eyebrow="Features"
            title={
              <>
                Everything you need to <span className="gradient-text">run registrations</span>
              </>
            }
            description="One platform for the whole journey, from designing the form to exporting the final list of participants."
          />
          <FeaturesGrid />
        </Section>

        <Section id="how-it-works" className="bg-card/40">
          <SectionHeading
            eyebrow="How it works"
            title="Up and running in four steps"
            description="No installation and no technical setup. If you can fill in a form, you can build one."
          />
          <Steps />
        </Section>

        <Section id="designs" className="overflow-hidden">
          <SectionHeading
            eyebrow="Designs"
            title={
              <>
                ID cards and tickets that look <span className="gradient-text">professionally made</span>
              </>
            }
            description="Pick one of eight two-sided ID card designs or two ticket designs, switch the colors to your brand, and add your logo. Every registrant's document is filled in automatically."
          />
          <Reveal variant="zoom">
            <DesignCarousel />
          </Reveal>
        </Section>

        <Section className="bg-card/40">
          <Spotlights />
        </Section>

        <Section id="teams">
          <SectionHeading
            eyebrow="Teams & roles"
            title="Bring your whole team, with the right access"
            description="Invite colleagues and control, program by program, who can manage and who can only view."
          />
          <Roles />
        </Section>

        <Section id="security" className="bg-card/40">
          <SectionHeading
            eyebrow="Security & privacy"
            title="Built to protect applicant data"
            description="Registrations often include personal details and documents. The platform is designed to keep them private."
          />
          <Security />
        </Section>

        <Section>
          <SectionHeading eyebrow="Who it's for" title="Made for programs of every kind" />
          <div className="flex flex-wrap justify-center gap-3">
            {USE_CASES.map((useCase, i) => (
              <Reveal key={useCase} delay={i * 90} variant="zoom">
                <span className="inline-block rounded-full border border-border/70 bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-glow">
                  {useCase}
                </span>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section id="faq" className="bg-card/40">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          <Faq />
        </Section>

        <div className="pt-20">
          <FinalCta />
        </div>
      </main>
      <Footer />
    </div>
  );
}
