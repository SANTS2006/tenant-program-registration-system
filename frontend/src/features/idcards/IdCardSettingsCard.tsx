import * as React from "react";
import { toast } from "sonner";
import { CreditCard, ImageUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { getAdminForm } from "../form-builder/api";
import { useUpdateProgram } from "../programs/hooks";
import { useIdCardConfig, useUpdateIdCardConfig } from "./hooks";
import { uploadIdCardBackground, type IdCardConfig } from "./api";
import { IdCardPreview } from "./IdCardPreview";
import type { FieldType } from "@/types/api";

const MAX_VISIBLE_FIELDS = 4;

interface AvailableField {
  fieldKey: string;
  label: string;
  type: FieldType;
}

export function IdCardSettingsCard({ programId, idCardEnabled }: { programId: string; idCardEnabled: boolean }) {
  const { data, isLoading } = useIdCardConfig(programId);
  const updateConfig = useUpdateIdCardConfig(programId);
  const updateProgram = useUpdateProgram(programId);
  const [config, setConfig] = React.useState<IdCardConfig | null>(null);
  const [availableFields, setAvailableFields] = React.useState<AvailableField[]>([]);
  const [uploadingBg, setUploadingBg] = React.useState(false);

  React.useEffect(() => {
    if (data) setConfig(data.config);
  }, [data]);

  React.useEffect(() => {
    getAdminForm(programId)
      .then((form) => setAvailableFields(form.fields.map((f) => ({ fieldKey: f.fieldKey, label: f.label, type: f.type }))))
      .catch(() => setAvailableFields([]));
  }, [programId]);

  if (isLoading || !config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ID Card</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading...</CardContent>
      </Card>
    );
  }

  const photoFields = availableFields.filter((f) => f.type === "image_upload");

  const toggleField = (fieldKey: string) => {
    setConfig((c) => {
      if (!c) return c;
      const has = c.visibleFields.includes(fieldKey);
      if (has) return { ...c, visibleFields: c.visibleFields.filter((k) => k !== fieldKey) };
      if (c.visibleFields.length >= MAX_VISIBLE_FIELDS) {
        toast.error(`You can show up to ${MAX_VISIBLE_FIELDS} extra fields on the card`);
        return c;
      }
      return { ...c, visibleFields: [...c.visibleFields, fieldKey] };
    });
  };

  const handleToggleEnabled = async (checked: boolean) => {
    try {
      await updateProgram.mutateAsync({ idCardEnabled: checked });
      toast.success(checked ? "ID cards enabled" : "ID cards disabled");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update");
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const url = await uploadIdCardBackground(programId, file);
      setConfig((c) => (c ? { ...c, backgroundImageUrl: url } : c));
      toast.success("Background uploaded — remember to save");
    } catch {
      toast.error("Failed to upload background image");
    } finally {
      setUploadingBg(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      await updateConfig.mutateAsync(config);
      toast.success("ID card design saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save ID card design");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" />
            ID Card
          </CardTitle>
          <CardDescription>
            Design a printable participant ID card with a photo and a scannable QR code. Upload your own background
            design, or leave it blank to use the gradient theme below.
          </CardDescription>
        </div>
        <Switch checked={idCardEnabled} onCheckedChange={handleToggleEnabled} />
      </CardHeader>
      {idCardEnabled && (
        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Primary color</Label>
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig((c) => (c ? { ...c, primaryColor: e.target.value } : c))}
                  className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Secondary color</Label>
                <input
                  type="color"
                  value={config.secondaryColor}
                  onChange={(e) => setConfig((c) => (c ? { ...c, secondaryColor: e.target.value } : c))}
                  className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Custom background design (optional)</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="relative" disabled={uploadingBg}>
                  <ImageUp className="h-4 w-4" />
                  {uploadingBg ? "Uploading..." : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </Button>
                {config.backgroundImageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfig((c) => (c ? { ...c, backgroundImageUrl: undefined } : c))}
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a card design (e.g. a branded template). The system overlays each participant's name,
                registration number, photo, and QR code on top of it automatically.
              </p>
            </div>

            {photoFields.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label>Participant photo field</Label>
                <Select
                  value={config.photoFieldKey ?? "none"}
                  onValueChange={(v) => setConfig((c) => (c ? { ...c, photoFieldKey: v === "none" ? undefined : v } : c))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No photo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No photo</SelectItem>
                    {photoFields.map((f) => (
                      <SelectItem key={f.fieldKey} value={f.fieldKey}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Add an "Image Upload" field to your form (e.g. "Photo") for this to populate.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="showQrCode"
                checked={config.showQrCode}
                onCheckedChange={(v) => setConfig((c) => (c ? { ...c, showQrCode: v === true } : c))}
              />
              <Label htmlFor="showQrCode" className="font-normal">
                Show verification QR code
              </Label>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Extra fields on card (up to {MAX_VISIBLE_FIELDS})</Label>
              <div className="flex flex-col gap-1.5 rounded-lg border border-border/70 p-3">
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

            <Button onClick={handleSave} disabled={updateConfig.isPending} className="w-fit">
              {updateConfig.isPending ? "Saving..." : "Save ID card design"}
            </Button>
          </div>

          <div className="flex flex-col items-center gap-2 lg:sticky lg:top-20 lg:self-start">
            <p className="text-xs font-medium text-muted-foreground">Live preview</p>
            <IdCardPreview config={config} hasPhoto={photoFields.length > 0} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
