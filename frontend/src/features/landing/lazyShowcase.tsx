import * as React from "react";

// The design samples need the whole card and ticket design library, so they download after the
// rest of the landing page instead of holding up its first paint.
const load = () => import("./designShowcase");

function lazyNamed(name: "HeroTicket" | "HeroIdCard" | "DocumentsShowcase" | "DesignCarousel") {
  return React.lazy(() => load().then((m) => ({ default: m[name] })));
}

const HeroTicketLazy = lazyNamed("HeroTicket");
const HeroIdCardLazy = lazyNamed("HeroIdCard");
const DocumentsShowcaseLazy = lazyNamed("DocumentsShowcase");
const DesignCarouselLazy = lazyNamed("DesignCarousel");

export function HeroTicket() {
  return (
    <React.Suspense fallback={<div className="aspect-[3/1] w-full" />}>
      <HeroTicketLazy />
    </React.Suspense>
  );
}

export function HeroIdCard() {
  return (
    <React.Suspense fallback={<div className="aspect-[300/476] w-full" />}>
      <HeroIdCardLazy />
    </React.Suspense>
  );
}

export function DocumentsShowcase() {
  return (
    <React.Suspense fallback={<div className="mx-auto min-h-[420px] w-full max-w-xl" aria-busy="true" />}>
      <DocumentsShowcaseLazy />
    </React.Suspense>
  );
}

export function DesignCarousel() {
  return (
    <React.Suspense fallback={<div className="min-h-[900px] w-full" aria-busy="true" />}>
      <DesignCarouselLazy />
    </React.Suspense>
  );
}
