import type { PublicProgram } from "@/types/api";

/** A business's name and logo at the top of its order page. */
export function BusinessCoverHeader({ business }: { business: NonNullable<PublicProgram["business"]> }) {
  return (
    <div className="flex items-center gap-4 border-b border-border/70 px-6 pb-5 pt-6">
      {business.logoUrl && (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-white">
          <img src={business.logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
        </span>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{business.name}</h1>
        {business.description && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{business.description}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{[business.phone, business.email, business.address].filter(Boolean).join(" · ")}</p>
      </div>
    </div>
  );
}

export function FormCoverHeader({
  name,
  thumbnailUrl,
  description,
}: {
  name: string;
  thumbnailUrl?: string | null;
  description?: string | null;
}) {
  return (
    <div className="flex flex-col">
      {thumbnailUrl && (
        <img src={thumbnailUrl} alt="" className="h-48 w-full rounded-t-xl object-cover sm:h-64" />
      )}
      <div className="flex flex-col gap-2 border-b border-border/70 px-6 pb-5 pt-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
        {description && <p className="whitespace-pre-line text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
