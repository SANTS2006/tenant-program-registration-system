import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ChevronLeft, ChevronRight, Eraser, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import type { ConditionalRule, FollowUp, FormField, FormSection } from "@/types/api";
import { cn } from "@/lib/utils";

export interface UploadedFileInfo {
  fieldKey: string;
  url: string;
  publicId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface DynamicFormProps {
  sections: FormSection[];
  fields: FormField[];
  onSubmit: (responses: Record<string, unknown>, files: UploadedFileInfo[], consentAccepted: boolean) => Promise<void>;
  onUploadFile?: (file: File, fieldKey: string) => Promise<UploadedFileInfo>;
  submitting?: boolean;
  errors?: string[];
  submitLabel?: string;
  layoutMode?: "stepped" | "single";
  requireConsent?: boolean;
  consentText?: string | null;
  onCancel?: () => void;
  /** Asks the person to confirm they checked their answers before the form can be submitted. */
  requireReviewConfirmation?: boolean;
  /** When set, answers are kept in this browser so a refresh doesn't lose them; cleared on submit or "Clear form". */
  storageKey?: string;
  /** Shows a summary of the answers to confirm before the form is actually submitted. */
  reviewBeforeSubmit?: boolean;
}

interface SavedDraft {
  responses: Record<string, unknown>;
  files: Record<string, UploadedFileInfo>;
  step: number;
}

function loadDraft(key: string | undefined): SavedDraft | null {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDraft;
    return parsed && typeof parsed.responses === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Forgets a saved draft, e.g. once the form has been submitted. */
export function clearSavedDraft(key: string | undefined) {
  if (!key) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage can be blocked; nothing to clear */
  }
}

const REVIEW_REQUIRED_MESSAGE = "Please confirm you have checked all your answers before submitting";

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

function evaluateRule(rule: ConditionalRule, responses: Record<string, unknown>): boolean {
  const actual = responses[rule.fieldKey];
  switch (rule.operator) {
    case "equals":
      // eslint-disable-next-line eqeqeq
      return String(actual) == String(rule.value);
    case "not_equals":
      return String(actual) !== String(rule.value);
    case "contains":
      return Array.isArray(actual) ? actual.includes(rule.value) : String(actual ?? "").includes(String(rule.value ?? ""));
    case "is_empty":
      return isEmpty(actual);
    case "is_not_empty":
      return !isEmpty(actual);
    default:
      return true;
  }
}

function isVisible(field: FormField, responses: Record<string, unknown>) {
  if (!field.conditionalLogic || field.conditionalLogic.length === 0) return true;
  return field.conditionalLogic.every((rule) => evaluateRule(rule, responses));
}

const FILE_TYPES = new Set(["image_upload", "pdf_upload", "document_upload"]);
const NUMBER_TYPES = new Set(["number", "currency", "rating"]);

/** Options like "Other" or "Other (please specify)" ask the registrant to type their own answer. */
export function isOtherOption(option: string) {
  return /^other\b/i.test(option.trim());
}

export function otherTextKey(fieldKey: string) {
  return `${fieldKey}__other`;
}

/** What the chosen option asks for on top of the choice itself, if the admin turned that on. */
function followUpFor(field: FormField, value: unknown): FollowUp | null {
  if (!["single_choice", "dropdown", "yes_no"].includes(field.type)) return null;
  const key = typeof value === "boolean" ? (value ? "Yes" : "No") : typeof value === "string" ? value : "";
  return field.config.followUps?.[key] ?? null;
}

/** The choices to show right now -- narrowed by the parent's answer for cascading fields. */
function optionsFor(field: FormField, responses: Record<string, unknown>): string[] {
  const dep = field.config.optionsDependOn;
  if (!dep) return field.config.options ?? [];
  const parentValue = responses[dep.fieldKey];
  return isEmpty(parentValue) ? [] : (dep.map[String(parentValue)] ?? []);
}

/** Drops answers a changed parent no longer allows, following chains (region -> district -> chiefdom). */
function pruneDependentAnswers(fields: FormField[], responses: Record<string, unknown>) {
  const next = { ...responses };
  let changed = true;
  while (changed) {
    changed = false;
    for (const field of fields) {
      if (!field.config.optionsDependOn || isEmpty(next[field.fieldKey])) continue;
      const allowed = optionsFor(field, next);
      const current = next[field.fieldKey];
      if (Array.isArray(current)) {
        const kept = current.filter((v) => allowed.includes(String(v)));
        if (kept.length !== current.length) {
          next[field.fieldKey] = kept;
          changed = true;
        }
      } else if (!allowed.includes(String(current))) {
        delete next[field.fieldKey];
        changed = true;
      }
    }
  }
  return next;
}

function initialResponses(fields: FormField[]): Record<string, unknown> {
  const responses: Record<string, unknown> = {};
  for (const field of fields) {
    const value = field.config.defaultValue;
    if (value === undefined || value === "" || FILE_TYPES.has(field.type)) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    if (field.type === "multiple_choice") responses[field.fieldKey] = Array.isArray(value) ? value : [String(value)];
    else if (field.type === "yes_no") responses[field.fieldKey] = value === true || value === "true" || value === "yes";
    else if (field.type === "consent") responses[field.fieldKey] = value === true || value === "true";
    else if (NUMBER_TYPES.has(field.type)) responses[field.fieldKey] = Number(value);
    else responses[field.fieldKey] = Array.isArray(value) ? value[0] : String(value);
  }
  return pruneDependentAnswers(fields, responses);
}

function chosenOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return typeof value === "string" ? [value] : [];
}

export function DynamicForm({
  sections,
  fields,
  onSubmit,
  onUploadFile,
  submitting,
  errors,
  submitLabel,
  layoutMode = "stepped",
  requireConsent = false,
  consentText,
  onCancel,
  requireReviewConfirmation = true,
  storageKey,
  reviewBeforeSubmit = false,
}: DynamicFormProps) {
  const orderedSections = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const hasSections = orderedSections.length > 0;
  const [consented, setConsented] = React.useState(!requireConsent);
  const [consentChecked, setConsentChecked] = React.useState(false);
  const draft = React.useMemo(() => loadDraft(storageKey), [storageKey]);
  const [stepIndex, setStepIndex] = React.useState(() => Math.max(0, Math.min(draft?.step ?? 0, Math.max(0, sections.length - 1))));
  const [responses, setResponses] = React.useState<Record<string, unknown>>(() =>
    draft ? pruneDependentAnswers(fields, draft.responses) : initialResponses(fields),
  );
  const [uploadedFiles, setUploadedFiles] = React.useState<Record<string, UploadedFileInfo>>(() => draft?.files ?? {});
  const [uploadingKey, setUploadingKey] = React.useState<string | null>(null);
  const [stepErrors, setStepErrors] = React.useState<string[]>([]);
  const [reviewConfirmed, setReviewConfirmed] = React.useState(false);
  const [reviewing, setReviewing] = React.useState(false);

  const fieldsBySection = (sectionId: string | null) =>
    fields.filter((f) => f.sectionId === sectionId).sort((a, b) => a.orderIndex - b.orderIndex);

  const groups: { id: string | null; title: string; fields: FormField[] }[] = hasSections
    ? orderedSections.map((s) => ({ id: s.id, title: s.title, fields: fieldsBySection(s.id) }))
    : [{ id: null, title: "Registration", fields: fieldsBySection(null) }];

  const unassigned = fieldsBySection(null);
  if (hasSections && unassigned.length > 0) {
    groups.push({ id: "unassigned", title: "Additional Information", fields: unassigned });
  }

  const isSingle = layoutMode === "single";
  const steps = isSingle ? [{ id: "all", title: "Registration", fields: groups.flatMap((g) => g.fields) }] : groups;
  const currentStep = steps[stepIndex]!;
  const isLastStep = stepIndex === steps.length - 1;

  // Keep what the person has typed, so a refresh (or an accidental close) doesn't lose it.
  React.useEffect(() => {
    if (!storageKey) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ responses, files: uploadedFiles, step: stepIndex } satisfies SavedDraft));
      } catch {
        /* storage full or blocked: the form still works, it just won't be remembered */
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [storageKey, responses, uploadedFiles, stepIndex]);

  // Empties every answer and upload at once, and returns to the first step.
  const clearForm = () => {
    clearSavedDraft(storageKey);
    setResponses({});
    setUploadedFiles({});
    setStepErrors([]);
    setStepIndex(0);
    setReviewConfirmed(false);
  };

  const setValue = (key: string, value: unknown) =>
    setResponses((r) => pruneDependentAnswers(fields, { ...r, [key]: value }));

  const handleFileChange = async (field: FormField, file: File | undefined) => {
    if (!file || !onUploadFile) return;
    setUploadingKey(field.fieldKey);
    try {
      const uploaded = await onUploadFile(file, field.fieldKey);
      setUploadedFiles((prev) => ({ ...prev, [field.fieldKey]: uploaded }));
      setValue(field.fieldKey, uploaded.filename);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleFollowUpFile = async (field: FormField, file: File | undefined) => {
    if (!file || !onUploadFile) return;
    const key = otherTextKey(field.fieldKey);
    setUploadingKey(key);
    try {
      const uploaded = await onUploadFile(file, key);
      setUploadedFiles((prev) => ({ ...prev, [key]: uploaded }));
    } finally {
      setUploadingKey(null);
    }
  };

  const validateFields = (fieldsToCheck: FormField[]): string[] => {
    const missing: string[] = [];
    for (const field of fieldsToCheck) {
      if (!isVisible(field, responses)) continue;
      if (!field.required) continue;
      // Cascading field with no options for the parent's answer doesn't apply.
      if (field.config.optionsDependOn && optionsFor(field, responses).length === 0) continue;
      const isFile = field.type.endsWith("_upload");
      const hasValue = isFile ? !!uploadedFiles[field.fieldKey] : !isEmpty(responses[field.fieldKey]);
      if (!hasValue) missing.push(`${field.label} is required`);
    }
    for (const field of fieldsToCheck) {
      if (!isVisible(field, responses)) continue;
      const followUp = followUpFor(field, responses[field.fieldKey]);
      if (followUp?.required) {
        const key = otherTextKey(field.fieldKey);
        const hasText = !isEmpty(String(responses[key] ?? "").trim());
        const hasFile = !!uploadedFiles[key];
        const ok = followUp.mode === "text" ? hasText : followUp.mode === "file" ? hasFile : hasText || hasFile;
        if (!ok) missing.push(`${field.label}: please provide ${followUp.label?.trim() || "more details"}`);
      }
    }
    for (const field of fieldsToCheck) {
      if (!isVisible(field, responses)) continue;
      const pickedOther = chosenOptions(responses[field.fieldKey]).some(isOtherOption);
      if (pickedOther && isEmpty(String(responses[otherTextKey(field.fieldKey)] ?? "").trim())) {
        missing.push(`Please specify your answer for ${field.label}`);
      }
    }
    return missing;
  };

  const validateStep = (): boolean => {
    const missing = validateFields(currentStep.fields);
    setStepErrors(missing);
    return missing.length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStepIndex((s) => s + 1);
  };

  const handleBack = () => setStepIndex((s) => Math.max(0, s - 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    if (requireReviewConfirmation && !reviewConfirmed) {
      setStepErrors([REVIEW_REQUIRED_MESSAGE]);
      return;
    }
    if (reviewBeforeSubmit && !reviewing) {
      setReviewing(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    await submitNow();
  };

  const submitNow = async () => {
    // Files from a follow-up box the person has since switched away from are not sent.
    const files = Object.entries(uploadedFiles)
      .filter(([key]) => {
        if (!key.endsWith("__other")) return true;
        const owner = fields.find((f) => otherTextKey(f.fieldKey) === key);
        const mode = owner && isVisible(owner, responses) ? followUpFor(owner, responses[owner.fieldKey])?.mode : undefined;
        return mode === "file" || mode === "text_or_file";
      })
      .map(([, file]) => file);
    await onSubmit(responses, files, consented);
  };

  const renderField = (field: FormField) => {
    if (!isVisible(field, responses)) return null;
    // A cascading question with nothing to pick for the chosen answer is left out entirely.
    const parentKey = field.config.optionsDependOn?.fieldKey;
    if (parentKey && !isEmpty(responses[parentKey]) && optionsFor(field, responses).length === 0) return null;
    const value = responses[field.fieldKey];

    return (
      <div key={field.fieldKey} className="flex flex-col gap-1.5">
        <Label htmlFor={field.fieldKey}>
          {field.label}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}

        {renderInput(field, value)}
        {renderOtherInput(field, value)}

        {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      </div>
    );
  };

  /** Free-text box that appears right under a choice field when an "Other" option is picked. */
  const renderFollowUp = (field: FormField, followUp: FollowUp) => {
    const key = otherTextKey(field.fieldKey);
    const asksText = followUp.mode !== "file";
    const asksFile = followUp.mode !== "text";
    const prompt = followUp.label?.trim() || (asksFile && !asksText ? "Upload a file" : "Tell us more");
    const uploaded = uploadedFiles[key];
    const isUploading = uploadingKey === key;
    return (
      <div className="mt-1 flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-3">
        <Label htmlFor={key} className="text-sm">
          {prompt}
          {followUp.required && <span className="text-destructive"> *</span>}
        </Label>
        {asksText && (
          <Textarea
            id={key}
            rows={3}
            maxLength={2000}
            value={(responses[key] as string) ?? ""}
            onChange={(e) => setResponses((r) => ({ ...r, [key]: e.target.value }))}
          />
        )}
        {asksFile && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background px-4 py-4 text-sm text-muted-foreground hover:bg-muted">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {isUploading ? "Uploading..." : uploaded ? uploaded.filename : asksText ? "Or upload a file" : "Click to upload a file"}
            <input type="file" className="sr-only" onChange={(e) => handleFollowUpFile(field, e.target.files?.[0])} />
          </label>
        )}
      </div>
    );
  };

  const renderOtherInput = (field: FormField, value: unknown) => {
    const followUp = followUpFor(field, value);
    if (followUp) return renderFollowUp(field, followUp);
    if (!chosenOptions(value).some(isOtherOption)) return null;
    const key = otherTextKey(field.fieldKey);
    return (
      <Input
        id={key}
        aria-label={`${field.label}: please specify`}
        placeholder="Please specify"
        autoFocus
        maxLength={500}
        value={(responses[key] as string) ?? ""}
        onChange={(e) => setResponses((r) => ({ ...r, [key]: e.target.value }))}
        className="mt-1"
      />
    );
  };

  /** Shown in place of a cascading field's options until its parent has an answer. */
  const renderAwaitingParent = (field: FormField) => {
    const parent = fields.find((f) => f.fieldKey === field.config.optionsDependOn?.fieldKey);
    return (
      <p className="rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground">
        {isEmpty(responses[field.config.optionsDependOn!.fieldKey])
          ? `Select ${parent?.label ?? "the previous question"} first`
          : "No options available for your previous answer"}
      </p>
    );
  };

  const renderInput = (field: FormField, value: unknown) => {
    const common = {
      id: field.fieldKey,
      placeholder: field.placeholder ?? undefined,
      required: field.required,
    };
    if (field.config.optionsDependOn && optionsFor(field, responses).length === 0) {
      return renderAwaitingParent(field);
    }

    switch (field.type) {
      case "long_text":
      case "address":
        return <Textarea {...common} value={(value as string) ?? ""} onChange={(e) => setValue(field.fieldKey, e.target.value)} />;
      case "email":
        return (
          <Input {...common} type="email" value={(value as string) ?? ""} onChange={(e) => setValue(field.fieldKey, e.target.value)} />
        );
      case "phone":
        return (
          <Input {...common} type="tel" value={(value as string) ?? ""} onChange={(e) => setValue(field.fieldKey, e.target.value)} />
        );
      case "url":
        return (
          <Input {...common} type="url" value={(value as string) ?? ""} onChange={(e) => setValue(field.fieldKey, e.target.value)} />
        );
      case "number":
      case "currency":
      case "rating":
        return (
          <Input
            {...common}
            type="number"
            min={field.config.minNumber}
            max={field.config.maxNumber}
            value={(value as number) ?? ""}
            onChange={(e) => setValue(field.fieldKey, e.target.value === "" ? "" : Number(e.target.value))}
          />
        );
      case "date":
      case "date_of_birth":
        return (
          <Input {...common} type="date" value={(value as string) ?? ""} onChange={(e) => setValue(field.fieldKey, e.target.value)} />
        );
      case "time":
        return (
          <Input {...common} type="time" value={(value as string) ?? ""} onChange={(e) => setValue(field.fieldKey, e.target.value)} />
        );
      case "datetime":
        return (
          <Input
            {...common}
            type="datetime-local"
            value={(value as string) ?? ""}
            onChange={(e) => setValue(field.fieldKey, e.target.value)}
          />
        );
      case "single_choice":
      case "gender":
      case "country":
        return (
          <div className="flex flex-col gap-2">
            {optionsFor(field, responses).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={field.fieldKey}
                  checked={value === option}
                  onChange={() => setValue(field.fieldKey, option)}
                  className="h-4 w-4"
                />
                {option}
              </label>
            ))}
          </div>
        );
      case "dropdown":
        return (
          <Select value={(value as string) ?? ""} onValueChange={(v) => setValue(field.fieldKey, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {optionsFor(field, responses).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "multiple_choice": {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="flex flex-col gap-2">
            {field.config.maxSelections !== undefined && (
              <p className="text-xs text-muted-foreground">
                Choose up to {field.config.maxSelections} ({selected.length} selected)
              </p>
            )}
            {optionsFor(field, responses).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(option)}
                  disabled={!selected.includes(option) && field.config.maxSelections !== undefined && selected.length >= field.config.maxSelections}
                  onCheckedChange={(checked) => {
                    const next = checked ? [...selected, option] : selected.filter((o) => o !== option);
                    setValue(field.fieldKey, next);
                  }}
                />
                {option}
              </label>
            ))}
          </div>
        );
      }
      case "yes_no":
        return (
          <div className="flex gap-4">
            {[
              { label: "Yes", val: true },
              { label: "No", val: false },
            ].map((opt) => (
              <label key={opt.label} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={field.fieldKey}
                  checked={value === opt.val}
                  onChange={() => setValue(field.fieldKey, opt.val)}
                  className="h-4 w-4"
                />
                {opt.label}
              </label>
            ))}
          </div>
        );
      case "consent":
        return (
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={value === true} onCheckedChange={(checked) => setValue(field.fieldKey, checked === true)} />
            <span>{field.label}</span>
          </label>
        );
      case "image_upload":
      case "pdf_upload":
      case "document_upload": {
        const uploaded = uploadedFiles[field.fieldKey];
        const isUploading = uploadingKey === field.fieldKey;
        return (
          <div className="flex flex-col gap-2">
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/40 px-4 py-6 text-sm text-muted-foreground hover:bg-muted",
              )}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {isUploading ? "Uploading..." : uploaded ? uploaded.filename : "Click to upload a file"}
              <input
                type="file"
                className="hidden"
                accept={field.type === "image_upload" ? "image/*" : undefined}
                onChange={(e) => handleFileChange(field, e.target.files?.[0])}
              />
            </label>
          </div>
        );
      }
      default:
        return (
          <Input {...common} value={(value as string) ?? ""} onChange={(e) => setValue(field.fieldKey, e.target.value)} />
        );
    }
  };

  if (requireConsent && !consented) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-gradient-brand-soft p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="whitespace-pre-line text-sm text-foreground">
            {consentText || "By continuing, you consent to the collection of the information in this form."}
          </div>
        </div>
        <label htmlFor="consent-agree" className="flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox
            id="consent-agree"
            checked={consentChecked}
            onCheckedChange={(checked) => setConsentChecked(checked === true)}
            className="mt-0.5"
          />
          <span>I have read and agree to the consent statement above.</span>
        </label>
        <div className="flex items-center justify-between gap-3">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={() => setConsented(true)} disabled={!consentChecked}>
            Continue to the form
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const combinedErrors = [...(errors ?? []), ...stepErrors];

  /** What the person entered for a question, as plain text for the review screen. */
  const answerText = (field: FormField): string => {
    if (FILE_TYPES.has(field.type)) return uploadedFiles[field.fieldKey]?.filename ?? "";
    const value = responses[field.fieldKey];
    const extra = String(responses[otherTextKey(field.fieldKey)] ?? "").trim();
    const followUpFile = uploadedFiles[otherTextKey(field.fieldKey)]?.filename;
    if (isEmpty(value)) return "";
    const pieces = (Array.isArray(value) ? value.map(String) : [typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)]).map((v) =>
      isOtherOption(v) && extra ? `${v}: ${extra}` : v,
    );
    let text = pieces.join(", ");
    if (!Array.isArray(value) && extra && !isOtherOption(String(value))) text += `: ${extra}`;
    if (followUpFile) text += ` [file: ${followUpFile}]`;
    return text;
  };

  if (reviewing) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">Check your answers</h2>
          <p className="text-sm text-muted-foreground">Look everything over. If something is wrong, go back and fix it before you confirm.</p>
        </div>
        {combinedErrors.length > 0 && (
          <div role="alert" className="flex flex-col gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              Please fix the following
            </div>
            <ul className="list-disc pl-6">
              {combinedErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        {groups.map((group) => {
          const rows = group.fields
            .filter((f) => isVisible(f, responses))
            .map((f) => ({ label: f.label, value: answerText(f) }))
            .filter((row) => row.value !== "");
          if (rows.length === 0) return null;
          return (
            <div key={group.id ?? "unassigned"} className="flex flex-col gap-2">
              {hasSections && <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">{group.title}</h3>}
              <dl className="divide-y divide-border/60 rounded-lg border border-border/60">
                {rows.map((row, i) => (
                  <div key={`${row.label}-${i}`} className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-[40%_1fr] sm:gap-3">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="whitespace-pre-line break-words font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setReviewing(false)} disabled={submitting}>
            <ChevronLeft className="h-4 w-4" />
            Edit my answers
          </Button>
          <Button type="button" onClick={() => void submitNow()} loading={submitting}>
            {submitting ? "Submitting..." : (submitLabel ?? "Confirm and submit")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {!isSingle && steps.length > 1 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {stepIndex + 1} of {steps.length}
            </span>
            <span>{currentStep.title}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {combinedErrors.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" />
            Please fix the following
          </div>
          <ul className="list-disc pl-6">
            {combinedErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {isSingle ? (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <div key={group.id ?? "unassigned"} className="flex flex-col gap-5">
              {hasSections && group.fields.length > 0 && (
                <h3 className="border-b border-border/60 pb-2 text-sm font-semibold text-muted-foreground">{group.title}</h3>
              )}
              {group.fields.map(renderField)}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5">{currentStep.fields.map(renderField)}</div>
      )}

      {requireReviewConfirmation && (isSingle || isLastStep) && (
        <label
          htmlFor="review-confirm"
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/25 bg-gradient-brand-soft p-4 text-sm"
        >
          <Checkbox
            id="review-confirm"
            checked={reviewConfirmed}
            onCheckedChange={(checked) => {
              setReviewConfirmed(checked === true);
              if (checked === true) setStepErrors((errs) => errs.filter((e) => e !== REVIEW_REQUIRED_MESSAGE));
            }}
            className="mt-0.5"
            aria-required="true"
          />
          <span>
            <span className="font-medium">I have gone through the entire form</span> and confirm that all the information
            I entered is complete and correct.
          </span>
        </label>
      )}

      <div className="flex items-center justify-between pt-2">
        {!isSingle && stepIndex > 0 ? (
          <Button type="button" variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        ) : onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={clearForm} disabled={submitting}>
            <Eraser className="h-4 w-4" />
            Clear form
          </Button>
          {isSingle || isLastStep ? (
            <Button type="submit" loading={submitting}>
              {reviewBeforeSubmit ? "Review your answers" : submitting ? "Submitting..." : (submitLabel ?? "Submit registration")}
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
