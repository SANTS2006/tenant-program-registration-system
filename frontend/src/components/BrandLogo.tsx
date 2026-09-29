import logoUrl from "@/assets/program-registration-logo.webp";
import { cn } from "@/lib/utils";

/** The application logo (151x120), sized by height so its aspect ratio is kept. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt=""
      width={151}
      height={120}
      decoding="async"
      className={cn("h-8 w-auto shrink-0 select-none object-contain", className)}
      draggable={false}
    />
  );
}
