import { pgTable, uuid, text, timestamp, integer, bigint, jsonb, index, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { programs } from "./programs";
import { registrations } from "./registrations";
import { tenants } from "./tenants";
import { users } from "./users";

// All money is stored as whole minor units (1 Leone = 100), never as decimals.
const money = (name: string) => bigint(name, { mode: "number" });

/** One attempt to collect money for a registration or an order. */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "restrict" }),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    // "registration" (fee, ID card, ticket) or "order" (goods from the order form).
    purpose: text("purpose").notNull(),
    // pending -> completed | failed | expired | cancelled, or review when what was paid doesn't match what was asked.
    status: text("status").notNull().default("pending"),
    currency: text("currency").notNull().default("SLE"),
    amountMinor: money("amount_minor").notNull(),
    // What the platform keeps, and what the organization is credited.
    feeMinor: money("fee_minor").notNull().default(0),
    netMinor: money("net_minor").notNull().default(0),
    // The items charged, as they were when the payment was made (names and prices at that moment).
    lineItems: jsonb("line_items").notNull().default([]),
    provider: text("provider").notNull().default("monime"),
    checkoutSessionId: text("checkout_session_id"),
    providerOrderNumber: text("provider_order_number"),
    // Where to send the payer to pay; kept so an unfinished payment can be resumed.
    redirectUrl: text("redirect_url"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    payerName: text("payer_name"),
    payerEmail: text("payer_email"),
    payerPhone: text("payer_phone"),
    // How it was paid, as reported by the provider (masked phone, provider, reference).
    channel: jsonb("channel"),
    providerPaymentId: text("provider_payment_id"),
    providerFees: jsonb("provider_fees"),
    // Fraud signals noted when it was created or settled: { flags: string[] }.
    risk: jsonb("risk").notNull().default({}),
    failureReason: text("failure_reason"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    index("payments_registration_idx").on(table.registrationId),
    index("payments_tenant_status_idx").on(table.tenantId, table.status, table.createdAt),
    index("payments_program_idx").on(table.programId, table.createdAt),
    index("payments_pending_idx").on(table.status, table.createdAt),
    uniqueIndex("payments_checkout_session_idx").on(table.checkoutSessionId).where(sql`${table.checkoutSessionId} is not null`),
    index("payments_ip_idx").on(table.ipAddress, table.createdAt),
    index("payments_email_idx").on(table.payerEmail, table.createdAt),
  ],
);

/** Every notification Monime sends us, once. The event id is unique, so a replayed or retried event is recognised. */
export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    name: text("name").notNull(),
    objectId: text("object_id"),
    // true: the signature checked out; false: it did not; null: not checked (no secret, or no signature).
    signatureValid: boolean("signature_valid"),
    outcome: text("outcome").notNull().default("received"),
    ipAddress: text("ip_address"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("payment_events_event_idx").on(table.eventId), index("payment_events_received_idx").on(table.receivedAt)],
);

/**
 * An organization's money, as an append-only ledger. A balance is the sum of its entries; nothing is
 * ever edited. Credits can wait until `availableAt` before they can be withdrawn.
 */
export const walletEntries = pgTable(
  "wallet_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    // payment (+), fee (-), payout (-), payout_reversal (+), adjustment (+/-)
    kind: text("kind").notNull(),
    amountMinor: money("amount_minor").notNull(),
    currency: text("currency").notNull().default("SLE"),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "restrict" }),
    payoutId: uuid("payout_id"),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("wallet_entries_tenant_idx").on(table.tenantId, table.createdAt),
    // A payment can be credited once, and charged its fee once, however many times it is processed.
    uniqueIndex("wallet_entries_payment_kind_idx").on(table.paymentId, table.kind).where(sql`${table.paymentId} is not null`),
    uniqueIndex("wallet_entries_payout_kind_idx").on(table.payoutId, table.kind).where(sql`${table.payoutId} is not null`),
  ],
);

/** Where an organization withdraws its money to: a mobile money number or a bank account. */
export const payoutAccounts = pgTable(
  "payout_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    providerId: text("provider_id").notNull(),
    accountNumber: text("account_number").notNull(),
    accountName: text("account_name").notNull(),
    // A new account can't receive money until this time, so a stolen session can't cash out at once.
    usableAfter: timestamp("usable_after", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
  },
  (table) => [index("payout_accounts_tenant_idx").on(table.tenantId)],
);

/** A withdrawal of an organization's money. */
export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => payoutAccounts.id, { onDelete: "restrict" }),
    amountMinor: money("amount_minor").notNull(),
    currency: text("currency").notNull().default("SLE"),
    // pending_review -> queued -> processing -> completed | failed;  or cancelled / rejected.
    status: text("status").notNull().default("queued"),
    providerPayoutId: text("provider_payout_id"),
    failureReason: text("failure_reason"),
    attempts: integer("attempts").notNull().default(0),
    risk: jsonb("risk").notNull().default({}),
    requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("payouts_tenant_idx").on(table.tenantId, table.createdAt), index("payouts_status_idx").on(table.status, table.updatedAt)],
);
