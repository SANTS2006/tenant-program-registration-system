import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Eye, FileDown, FileText, ImageDown, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch, downloadAuthenticatedFile } from "@/lib/api";
import { printSummary, saveBlob, summaryHtml, summaryImage, type SubmissionSummary } from "./submissionDocument";

/**
 * Lets a registrant (or a customer who placed an order) look over, preview, print, and download the
 * answers they just submitted, as a PDF or a picture. Orders also show their number and status.
 */
export function SubmissionDetails({
  token,
  heading = "Your registration information",
  variant = "registration",
}: {
  token: string;
  heading?: string;
  variant?: "registration" | "order";
}) {
  const isOrder = variant === "order";
  const [open, setOpen] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const [busy, setBusy] = React.useState<"pdf" | "image" | null>(null);
  const path = `/public/submissions/${encodeURIComponent(token)}`;

  const { data, isLoading, error } = useQuery({
    queryKey: ["submission-summary", token],
    queryFn: () => apiFetch<SubmissionSummary>(path),
    // Orders show their number and status straight away; registrations load when opened.
    enabled: open || previewing || isOrder,
    staleTime: isOrder ? 30_000 : Infinity,
  });

  const noun = isOrder ? "Order" : "Registration";
  const fileBase = data ? `${noun}-${data.registrationNumber}`.replace(/[^A-Za-z0-9._-]+/g, "-") : noun;

  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      await downloadAuthenticatedFile(`${path}/pdf`, `${fileBase}.pdf`);
    } catch {
      toast.error("The download didn't work. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const downloadImage = async () => {
    if (!data) return;
    setBusy("image");
    try {
      saveBlob(await summaryImage(data), `${fileBase}.png`);
    } catch {
      toast.error("The picture couldn't be made. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const ready = !!data;

  return (
    <section className="w-full max-w-xl rounded-xl border border-border/70 text-left" aria-labelledby="submission-heading">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="submission-heading" className="text-sm font-semibold">
              {heading}
            </h2>
          </div>
          {isOrder && data && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono font-semibold tracking-wide">{data.registrationNumber}</span>
              <Badge variant="default" aria-label={`Order status: ${data.statusLabel ?? data.status}`}>
                {data.statusLabel ?? data.status}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="submission-body">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {open ? "Hide" : "View"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreviewing(true)} disabled={isOrder && !ready}>
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button variant="outline" size="sm" onClick={() => data && printSummary(data)} disabled={!ready}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" onClick={downloadPdf} loading={busy === "pdf"} disabled={busy !== null}>
            <FileDown className="h-4 w-4" />
            Download PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={downloadImage} loading={busy === "image"} disabled={!ready || busy !== null}>
            <ImageDown className="h-4 w-4" />
            Download image
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
        This page is private to you. Keep a copy for your records.
      </p>

      <Dialog open={previewing} onOpenChange={setPreviewing}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Preview</DialogTitle>
            <DialogDescription>This is how your copy looks when printed or downloaded.</DialogDescription>
          </DialogHeader>
          {data ? (
            <iframe title={`${noun} preview`} srcDoc={summaryHtml(data)} className="h-[60vh] w-full border-t border-border/70 bg-white" />
          ) : (
            <p className="px-6 pb-6 text-sm text-muted-foreground">{error ? "We couldn't load the preview." : "Loading..."}</p>
          )}
          {data && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-6 py-3">
              <Button variant="outline" size="sm" onClick={() => printSummary(data)}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button size="sm" onClick={downloadPdf} loading={busy === "pdf"}>
                <FileDown className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
