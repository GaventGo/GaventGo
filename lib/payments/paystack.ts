// Server-only. Never import from a Client Component — relies on
// PAYSTACK_SECRET_KEY, which has no NEXT_PUBLIC_ prefix and must stay off
// the browser.

interface InitializeParams {
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl: string;
}

interface InitializeResult {
  ok: true;
  authorizationUrl: string;
}

interface FailureResult {
  ok: false;
  error: string;
}

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export async function initializeTransaction(
  params: InitializeParams
): Promise<InitializeResult | FailureResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return {
      ok: false,
      error:
        "Payment is not configured yet. Please contact the GaventGo team or try again later.",
    };
  }

  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountPesewas,
        reference: params.reference,
        callback_url: params.callbackUrl,
        currency: "GHS",
      }),
    });

    const json = await res.json();

    if (!res.ok || !json?.status || !json?.data?.authorization_url) {
      return {
        ok: false,
        error: json?.message || "Could not start payment. Please try again.",
      };
    }

    return { ok: true, authorizationUrl: json.data.authorization_url as string };
  } catch {
    return {
      ok: false,
      error: "Could not reach the payment provider. Please try again.",
    };
  }
}

export type PaystackVerification =
  | { ok: true; success: boolean; amountPesewas: number; reference: string }
  | { ok: false; error: string };

export async function verifyTransaction(
  reference: string
): Promise<PaystackVerification> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { ok: false, error: "Payment is not configured." };
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );

    const json = await res.json();

    if (!res.ok || !json?.status) {
      return { ok: false, error: json?.message || "Verification failed." };
    }

    return {
      ok: true,
      success: json.data?.status === "success",
      amountPesewas: json.data?.amount ?? 0,
      reference: json.data?.reference ?? reference,
    };
  } catch {
    return { ok: false, error: "Could not reach the payment provider." };
  }
}

export type PaystackRefund =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Issues a full refund for a transaction via Paystack's /refund endpoint.
 * Called from lib/actions/refunds.ts, only after the caller has already
 * been verified as the organizer of the event this order belongs to.
 */
export async function refundTransaction(
  reference: string
): Promise<PaystackRefund> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { ok: false, error: "Payment is not configured." };
  }

  try {
    const res = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction: reference }),
    });

    const json = await res.json();

    if (!res.ok || !json?.status) {
      return {
        ok: false,
        error: json?.message || "Paystack refused the refund request.",
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the payment provider." };
  }
}

/**
 * Verifies the Paystack webhook signature (HMAC-SHA512 of the raw request
 * body, keyed with the Paystack secret key) so we only act on requests that
 * genuinely came from Paystack.
 */
export async function isValidPaystackSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !signatureHeader) return false;

  const crypto = await import("node:crypto");
  const expected = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  return expected === signatureHeader;
}
