import poppinsRegular from "@fontsource/poppins/files/poppins-latin-400-normal.woff2?url";
import poppinsBold from "@fontsource/poppins/files/poppins-latin-700-normal.woff2?url";
import poppinsItalic from "@fontsource/poppins/files/poppins-latin-400-italic.woff2?url";
import poppinsBoldItalic from "@fontsource/poppins/files/poppins-latin-700-italic.woff2?url";
import { ApiError, getAccessToken } from "@/lib/api";

export type DocumentKind = "id-card" | "ticket";

interface RenderedDocument {
  svg: string;
  fileName: string;
}

/** Pixels per design unit: cards and tickets are saved at print-friendly resolution. */
const SCALE = 4;
const GAP = 48;

/** Fetches a rendered card side or ticket as SVG, with the file name the server chose for it. */
async function fetchDocumentSvg(path: string, authenticated: boolean): Promise<RenderedDocument> {
  const token = authenticated ? getAccessToken() : null;
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/svg+xml")) {
    throw new ApiError("DOWNLOAD_FAILED", "This document isn't available to download", response.status);
  }
  const header = response.headers.get("x-download-name");
  return { svg: await response.text(), fileName: header ? decodeURIComponent(header) : "document.png" };
}

let fontCss: Promise<string> | null = null;

/** Poppins as inline @font-face rules: an SVG drawn as an image can't load the page's fonts. */
function embeddedFontCss(): Promise<string> {
  fontCss ??= Promise.all(
    [
      [poppinsRegular, "normal", 400],
      [poppinsBold, "normal", 700],
      [poppinsItalic, "italic", 400],
      [poppinsBoldItalic, "italic", 700],
    ].map(async ([url, style, weight]) => {
      const blob = await (await fetch(url as string)).blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      return `@font-face{font-family:Poppins;font-style:${style};font-weight:${weight};src:url(${dataUrl}) format("woff2");}`;
    }),
  ).then((rules) => rules.join(""));
  return fontCss;
}

function viewBoxSize(svg: string): { width: number; height: number } {
  const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return { width: Number(match?.[1] ?? 300), height: Number(match?.[2] ?? 150) };
}

async function svgToImage(svg: string, fonts: string): Promise<{ image: HTMLImageElement; width: number; height: number }> {
  const { width, height } = viewBoxSize(svg);
  // Give the SVG an explicit size and the fonts it needs before drawing it.
  const sized = svg.replace(
    "<svg ",
    `<svg width="${width * SCALE}" height="${height * SCALE}" `,
  ).replace("<defs>", `<defs><style>${fonts}</style>`);
  const image = new Image();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not draw the document"));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
  });
  return { image, width: width * SCALE, height: height * SCALE };
}

/** Draws the pieces side by side (an ID card's front and back) into one PNG and saves it. */
async function savePng(svgs: string[], fileName: string) {
  const fonts = await embeddedFontCss();
  const images = await Promise.all(svgs.map((svg) => svgToImage(svg, fonts)));
  const padding = images.length > 1 ? GAP : 0;
  const width = images.reduce((sum, img) => sum + img.width, 0) + padding * (images.length + 1);
  const height = Math.max(...images.map((img) => img.height)) + padding * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't create images");
  if (images.length > 1) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  let x = padding;
  for (const { image, width: w, height: h } of images) {
    ctx.drawImage(image, x, padding, w, h);
    x += w + padding;
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create the image");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads a registrant's ID card (front and back together) or ticket as a PNG named
 * "<Name>-ID-Card-<code>.png" or "<Name>-Ticket-<code>.png".
 */
export async function downloadDocumentImage(
  kind: DocumentKind,
  basePath: string,
  { authenticated = false }: { authenticated?: boolean } = {},
) {
  if (kind === "ticket") {
    const ticket = await fetchDocumentSvg(`${basePath}/ticket?format=svg`, authenticated);
    return savePng([ticket.svg], ticket.fileName);
  }
  const [front, back] = await Promise.all([
    fetchDocumentSvg(`${basePath}/id-card?format=svg&side=front`, authenticated),
    fetchDocumentSvg(`${basePath}/id-card?format=svg&side=back`, authenticated),
  ]);
  return savePng([front.svg, back.svg], front.fileName);
}
