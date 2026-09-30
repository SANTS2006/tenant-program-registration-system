import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FieldConfig, FollowUp } from "@/types/api";
import type { EditableField } from "./types";

type UpdateConfig = (patch: Partial<FieldConfig>) => void;

const NONE = "__none";
const SINGLE_CHOICE_TYPES = new Set(["single_choice", "dropdown", "gender", "country"]);
const TEXT_INPUT_TYPES: Record<string, string> = {
  short_text: "text",
  long_text: "text",
  address: "text",
  email: "email",
  phone: "tel",
  url: "url",
  number: "number",
  currency: "number",
  rating: "number",
  date: "date",
  date_of_birth: "date",
  time: "time",
  datetime: "datetime-local",
};

/** Pre-fills the answer on the live form; the registrant can still change it. */
export function DefaultValueEditor({ draft, updateConfig }: { draft: EditableField; updateConfig: UpdateConfig }) {
  const value = draft.config.defaultValue;
  const options = draft.config.options ?? [];
  let input: React.ReactNode = null;

  if (SINGLE_CHOICE_TYPES.has(draft.type)) {
    input = (
      <Select
        value={typeof value === "string" && options.includes(value) ? value : NONE}
        onValueChange={(v) => updateConfig({ defaultValue: v === NONE ? undefined : v })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No default</SelectItem>
          {options.filter(Boolean).map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (draft.type === "multiple_choice") {
    const selected = Array.isArray(value) ? value : [];
    input = (
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        {options.filter(Boolean).map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(option)}
              onCheckedChange={(checked) => {
                const next = checked ? [...selected, option] : selected.filter((o) => o !== option);
                updateConfig({ defaultValue: next.length ? next : undefined });
              }}
            />
            {option}
          </label>
        ))}
        {options.length === 0 && <p className="text-xs text-muted-foreground">Add options first.</p>}
      </div>
    );
  } else if (draft.type === "yes_no") {
    input = (
      <Select
        value={value === true ? "yes" : value === false ? "no" : NONE}
        onValueChange={(v) => updateConfig({ defaultValue: v === NONE ? undefined : v === "yes" })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No default</SelectItem>
          <SelectItem value="yes">Yes</SelectItem>
          <SelectItem value="no">No</SelectItem>
        </SelectContent>
      </Select>
    );
  } else if (TEXT_INPUT_TYPES[draft.type]) {
    const inputType = TEXT_INPUT_TYPES[draft.type]!;
    input = (
      <Input
        type={inputType}
        placeholder="No default"
        value={value === undefined || Array.isArray(value) || typeof value === "boolean" ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) return updateConfig({ defaultValue: undefined });
          updateConfig({ defaultValue: inputType === "number" ? Number(raw) : raw });
        }}
      />
    );
  }

  if (!input) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Default value (optional)</Label>
      {input}
      <p className="text-xs text-muted-foreground">Pre-filled on the form; registrants can still change it.</p>
    </div>
  );
}

const FOLLOW_UP_TYPES = new Set(["single_choice", "dropdown", "yes_no"]);

/** The most options a person may tick on a multiple choice question. */
export function MaxSelectionsEditor({ draft, updateConfig }: { draft: EditableField; updateConfig: UpdateConfig }) {
  if (draft.type !== "multiple_choice") return null;
  const count = (draft.config.options ?? []).filter(Boolean).length;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="max-selections">Limit how many can be selected (optional)</Label>
      <Input
        id="max-selections"
        type="number"
        min={1}
        max={count || undefined}
        placeholder="No limit"
        value={draft.config.maxSelections ?? ""}
        onChange={(e) => updateConfig({ maxSelections: e.target.value ? Math.max(1, Number(e.target.value)) : undefined })}
      />
      <p className="text-xs text-muted-foreground">For example, enter 2 to let people pick no more than two options.</p>
    </div>
  );
}

/**
 * Lets an option ask for more, e.g. "Do you have a design in mind?" -> Yes shows a box to describe
 * or upload the design, No shows nothing.
 */
export function FollowUpEditor({ draft, updateConfig }: { draft: EditableField; updateConfig: UpdateConfig }) {
  if (!FOLLOW_UP_TYPES.has(draft.type) || draft.config.optionsDependOn) return null;
  const choices = draft.type === "yes_no" ? ["Yes", "No"] : (draft.config.options ?? []).filter((o) => o.trim() && !/^other/i.test(o.trim()));
  if (choices.length === 0) return null;
  const followUps = draft.config.followUps ?? {};

  const setFollowUp = (option: string, next: FollowUp | undefined) => {
    const copy = { ...followUps };
    if (next) copy[option] = next;
    else delete copy[option];
    updateConfig({ followUps: Object.keys(copy).length ? copy : undefined });
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-border p-3">
      <p className="text-sm font-medium">Ask for more details</p>
      <p className="-mt-2 text-xs text-muted-foreground">
        Turn this on for an option to show an extra box when it is chosen. Options left off show nothing extra.
      </p>
      {choices.map((option) => {
        const followUp = followUps[option];
        return (
          <div key={option} className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={Boolean(followUp)}
                onCheckedChange={(checked) => setFollowUp(option, checked === true ? { mode: "text", label: "" } : undefined)}
              />
              When “{option}” is chosen, ask for more
            </label>
            {followUp && (
              <div className="ml-6 flex flex-col gap-2">
                <Select value={followUp.mode} onValueChange={(mode) => setFollowUp(option, { ...followUp, mode: mode as FollowUp["mode"] })}>
                  <SelectTrigger aria-label={`What to ask for when ${option} is chosen`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">A written answer</SelectItem>
                    <SelectItem value="file">An uploaded file</SelectItem>
                    <SelectItem value="text_or_file">A written answer or an uploaded file</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  aria-label={`Prompt shown when ${option} is chosen`}
                  placeholder="What should they enter? e.g. Describe or upload your design"
                  value={followUp.label ?? ""}
                  onChange={(e) => setFollowUp(option, { ...followUp, label: e.target.value })}
                />
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox checked={followUp.required === true} onCheckedChange={(checked) => setFollowUp(option, { ...followUp, required: checked === true })} />
                  Required
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function linesToOptions(text: string): string[] {
  return [...new Set(text.split("\n").map((line) => line.trim()).filter(Boolean))];
}

/**
 * Cascading options, e.g. District -> Chiefdom: pick the parent question, then
 * list this field's choices for each of the parent's answers.
 */
export function DependentOptionsEditor({
  draft,
  otherFields,
  updateConfig,
}: {
  draft: EditableField;
  otherFields: EditableField[];
  updateConfig: UpdateConfig;
}) {
  const dep = draft.config.optionsDependOn;
  const candidates = otherFields.filter(
    (f) => SINGLE_CHOICE_TYPES.has(f.type) && (f.config.options?.length ?? 0) > 0 && f.config.optionsDependOn?.fieldKey !== draft.fieldKey,
  );
  const parent = candidates.find((f) => f.fieldKey === dep?.fieldKey);

  const setDependency = (next: FieldConfig["optionsDependOn"]) =>
    updateConfig({
      optionsDependOn: next,
      // Keep the flat option list in sync so previews, defaults and analytics see every choice.
      options: next ? [...new Set(Object.values(next.map).flat())] : draft.config.options,
    });

  if (candidates.length === 0 && !dep) return null;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          checked={Boolean(dep)}
          onCheckedChange={(checked) => {
            if (!checked) return setDependency(undefined);
            const first = candidates[0];
            if (first) setDependency({ fieldKey: first.fieldKey, map: {} });
          }}
        />
        Filter these options based on another answer
      </label>
      <p className="-mt-2 text-xs text-muted-foreground">
        For example, only show the chiefdoms that belong to the district the registrant picked.
      </p>

      {dep && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>Depends on</Label>
            <Select value={dep.fieldKey} onValueChange={(fieldKey) => setDependency({ fieldKey, map: {} })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a question" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((f) => (
                  <SelectItem key={f.fieldKey} value={f.fieldKey}>
                    {f.label || f.fieldKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {parent ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Enter the options for each answer to “{parent.label}”, one per line.
              </p>
              {(parent.config.options ?? []).map((parentOption) => (
                <div key={`${dep.fieldKey}:${parentOption}`} className="flex flex-col gap-1">
                  <Label className="text-xs">When “{parentOption}” is chosen</Label>
                  {/* Uncontrolled so blank lines survive while typing; parsed into options on every change. */}
                  <Textarea
                    rows={3}
                    defaultValue={(dep.map[parentOption] ?? []).join("\n")}
                    placeholder="One option per line"
                    onChange={(e) =>
                      setDependency({ ...dep, map: { ...dep.map, [parentOption]: linesToOptions(e.target.value) } })
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-destructive">The question this depends on no longer exists. Choose another.</p>
          )}
        </>
      )}
    </div>
  );
}
