import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

// Never reach a real database or Monime from these tests.
process.env.DATABASE_URL = "postgres://nobody:nobody@127.0.0.1:1/none";
process.env.APP_URL ||= "http://localhost:4000";
process.env.API_URL ||= "http://localhost:4000";
process.env.JWT_SECRET ||= "test-secret-test-secret-test-secret";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-test-secret";
process.env.MONIME_ACCESS_TOKEN = "mon-test-token-should-never-leak";
process.env.MONIME_SPACE_ID = "spc-test";
process.env.PAYMENTS_MAX_AMOUNT = "1000000";

const { leonesToMinor, platformFee, formatMinor } = await import("../../src/lib/money.js");
const pricing = await import("../../src/modules/payments/pricing.js");
const { chargePlanFor } = await import("../../src/modules/payments/charge.js");
const { verifyWebhookSignature } = await import("../../src/modules/payments/webhookSignature.js");
const monime = await import("../../src/modules/payments/monime.js");
const { normalizePhone } = await import("../../src/modules/payments/payouts.js");
const { assertDocumentsUnlocked } = await import("../../src/modules/payments/gate.js");

describe("money", () => {
  it("keeps amounts as whole cents", () => {
    expect(leonesToMinor(1250.5)).toBe(125050);
    expect(leonesToMinor(0.1 + 0.2)).toBe(30);
    expect(() => leonesToMinor(-1)).toThrow();
    expect(() => leonesToMinor(Number.NaN)).toThrow();
    expect(formatMinor(125050)).toBe("NLe 1,250.50");
  });
  it("takes the platform fee, never more than the payment", () => {
    expect(platformFee(100_000, 2.5, 0)).toBe(2_500);
    expect(platformFee(100_000, 2.5, 100)).toBe(2_600);
    expect(platformFee(50, 0, 100)).toBe(50);
    expect(platformFee(100_000, 0, 0)).toBe(0);
  });
});

describe("what a registration or order costs", () => {
  const catalogue = [
    { id: "rice", name: "Rice 25kg", priceMinor: 40_000, maxQuantity: 5 },
    { id: "oil", name: "Palm oil", priceMinor: 12_550 },
  ];
  const program = { kind: "program", idCardEnabled: true, ticketEnabled: true, paymentConfig: { enabled: true, registrationFeeMinor: 5_000, idCardPriceMinor: 2_000, ticketPriceMinor: 0 } };

  it("charges the fee and the ID card, but not a free ticket", () => {
    const plan = chargePlanFor(program, { orderItems: [] }, undefined)!;
    expect(plan.lines.map((l) => l.id)).toEqual(["registration", "id_card"]);
    expect(plan.totalMinor).toBe(7_000);
    expect(plan.charge).toBe(true);
  });

  it("charges nothing for the ID card when the program has none", () => {
    const plan = chargePlanFor({ ...program, idCardEnabled: false }, { orderItems: [] }, undefined)!;
    expect(plan.totalMinor).toBe(5_000);
  });

  it("does nothing when payments are off", () => {
    expect(chargePlanFor({ ...program, paymentConfig: { enabled: false } }, { orderItems: [] }, undefined)).toBeNull();
  });

  it("prices an order from the server's own list, never from the browser", () => {
    const order = { ...program, kind: "order_form" };
    const plan = chargePlanFor(order, { orderItems: catalogue }, [{ itemId: "rice", quantity: 2 }, { itemId: "oil", quantity: 1 }])!;
    expect(plan.totalMinor).toBe(2 * 40_000 + 12_550);
    expect(plan.lines[0]).toMatchObject({ name: "Rice 25kg", unitMinor: 40_000, quantity: 2 });
  });

  it("merges repeated items and enforces limits", () => {
    const order = { ...program, kind: "order_form" };
    const plan = chargePlanFor(order, { orderItems: catalogue }, [{ itemId: "oil", quantity: 1 }, { itemId: "oil", quantity: 2 }])!;
    expect(plan.lines).toHaveLength(1);
    expect(plan.lines[0]!.quantity).toBe(3);
    expect(() => chargePlanFor(order, { orderItems: catalogue }, [{ itemId: "rice", quantity: 6 }])).toThrow(/at most 5/);
  });

  it("refuses unknown items, an empty order, and a total above the largest payment", () => {
    const order = { ...program, kind: "order_form" };
    expect(() => chargePlanFor(order, { orderItems: catalogue }, [{ itemId: "ghost", quantity: 1 }])).toThrow(/no longer available/);
    expect(() => chargePlanFor(order, { orderItems: catalogue }, [])).toThrow(/at least one item/);
    const big = [{ id: "car", name: "Car", priceMinor: pricing.MAX_PAYMENT_MINOR }];
    expect(() => chargePlanFor(order, { orderItems: big }, [{ itemId: "car", quantity: 2 }])).toThrow(/largest payment/);
  });

  it("an order form with items but payments off still records the order", () => {
    const order = { ...program, kind: "order_form", paymentConfig: { enabled: false } };
    const plan = chargePlanFor(order, { orderItems: catalogue }, [{ itemId: "oil", quantity: 1 }])!;
    expect(plan.charge).toBe(false);
    expect(plan.totalMinor).toBe(12_550);
  });

  it("validates the catalogue", () => {
    expect(pricing.orderItemsSchema.safeParse([{ id: "a", name: "A", priceMinor: 0 }]).success).toBe(false);
    expect(pricing.orderItemsSchema.safeParse([{ id: "a", name: "A", priceMinor: 100 }, { id: "a", name: "B", priceMinor: 100 }]).success).toBe(false);
    expect(pricing.orderItemsSchema.safeParse([{ id: "a b", name: "A", priceMinor: 100 }]).success).toBe(false);
    expect(pricing.orderItemsSchema.safeParse([{ id: "a", name: "A", priceMinor: 100, imageUrl: "https://evil.example/x.png" }]).success).toBe(false);
  });
});

describe("webhook signatures", () => {
  const secret = "s".repeat(40);
  const body = JSON.stringify({ event: { id: "e1", name: "checkout_session.completed" } });
  const now = 1_725_018_144;
  const hmac = (signed: string) => createHmac("sha256", secret).update(signed).digest("hex");

  it("accepts a timestamped signature, and a plain digest", () => {
    const header = `t=${now},v1=${hmac(`${now}.${body}`)}`;
    expect(verifyWebhookSignature({ rawBody: body, secret, header, nowSeconds: now + 10 })).toBe("valid");
    expect(verifyWebhookSignature({ rawBody: body, secret, header: hmac(body), nowSeconds: now })).toBe("valid");
  });

  it("rejects a changed body, a wrong secret and a stale timestamp", () => {
    const header = `t=${now},v1=${hmac(`${now}.${body}`)}`;
    expect(verifyWebhookSignature({ rawBody: body + " ", secret, header, nowSeconds: now })).toBe("invalid");
    expect(verifyWebhookSignature({ rawBody: body, secret: "x".repeat(40), header, nowSeconds: now })).toBe("invalid");
    expect(verifyWebhookSignature({ rawBody: body, secret, header, nowSeconds: now + 3600 })).toBe("invalid");
  });

  it("reports absent when there is nothing to check", () => {
    expect(verifyWebhookSignature({ rawBody: body, secret: "", header: "x" })).toBe("absent");
    expect(verifyWebhookSignature({ rawBody: body, secret, header: undefined })).toBe("absent");
  });
});

describe("the Monime client", () => {
  afterEach(() => vi.unstubAllGlobals());

  const jsonResponse = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "monime-request-id": "req-1" } });

  it("sends the token, space id and an idempotency key, with prices in cents", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { success: true, result: { id: "cs-1", status: "pending", redirectUrl: "https://pay.monime.io/x" } }));
    vi.stubGlobal("fetch", fetchMock);
    await monime.createCheckoutSession({
      idempotencyKey: "11111111-2222-3333-4444-555555555555",
      name: "Demo",
      reference: "pay-1",
      successUrl: "https://app/ok",
      cancelUrl: "https://app/no",
      lineItems: [{ name: "Ticket", unitMinor: 15000, quantity: 2, reference: "ticket" }],
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(String(url)).toBe("https://api.monime.io/v1/checkout-sessions");
    expect(headers.Authorization).toBe("Bearer mon-test-token-should-never-leak");
    expect(headers["Monime-Space-Id"]).toBe("spc-test");
    expect(headers["Idempotency-Key"]).toBe("11111111-2222-3333-4444-555555555555");
    const body = JSON.parse(String(init.body));
    expect(body.lineItems[0].price).toEqual({ currency: "SLE", value: 15000 });
    expect(body.paymentOptions.momo.disable).toBe(false);
    expect(body.paymentOptions.card.disable).toBe(true);
  });

  it("retries a server error with the same key, and gives up on a client error", async () => {
    const calls: Record<string, string>[] = [];
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async (_u: unknown, init: RequestInit) => {
        calls.push(init.headers as Record<string, string>);
        return jsonResponse(503, { success: false });
      })
      .mockImplementationOnce(async (_u: unknown, init: RequestInit) => {
        calls.push(init.headers as Record<string, string>);
        return jsonResponse(200, { success: true, result: { id: "p-1", status: "pending" } });
      });
    vi.stubGlobal("fetch", fetchMock);
    const out = await monime.createPayout({ idempotencyKey: "payout-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", amountMinor: 100, destination: { type: "momo", providerId: "m17", phoneNumber: "23276123456" } });
    expect(out.id).toBe("p-1");
    expect(calls).toHaveLength(2);
    expect(calls[0]!["Idempotency-Key"]).toBe(calls[1]!["Idempotency-Key"]);

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(400, { success: false, error: { reason: "bad" } })));
    await expect(monime.getCheckoutSession("cs-1")).rejects.toMatchObject({ status: 400, retryable: false });
  });

  it("never puts the token in an error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(401, { success: false, error: { reason: "unauthorized" } })));
    try {
      await monime.getCheckoutSession("cs-1");
      expect.unreachable();
    } catch (err) {
      expect(String((err as Error).message)).not.toContain("mon-test-token");
    }
  });

  it("only trusts Monime's own checkout pages", () => {
    expect(monime.isTrustedCheckoutUrl("https://checkout.monime.io/s/abc")).toBe(true);
    expect(monime.isTrustedCheckoutUrl("https://monime.io/pay")).toBe(true);
    expect(monime.isTrustedCheckoutUrl("http://checkout.monime.io/s/abc")).toBe(false);
    expect(monime.isTrustedCheckoutUrl("https://monime.io.evil.example/pay")).toBe(false);
    expect(monime.isTrustedCheckoutUrl("https://evil.example/?u=monime.io")).toBe(false);
    expect(monime.isTrustedCheckoutUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("withdrawal details", () => {
  it("normalises Sierra Leone mobile numbers", () => {
    expect(normalizePhone("076 123456")).toBe("23276123456");
    expect(normalizePhone("+232 76 123456")).toBe("23276123456");
    expect(normalizePhone("76123456")).toBe("23276123456");
    expect(() => normalizePhone("12345")).toThrow();
    expect(() => normalizePhone("07612345678901")).toThrow();
  });
});

describe("documents held until paid", () => {
  it("holds back an ID card or ticket while payment is pending or under review only", () => {
    expect(() => assertDocumentsUnlocked({ paymentStatus: "pending" })).toThrow(/payment/i);
    expect(() => assertDocumentsUnlocked({ paymentStatus: "review" })).toThrow();
    for (const status of ["none", "paid", "waived"]) expect(() => assertDocumentsUnlocked({ paymentStatus: status })).not.toThrow();
  });
});
