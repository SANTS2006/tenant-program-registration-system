import { QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketConfig } from "./api";

/** A CSS approximation of the generated PDF ticket (7.5in x 3in, stub on the right). */
export function TicketPreview({
  config,
  eventTitle,
  eventDate,
}: {
  config: TicketConfig;
  eventTitle: string;
  eventDate?: string;
}) {
  const hasImage = Boolean(config.backgroundImageUrl);
  const light = hasImage ? config.textColor === "light" : config.template === "classic";

  const background = hasImage
    ? { backgroundImage: `url(${config.backgroundImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : config.template === "classic"
      ? { backgroundImage: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})` }
      : { backgroundColor: "#ffffff" };

  const text = light ? "text-white" : "text-slate-900";
  const muted = light ? "text-white/75" : "text-slate-500";
  const accent = hasImage || light ? undefined : config.primaryColor;
  const date = config.eventDate || eventDate;

  return (
    <div
      className={cn(
        "relative flex w-full overflow-hidden rounded-xl shadow-lg",
        !hasImage && config.template === "minimal" && "border-2",
      )}
      style={{ aspectRatio: "540 / 216", ...background, borderColor: config.primaryColor }}
    >
      {hasImage && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: light ? "#0f172a" : "#ffffff", opacity: config.overlayOpacity }}
        />
      )}
      {!hasImage && config.template === "modern" && (
        <div
          className="absolute inset-y-0 left-0 w-[1.5%]"
          style={{ backgroundImage: `linear-gradient(180deg, ${config.primaryColor}, ${config.secondaryColor})` }}
        />
      )}

      <div className={cn("relative flex flex-1 flex-col justify-between p-[4%]", text)}>
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: accent }}>
            {config.admissionLabel || "General Admission"}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-bold leading-tight">{config.eventTitle || eventTitle}</p>
        </div>
        <div>
          <p className={cn("text-[7px] font-bold uppercase tracking-wider", muted)}>Issued to</p>
          <p className="text-[11px] font-semibold">Jordan Avery</p>
        </div>
        <div className="flex gap-4">
          {date && (
            <div className="min-w-0">
              <p className={cn("text-[7px] font-bold uppercase tracking-wider", muted)}>Date</p>
              <p className="truncate text-[9px]">{date}</p>
            </div>
          )}
          {config.venue && (
            <div className="min-w-0">
              <p className={cn("text-[7px] font-bold uppercase tracking-wider", muted)}>Venue</p>
              <p className="truncate text-[9px]">{config.venue}</p>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative flex w-[28%] flex-col items-center justify-center gap-1 border-l-2 border-dashed",
          light ? "border-white/60" : "border-slate-300",
          !hasImage && config.template === "classic" && "bg-white/10",
          !hasImage && config.template === "modern" && "bg-slate-50",
          text,
        )}
      >
        <span className="absolute -top-2 left-[-9px] h-4 w-4 rounded-full bg-background" />
        <span className="absolute -bottom-2 left-[-9px] h-4 w-4 rounded-full bg-background" />
        <p className="text-[7px] font-bold uppercase tracking-[0.2em]">Admit one</p>
        {config.showQrCode && (
          <div className="rounded-md bg-white p-1">
            <QrCode className="h-9 w-9 text-slate-900" />
          </div>
        )}
        <p className="text-[7px] font-semibold">REG-2026-000123</p>
      </div>
    </div>
  );
}
