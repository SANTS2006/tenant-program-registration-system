import type { ConditionalRule, FieldConfig, FieldType } from "@/types/api";

export interface EditableSection {
  key: string;
  title: string;
  description?: string;
  orderIndex: number;
}

export interface EditableField {
  fieldKey: string;
  sectionKey: string | null;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  orderIndex: number;
  config: FieldConfig;
  conditionalLogic?: ConditionalRule[];
}

export type FormLayoutMode = "stepped" | "single";

export interface EditableFormPayload {
  title: string;
  description?: string;
  instructions?: string;
  confirmationMessage?: string;
  requireConsent: boolean;
  consentText?: string;
  showRegistrationNumber: boolean;
  layoutMode: FormLayoutMode;
  sections: EditableSection[];
  fields: EditableField[];
}
