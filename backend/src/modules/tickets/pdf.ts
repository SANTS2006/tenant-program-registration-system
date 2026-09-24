import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { fetchImageBuffer } from "../idcards/pdf.js";
import type { TicketConfig } from "./schemas.js";

// 7.5in x 3in landscape event ticket, in PDF points; the stub is on the right.
const WIDTH = 540;
const HEIGHT = 216;
const STUB_X = 390;
const PAD = 22;

export interface TicketData {
  eventTitle: string;
  admissionLabel: string;
  participantName: string;
  registrationNumber: string;
  eventDate?: string;
  venue?: string;
  terms?: string;
  extraFields: { label: string; value: string }[];
  verifyUrl?: string;
}

interface Palette {
  text: string;
  muted: string;
  accent: string;
  perforation: string;
}

export async function generateTicketPdf(data: TicketData, config: TicketConfig): Promise<Buffer> {
  const background = config.backgroundImageUrl ? await fetchImageBuffer(config.backgroundImageUrl) : null;

  const doc = new PDFDocument({ size: [WIDTH, HEIGHT], margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const palette = drawBackground(doc, config, background);

  // Main section
  const mainWidth = STUB_X - PAD * 2;
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(palette.accent)
    .text(data.admissionLabel.toUpperCase(), PAD, PAD, { width: mainWidth, characterSpacing: 1.2 });

  doc
    .font("Helvetica-Bold")
    .fontSize(19)
    .fillColor(palette.text)
    .text(data.eventTitle, PAD, PAD + 14, { width: mainWidth, height: 48, ellipsis: true, lineGap: 1 });

  const infoY = 92;
  label(doc, "ISSUED TO", PAD, infoY, palette);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(palette.text)
    .text(data.participantName, PAD, infoY + 10, { width: mainWidth, height: 17, ellipsis: true });

  const detailsY = 132;
  const colWidth = mainWidth / 2 - 6;
  if (data.eventDate) {
    label(doc, "DATE", PAD, detailsY, palette);
    value(doc, data.eventDate, PAD, detailsY + 10, colWidth, palette);
  }
  if (data.venue) {
    const x = data.eventDate ? PAD + colWidth + 12 : PAD;
    label(doc, "VENUE", x, detailsY, palette);
    value(doc, data.venue, x, detailsY + 10, colWidth, palette);
  }

  const extras = data.extraFields.slice(0, 3);
  if (extras.length > 0) {
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(palette.muted)
      .text(extras.map((f) => `${f.label}: ${f.value}`).join("   •   "), PAD, 164, {
        width: mainWidth,
        height: 18,
        ellipsis: true,
      });
  }

  if (data.terms) {
    doc
      .font("Helvetica-Oblique")
      .fontSize(6)
      .fillColor(palette.muted)
      .text(data.terms, PAD, HEIGHT - 20, { width: mainWidth, height: 10, ellipsis: true });
  }

  drawPerforation(doc, palette);

  // Stub
  const stubCenter = STUB_X + (WIDTH - STUB_X) / 2;
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(palette.text)
    .text("ADMIT ONE", STUB_X, PAD, { width: WIDTH - STUB_X, align: "center", characterSpacing: 1.5 });

  const qrSize = 92;
  if (data.verifyUrl) {
    const qr = await QRCode.toBuffer(data.verifyUrl, { margin: 0, width: 256, color: { dark: "#0f172a", light: "#ffffff" } });
    const qrX = stubCenter - qrSize / 2;
    doc.roundedRect(qrX - 6, 44 - 6, qrSize + 12, qrSize + 12, 8).fill("#ffffff");
    doc.image(qr, qrX, 44, { width: qrSize, height: qrSize });
  }

  label(doc, "NO.", STUB_X, 158, palette, { width: WIDTH - STUB_X, align: "center" });
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(palette.text)
    .text(data.registrationNumber, STUB_X + 8, 168, { width: WIDTH - STUB_X - 16, align: "center" });

  doc.end();
  return finished;
}

function drawBackground(doc: PDFKit.PDFDocument, config: TicketConfig, background: Buffer | null): Palette {
  const dark: Palette = {
    text: "#0f172a",
    muted: "#475569",
    accent: config.primaryColor,
    perforation: "#94a3b8",
  };
  const light: Palette = {
    text: "#ffffff",
    muted: "#e2e8f0",
    accent: "#ffffff",
    perforation: "#ffffff",
  };

  if (background) {
    try {
      doc.image(background, 0, 0, { width: WIDTH, height: HEIGHT });
      // Tint the uploaded design so the overlaid details stay legible.
      const tint = config.textColor === "light" ? "#0f172a" : "#ffffff";
      doc.rect(0, 0, WIDTH, HEIGHT).fillOpacity(config.overlayOpacity).fill(tint);
      doc.fillOpacity(1);
      return config.textColor === "light" ? light : { ...dark, accent: "#0f172a" };
    } catch {
      /* unreadable image: fall through to the chosen template */
    }
  }

  if (config.template === "classic") {
    const gradient = doc.linearGradient(0, 0, WIDTH, HEIGHT);
    gradient.stop(0, config.primaryColor).stop(1, config.secondaryColor);
    doc.rect(0, 0, WIDTH, HEIGHT).fill(gradient);
    doc.save();
    doc.circle(STUB_X - 40, -30, 90).fillOpacity(0.1).fill("#ffffff");
    doc.circle(WIDTH, HEIGHT + 10, 70).fillOpacity(0.08).fill("#ffffff");
    doc.rect(STUB_X, 0, WIDTH - STUB_X, HEIGHT).fillOpacity(0.12).fill("#ffffff");
    doc.restore();
    doc.fillOpacity(1);
    return light;
  }

  doc.rect(0, 0, WIDTH, HEIGHT).fill("#ffffff");

  if (config.template === "modern") {
    const band = doc.linearGradient(0, 0, 0, HEIGHT);
    band.stop(0, config.primaryColor).stop(1, config.secondaryColor);
    doc.rect(0, 0, 8, HEIGHT).fill(band);
    doc.rect(STUB_X, 0, WIDTH - STUB_X, HEIGHT).fill(config.primaryColor);
    doc.save();
    doc.rect(STUB_X, 0, WIDTH - STUB_X, HEIGHT).fillOpacity(0.88).fill("#ffffff");
    doc.restore();
    doc.fillOpacity(1);
    return dark;
  }

  // minimal
  doc.roundedRect(3, 3, WIDTH - 6, HEIGHT - 6, 10).lineWidth(2).stroke(config.primaryColor);
  return dark;
}

function drawPerforation(doc: PDFKit.PDFDocument, palette: Palette) {
  doc.save();
  doc
    .moveTo(STUB_X, 14)
    .lineTo(STUB_X, HEIGHT - 14)
    .dash(3, { space: 4 })
    .lineWidth(1)
    .strokeOpacity(0.7)
    .stroke(palette.perforation);
  doc.undash();
  doc.restore();
  // Notches where a real ticket would tear.
  doc.circle(STUB_X, 0, 9).fill("#ffffff");
  doc.circle(STUB_X, HEIGHT, 9).fill("#ffffff");
}

function label(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  palette: Palette,
  options: PDFKit.Mixins.TextOptions = {},
) {
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(palette.muted).text(text, x, y, { characterSpacing: 1, ...options });
}

function value(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number, palette: Palette) {
  doc.font("Helvetica").fontSize(9.5).fillColor(palette.text).text(text, x, y, { width, height: 24, ellipsis: true });
}
