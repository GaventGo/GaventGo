"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import jsQR from "jsqr";
import { scanTicket } from "@/lib/actions/scan";
import type { ScanTicketPayload } from "@/types/database";

type ViewState =
  | { kind: "scanning" }
  | { kind: "result"; payload: ScanTicketPayload }
  | { kind: "error"; message: string };

export default function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const processingRef = useRef(false); // guards against re-submitting the same frame while a scan is in flight

  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ kind: "scanning" });
  const [isPending, startTransition] = useTransition();

  const submitCode = useCallback((code: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    startTransition(async () => {
      const result = await scanTicket(code);
      if (result.error || !result.payload) {
        setView({
          kind: "error",
          message: result.error ?? "Couldn't scan this ticket.",
        });
      } else {
        setView({ kind: "result", payload: result.payload });
      }
      processingRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (view.kind !== "scanning") return; // camera loop pauses while a result is shown

    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraError(null);
        tick();
      } catch {
        setCameraError(
          "Couldn't access the camera. You can still enter a code manually below."
        );
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code?.data) {
        submitCode(code.data);
        return; // effect cleans up + re-runs once view leaves "scanning"
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [view.kind, submitCode]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) submitCode(manualCode.trim());
  }

  function scanNext() {
    setManualCode("");
    setView({ kind: "scanning" });
  }

  if (view.kind === "result" || view.kind === "error") {
    return <ResultPanel view={view} onScanNext={scanNext} />;
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-ink">
        <video
          ref={videoRef}
          className="aspect-square w-full object-cover"
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />
        <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/60" />
      </div>

      {cameraError && (
        <p className="mt-3 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {cameraError}
        </p>
      )}

      <form onSubmit={handleManualSubmit} className="mt-6 flex gap-3">
        <input
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Or enter the ticket code manually"
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
        />
        <button
          type="submit"
          disabled={isPending || !manualCode.trim()}
          className="shrink-0 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Check in
        </button>
      </form>
    </div>
  );
}

function ResultPanel({
  view,
  onScanNext,
}: {
  view:
    | { kind: "result"; payload: ScanTicketPayload }
    | { kind: "error"; message: string };
  onScanNext: () => void;
}) {
  if (view.kind === "error") {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-3xl text-error">
          !
        </span>
        <h2 className="mt-4 text-lg font-bold text-ink">Couldn&apos;t check in</h2>
        <p className="mt-2 text-sm text-ink/50">{view.message}</p>
        <button
          type="button"
          onClick={onScanNext}
          className="mt-6 rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
        >
          Scan next ticket
        </button>
      </div>
    );
  }

  const { payload } = view;

  const tone =
    payload.result === "success"
      ? { icon: "✓", classes: "bg-success/10 text-success", title: "Checked in" }
      : payload.result === "already_scanned"
        ? {
            icon: "!",
            classes: "bg-orange-50 text-orange-700",
            title: "Already checked in",
          }
        : payload.result === "not_paid"
          ? {
              icon: "!",
              classes: "bg-error/10 text-error",
              title: "Not paid",
            }
          : { icon: "×", classes: "bg-error/10 text-error", title: "Invalid ticket" };

  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-card">
      <span
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-3xl ${tone.classes}`}
      >
        {tone.icon}
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink">{tone.title}</h2>

      {payload.event_title && (
        <p className="mt-1 text-sm text-ink/50">{payload.event_title}</p>
      )}

      {(payload.result === "success" || payload.result === "already_scanned") && (
        <dl className="mt-5 space-y-2 text-left text-sm">
          {payload.ticket_type_name && (
            <div className="flex justify-between">
              <dt className="text-ink/40">Ticket type</dt>
              <dd className="font-semibold text-ink">
                {payload.ticket_type_name}
              </dd>
            </div>
          )}
          {payload.holder_name && (
            <div className="flex justify-between">
              <dt className="text-ink/40">Holder</dt>
              <dd className="font-semibold text-ink">{payload.holder_name}</dd>
            </div>
          )}
          {typeof payload.quantity === "number" && (
            <div className="flex justify-between">
              <dt className="text-ink/40">Quantity</dt>
              <dd className="font-semibold text-ink">{payload.quantity}</dd>
            </div>
          )}
          {payload.wristband_id && (
            <div className="flex justify-between">
              <dt className="text-ink/40">Wristband</dt>
              <dd className="font-semibold text-ink">{payload.wristband_id}</dd>
            </div>
          )}
          {payload.scanned_at && (
            <div className="flex justify-between">
              <dt className="text-ink/40">Scanned at</dt>
              <dd className="font-semibold text-ink">
                {new Date(payload.scanned_at).toLocaleTimeString("en-GB")}
              </dd>
            </div>
          )}
        </dl>
      )}

      <button
        type="button"
        onClick={onScanNext}
        className="mt-6 rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
      >
        Scan next ticket
      </button>
    </div>
  );
}
