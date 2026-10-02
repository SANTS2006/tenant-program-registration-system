import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { importRegistrations, previewRegistrationImport, type ExistingRows, type ImportPreview, type ImportResult } from "./api";

const NONE = "__skip";
const MAX_BYTES = 5 * 1024 * 1024;

/** The file as base64 text, which is how it travels to the server. */
function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("The file could not be read"));
    reader.readAsDataURL(file);
  });
}

function Issues({ title, items, tone }: { title: string; items: ImportResult["errors"]; tone: "error" | "warn" }) {
  if (items.length === 0) return null;
  return (
    <div className={`flex flex-col gap-1.5 rounded-lg border p-3 text-sm ${tone === "error" ? "border-destructive/30 bg-destructive/10" : "border-amber-500/30 bg-amber-500/10"}`}>
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </p>
      <ul className="max-h-40 list-disc overflow-y-auto pl-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item.row}>
            <span className="font-medium text-foreground">Row {item.row}:</span> {item.messages.join("; ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Brings registrations in from an Excel sheet, CSV file or Word table: upload the document, match its
 * columns to the form's questions, check the data, then import the rows that pass.
 */
export function ImportRegistrationsDialog({ programId, termLabel }: { programId: string; termLabel: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<"reading" | "checking" | "importing" | null>(null);
  const [file, setFile] = React.useState<{ name: string; content: string } | null>(null);
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [check, setCheck] = React.useState<ImportResult | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [existing, setExisting] = React.useState<ExistingRows>("skip");

  const reset = () => {
    setBusy(null);
    setFile(null);
    setPreview(null);
    setMapping({});
    setCheck(null);
    setResult(null);
    setExisting("skip");
  };

  const onFile = async (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > MAX_BYTES) return toast.error("The file is too large. The limit is 5 MB.");
    setBusy("reading");
    try {
      const content = await readBase64(picked);
      const data = await previewRegistrationImport(programId, picked.name, content);
      setFile({ name: picked.name, content });
      setPreview(data);
      setMapping(data.mapping);
      setCheck(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "That file could not be read");
    } finally {
      setBusy(null);
    }
  };

  const setColumn = (index: number, fieldKey: string) => {
    setCheck(null);
    setMapping((prev) => {
      const next = { ...prev };
      // A question can only take its answers from one column.
      for (const [col, key] of Object.entries(next)) if (key === fieldKey && Number(col) !== index) delete next[col];
      if (fieldKey === NONE) delete next[String(index)];
      else next[String(index)] = fieldKey;
      return next;
    });
  };

  const run = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(dryRun ? "checking" : "importing");
    try {
      const data = await importRegistrations(programId, file.name, file.content, mapping, dryRun, existing);
      if (dryRun) setCheck(data);
      else {
        setResult(data);
        await queryClient.invalidateQueries({ queryKey: ["registrations", programId] });
        toast.success(`${data.imported} imported, ${data.updated} updated`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "The import did not work");
    } finally {
      setBusy(null);
    }
  };

  const mappedKeys = new Set(Object.values(mapping));
  const missingRequired = preview?.fields.filter((f) => f.required && !mappedKeys.has(f.fieldKey)) ?? [];
  const mappedCount = Object.keys(mapping).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Import {termLabel} from a document</DialogTitle>
          <DialogDescription>
            Upload an Excel sheet (.xlsx or .csv) or a Word document (.docx) with a table. The first row must hold the column names. Nobody is emailed
            about imported rows.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-gradient-brand-soft p-4">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="text-base font-semibold">
                  {result.imported} imported{result.updated > 0 || existing !== "skip" ? `, ${result.updated} updated` : ""}
                </p>
                <p className="text-muted-foreground">
                  {result.errors.length + result.skipped.length > 0
                    ? `${result.errors.length + result.skipped.length} of ${result.total} rows were left out.`
                    : `All ${result.total} rows were imported or updated.`}
                </p>
              </div>
            </div>
            <Issues title="Rows with problems (not imported)" items={result.errors} tone="error" />
            <Issues title="Rows skipped" items={result.skipped} tone="warn" />
            <Issues title="Imported with required answers missing (open the registration and choose Edit answers)" items={result.incomplete} tone="warn" />
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : !preview ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input px-6 py-10 text-center text-sm text-muted-foreground hover:bg-muted/40">
            {busy === "reading" ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <FileUp className="h-6 w-6 text-primary" />}
            <span className="font-medium text-foreground">{busy === "reading" ? "Reading the document..." : "Choose a document to import"}</span>
            <span>.xlsx, .csv or .docx, up to 5 MB and 500 rows</span>
            <input
              type="file"
              className="sr-only"
              accept=".xlsx,.csv,.docx"
              disabled={busy !== null}
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{file?.name}</span> has {preview.totalRows} rows. Match each column to the question it answers.
              Columns set to &ldquo;Don&apos;t import&rdquo; are ignored.
            </p>

            <div className="divide-y divide-border/60 rounded-lg border border-border/60">
              {preview.headers.map((header, index) => (
                <div key={index} className="grid gap-2 px-3 py-2 sm:grid-cols-[1fr_1fr] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{header}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {preview.sampleRows
                        .slice(0, 2)
                        .map((r) => r[index])
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <Select value={mapping[String(index)] ?? NONE} onValueChange={(v) => setColumn(index, v)}>
                    <SelectTrigger aria-label={`Question for column ${header}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Don&apos;t import</SelectItem>
                      {preview.fields.map((f) => (
                        <SelectItem key={f.fieldKey} value={f.fieldKey}>
                          {f.label}
                          {f.required ? " *" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {missingRequired.length > 0 && (
              <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Required questions with no column: <span className="font-medium">{missingRequired.map((f) => f.label).join(", ")}</span>. Rows will be left
                  out unless these are matched.
                </span>
              </p>
            )}

            <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">If a row matches a registration this program already has</p>
              <Select
                value={existing}
                onValueChange={(v) => {
                  setExisting(v as ExistingRows);
                  setCheck(null);
                }}
              >
                <SelectTrigger aria-label="What to do with rows that match an existing registration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Add every row as a new registration</SelectItem>
                  <SelectItem value="update">Update the existing registration, and add the rows with no match</SelectItem>
                  <SelectItem value="update_only">Only update existing registrations; ignore rows with no match</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {existing === "skip"
                  ? "If the program allows one registration per email, rows whose email is already registered are skipped."
                  : "A row finds its registration by the registration number column, or else by the email. Only the answers in your document change; empty cells and other questions keep what they had."}
              </p>
            </div>

            {check && (
              <div className="flex flex-col gap-3">
                <p className="text-sm">
                  <span className="font-semibold">{check.valid}</span> of {check.total} rows are ready:{" "}
                  <span className="font-medium">{check.willCreate}</span> new{existing !== "skip" && (
                    <>
                      , <span className="font-medium">{check.willUpdate}</span> updates
                    </>
                  )}.
                </p>
                <Issues title="Rows with problems (will not be imported)" items={check.errors} tone="error" />
                <Issues title="Rows that will be skipped" items={check.skipped} tone="warn" />
                <Issues title="Will be imported with required answers still missing (fill them in by editing the registration)" items={check.incomplete} tone="warn" />
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={reset} disabled={busy !== null}>
                Choose another file
              </Button>
              <Button variant="outline" onClick={() => run(true)} loading={busy === "checking"} disabled={busy !== null || mappedCount === 0}>
                Check the data
              </Button>
              <Button onClick={() => run(false)} loading={busy === "importing"} disabled={busy !== null || mappedCount === 0 || (check !== null && check.valid === 0)}>
                {check ? `${existing === "skip" ? "Import" : "Import / update"} ${check.valid}` : existing === "skip" ? "Import" : "Import / update"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
