import { NavLink, useOutletContext, useParams } from "react-router-dom";
import { ArrowLeft, Vote } from "lucide-react";
import { LazyOutlet } from "@/components/PageLoading";
import { LinkButton } from "@/components/ui/link-button";
import { ApiError } from "@/lib/api";
import { usePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { Poll } from "./api";
import { usePoll } from "./hooks";
import { PollStateBadge } from "./PollsListPage";

export function usePollOutletContext() {
  return useOutletContext<{ poll: Poll }>();
}

const tabs = [
  { to: "", label: "Overview", end: true },
  { to: "ballot", label: "Ballot", end: false },
  { to: "results", label: "Results", end: false },
  { to: "voters", label: "Voters", end: false },
];

export function PollDetailLayout() {
  const { pollId } = useParams<{ pollId: string }>();
  const { data: poll, isLoading, error } = usePoll(pollId);
  usePageMeta({ title: poll?.name ?? "Poll" });

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          {error instanceof ApiError && error.statusCode === 403 ? "You do not have access to this poll." : "This poll could not be found."}
        </p>
        <LinkButton to="/admin/polls" variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Back to polls
        </LinkButton>
      </div>
    );
  }
  if (isLoading || !poll) return <p className="text-sm text-muted-foreground">Loading poll...</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-border/70 bg-gradient-brand shadow-glow sm:h-44">
        {poll.imageUrl ? (
          <img src={poll.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-start justify-end p-5">
            <Vote className="h-12 w-12 text-white/30" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow sm:text-3xl">{poll.name}</h1>
            <PollStateBadge state={poll.state} />
          </div>
          <p className="text-sm text-white/80">/vote/{poll.slug}</p>
        </div>
      </div>

      <nav aria-label="Poll sections" className="-mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-border/70 bg-card/60 p-1.5 backdrop-blur-sm sm:mx-0">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={`/admin/polls/${poll.id}${tab.to ? `/${tab.to}` : ""}`}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                isActive ? "bg-gradient-brand text-white shadow-glow" : "text-muted-foreground hover:bg-gradient-brand-soft hover:text-primary",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <LazyOutlet context={{ poll }} />
    </div>
  );
}
