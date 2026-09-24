import { QrCode, User } from "lucide-react";
import type { IdCardConfig } from "./api";

export interface IdCardPreviewData {
  programName: string;
  applicantName: string;
  registrationNumber: string;
  extraFields: { label: string; value: string }[];
  validUntil?: string;
}

const SAMPLE_DATA: IdCardPreviewData = {
  programName: "Sample Program",
  applicantName: "Jordan Avery",
  registrationNumber: "REG-2026-000123",
  extraFields: [
    { label: "Country", value: "United States" },
    { label: "Role", value: "Participant" },
  ],
};

export function IdCardPreview({
  config,
  data = SAMPLE_DATA,
  hasPhoto = true,
  className,
}: {
  config: IdCardConfig;
  data?: IdCardPreviewData;
  hasPhoto?: boolean;
  className?: string;
}) {
  const showPhoto = hasPhoto && !!config.photoFieldKey;

  return (
    <div
      className={`relative aspect-[1.586/1] w-full max-w-sm overflow-hidden rounded-xl shadow-lg ${className ?? ""}`}
      style={{
        backgroundImage: config.backgroundImageUrl
          ? `linear-gradient(rgba(15,23,42,0.38), rgba(15,23,42,0.38)), url(${config.backgroundImageUrl})`
          : `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10" />

      <div className="relative flex h-full flex-col p-4 text-white">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wide">{data.programName}</p>
          {showPhoto && (
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-white/20">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>

        <p className="mt-2 text-lg font-bold leading-tight">{data.applicantName}</p>
        <p className="text-xs text-white/90">Reg #: {data.registrationNumber}</p>

        <div className="mt-1.5 flex flex-col gap-0.5">
          {data.extraFields.slice(0, 3).map((f) => (
            <p key={f.label} className="text-[10px] text-white/85">
              {f.label}: {f.value}
            </p>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between">
          {data.validUntil ? (
            <p className="text-[9px] text-white/75">Valid until {data.validUntil}</p>
          ) : (
            <span />
          )}
          {config.showQrCode && (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-slate-800">
              <QrCode className="h-6 w-6" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
