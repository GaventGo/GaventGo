"use client";

import { useState, useTransition } from "react";
import { initiatePayment } from "@/lib/actions/payments";

export default function PaymentButton({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const result = await initiatePayment(orderId);
      if (result.error || !result.authorizationUrl) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      window.location.href = result.authorizationUrl;
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePay}
        disabled={isPending}
        className="w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Redirecting to Paystack…" : "Pay with Paystack"}
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}
