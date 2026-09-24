import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { isOwnCloudinaryUrl } from "../../lib/cloudinaryUrl.js";

// CR-80 card size (3.375in x 2.125in) in PDF points, landscape.
const CARD_WIDTH = 243;
const CARD_HEIGHT = 153;

export interface IdCardData {
  programName: string;
  registrationNumber: string;
  applicantName: string;
  extraFields: { label: string; value: string }[];
  primaryColor: string;
  secondaryColor: string;
  verifyUrl?: string;
  validUntil?: string;
  backgroundImageUrl?: string;
  photoUrl?: string;
}

export async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  if (!isOwnCloudinaryUrl(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function generateIdCardPdf(data: IdCardData): Promise<Buffer> {
  const [backgroundBuffer, photoBuffer] = await Promise.all([
    data.backgroundImageUrl ? fetchImageBuffer(data.backgroundImageUrl) : Promise.resolve(null),
    data.photoUrl ? fetchImageBuffer(data.photoUrl) : Promise.resolve(null),
  ]);

  const doc = new PDFDocument({ size: [CARD_WIDTH, CARD_HEIGHT], margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  if (backgroundBuffer) {
    try {
      doc.image(backgroundBuffer, 0, 0, { width: CARD_WIDTH, height: CARD_HEIGHT });
      // Darken so white text stays legible over an arbitrary uploaded image.
      doc.rect(0, 0, CARD_WIDTH, CARD_HEIGHT).fillOpacity(0.38).fill("#0f172a");
      doc.fillOpacity(1);
    } catch {
      drawGradientBackground(doc, data);
    }
  } else {
    drawGradientBackground(doc, data);
  }

  const textRightEdge = data.photoUrl ? CARD_WIDTH - 55 : CARD_WIDTH - 14;

  doc
    .fillColor("#ffffff")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text(data.programName.toUpperCase(), 14, 14, { width: textRightEdge - 14, characterSpacing: 0.5 });

  if (photoBuffer) {
    const size = 38;
    const cx = CARD_WIDTH - 14 - size / 2;
    const cy = 14 + size / 2;
    try {
      doc.save();
      doc.circle(cx, cy, size / 2).clip();
      doc.image(photoBuffer, cx - size / 2, cy - size / 2, { width: size, height: size });
      doc.restore();
      doc.circle(cx, cy, size / 2).lineWidth(1.5).stroke("#ffffff");
    } catch {
      /* skip photo if it can't be decoded */
    }
  }

  doc
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(data.applicantName, 14, 38, { width: textRightEdge - 14 });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#ffffff", 0.9)
    .text(`Reg #: ${data.registrationNumber}`, 14, 60, { width: textRightEdge - 14 });

  let y = 76;
  for (const field of data.extraFields.slice(0, 3)) {
    doc
      .fontSize(7)
      .fillColor("#ffffff", 0.85)
      .text(`${field.label}: ${field.value}`, 14, y, { width: textRightEdge - 14 });
    y += 11;
  }

  if (data.validUntil) {
    doc.fontSize(6.5).fillColor("#ffffff", 0.75).text(`Valid until ${data.validUntil}`, 14, CARD_HEIGHT - 16);
  }

  if (data.verifyUrl) {
    const qrBuffer = await QRCode.toBuffer(data.verifyUrl, {
      margin: 0,
      width: 128,
      color: { dark: "#1e1b4b", light: "#ffffff" },
    });
    const qrSize = 56;
    doc.roundedRect(CARD_WIDTH - qrSize - 12, CARD_HEIGHT - qrSize - 12, qrSize + 6, qrSize + 6, 6).fill("#ffffff");
    doc.image(qrBuffer, CARD_WIDTH - qrSize - 9, CARD_HEIGHT - qrSize - 9, { width: qrSize, height: qrSize });
  }

  doc.end();
  return finished;
}

function drawGradientBackground(doc: PDFKit.PDFDocument, data: IdCardData) {
  const gradient = doc.linearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.stop(0, data.primaryColor).stop(1, data.secondaryColor);
  doc.rect(0, 0, CARD_WIDTH, CARD_HEIGHT).fill(gradient);

  doc.save();
  doc.circle(CARD_WIDTH - 20, -10, 55).fillOpacity(0.12).fill("#ffffff");
  doc.fillOpacity(1);
  doc.restore();
}
