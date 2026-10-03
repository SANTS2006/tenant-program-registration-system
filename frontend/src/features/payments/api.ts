import { apiFetch } from "@/lib/api";
import type { PaginatedResult, PaymentConfig } from "@/types/api";

// ---- a program's payment settings and payments ----

export function updatePaymentConfig(programId: string, config: PaymentConfig) {
  return apiFetch<{ paymentConfig: PaymentConfig }>(`/programs/${programId}/payment-config`, { method: "PUT", body: config });
}

export interface ProgramPayment {
  id: string;
  status: "pending" | "completed" | "failed" | "expired" | "cancelled" | "review";
  amountMinor: number;
  feeMinor: number;
  currency: string;
  purpose: "registration" | "order";
  payerName: string | null;
  payerEmail: string | null;
  channel: { type?: string; provider?: string; phoneNumber?: string; reference?: string } | null;
  failureReason: string | null;
  risk: { flags?: string[] };
  createdAt: string;
  paidAt: string | null;
  registrationId: string;
  registrationNumber: string;
}

export interface ProgramPaymentsPage extends PaginatedResult<ProgramPayment> {
  summary: { paidMinor: number; pendingMinor: number };
}

export function listProgramPayments(programId: string, params: { page?: number; pageSize?: number; status?: string; dateFrom?: string; dateTo?: string }) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") query.set(k, String(v));
  return apiFetch<ProgramPaymentsPage>(`/programs/${programId}/payments?${query.toString()}`);
}

export function waivePayment(programId: string, registrationId: string, note?: string) {
  return apiFetch<null>(`/programs/${programId}/registrations/${registrationId}/waive-payment`, { method: "POST", body: { note } });
}

// ---- what a payer sees ----

export interface PaymentView {
  status: "pending" | "completed" | "failed" | "expired" | "cancelled" | "review";
  registrationPaymentStatus: string;
  amountMinor: number;
  currency: string;
  lineItems: { id: string; name: string; unitMinor: number; quantity: number; totalMinor: number }[];
  registrationNumber: string;
  registrationStatus: string;
  programName: string;
  programSlug: string;
  kind: "program" | "order_form";
  paidAt: string | null;
  redirectUrl: string | null;
  expiresAt: string | null;
  canRetry: boolean;
  confirmationMessage: string | null;
  showRegistrationNumber: boolean;
  idCardAvailable: boolean;
  ticketAvailable: boolean;
  receiptToken?: string;
}

export function getPaymentView(token: string, refresh = false) {
  return apiFetch<PaymentView>(`/public/payments/${encodeURIComponent(token)}${refresh ? "?refresh=1" : ""}`);
}

export interface PaymentStartView {
  token: string;
  status: "pending" | "failed";
  redirectUrl: string | null;
  amountMinor: number;
  currency: string;
}

export function retryPayment(token: string) {
  return apiFetch<PaymentStartView>(`/public/payments/${encodeURIComponent(token)}/retry`, { method: "POST" });
}

// ---- the payment fund ----

export interface Provider {
  providerId: string;
  name: string;
}

export interface PayoutAccount {
  id: string;
  type: "momo" | "bank";
  providerId: string;
  providerName: string;
  accountNumber: string;
  accountName: string;
  usableAfter: string;
  usable: boolean;
}

export interface FundsSummary {
  configured: boolean;
  balances: { totalMinor: number; availableMinor: number; pendingMinor: number };
  accounts: PayoutAccount[];
  providers: { momo: Provider[]; banks: Provider[] };
  limits: {
    minMinor: number;
    dailyLimitMinor: number;
    reviewAboveMinor: number;
    holdHours: number;
    newAccountHours: number;
    feePercent: number;
    feeFixedMinor: number;
  };
}

export interface LedgerEntry {
  id: string;
  kind: "payment" | "fee" | "payout" | "payout_reversal" | "adjustment";
  amountMinor: number;
  currency: string;
  availableAt: string;
  note: string | null;
  createdAt: string;
  registrationNumber: string | null;
}

export interface PayoutRow {
  id: string;
  amountMinor: number;
  currency: string;
  status: "pending_review" | "queued" | "processing" | "completed" | "failed" | "cancelled" | "rejected";
  failureReason: string | null;
  accountName: string;
  providerId: string;
  accountNumber: string;
  createdAt: string;
  completedAt: string | null;
}

export const getFunds = () => apiFetch<FundsSummary>("/funds");
const dates = (range: { dateFrom?: string; dateTo?: string }) =>
  (range.dateFrom ? `&dateFrom=${encodeURIComponent(range.dateFrom)}` : "") + (range.dateTo ? `&dateTo=${encodeURIComponent(range.dateTo)}` : "");

export const getLedger = (page: number, range: { dateFrom?: string; dateTo?: string } = {}) =>
  apiFetch<PaginatedResult<LedgerEntry>>(`/funds/entries?page=${page}&pageSize=15${dates(range)}`);
export const getPayouts = (page: number, range: { dateFrom?: string; dateTo?: string } = {}) =>
  apiFetch<PaginatedResult<PayoutRow>>(`/funds/payouts?page=${page}&pageSize=10${dates(range)}`);

export const addPayoutAccount = (input: { type: "momo" | "bank"; providerId: string; accountNumber: string; accountName: string; password: string }) =>
  apiFetch<PayoutAccount[]>("/funds/accounts", { method: "POST", body: input });

export const removePayoutAccount = (accountId: string, password: string) =>
  apiFetch<PayoutAccount[]>(`/funds/accounts/${accountId}/remove`, { method: "POST", body: { password } });

export const requestPayout = (input: { accountId: string; amountMinor: number; password: string }) =>
  apiFetch<{ id: string; status: string }>("/funds/payouts", { method: "POST", body: input });

export const cancelPayout = (payoutId: string) => apiFetch<null>(`/funds/payouts/${payoutId}/cancel`, { method: "POST" });

// ---- the platform team ----

export interface PlatformPayments {
  awaitingReview: { id: string; tenantName: string; amountMinor: number; accountName: string; providerId: string; accountNumber: string; createdAt: string }[];
  paymentsInReview: { id: string; amountMinor: number; failureReason: string | null; createdAt: string; tenantName: string; payerEmail: string | null }[];
  totals: { paidMinor: number; feesMinor: number; paymentCount: number };
  monime: { configured: boolean; accounts: { id: string; name: string; currency: string; availableMinor: number | null }[]; error?: string };
}

export const getPlatformPayments = () => apiFetch<PlatformPayments>("/platform/payments");
export const reviewPayout = (payoutId: string, decision: "approve" | "reject", note?: string) =>
  apiFetch<null>(`/platform/payments/payouts/${payoutId}/review`, { method: "POST", body: { decision, note } });
export const recheckPayment = (paymentId: string) => apiFetch<{ status: string }>(`/platform/payments/payments/${paymentId}/recheck`, { method: "POST" });
