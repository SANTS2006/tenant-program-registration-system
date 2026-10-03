import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

// A small client for the Monime API (https://docs.monime.io, version caph-2025-08-23).
//  - Every request carries the access token and the space id, a timeout, and (for anything that creates
//    something) an Idempotency-Key, so a retry can never create a second payment or payout.
//  - Amounts are whole minor units (1 Leone = 100), as Monime expects.
//  - The token is only ever sent in the Authorization header; it is never logged or put in an error message.

export const isMonimeConfigured = () => Boolean(env.MONIME_ACCESS_TOKEN && env.MONIME_SPACE_ID);

export class MonimeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "MonimeError";
  }
}

interface CallOptions {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** 25-64 characters. Required for requests that create something. */
  idempotencyKey?: string;
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, options: CallOptions = {}): Promise<T> {
  if (!isMonimeConfigured()) throw AppError.paymentUnavailable("Payments are not set up on this platform yet.");

  const url = new URL(`${env.MONIME_API_BASE.replace(/\/$/, "")}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.MONIME_ACCESS_TOKEN}`,
    "Monime-Space-Id": env.MONIME_SPACE_ID,
    "Monime-Version": env.MONIME_API_VERSION,
    Accept: "application/json",
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  // Reads can be repeated freely; a create can be repeated too because of its idempotency key.
  const attempts = method === "GET" || options.idempotencyKey ? 3 : 1;
  let last: MonimeError | undefined;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(300 * 3 ** (attempt - 1));
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      });
      const requestId = response.headers.get("monime-request-id") ?? undefined;
      let json: { success?: boolean; result?: T; error?: { code?: string; reason?: string; message?: string } } = {};
      try {
        json = (await response.json()) as typeof json;
      } catch {
        /* an empty or non-JSON body; handled below */
      }
      if (response.ok && json.success !== false) return json.result as T;

      const reason = json.error?.reason ?? json.error?.code ?? `HTTP ${response.status}`;
      const retryable = response.status >= 500 || response.status === 429;
      last = new MonimeError(`Monime ${method} ${path} failed: ${reason}`, response.status, retryable, requestId);
      if (!retryable) throw last;
    } catch (err) {
      if (err instanceof MonimeError) {
        if (!err.retryable) throw err;
        last = err;
      } else {
        // A timeout or a dropped connection: nothing is known about whether Monime got it, which is what the key is for.
        last = new MonimeError(`Monime ${method} ${path} could not be reached`, 0, true);
      }
    }
  }
  throw last ?? new MonimeError("Monime request failed", 0, true);
}

export interface MonimeMoney {
  currency: string;
  value: number;
}

export interface MonimeCheckoutSession {
  id: string;
  status: "pending" | "cancelled" | "expired" | "completed";
  orderNumber?: string | null;
  reference?: string | null;
  redirectUrl: string;
  expireTime?: string;
  metadata?: Record<string, string> | null;
}

export interface MonimePayment {
  id: string;
  status: "pending" | "processing" | "completed";
  amount: MonimeMoney;
  channel?: { type: string; provider?: string; reference?: string; phoneNumber?: string; accountNumber?: string; scheme?: string; last4?: string };
  orderNumber?: string | null;
  reference?: string | null;
  fees?: { code: string; amount: MonimeMoney }[] | null;
}

export interface MonimePayout {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  amount: MonimeMoney;
  failureDetail?: { code?: string; message?: string } | null;
}

export type PayoutDestination =
  | { type: "momo"; providerId: string; phoneNumber: string }
  | { type: "bank"; providerId: string; accountNumber: string };

export function createCheckoutSession(input: {
  idempotencyKey: string;
  name: string;
  description?: string;
  reference: string;
  successUrl: string;
  cancelUrl: string;
  lineItems: { name: string; unitMinor: number; quantity: number; reference: string }[];
  metadata?: Record<string, string>;
}) {
  return call<MonimeCheckoutSession>("POST", "/checkout-sessions", {
    idempotencyKey: input.idempotencyKey,
    body: {
      name: input.name.slice(0, 150),
      description: input.description?.slice(0, 1000),
      reference: input.reference,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      lineItems: input.lineItems.map((line) => ({
        type: "custom",
        name: line.name.slice(0, 100),
        price: { currency: "SLE", value: line.unitMinor },
        quantity: line.quantity,
        reference: line.reference.slice(0, 100),
      })),
      // Mobile money (Orange Money, Africell Money, QMoney, ...) is always offered. Cards, banks and wallets only when switched on.
      paymentOptions: {
        card: { disable: !env.MONIME_ALLOW_CARDS },
        bank: { disable: !env.MONIME_ALLOW_BANKS },
        wallet: { disable: true },
        momo: { disable: false },
      },
      metadata: input.metadata,
    },
  });
}

export const getCheckoutSession = (id: string) => call<MonimeCheckoutSession>("GET", `/checkout-sessions/${encodeURIComponent(id)}`);

/** The payments Monime recorded for a checkout session, found by its order number. */
export const listPaymentsForOrder = (orderNumber: string) =>
  call<MonimePayment[]>("GET", "/payments", { query: { orderNumber, limit: 50 } });

export const createPayout = (input: { idempotencyKey: string; amountMinor: number; destination: PayoutDestination; metadata?: Record<string, string> }) =>
  call<MonimePayout>("POST", "/payouts", {
    idempotencyKey: input.idempotencyKey,
    body: { amount: { currency: "SLE", value: input.amountMinor }, destination: input.destination, metadata: input.metadata },
  });

export const getPayout = (id: string) => call<MonimePayout>("GET", `/payouts/${encodeURIComponent(id)}`);

export interface MonimeMomo {
  providerId: string;
  name: string;
  country: string;
  status?: { active?: boolean };
  featureSet?: { payout?: { canPayTo?: boolean }; payment?: { canPayFrom?: boolean } };
}

export interface MonimeBank {
  providerId: string;
  name: string;
  status?: { active?: boolean };
  featureSet?: { payout?: { canPayTo?: boolean } };
}

export const listBanks = () => call<MonimeBank[]>("GET", "/banks", { query: { country: "SL" } });

export const listMomos = () => call<MonimeMomo[]>("GET", "/momos", { query: { country: "SL" } });

export interface MonimeFinancialAccount {
  id: string;
  name: string;
  currency: string;
  balance?: { available?: MonimeMoney } | null;
}

export const listFinancialAccounts = () => call<MonimeFinancialAccount[]>("GET", "/financial-accounts", { query: { limit: 50 } });

/** True when a checkout address is on a host the platform trusts (https only), so a payer is never sent somewhere else. */
export function isTrustedCheckoutUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const hosts = env.MONIME_REDIRECT_HOSTS.split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    return hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}
