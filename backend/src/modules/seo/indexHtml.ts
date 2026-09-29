import { readFileSync } from "node:fs";
import path from "node:path";
import * as programsRepo from "../programs/repository.js";

let template: string | null = null;

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Replaces the value of the attribute `attr` on the tag carrying `id` in index.html. */
function setById(html: string, id: string, attr: "content" | "href", value: string) {
  return html.replace(new RegExp(`(id="${id}"[^>]*?${attr}=")[^"]*(")`), `$1${escapeAttr(value)}$2`);
}

function setByProperty(html: string, property: string, value: string) {
  return html.replace(new RegExp(`(property="${property}"[^>]*?content=")[^"]*(")`), `$1${escapeAttr(value)}$2`);
}

const PROGRAM_PAGE = /^\/programs\/([^/?#]+)(\/register)?\/?(?:[?#].*)?$/;

/**
 * index.html for a client-side route. A shared program link gets that program's title,
 * description, and picture in the page itself, because WhatsApp, Facebook, and other link
 * previews don't run JavaScript.
 */
export async function indexHtmlFor(distDir: string, url: string, siteUrl: string): Promise<string | null> {
  const match = PROGRAM_PAGE.exec(url);
  if (!match) return null;
  template ??= readFileSync(path.join(distDir, "index.html"), "utf8");

  const program = await programsRepo.findProgramBySlug(decodeURIComponent(match[1]!)).catch(() => null);
  if (!program || program.status !== "published") return null;
  return programIndexHtml(template, program, siteUrl, !!match[2]);
}

type ProgramMeta = Pick<programsRepo.ProgramRow, "name" | "slug" | "shortDescription" | "description" | "thumbnailUrl">;

export function programIndexHtml(template: string, program: ProgramMeta, siteUrl: string, register: boolean): string {
  const title = register ? `Register for ${program.name}` : program.name;
  const description = (program.shortDescription ?? program.description ?? `Register for ${program.name} online.`).replace(/\s+/g, " ").slice(0, 200);
  const pageUrl = `${siteUrl.replace(/\/+$/, "")}/programs/${encodeURIComponent(program.slug)}${register ? "/register" : ""}`;

  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(`${title} | Program Registration Platform`)}</title>`);
  html = setById(html, "robots-meta", "content", "index, follow");
  html = setById(html, "description-meta", "content", description);
  html = setById(html, "canonical-link", "href", pageUrl);
  html = setById(html, "og-title", "content", title);
  html = setById(html, "og-description", "content", description);
  html = setById(html, "og-url", "content", pageUrl);
  html = setById(html, "twitter-title", "content", title);
  html = setById(html, "twitter-description", "content", description);
  if (program.thumbnailUrl) {
    html = setByProperty(html, "og:image", program.thumbnailUrl);
    html = setByProperty(html, "og:image:alt", program.name);
    html = html.replace(/(name="twitter:image"[^>]*?content=")[^"]*(")/, `$1${escapeAttr(program.thumbnailUrl)}$2`);
    // The site's own picture sizes no longer apply.
    html = html.replace(/\s*<meta property="og:image:(width|height)"[^>]*>/g, "");
  }
  return html;
}
