import { NavLink, Outlet, useOutletContext, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { ProgramStatusBadge } from "@/components/StatusBadge";
import { LinkButton } from "@/components/ui/link-button";
import { useProgram } from "./hooks";
import type { Program } from "@/types/api";

export function useProgramOutletContext() {
  return useOutletContext<{ program: Program }>();
}

const tabs = [
  { to: "", label: "Overview", end: true },
  { to: "form", label: "Form Builder", end: false },
  { to: "analytics", label: "Analytics", end: false },
  { to: "registrations", label: "Registrations", end: false },
];

export function ProgramDetailLayout() {
  const { programId } = useParams<{ programId: string }>();
  const { data: program, isLoading, error } = useProgram(programId);

  if (error) {
    const message =
      error instanceof ApiError && error.statusCode === 403
        ? "You do not have access to this program."
        : "This program could not be found.";
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        <LinkButton to="/admin/programs" variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to programs
        </LinkButton>
      </div>
    );
  }

  if (isLoading || !program) {
    return <p className="text-sm text-muted-foreground">Loading program...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero banner: image container uses `relative` positioning so the name/status
          overlay can be laid on top with `absolute`, anchored to its bottom-left. */}
      <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-border/70 bg-gradient-brand shadow-glow sm:h-52">
        {program.thumbnailUrl ? (
          <img src={program.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-brand">
            <ImageIcon className="h-10 w-10 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow sm:text-3xl">{program.name}</h1>
            <ProgramStatusBadge status={program.status} />
          </div>
          <p className="text-sm text-white/80">/{program.slug}</p>
        </div>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-border/70 bg-card/60 p-1.5 backdrop-blur-sm sm:mx-0">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={`/admin/programs/${programId}${tab.to ? `/${tab.to}` : ""}`}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-brand text-white shadow-glow"
                  : "text-muted-foreground hover:bg-gradient-brand-soft hover:text-primary",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet context={{ program }} />
    </div>
  );
}
