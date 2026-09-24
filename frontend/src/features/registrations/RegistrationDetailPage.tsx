import * as React from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegistrationStatusBadge } from "@/components/StatusBadge";
import { ApiError } from "@/lib/api";
import { useProgramOutletContext } from "../programs/ProgramDetailLayout";
import { downloadIdCard } from "./api";
import { useRegistration, useUpdateRegistrationStatus } from "./hooks";
import type { RegistrationStatus } from "@/types/api";

const STATUS_OPTIONS: RegistrationStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "waitlisted",
  "cancelled",
];

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object") {
      return value.map((v: { filename?: string }) => v.filename ?? "file").join(", ");
    }
    return value.join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function RegistrationDetailPage() {
  const { program } = useProgramOutletContext();
  const { registrationId } = useParams<{ registrationId: string }>();
  const { data, isLoading } = useRegistration(program.id, registrationId);
  const updateStatus = useUpdateRegistrationStatus(program.id, registrationId ?? "");
  const [nextStatus, setNextStatus] = React.useState<RegistrationStatus | "">("");
  const [note, setNote] = React.useState("");
  const [downloadingCard, setDownloadingCard] = React.useState(false);

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading registration...</p>;

  const handleDownloadIdCard = async () => {
    setDownloadingCard(true);
    try {
      await downloadIdCard(program.id, data.registration.id, data.registration.registrationNumber);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to download ID card");
    } finally {
      setDownloadingCard(false);
    }
  };

  const { registration, files, history, form } = data;
  const fieldsByKey = new Map(form.fields.map((f) => [f.fieldKey, f]));

  const handleUpdateStatus = async () => {
    if (!nextStatus) return;
    try {
      await updateStatus.mutateAsync({ status: nextStatus, note: note || undefined });
      toast.success("Status updated");
      setNote("");
      setNextStatus("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{registration.registrationNumber}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Submitted {new Date(registration.submittedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {program.idCardEnabled && (
                <Button variant="outline" size="sm" onClick={handleDownloadIdCard} disabled={downloadingCard}>
                  <CreditCard className="h-4 w-4" />
                  {downloadingCard ? "Preparing..." : "ID Card"}
                </Button>
              )}
              <RegistrationStatusBadge status={registration.status} />
            </div>
          </CardHeader>
          <CardContent>
            {form.sections
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((section) => (
                <div key={section.id} className="mt-6 first:mt-0">
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{section.title}</h3>
                  <ResponseGroup
                    fields={form.fields.filter((f) => f.sectionId === section.id)}
                    responses={registration.responses}
                    files={files}
                  />
                </div>
              ))}
            {(() => {
              const unassigned = form.fields.filter((f) => !f.sectionId);
              return unassigned.length > 0 ? (
                <div className="mt-6">
                  {form.sections.length > 0 && <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Other</h3>}
                  <ResponseGroup fields={unassigned} responses={registration.responses} files={files} />
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as RegistrationStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose new status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            <Button onClick={handleUpdateStatus} disabled={!nextStatus || updateStatus.isPending}>
              {updateStatus.isPending ? "Updating..." : "Update status"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {history.map((entry) => (
              <div key={entry.id} className="border-l-2 border-border pl-3 text-sm">
                <p className="font-medium">
                  {entry.fromStatus ? `${entry.fromStatus} → ${entry.toStatus}` : entry.toStatus}
                </p>
                {entry.note && <p className="text-muted-foreground">{entry.note}</p>}
                <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResponseGroup({
  fields,
  responses,
  files,
}: {
  fields: { fieldKey: string; label: string }[];
  responses: Record<string, unknown>;
  files: { fieldKey: string; secureUrl: string; originalFilename: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const fileMatches = files.filter((f) => f.fieldKey === field.fieldKey);
        return (
          <div key={field.fieldKey}>
            <dt className="text-xs uppercase text-muted-foreground">{field.label}</dt>
            {fileMatches.length > 0 ? (
              <dd className="flex flex-col gap-1 text-sm">
                {fileMatches.map((f) => (
                  <a key={f.secureUrl} href={f.secureUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                    {f.originalFilename}
                  </a>
                ))}
              </dd>
            ) : (
              <dd className="text-sm">{formatValue(responses[field.fieldKey])}</dd>
            )}
          </div>
        );
      })}
    </div>
  );
}
