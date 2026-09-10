"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelEvent } from "@/lib/actions/events";

export default function CancelEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const result = await cancelEvent(eventId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      setConfirming(false);
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-error/30 px-4 py-1.5 text-xs font-semibold text-error transition hover:bg-error/10"
      >
        Cancel event
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-xs">
      <p className="font-medium text-error">
        This will cancel the event and automatically refund every paid
        order. This can't be undone.
      </p>
      {error && <p className="mt-1 font-medium text-error">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={handleConfirm}
          className="rounded-full bg-error px-4 py-1.5 font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Cancelling…" : "Yes, cancel & refund everyone"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full border border-black/10 px-4 py-1.5 font-semibold text-ink"
        >
          Never mind
        </button>
      </div>
    </div>
  );
}
