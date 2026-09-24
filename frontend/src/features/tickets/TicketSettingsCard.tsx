import * as React from "react";
import { toast } from "sonner";
import { ImageUp, LayoutTemplate, Ticket, Upload, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Program } from "@/types/api";
import { getAdminForm } from "../form-builder/api";
import { uploadIdCardBackground } from "../idcards/api";
import { ShowOnConfirmationToggle } from "../idcards/IdCardSettingsCard";
import { useUpdateProgram } from "../programs/hooks";
import type { TicketConfig, TicketTemplate } from "./api";
import { useTicketConfig, useUpdateTicketConfig } from "./hooks";
import { TicketPreview } from "./TicketPreview";

const MAX_VISIBLE_FIELDS = 3;

const TEMPLATES: { value: TicketTemplate; label: string; hint: string }[] = [
  { value: "classic", label: "Classic", hint: "Bold gradient" },
  { value: "modern", label: "Modern", hint: "Clean with accent" },
  { value: "minimal", label: "Minimal", hint: "White & outline" },
];

function formatProgramDates(program: Program): string | undefined {
  if (!program.startDate) return undefined;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const start = fmt(program.startDate);
  const end = program.endDate ? fmt(program.endDate) : start;
  return start === end ? start : `${start} – ${end}`;
}

export function TicketSettingsCard({ program }: { program: Program }) {
  const { data, isLoading } = useTicketConfig(program.id);
  const updateConfig = useUpdateTicketConfig(program.id);
  const updateProgram = useUpdateProgram(program.id);
  const [config, setConfig] = React.useState<TicketConfig | null>(null);
  const [availableFields, setAvailableFields] = React.useState<{ fieldKey: string; label: string }[]>([]);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    if (data) setConfig(data.config);
  }, [data]);

  React.useEffect(() => {
    getAdminForm(program.id)
      .then((form) =>
        setAvailableFields(
          form.fields.filter((f) => !f.type.endsWith("_upload")).map((f) => ({ fieldKey: f.fieldKey, label: f.label })),
        ),
      )
      .catch(() => setAvailableFields([]));
  }, [program.id]);

  if (isLoading || !config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tickets</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  const set = (patch: Partial<TicketConfig>) => setConfig((c) => (c ? { ...c, ...patch } : c));
  const programDates = formatProgramDates(program);
  const usingUpload = Boolean(config.backgroundImageUrl);

  const toggleField = (fieldKey: string) => {
    if (config.visibleFields.includes(fieldKey)) {
      set({ visibleFields: config.visibleFields.filter((k) => k !== fieldKey) });
    } else if (config.visibleFields.length >= MAX_VISIBLE_FIELDS) {
      toast.error(`You can show up to ${MAX_VISIBLE_FIELDS} extra fields on the ticket`);
    } else {
      set({ visibleFields: [...config.visibleFields, fieldKey] });
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    try {
      await updateProgram.mutateAsync({ ticketEnabled: checked });
      toast.success(checked ? "Tickets enabled" : "Tickets disabled");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadIdCardBackground(program.id, file);
      set({ backgroundImageUrl: url });
      toast.success("Design uploaded — remember to save");
    } catch {
      toast.error("Failed to upload the ticket design");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(config);
      toast.success("Ticket design saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save ticket design");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-4 w-4 text-primary" />
            Tickets
          </CardTitle>
          <CardDescription>
            Give every registrant a printable ticket with a scannable verification QR code. Start from a template, or
            upload your own ticket design and the system fills in each registrant&apos;s details on it.
          </CardDescription>
        </div>
        <Switch checked={program.ticketEnabled} onCheckedChange={handleToggleEnabled} />
      </CardHeader>

      {program.ticketEnabled && (
        <CardContent className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5">
                <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                Design
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set({ template: t.value, backgroundImageUrl: undefined })}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors",
                      !usingUpload && config.template === t.value
                        ? "border-primary bg-gradient-brand-soft"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.hint}</p>
                  </button>
                ))}
              </div>

              <div
                className={cn(
                  "flex flex-col gap-2 rounded-lg border border-dashed p-3",
                  usingUpload ? "border-primary bg-gradient-brand-soft" : "border-border",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="relative" disabled={uploading}>
                    {usingUpload ? <ImageUp className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Uploading..." : usingUpload ? "Replace design" : "Upload your own design"}
                    <input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 cursor-pointer opacity-0" />
                  </Button>
                  {usingUpload && (
                    <Button variant="ghost" size="sm" onClick={() => set({ backgroundImageUrl: undefined })}>
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a sample ticket image (ideally 7.5 × 3 in, landscape). It becomes the ticket background, and each
                  registrant&apos;s name, program details, number, and QR code are laid over it.
                </p>
                {usingUpload && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Text color</Label>
                      <div className="flex gap-2">
                        {(["light", "dark"] as const).map((tone) => (
                          <Button
                            key={tone}
                            type="button"
                            size="sm"
                            variant={config.textColor === tone ? "default" : "outline"}
                            onClick={() => set({ textColor: tone })}
                          >
                            {tone === "light" ? "Light text" : "Dark text"}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Tint for readability ({Math.round(config.overlayOpacity * 100)}%)</Label>
                      <input
                        type="range"
                        min={0}
                        max={0.8}
                        step={0.05}
                        value={config.overlayOpacity}
                        onChange={(e) => set({ overlayOpacity: Number(e.target.value) })}
                        className="accent-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!usingUpload && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Primary color</Label>
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => set({ primaryColor: e.target.value })}
                    className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Secondary color</Label>
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) => set({ secondaryColor: e.target.value })}
                    className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Event title</Label>
                <Input placeholder={program.name} value={config.eventTitle ?? ""} onChange={(e) => set({ eventTitle: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Admission label</Label>
                <Input
                  placeholder="General Admission"
                  value={config.admissionLabel}
                  onChange={(e) => set({ admissionLabel: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Date &amp; time</Label>
                <Input
                  placeholder={programDates ?? "e.g. Sat, 12 Oct 2026 · 9:00 AM"}
                  value={config.eventDate ?? ""}
                  onChange={(e) => set({ eventDate: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Venue</Label>
                <Input
                  placeholder="e.g. Miatta Conference Hall, Freetown"
                  value={config.venue ?? ""}
                  onChange={(e) => set({ venue: e.target.value })}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">Leave title or date blank to use the program&apos;s own details.</p>

            <div className="flex flex-col gap-1.5">
              <Label>Terms / notes (optional)</Label>
              <Textarea
                rows={2}
                maxLength={300}
                placeholder="e.g. Non-transferable. Present this ticket at the entrance."
                value={config.terms ?? ""}
                onChange={(e) => set({ terms: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Extra fields on ticket (up to {MAX_VISIBLE_FIELDS})</Label>
              <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border/70 p-3">
                {availableFields.length === 0 && (
                  <p className="text-xs text-muted-foreground">No form fields yet. Build the form first.</p>
                )}
                {availableFields.map((field) => (
                  <label key={field.fieldKey} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={config.visibleFields.includes(field.fieldKey)}
                      onCheckedChange={() => toggleField(field.fieldKey)}
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={config.showQrCode} onCheckedChange={(v) => set({ showQrCode: v === true })} />
              Show verification QR code
            </label>

            <ShowOnConfirmationToggle
              id="ticketShowOnConfirmation"
              checked={config.showOnConfirmation}
              onChange={(checked) => set({ showOnConfirmation: checked })}
              thing="ticket"
            />

            <Button onClick={handleSave} disabled={updateConfig.isPending} className="w-fit">
              {updateConfig.isPending ? "Saving..." : "Save ticket design"}
            </Button>
          </div>

          <div className="flex flex-col gap-2 xl:sticky xl:top-20 xl:self-start">
            <p className="text-xs font-medium text-muted-foreground">Live preview</p>
            <TicketPreview config={config} eventTitle={program.name} eventDate={programDates} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
