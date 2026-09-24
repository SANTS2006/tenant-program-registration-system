import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import type { ConditionalRule, FormField, FormSection } from "@/types/api";
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
}

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
}: DynamicFormProps) {
  const orderedSections = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const hasSections = orderedSections.length > 0;
  const [consented, setConsented] = React.useState(!requireConsent);
  const [consentChecked, setConsentChecked] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [responses, setResponses] = React.useState<Record<string, unknown>>(() => initialResponses(fields));
  const [uploadedFiles, setUploadedFiles] = React.useState<Record<string, UploadedFileInfo>>({});
  const [uploadingKey, setUploadingKey] = React.useState<string | null>(null);
  const [stepErrors, setStepErrors] = React.useState<string[]>([]);

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
    await onSubmit(responses, Object.values(uploadedFiles), consented);
  };

  const renderField = (field: FormField) => {
    if (!isVisible(field, responses)) return null;
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
  const renderOtherInput = (field: FormField, value: unknown) => {
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
            {optionsFor(field, responses).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(option)}
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

        {isSingle || isLastStep ? (
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : (submitLabel ?? "Submit registration")}
          </Button>
        ) : (
          <Button type="button" onClick={handleNext}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
