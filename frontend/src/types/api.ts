export type UserRole = "super_admin" | "admin" | "program_admin" | "viewer";
export type UserStatus = "active" | "suspended";
export type ProgramRole = "admin" | "viewer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  tenantId: string | null;
  emailVerified: boolean;
}

export type ProgramStatus = "draft" | "published" | "closed" | "archived";

export interface Program {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  status: ProgramStatus;
  startDate: string | null;
  endDate: string | null;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  registrationEnabled: boolean;
  idCardEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProgram {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  registrationOpen: boolean;
}

export type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "time"
  | "datetime"
  | "single_choice"
  | "multiple_choice"
  | "dropdown"
  | "yes_no"
  | "image_upload"
  | "pdf_upload"
  | "document_upload"
  | "address"
  | "country"
  | "gender"
  | "date_of_birth"
  | "url"
  | "currency"
  | "rating"
  | "consent";

export interface FieldConfig {
  minLength?: number;
  maxLength?: number;
  minNumber?: number;
  maxNumber?: number;
  regex?: string;
  options?: string[];
  allowMultiple?: boolean;
  maxFileSizeMb?: number;
  allowedFileTypes?: string[];
  defaultValue?: string | number | boolean;
  currencyCode?: string;
  maxRating?: number;
}

export interface ConditionalRule {
  fieldKey: string;
  operator: "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
  value?: string | number | boolean;
}

export interface FormSection {
  id: string;
  formId: string;
  title: string;
  description: string | null;
  orderIndex: number;
}

export interface FormField {
  id: string;
  formId: string;
  sectionId: string | null;
  fieldKey: string;
  type: FieldType;
  label: string;
  description: string | null;
  placeholder: string | null;
  helpText: string | null;
  required: boolean;
  orderIndex: number;
  config: FieldConfig;
  conditionalLogic: ConditionalRule[] | null;
}

export type FormStatus = "draft" | "published" | "archived";

export interface FormMeta {
  id: string;
  programId: string;
  version: number;
  title: string;
  description: string | null;
  instructions: string | null;
  confirmationMessage: string | null;
  requireConsent: boolean;
  consentText: string | null;
  layoutMode: "stepped" | "single";
  status: FormStatus;
  publishedAt: string | null;
}

export interface FormWithContent {
  form: FormMeta;
  sections: FormSection[];
  fields: FormField[];
  versions?: FormMeta[];
}

export type RegistrationStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "cancelled";

export interface Registration {
  id: string;
  programId: string;
  formId: string;
  registrationNumber: string;
  status: RegistrationStatus;
  applicantName: string | null;
  applicantEmail: string | null;
  applicantPhone: string | null;
  responses: Record<string, unknown>;
  submittedAt: string;
}

export interface RegistrationFile {
  id: string;
  registrationId: string;
  fieldKey: string;
  originalFilename: string;
  secureUrl: string;
  mimeType: string;
  sizeBytes: number;
}

export interface RegistrationHistoryEntry {
  id: string;
  fromStatus: RegistrationStatus | null;
  toStatus: RegistrationStatus;
  note: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProgramStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byStatus: Record<string, number>;
}

export interface DashboardOverview {
  totalPrograms: number;
  activePrograms: number;
  closedPrograms: number;
  totalRegistrations: number;
  registrationsToday: number;
  registrationsThisWeek: number;
  registrationsThisMonth: number;
  byStatus: Record<string, number>;
}
