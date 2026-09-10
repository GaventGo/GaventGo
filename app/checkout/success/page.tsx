import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { settleOrderByReference } from "@/lib/payments/settle";

const COPY: Record<string, { title: string; body: string; tone: "success" | "error" | "pending" }> = {
  paid: {
    title: "Payment successful",
    body: "Your order is confirmed. Ticket details will be available after payment processing finishes.",
    tone: "success",
  },
  pending: {
    title: "Payment pending",
    body: "We haven't received confirmation from Paystack yet. This page will catch up once the payment is confirmed — check your account shortly.",
    tone: "pending",
  },
  failed: {
    title: "Payment didn't go through",
    body: "The amount didn't match or the payment failed. No charge should have been made — please try again from your account.",
    tone: "error",
  },
  not_found: {
    title: "We couldn't find that order",
    body: "This payment reference doesn't match an order on GaventGo.",
    tone: "error",
  },
  error: {
    title: "Something went wrong",
    body: "We couldn't verify this payment right now. If you were charged, it will still be reconciled automatically shortly.",
    tone: "error",
  },
};

const toneClasses: Record<string, string> = {
  success: "bg-success/10 text-success",
  error: "bg-error/10 text-error",
  pending: "bg-orange-50 text-orange-700",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { reference?: string };
}) {
  const reference = searchParams.reference;

  const result = reference
    ? await settleOrderByReference(reference)
    : ({ status: "not_found" } as const);

  const copy = COPY[result.status] ?? COPY.error;

  return (
    <>
      <Navbar />
      <main className="container-page flex justify-center py-16">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-card">
          <span
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-2xl ${toneClasses[copy.tone]}`}
          >
            {copy.tone === "success" ? "✓" : copy.tone === "pending" ? "…" : "!"}
          </span>
          <h1 className="mt-4 text-lg font-bold text-ink">{copy.title}</h1>
          <p className="mt-2 text-sm text-ink/50">{copy.body}</p>

          <Link
            href="/account"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Go to my account
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
