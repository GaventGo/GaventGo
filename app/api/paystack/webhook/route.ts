import { NextResponse } from "next/server";
import { isValidPaystackSignature } from "@/lib/payments/paystack";
import { settleOrderByReference } from "@/lib/payments/settle";

/**
 * Paystack calls this after a transaction completes. This is the primary,
 * trusted source of truth for marking an order 'paid' — the checkout
 * success page (app/checkout/success/page.tsx) also calls the same
 * settlement code for immediate UI feedback, but if the customer closes
 * their browser before that page loads, this webhook is what still gets
 * the order settled correctly.
 *
 * All settlement logic — verifying with Paystack, checking the amount,
 * flipping order status, issuing QR codes — lives in
 * settleOrderByReference() (lib/payments/settle.ts). This route does
 * nothing but authenticate the request and hand off the reference; there
 * is deliberately no second copy of that logic here.
 *
 * Configure this exact path — /api/paystack/webhook — as the webhook URL
 * in the Paystack dashboard (Settings → API Keys & Webhooks).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const valid = await isValidPaystackSignature(rawBody, signature);
  if (!valid) {
    // Wrong/missing signature — never process an unverified request, even
    // if the payload looks plausible.
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const reference: string | undefined = payload?.data?.reference;

  if (payload?.event === "charge.success" && reference) {
    // settleOrderByReference is idempotent (checks order.status === "paid"
    // and short-circuits, re-issuing only any missing QR codes) — so
    // Paystack retrying this webhook, or it arriving after the success
    // page already settled the same order, never double-processes or
    // issues duplicate QR codes.
    const result = await settleOrderByReference(reference);

    if (result.status === "error") {
      // Paystack verification itself failed (e.g. transient network issue
      // on our side calling their API) — ask Paystack to retry later
      // rather than silently swallowing it.
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
  }

  // Any other event type, or a charge.success with no reference, is
  // acknowledged but ignored — not every Paystack event is one we act on.
  return NextResponse.json({ received: true });
}
