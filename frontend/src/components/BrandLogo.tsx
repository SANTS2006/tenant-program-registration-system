import logoUrl from "@/assets/program-registration-logo.png";
import { cn } from "@/lib/utils";

/** The application logo (900x713 source), sized by height so its aspect ratio is kept. */
export function BrandLogo({ className }: { className?: string }) {
  return <img src={logoUrl} alt="" className={cn("h-8 w-auto shrink-0 select-none object-contain", className)} draggable={false} />;
}
