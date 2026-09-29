import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, downloadAuthenticatedFile } from "@/lib/api";

interface SubmissionSummary {
  programName: string;
  registrationNumber: string;
  applicantName: string | null;
  status: string;
  submittedAt: string;
  sections: { title: string; rows: { label: string; value: string }[] }[];
}

/** Lets a registrant look over and download (as a PDF) the answers they just submitted. */
export function SubmissionDetails({ token, heading = "Your registration information" }: { token: string; heading?: string }) {
  const [open, setOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const path = `/public/submissions/${encodeURIComponent(token)}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ["submission-summary", token],
    queryFn: () => apiFetch<SubmissionSummary>(path),
    enabled: open,
    staleTime: Infinity,
  });

  const download = async () => {
    setDownloading(true);
    try {
      await downloadAuthenticatedFile(`${path}/pdf`, "Registration.pdf");
    } catch {
      toast.error("The download didn't work. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="w-full max-w-xl rounded-xl border border-border/70 text-left" aria-labelledby="submission-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 id="submission-heading" className="text-sm font-semibold">
            {heading}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="submission-body">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {open ? "Hide" : "View"}
          </Button>
          <Button size="sm" onClick={download} loading={downloading}>
            <FileDown className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {open && (
        <div id="submission-body" className="border-t border-border/70 p-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading your answers...</p>}
          {error && <p className="text-sm text-destructive">We couldn&apos;t load your answers. Please try again later.</p>}
          {data && (
            <div className="flex flex-col gap-5">
              {data.sections.map((section) => (
                <div key={section.title} className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">{section.title}</h3>
                  <dl className="divide-y divide-border/60 rounded-lg border border-border/60">
                    {section.rows.map((row, i) => (
                      <div key={`${row.label}-${i}`} className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[40%_1fr] sm:gap-3">
                        <dt className="text-muted-foreground">{row.label}</dt>
                        <dd className="whitespace-pre-line break-words font-medium">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="border-t border-border/70 px-4 py-2 text-xs text-muted-foreground">
        This page is private to you. Keep the PDF for your records.
      </p>
    </section>
  );
}
