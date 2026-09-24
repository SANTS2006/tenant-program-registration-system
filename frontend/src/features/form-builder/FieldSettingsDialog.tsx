import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { DefaultValueEditor, DependentOptionsEditor } from "./FieldAdvancedSettings";
import { metaFor } from "./fieldTypes";
import type { EditableField } from "./types";
import { slugifyKey } from "@/lib/utils";

const FILE_TYPE_PRESETS: Record<string, string[]> = {
  image_upload: ["image/jpeg", "image/png", "image/webp"],
  pdf_upload: ["application/pdf"],
  document_upload: ["application/pdf", "application/msword", "image/jpeg", "image/png"],
};

export function FieldSettingsDialog({
  field,
  otherFields,
  usedKeys,
  onSave,
  onClose,
}: {
  field: EditableField;
  otherFields: EditableField[];
  usedKeys: Set<string>;
  onSave: (field: EditableField) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = React.useState<EditableField>(field);
  // Keys start auto-generated from the field TYPE's default label (e.g. "short_text"), not the
  // admin's chosen label. Keep auto-deriving the key from the label until the admin edits the key
  // field directly, otherwise renaming "Short Text" to "Full Name" would silently keep "short_text".
  const [keyTouched, setKeyTouched] = React.useState(false);
  const meta = metaFor(draft.type);
  const keyConflict = draft.fieldKey !== field.fieldKey && usedKeys.has(draft.fieldKey);

  const update = (patch: Partial<EditableField>) => setDraft((d) => ({ ...d, ...patch }));
  const updateConfig = (patch: Partial<EditableField["config"]>) =>
    setDraft((d) => ({ ...d, config: { ...d.config, ...patch } }));

  const options = draft.config.options ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Field settings &middot; {meta.label}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Label</Label>
            <Input
              value={draft.label}
              onChange={(e) => {
                const label = e.target.value;
                update({ label, fieldKey: keyTouched ? draft.fieldKey : slugifyKey(label) });
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Field key (used internally, must be unique)</Label>
            <Input
              value={draft.fieldKey}
              onChange={(e) => {
                setKeyTouched(true);
                update({ fieldKey: slugifyKey(e.target.value) });
              }}
            />
            {keyConflict && <p className="text-sm text-destructive">This key is already used by another field.</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Textarea value={draft.description ?? ""} onChange={(e) => update({ description: e.target.value })} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Placeholder</Label>
              <Input value={draft.placeholder ?? ""} onChange={(e) => update({ placeholder: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Help text</Label>
              <Input value={draft.helpText ?? ""} onChange={(e) => update({ helpText: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="required" checked={draft.required} onCheckedChange={(v) => update({ required: v === true })} />
            <Label htmlFor="required" className="font-normal">
              Required field
            </Label>
          </div>

          {(draft.type === "short_text" || draft.type === "long_text" || draft.type === "address") && (
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Min length</Label>
                <Input
                  type="number"
                  value={draft.config.minLength ?? ""}
                  onChange={(e) => updateConfig({ minLength: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Max length</Label>
                <Input
                  type="number"
                  value={draft.config.maxLength ?? ""}
                  onChange={(e) => updateConfig({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Regex (optional)</Label>
                <Input value={draft.config.regex ?? ""} onChange={(e) => updateConfig({ regex: e.target.value || undefined })} />
              </div>
            </div>
          )}

          {(draft.type === "number" || draft.type === "currency" || draft.type === "rating") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Minimum</Label>
                <Input
                  type="number"
                  value={draft.config.minNumber ?? ""}
                  onChange={(e) => updateConfig({ minNumber: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Maximum</Label>
                <Input
                  type="number"
                  value={draft.config.maxNumber ?? ""}
                  onChange={(e) => updateConfig({ maxNumber: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
          )}

          {meta.hasOptions && (
            <DependentOptionsEditor draft={draft} otherFields={otherFields} updateConfig={updateConfig} />
          )}

          {meta.hasOptions && !draft.config.optionsDependOn && (
            <div className="flex flex-col gap-2">
              <Label>Options</Label>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => {
                      const next = [...options];
                      next[index] = e.target.value;
                      updateConfig({ options: next });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => updateConfig({ options: options.filter((_, i) => i !== index) })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => updateConfig({ options: [...options, `Option ${options.length + 1}`] })}
              >
                <Plus className="h-4 w-4" />
                Add option
              </Button>
              <p className="text-xs text-muted-foreground">
                Tip: an option that starts with “Other” (e.g. “Other (please specify)”) asks registrants to type their
                answer when they choose it.
              </p>
              {draft.type === "multiple_choice" && (
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="allowMultiple"
                    checked={draft.config.allowMultiple ?? true}
                    onCheckedChange={(v) => updateConfig({ allowMultiple: v === true })}
                  />
                  <Label htmlFor="allowMultiple" className="font-normal">
                    Allow multiple selections
                  </Label>
                </div>
              )}
            </div>
          )}

          <DefaultValueEditor draft={draft} updateConfig={updateConfig} />

          {meta.isFile && (
            <div className="flex flex-col gap-1.5">
              <Label>Max file size (MB)</Label>
              <Input
                type="number"
                value={draft.config.maxFileSizeMb ?? 5}
                onChange={(e) => updateConfig({ maxFileSizeMb: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Accepted types: {(FILE_TYPE_PRESETS[draft.type] ?? []).join(", ")}
              </p>
            </div>
          )}

          {otherFields.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
              <Label>Conditional logic (optional)</Label>
              <p className="text-xs text-muted-foreground">Only show this field when another field's answer matches.</p>
              <div className="flex items-center gap-2">
                <Select
                  value={draft.conditionalLogic?.[0]?.fieldKey ?? "none"}
                  onValueChange={(value) =>
                    update({
                      conditionalLogic:
                        value === "none" ? undefined : [{ fieldKey: value, operator: "equals", value: "" }],
                    })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="No condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No condition</SelectItem>
                    {otherFields.map((f) => (
                      <SelectItem key={f.fieldKey} value={f.fieldKey}>
                        {f.label || f.fieldKey}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {draft.conditionalLogic?.[0] && (
                  <Input
                    placeholder="equals value"
                    value={String(draft.conditionalLogic[0].value ?? "")}
                    onChange={(e) =>
                      update({
                        conditionalLogic: [{ ...draft.conditionalLogic![0]!, value: e.target.value }],
                      })
                    }
                    className="flex-1"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!draft.label.trim() || !draft.fieldKey.trim() || keyConflict}
            onClick={() => onSave(draft)}
          >
            Save field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
