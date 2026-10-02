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
  /** The account the program belongs to; differs from yours when it was shared with you. */
  tenantId?: string;
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
  ticketEnabled: boolean;
  oneRegistrationPerEmail: boolean;
  notifyOnRegistration: boolean;
  allowSubmissionCopy: boolean;
  notifyOnVerification: boolean;
  registrationNumberConfig: Partial<RegistrationNumberConfig>;
  createdAt: string;
  updatedAt: string;
  /** The current user's role on this program (only on the single-program endpoint). */
  myRole?: ProgramRole | null;
  /** "order_form" programs are a business's order page. */
  kind?: "program" | "order_form";
  businessId?: string | null;
}

export interface RegistrationNumberConfig {
  prefix: string;
  separator: "-" | "/" | "";
  includeYear: boolean;
  digits: number;
  startAt: number;
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
  kind?: "program" | "order_form";
  /** For an order form: the business the order goes to. */
  business?: {
    name: string;
    logoUrl: string | null;
    description: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    website: string | null;
  } | null;
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
  defaultValue?: string | number | boolean | string[];
  /** Cascading options: which choices show depends on the answer to another field. */
  optionsDependOn?: { fieldKey: string; map: Record<string, string[]> };
  currencyCode?: string;
  maxRating?: number;
  /** Dates: earliest and latest allowed (YYYY-MM-DD or "today"); dates of birth can also limit age. */
  minDate?: string;
  maxDate?: string;
  minAge?: number;
  maxAge?: number;
  /** Fill this field from another field's answer until the person types in it. */
  autoFillFrom?: string;
  /** Multiple choice: the most options a person may tick. */
  maxSelections?: number;
  /** Choices that ask for more: option (or "Yes"/"No") -> what to ask for. */
  followUps?: Record<string, FollowUp>;
}

export type FollowUpMode = "text" | "short_text" | "number" | "email" | "phone" | "date" | "dropdown" | "file" | "text_or_file";

export interface FollowUp {
  mode: FollowUpMode;
  label?: string;
  required?: boolean;
  /** The choices, when the mode is "dropdown". */
  options?: string[];
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
  showRegistrationNumber: boolean;
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
  | "cancelled"
  // Order statuses, for business order forms.
  | "confirmed"
  | "processing"
  | "ready"
  | "delivered"
  | "completed"
  // A business can add its own order statuses.
  | (string & {});

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
  /** Admin changes to this registrant's ID card. */
  documentOverrides?: { role?: string; photoUrl?: string };
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
