import { cn } from "@/lib/utils";

/**
 * Shows markup from the shared design renderer, which escapes every value it draws,
 * so the same SVG that becomes the PDF can be previewed inline.
 */
export function DesignSvg({ svg, label, className }: { svg: string; label: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("overflow-hidden [&>svg]:block [&>svg]:h-auto [&>svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
