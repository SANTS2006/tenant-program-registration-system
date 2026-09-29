import { Ctx, esc, fitText, image, n, rect, svgDocument, text, textWidth, tint, wrapText } from "./svg.js";

// ---------------------------------------------------------------------------
// Invoices and receipts, drawn as A4 pages (595 x 842 points). The same drawing is used for
// the live preview in the browser, image downloads, PDFs, and email attachments.

export const DOC_PAGE_WIDTH = 595;
export const DOC_PAGE_HEIGHT = 842;
const W = DOC_PAGE_WIDTH;
const H = DOC_PAGE_HEIGHT;
const M = 40;
const INK = "#0f172a";
const MUTED = "#64748b";
const RULE = "#e2e8f0";

export type BusinessDocumentKind = "invoice" | "receipt";
export type DocumentTemplate = "classic" | "modern" | "minimal";

export const INVOICE_STATUSES = ["draft", "sent", "partially_paid", "paid", "cancelled"] as const;
export const RECEIPT_STATUSES = ["issued", "sent", "void"] as const;

export interface DocumentCustomField {
  key: string;
  label: string;
}

/** How a business's invoices (or receipts) look and what they ask for. */
export interface DocumentSettings {
  prefix: string;
  title: string;
  template: DocumentTemplate;
  accentColor: string;
  taxLabel: string;
  defaultTaxRate: number;
  /** Invoices: days from issue until payment is due. */
  dueDays: number;
  defaultNotes: string;
  defaultTerms: string;
  /** Bank or mobile money details printed on invoices. */
  paymentDetails: string;
  footer: string;
  signatureLabel: string;
  showLogo: boolean;
  showBusinessDetails: boolean;
  customFields: DocumentCustomField[];
}

export function defaultDocumentSettings(kind: BusinessDocumentKind, accentColor = "#2563eb"): DocumentSettings {
  return {
    prefix: kind === "invoice" ? "INV" : "RCT",
    title: kind === "invoice" ? "INVOICE" : "RECEIPT",
    template: "classic",
    accentColor,
    taxLabel: "Tax",
    defaultTaxRate: 0,
    dueDays: 14,
    defaultNotes: kind === "invoice" ? "Thank you for your business." : "Thank you for your payment.",
    defaultTerms: kind === "invoice" ? "Payment is due by the due date shown above." : "",
    paymentDetails: "",
    footer: "",
    signatureLabel: "Authorised signature",
    showLogo: true,
    showBusinessDetails: true,
    customFields: [],
  };
}

/** Fills in anything missing from stored settings with the defaults. */
export function resolveDocumentSettings(kind: BusinessDocumentKind, stored: unknown, accentColor?: string): DocumentSettings {
  const base = defaultDocumentSettings(kind, accentColor);
  const raw = (stored && typeof stored === "object" ? stored : {}) as Partial<DocumentSettings>;
  const merged = { ...base, ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && v !== null)) } as DocumentSettings;
  if (!["classic", "modern", "minimal"].includes(merged.template)) merged.template = "classic";
  if (!/^#[0-9a-f]{6}$/i.test(merged.accentColor)) merged.accentColor = base.accentColor;
  merged.customFields = Array.isArray(merged.customFields) ? merged.customFields.filter((f) => f && f.key && f.label) : [];
  return merged;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface DocumentTotals {
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function lineAmount(item: LineItem) {
  return round2((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
}

/** Subtotal, discount, tax on the discounted amount, total, and what's still owed. */
export function computeTotals(items: LineItem[], discount: number, taxRate: number, amountPaid = 0): DocumentTotals {
  const subtotal = round2(items.reduce((sum, item) => sum + lineAmount(item), 0));
  const cappedDiscount = round2(Math.min(Math.max(0, Number(discount) || 0), subtotal));
  const taxAmount = round2(((subtotal - cappedDiscount) * Math.max(0, Number(taxRate) || 0)) / 100);
  const total = round2(subtotal - cappedDiscount + taxAmount);
  const paid = round2(Math.max(0, Number(amountPaid) || 0));
  return { subtotal, discount: cappedDiscount, taxAmount, total, amountPaid: paid, balance: round2(total - paid) };
}

/** "Le 1,250.50" for leones, "USD 1,250.50" for other currency codes. */
export function formatMoney(amount: number, currency = "SLE"): string {
  const value = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "SLE" ? `Le ${value}` : `${currency} ${value}`;
}

export function formatDocDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export interface DocumentBusiness {
  name: string;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  taxNumber?: string | null;
}

export interface DocumentContent {
  kind: BusinessDocumentKind;
  number: string;
  status: string;
  /** Changed since it was first saved: printed as "Updated". */
  updatedOn?: string | Date | null;
  issueDate: string | Date;
  dueDate?: string | Date | null;
  paymentMethod?: string | null;
  client: { name: string; email?: string | null; phone?: string | null; address?: string | null };
  items: LineItem[];
  discount: number;
  taxRate: number;
  amountPaid: number;
  notes?: string | null;
  terms?: string | null;
  customFields: { label: string; value: string }[];
  currency: string;
}

// ---------------------------------------------------------------------------
// Drawing

interface Row {
  lines: string[];
  item: LineItem;
  height: number;
}

const COLS = { desc: M + 12, qty: 352, price: 440, amount: W - M - 12 };
const DESC_WIDTH = 290;
const ROW_SIZE = 9.5;
const LINE = 12.5;

function tableRows(items: LineItem[]): Row[] {
  return items.map((item) => {
    const lines = wrapText(item.description || "-", DESC_WIDTH, ROW_SIZE, 4);
    return { lines, item, height: 12 + lines.length * LINE };
  });
}

function wrapBlock(value: string | null | undefined, width: number, size: number, maxLines: number) {
  if (!value?.trim()) return [];
  return value
    .split(/\r?\n/)
    .flatMap((paragraph) => (paragraph.trim() ? wrapText(paragraph, width, size, maxLines) : [""]))
    .slice(0, maxLines);
}

function statusStamp(content: DocumentContent): { label: string; color: string } | null {
  if (content.kind === "receipt") return content.status === "void" ? { label: "VOID", color: "#dc2626" } : { label: "PAID", color: "#16a34a" };
  if (content.status === "paid") return { label: "PAID", color: "#16a34a" };
  if (content.status === "cancelled") return { label: "CANCELLED", color: "#dc2626" };
  if (content.status === "partially_paid") return { label: "PART PAID", color: "#d97706" };
  return null;
}

/**
 * Draws the document on as many A4 pages as its line items need. The first page has the full
 * header; later pages repeat a short header; the totals, notes, and signature close the last page.
 */
export function renderBusinessDocument(content: DocumentContent, business: DocumentBusiness, settings: DocumentSettings): string[] {
  const accent = settings.accentColor;
  const t = settings.template;
  const money = (v: number) => formatMoney(v, content.currency);
  const totals = computeTotals(content.items, content.discount, content.taxRate, content.amountPaid);
  const rows = tableRows(content.items);

  // Closing block: totals, payment details, notes, terms, signature.
  const notes = wrapBlock(content.notes, 280, 8.5, 6);
  const terms = wrapBlock(content.terms, 280, 8, 6);
  const payment = content.kind === "invoice" ? wrapBlock(settings.paymentDetails, 280, 8.5, 5) : [];
  const totalLines = 2 + (totals.discount ? 1 : 0) + (content.taxRate ? 1 : 0) + (content.kind === "receipt" || totals.amountPaid ? 2 : 0);
  const leftBlock = (payment.length ? 18 + payment.length * 11 : 0) + (notes.length ? 18 + notes.length * 11 : 0) + (terms.length ? 18 + terms.length * 10.5 : 0);
  const closingHeight = Math.max(totalLines * 18 + 20, leftBlock) + 90;

  const pages: string[] = [];
  let index = 0;
  const footerY = H - 26;

  const header = (first: boolean, ctx: Ctx): { svg: string; y: number } => {
    let svg = rect(0, 0, W, H, "#ffffff");
    if (!first) {
      svg += rect(0, 0, W, 4, accent);
      svg += text(M, 40, business.name, { size: 11, fill: INK, bold: true });
      svg += text(W - M, 40, `${settings.title} ${content.number} (continued)`, { size: 9, fill: MUTED, anchor: "end" });
      svg += rect(M, 52, W - 2 * M, 0.8, RULE);
      return { svg, y: 72 };
    }

    const dark = t === "modern";
    const bandHeight = dark ? 150 : 0;
    if (dark) svg += rect(0, 0, W, bandHeight, accent);
    else if (t === "classic") svg += rect(0, 0, W, 6, accent);
    const headInk = dark ? "#ffffff" : INK;
    const headMuted = dark ? tint(accent, 0.8) : MUTED;

    // Business block (left)
    let bx = M;
    if (settings.showLogo && business.logo) {
      const clip = ctx.clip(`<rect x="${M}" y="34" width="64" height="64" rx="10"/>`);
      svg += dark ? rect(M - 4, 30, 72, 72, "#ffffff", `rx="12"`) : "";
      svg += image(business.logo, M, 34, 64, 64, "meet", clip);
      bx = M + 78;
    }
    const nameFit = fitText(business.name, 250 - (bx - M), 16, { bold: true, minSize: 11 });
    svg += text(bx, 50, nameFit.text, { size: nameFit.size, fill: headInk, bold: true });
    let by = 64;
    if (settings.showBusinessDetails) {
      const details = [business.address, [business.phone, business.email].filter(Boolean).join("  ·  "), business.website, business.taxNumber ? `Tax no. ${business.taxNumber}` : ""].filter(
        (d): d is string => !!d,
      );
      for (const line of details.flatMap((d) => wrapText(d, 250 - (bx - M), 8.5, 2))) {
        svg += text(bx, by, line, { size: 8.5, fill: headMuted });
        by += 11.5;
      }
    }

    // Title and meta (right)
    const titleColor = dark ? "#ffffff" : t === "minimal" ? INK : accent;
    svg += text(W - M, 56, settings.title, { size: t === "minimal" ? 22 : 26, fill: titleColor, bold: true, anchor: "end", letterSpacing: 2 });
    const meta: [string, string][] = [
      [content.kind === "invoice" ? "Invoice no." : "Receipt no.", content.number],
      [content.kind === "invoice" ? "Issue date" : "Date", formatDocDate(content.issueDate)],
    ];
    if (content.kind === "invoice" && content.dueDate) meta.push(["Due date", formatDocDate(content.dueDate)]);
    if (content.kind === "receipt" && content.dueDate) meta.push(["Paid on", formatDocDate(content.dueDate)]);
    if (content.paymentMethod) meta.push(["Payment method", content.paymentMethod]);
    let my = 76;
    for (const [label, value] of meta) {
      svg += text(W - M - 110, my, label, { size: 8.5, fill: headMuted, anchor: "end" });
      const fit = fitText(value, 104, 9, { bold: true, minSize: 7 });
      svg += text(W - M, my, fit.text, { size: fit.size, fill: headInk, bold: true, anchor: "end" });
      my += 13;
    }
    if (content.updatedOn) {
      const label = `UPDATED ${formatDocDate(content.updatedOn).toUpperCase()}`;
      const w = textWidth(label, 7, true, 0.6) + 14;
      svg += rect(W - M - w, my - 4, w, 15, dark ? tint(accent, 0.25) : "#fef3c7", `rx="7.5"`);
      svg += text(W - M - w / 2, my + 6.5, label, { size: 7, fill: dark ? "#ffffff" : "#92400e", bold: true, anchor: "middle", letterSpacing: 0.6 });
      my += 18;
    }

    // Bill to / received from, plus custom fields
    const y = Math.max(by, my, bandHeight) + 26;
    if (!dark) svg += rect(M, y - 14, W - 2 * M, 0.8, RULE);
    svg += text(M, y, content.kind === "invoice" ? "BILL TO" : "RECEIVED FROM", { size: 8, fill: accent, bold: true, letterSpacing: 1 });
    let cy = y + 15;
    const clientFit = fitText(content.client.name, 250, 11.5, { bold: true, minSize: 9 });
    svg += text(M, cy, clientFit.text, { size: clientFit.size, fill: INK, bold: true });
    cy += 13;
    for (const line of [content.client.address, content.client.phone, content.client.email].filter((v): v is string => !!v).flatMap((v) => wrapText(v, 250, 8.5, 2))) {
      svg += text(M, cy, line, { size: 8.5, fill: MUTED });
      cy += 11.5;
    }
    let fy = y + 15;
    for (const field of content.customFields.filter((f) => f.value)) {
      svg += text(W - M - 160, fy, field.label, { size: 8.5, fill: MUTED });
      const fit = fitText(field.value, 150, 9, { bold: true, minSize: 7 });
      svg += text(W - M, fy, fit.text, { size: fit.size, fill: INK, bold: true, anchor: "end" });
      fy += 13;
    }
    return { svg, y: Math.max(cy, fy) + 18 };
  };

  const tableHead = (y: number) => {
    // A solid tint: PDFs can't draw colours with transparency written as #rrggbbaa.
    const bg = t === "minimal" ? "#ffffff" : t === "modern" ? accent : tint(accent, 0.88);
    const ink = t === "modern" ? "#ffffff" : t === "minimal" ? INK : accent;
    let svg = rect(M, y, W - 2 * M, 24, bg, `rx="${t === "minimal" ? 0 : 6}"`);
    if (t === "minimal") svg += rect(M, y + 24, W - 2 * M, 1.2, INK);
    svg += text(COLS.desc, y + 16, "DESCRIPTION", { size: 8, fill: ink, bold: true, letterSpacing: 0.8 });
    svg += text(COLS.qty, y + 16, "QTY", { size: 8, fill: ink, bold: true, anchor: "end", letterSpacing: 0.8 });
    svg += text(COLS.price, y + 16, "UNIT PRICE", { size: 8, fill: ink, bold: true, anchor: "end", letterSpacing: 0.8 });
    svg += text(COLS.amount, y + 16, "AMOUNT", { size: 8, fill: ink, bold: true, anchor: "end", letterSpacing: 0.8 });
    return { svg, y: y + 30 };
  };

  const drawRow = (row: Row, y: number, zebra: boolean) => {
    let svg = zebra && t !== "minimal" ? rect(M, y - 4, W - 2 * M, row.height, "#f8fafc") : "";
    row.lines.forEach((line, i) => (svg += text(COLS.desc, y + 9 + i * LINE, line, { size: ROW_SIZE, fill: INK })));
    const qty = Number(row.item.quantity) || 0;
    svg += text(COLS.qty, y + 9, String(Number.isInteger(qty) ? qty : qty.toFixed(2)), { size: ROW_SIZE, fill: INK, anchor: "end" });
    svg += text(COLS.price, y + 9, money(Number(row.item.unitPrice) || 0), { size: ROW_SIZE, fill: INK, anchor: "end" });
    svg += text(COLS.amount, y + 9, money(lineAmount(row.item)), { size: ROW_SIZE, fill: INK, bold: true, anchor: "end" });
    svg += rect(M, y - 4 + row.height, W - 2 * M, 0.6, RULE);
    return svg;
  };

  const closing = (y: number) => {
    let svg = "";
    // Totals (right)
    const lines: [string, string, boolean][] = [["Subtotal", money(totals.subtotal), false]];
    if (totals.discount) lines.push(["Discount", `- ${money(totals.discount)}`, false]);
    if (content.taxRate) lines.push([`${settings.taxLabel} (${content.taxRate}%)`, money(totals.taxAmount), false]);
    lines.push(["Total", money(totals.total), true]);
    if (content.kind === "receipt" || totals.amountPaid) {
      lines.push(["Amount paid", money(totals.amountPaid), false]);
      lines.push([content.kind === "receipt" ? "Balance" : "Balance due", money(totals.balance), true]);
    }
    let ty = y + 4;
    const tx = W - M - 210;
    for (const [label, value, strong] of lines) {
      if (strong && label === "Total") {
        svg += rect(tx - 8, ty - 13, 218, 22, t === "minimal" ? "#f1f5f9" : accent, `rx="5"`);
        svg += text(tx, ty + 2, label, { size: 10, fill: t === "minimal" ? INK : "#ffffff", bold: true });
        svg += text(W - M, ty + 2, value, { size: 11, fill: t === "minimal" ? INK : "#ffffff", bold: true, anchor: "end" });
        ty += 24;
      } else {
        svg += text(tx, ty, label, { size: 9, fill: strong ? INK : MUTED, bold: strong });
        svg += text(W - M, ty, value, { size: 9.5, fill: INK, bold: strong, anchor: "end" });
        ty += 17;
      }
    }

    // Payment details, notes, terms (left)
    let ly = y;
    const block = (title: string, lines: string[], size: number) => {
      if (!lines.length) return;
      svg += text(M, ly, title, { size: 8, fill: accent, bold: true, letterSpacing: 1 });
      ly += 13;
      for (const line of lines) {
        svg += text(M, ly, line, { size, fill: "#334155" });
        ly += size + 2.5;
      }
      ly += 8;
    };
    block("PAYMENT DETAILS", payment, 8.5);
    block("NOTES", notes, 8.5);
    block("TERMS", terms, 8);

    // Signature
    const sy = Math.max(ty, ly) + 40;
    if (settings.signatureLabel) {
      svg += rect(W - M - 170, sy, 170, 0.8, "#94a3b8");
      svg += text(W - M - 85, sy + 13, settings.signatureLabel, { size: 8.5, fill: MUTED, anchor: "middle" });
    }

    const stamp = statusStamp(content);
    if (stamp) {
      const sw = textWidth(stamp.label, 20, true, 3) + 28;
      svg += `<g transform="rotate(-12 ${n(M + 120)} ${n(sy)})" opacity="0.85">${rect(M + 120 - sw / 2, sy - 20, sw, 40, "none", `rx="8" stroke="${stamp.color}" stroke-width="3"`)}${text(M + 120, sy + 7, stamp.label, { size: 20, fill: stamp.color, bold: true, anchor: "middle", letterSpacing: 3 })}</g>`;
    }
    return svg;
  };

  const footer = (pageNo: number, pageCount: number) => {
    let svg = rect(M, footerY - 14, W - 2 * M, 0.6, RULE);
    const note = settings.footer || `${business.name}${business.website ? ` · ${business.website}` : ""}`;
    const fit = fitText(note, W - 2 * M - 80, 8, { minSize: 6.5 });
    svg += text(M, footerY, fit.text, { size: fit.size, fill: MUTED });
    svg += text(W - M, footerY, `Page ${pageNo} of ${pageCount}`, { size: 8, fill: MUTED, anchor: "end" });
    return svg;
  };

  // Lay the rows out over pages, keeping room for the closing block on the last page.
  const bodies: { ctx: Ctx; svg: string }[] = [];
  const bottom = footerY - 26;
  let first = true;
  while (first || index < rows.length) {
    const ctx = new Ctx();
    const head = header(first, ctx);
    let svg = head.svg;
    const th = tableHead(head.y);
    svg += th.svg;
    let y = th.y;
    if (rows.length === 0) {
      svg += text(COLS.desc, y + 9, "No items", { size: ROW_SIZE, fill: MUTED });
      y += 24;
    }
    const startIndex = index;
    while (index < rows.length) {
      const row = rows[index]!;
      // A page always takes at least one row, so a very long description can't stall the layout.
      if (y + row.height > bottom && index > startIndex) break;
      svg += drawRow(row, y, index % 2 === 1);
      y += row.height;
      index++;
    }
    first = false;
    if (index < rows.length) {
      bodies.push({ ctx, svg });
      continue;
    }
    if (y + 22 + closingHeight <= bottom + 20) {
      bodies.push({ ctx, svg: svg + closing(y + 22) });
    } else {
      // The items fill this page: the totals go on a page of their own.
      bodies.push({ ctx, svg });
      const ctx2 = new Ctx();
      const h2 = header(false, ctx2);
      bodies.push({ ctx: ctx2, svg: h2.svg + closing(h2.y + 10) });
    }
    break;
  }

  bodies.forEach((body, i) => pages.push(svgDocument(W, H, body.ctx, body.svg + footer(i + 1, bodies.length))));
  return pages;
}

/** Escapes a value for use inside the SVG (exported for callers composing their own markup). */
export const escapeSvg = esc;
