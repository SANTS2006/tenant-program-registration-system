export interface SubmissionSummary {
  programName: string;
  registrationNumber: string;
  applicantName: string | null;
  status: string;
  statusLabel?: string;
  kind?: "program" | "order_form";
  business?: { name: string; logoUrl: string | null; accentColor: string } | null;
  submittedAt: string;
  sections: { title: string; rows: { label: string; value: string }[] }[];
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isOrder = (data: SubmissionSummary) => data.kind === "order_form";
const numberLabel = (data: SubmissionSummary) => (isOrder(data) ? "Order number" : "Registration number");
const titleOf = (data: SubmissionSummary) => data.business?.name ?? data.programName;
const accentOf = (data: SubmissionSummary) => (/^#[0-9a-fA-F]{6}$/.test(data.business?.accentColor ?? "") ? data.business!.accentColor : "#2563eb");

function placedOn(data: SubmissionSummary) {
  return new Date(data.submittedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function facts(data: SubmissionSummary) {
  return [
    { label: numberLabel(data), value: data.registrationNumber },
    { label: "Status", value: data.statusLabel ?? data.status },
    { label: isOrder(data) ? "Placed" : "Submitted", value: placedOn(data) },
    ...(data.applicantName ? [{ label: "Name", value: data.applicantName }] : []),
  ];
}

/** A print-ready page of the answers; used for the preview and for printing. */
export function summaryHtml(data: SubmissionSummary): string {
  const accent = accentOf(data);
  const factRows = facts(data)
    .map((f) => `<div class="fact"><span>${escapeHtml(f.label)}</span><strong>${escapeHtml(f.value)}</strong></div>`)
    .join("");
  const sections = data.sections
    .map(
      (s) => `<section><h2>${escapeHtml(s.title)}</h2><table>${s.rows
        .map((r) => `<tr><th scope="row">${escapeHtml(r.label)}</th><td>${escapeHtml(r.value).replace(/\n/g, "<br>")}</td></tr>`)
        .join("")}</table></section>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    `${titleOf(data)} - ${data.registrationNumber}`,
  )}</title><style>
  *{box-sizing:border-box}body{margin:0;padding:32px;font-family:Poppins,Segoe UI,Arial,sans-serif;color:#0f172a;background:#fff}
  header{border-bottom:4px solid ${accent};padding-bottom:16px;margin-bottom:20px}
  header p{margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${accent};font-weight:600}
  header h1{margin:4px 0 0;font-size:24px}
  .facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:24px}
  .fact{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;background:#f8fafc}
  .fact span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
  .fact strong{display:block;margin-top:2px;font-size:15px;word-break:break-word}
  section{margin-bottom:20px;break-inside:avoid}
  h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${accent};margin:0 0 6px}
  table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0}
  th,td{padding:8px 10px;text-align:left;font-size:13px;vertical-align:top;border-bottom:1px solid #e2e8f0}
  th{width:38%;color:#475569;font-weight:500;background:#f8fafc}
  td{font-weight:600;word-break:break-word}
  footer{margin-top:24px;font-size:11px;color:#94a3b8}
  @media print{body{padding:0}}
  </style></head><body><header><p>${escapeHtml(isOrder(data) ? "Order details" : "Registration details")}</p><h1>${escapeHtml(titleOf(data))}</h1></header>
  <div class="facts">${factRows}</div>${sections}<footer>${escapeHtml(titleOf(data))} &middot; ${escapeHtml(data.registrationNumber)}</footer></body></html>`;
}

/** Prints the answers from an invisible frame, so the rest of the page is left out. */
export function printSummary(data: SubmissionSummary) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.srcdoc = summaryHtml(data);
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    window.setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}

/** The answers drawn onto a PNG picture, with the order (or registration) number at the top. */
export function summaryImage(data: SubmissionSummary): Promise<Blob> {
  const scale = 2;
  const width = 900;
  const pad = 40;
  const accent = accentOf(data);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas unavailable"));
  const font = (size: number, weight = 400) => `${weight} ${size}px Poppins, "Segoe UI", Arial, sans-serif`;

  const wrap = (text: string, maxWidth: number, f: string): string[] => {
    ctx.font = f;
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
        else {
          lines.push(line);
          line = word;
        }
      }
      lines.push(line);
    }
    return lines;
  };

  type Op = (y: number) => void;
  const ops: Op[] = [];
  let y = 0;
  const add = (height: number, draw: Op) => {
    const top = y;
    ops.push(() => draw(top));
    y += height;
  };

  add(10, (top) => {
    ctx.fillStyle = accent;
    ctx.fillRect(0, top, width, 10);
  });
  y += 30;
  add(18, (top) => {
    ctx.fillStyle = accent;
    ctx.font = font(13, 600);
    ctx.fillText((isOrder(data) ? "ORDER DETAILS" : "REGISTRATION DETAILS"), pad, top + 14);
  });
  for (const line of wrap(titleOf(data), width - pad * 2, font(28, 700))) {
    add(38, (top) => {
      ctx.fillStyle = "#0f172a";
      ctx.font = font(28, 700);
      ctx.fillText(line, pad, top + 28);
    });
  }
  y += 16;
  // The number and status stand out in a box, then the smaller facts follow.
  const [first, ...others] = facts(data);
  add(84, (top) => {
    ctx.fillStyle = "#f1f5f9";
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(pad, top, width - pad * 2, 84, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.font = font(12, 600);
    ctx.fillText(first!.label.toUpperCase(), pad + 20, top + 28);
    ctx.fillStyle = "#0f172a";
    ctx.font = font(28, 700);
    ctx.fillText(first!.value, pad + 20, top + 64);
  });
  y += 16;
  for (const fact of others) {
    add(28, (top) => {
      ctx.fillStyle = "#64748b";
      ctx.font = font(14);
      ctx.fillText(fact.label, pad, top + 18);
      ctx.fillStyle = "#0f172a";
      ctx.font = font(14, 600);
      ctx.fillText(fact.value, pad + 160, top + 18);
    });
  }
  y += 14;
  const labelWidth = 250;
  const valueWidth = width - pad * 2 - labelWidth - 20;
  for (const section of data.sections) {
    add(28, (top) => {
      ctx.fillStyle = accent;
      ctx.font = font(13, 700);
      ctx.fillText(section.title.toUpperCase(), pad, top + 18);
    });
    for (const row of section.rows) {
      const labelLines = wrap(row.label, labelWidth - 10, font(14));
      const valueLines = wrap(row.value, valueWidth, font(14, 600));
      const lines = Math.max(labelLines.length, valueLines.length);
      const height = lines * 22 + 14;
      add(height, (top) => {
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, top + height);
        ctx.lineTo(width - pad, top + height);
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.font = font(14);
        labelLines.forEach((l, i) => ctx.fillText(l, pad, top + 22 + i * 22));
        ctx.fillStyle = "#0f172a";
        ctx.font = font(14, 600);
        valueLines.forEach((l, i) => ctx.fillText(l, pad + labelWidth + 20, top + 22 + i * 22));
      });
    }
    y += 18;
  }
  add(30, (top) => {
    ctx.fillStyle = "#94a3b8";
    ctx.font = font(12);
    ctx.fillText(`${titleOf(data)} · ${data.registrationNumber}`, pad, top + 20);
  });

  canvas.width = width * scale;
  canvas.height = Math.ceil(y) * scale;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, y);
  ctx.textBaseline = "alphabetic";
  for (const op of ops) op(0);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not make the image"))), "image/png"));
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
