import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ImageIcon, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { listPublicPrograms } from "./api";

function ProgramCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/60">
      <div className="h-40 w-full animate-pulse bg-muted/60" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted/60" />
        <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted/40" />
      </div>
    </div>
  );
}

export function PublicProgramsListPage() {
  const { data, isLoading } = useQuery({ queryKey: ["public-programs"], queryFn: () => listPublicPrograms(1) });

  React.useEffect(() => {
    document.title = "Open Programs - Program Registration";
    document.getElementById("robots-meta")?.setAttribute("content", "index, follow");
  }, []);

  const count = data?.items.length ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-start gap-4 py-4 sm:py-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-brand-soft px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {isLoading ? "Loading programs..." : `${count} program${count === 1 ? "" : "s"} open for registration`}
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Find your next <span className="gradient-text">program</span>
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          Browse currently open programs and submit your registration in just a few minutes.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProgramCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((program) => (
            <Link key={program.id} to={`/programs/${program.slug}`} className="group block h-full">
              <div
                className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-glow-lg"
                style={{
                  backgroundImage:
                    "linear-gradient(hsl(var(--card)), hsl(var(--card))), linear-gradient(135deg, rgba(99,102,241,0.35), rgba(168,85,247,0.35))",
                  backgroundOrigin: "border-box",
                  backgroundClip: "padding-box, border-box",
                }}
              >
                <div className="relative h-40 w-full shrink-0 overflow-hidden bg-gradient-brand-soft">
                  {program.thumbnailUrl ? (
                    <img
                      src={program.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute right-3 top-3">
                    <Badge variant={program.registrationOpen ? "success" : "secondary"}>
                      {program.registrationOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-lg font-semibold leading-tight transition-colors group-hover:text-primary">
                    {program.name}
                  </h3>
                  <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                    {program.shortDescription ?? "No description provided."}
                  </p>
                  <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs font-medium text-muted-foreground">
                    {program.startDate ? (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Starts {new Date(program.startDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="flex items-center gap-1 text-primary transition-all group-hover:gap-1.5">
                      View
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/40 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand-soft text-primary">
            <Search className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium">No programs are currently open for registration.</p>
          <p className="max-w-sm text-sm text-muted-foreground">Check back soon &mdash; new programs open regularly.</p>
        </div>
      )}
    </div>
  );
}
