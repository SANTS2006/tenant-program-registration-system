import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, CameraOff, Keyboard, ScanLine, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { verifyRegistration, type VerificationResult } from "../public-registration/api";
import { DOCUMENT_LABELS } from "./api";

type ScanState =
  | { kind: "scanning" }
  | { kind: "checking" }
  | { kind: "result"; result: VerificationResult }
  | { kind: "error"; message: string };

/** Reads a verification link from a scanned code: /verify/<program>/<registration number>?doc=... */
function parseVerificationLink(text: string): { slug: string; registrationNumber: string; doc: string | null } | null {
  try {
    const url = new URL(text, window.location.origin);
    const match = url.pathname.match(/^\/verify\/([^/]+)\/([^/]+)\/?$/);
    if (!match) return null;
    return {
      slug: decodeURIComponent(match[1]!),
      registrationNumber: decodeURIComponent(match[2]!),
      doc: url.searchParams.get("doc"),
    };
  } catch {
    return null;
  }
}

/**
 * Scans ID card and ticket QR codes with the device camera and verifies them on the spot.
 * The check goes through the same verification as a phone's own camera app, so it is
 * logged in the Verifications table, credited to the signed-in team member.
 */
export function QrScannerDialog({
  open,
  onOpenChange,
  programId,
  programSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programSlug: string;
}) {
  const queryClient = useQueryClient();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [state, setState] = React.useState<ScanState>({ kind: "scanning" });
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [manual, setManual] = React.useState("");
  const [round, setRound] = React.useState(0);

  const check = React.useCallback(
    async (slug: string, registrationNumber: string, doc: string | null) => {
      setState({ kind: "checking" });
      try {
        const result = await verifyRegistration(slug, registrationNumber, doc);
        setState({ kind: "result", result });
        void queryClient.invalidateQueries({ queryKey: ["verifications", programId] });
      } catch {
        setState({ kind: "error", message: "Registration not found. This code doesn't match any registration." });
      }
    },
    [programId, queryClient],
  );

  // Camera and decoding run only while the dialog is open and waiting for a code.
  React.useEffect(() => {
    if (!open || state.kind !== "scanning") return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let frame = 0;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const [{ default: jsQR }, media] = await Promise.all([
          import("jsqr"),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }),
        ]);
        stream = media;
        if (stopped) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play();
        setCameraError(null);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const tick = () => {
          if (stopped) return;
          if (ctx && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
            // Decode a scaled-down frame: fast enough for phones, still sharp enough for QR codes.
            const scale = Math.min(1, 640 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, {
              inversionAttempts: "dontInvert",
            });
            if (code?.data) {
              const link = parseVerificationLink(code.data);
              if (link) {
                void check(link.slug, link.registrationNumber, link.doc);
              } else {
                setState({ kind: "error", message: "This QR code isn't from an ID card or ticket on this platform." });
              }
              return;
            }
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (err) {
        const denied = err instanceof DOMException && err.name === "NotAllowedError";
        setCameraError(
          denied
            ? "Camera access was blocked. Allow the camera for this site in your browser settings, or enter the number below."
            : "No camera is available on this device. Enter the registration number below instead.",
        );
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open, state.kind, round, check]);

  const scanAgain = () => {
    setManual("");
    setState({ kind: "scanning" });
    setRound((r) => r + 1);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) scanAgain();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Scan a QR code
          </DialogTitle>
          <DialogDescription>Point the camera at the QR code on an ID card or ticket.</DialogDescription>
        </DialogHeader>

        {(state.kind === "scanning" || state.kind === "checking") && (
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
              {cameraError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/80">
                  <CameraOff className="h-8 w-8" />
                  {cameraError}
                </div>
              ) : (
                <>
                  <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                  <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </>
              )}
              {state.kind === "checking" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-medium text-white">
                  Verifying...
                </div>
              )}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (manual.trim()) void check(programSlug, manual.trim(), null);
              }}
            >
              <div className="relative flex-1">
                <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Or enter a registration number"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline" disabled={!manual.trim()} loading={state.kind === "checking"}>
                Verify
              </Button>
            </form>
          </div>
        )}

        {state.kind === "result" && <ScanResult result={state.result} />}

        {state.kind === "error" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-destructive text-white">
              <ShieldX className="h-7 w-7" />
            </span>
            <p className="text-sm text-muted-foreground">{state.message}</p>
          </div>
        )}

        {(state.kind === "result" || state.kind === "error") && (
          <Button onClick={scanAgain} className="w-full">
            <ScanLine className="h-4 w-4" />
            Scan next
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScanResult({ result }: { result: VerificationResult }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full text-white ${
          result.valid ? "bg-gradient-success" : "bg-gradient-destructive"
        }`}
      >
        {result.valid ? <BadgeCheck className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
      </span>
      <div>
        <p className="text-lg font-semibold">{result.valid ? "Valid" : "Not valid"}</p>
        <p className="text-sm text-muted-foreground">{DOCUMENT_LABELS[result.documentType]}</p>
      </div>
      <dl className="grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl border border-border/70 p-4 text-left text-sm">
        <dt className="text-muted-foreground">Participant</dt>
        <dd className="font-medium">{result.applicantName ?? "—"}</dd>
        <dt className="text-muted-foreground">Registration #</dt>
        <dd className="font-medium">{result.registrationNumber}</dd>
        <dt className="text-muted-foreground">Program</dt>
        <dd className="font-medium">{result.programName}</dd>
        <dt className="text-muted-foreground">Status</dt>
        <dd className="font-medium capitalize">{result.status.replace("_", " ")}</dd>
        {result.details.map((detail) => (
          <React.Fragment key={detail.label}>
            <dt className="text-muted-foreground">{detail.label}</dt>
            <dd className="font-medium">{detail.value}</dd>
          </React.Fragment>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">Logged in the Verifications table.</p>
    </div>
  );
}
