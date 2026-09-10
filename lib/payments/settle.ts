import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/payments/paystack";
import { generateQrToken } from "@/lib/tickets/qr";
import { sendTicketConfirmationEmail } from "@/lib/email/ticketConfirmation";

export type SettleResult =
  | { status: "paid" }
  | { status: "failed" }
  | { status: "pending" }
  | { status: "not_found" }
  | { status: "error"; error: string };

/**
 * Assigns a fresh QR token to every order_item on this order that doesn't
 * already have one. Only ever meant to run against orders that are truly
 * 'paid' — callers are responsible for checking that first. Guarded by
 * `.is("qr_code", null)` so it's safe to call more than once, including
 * from settleOrderByReference's own idempotent branch and from the
 * customer ticket page's recovery path (app/account/tickets/[orderItemId])
 * for any row that ended up 'paid' without going through settlement at all
 * — e.g. a manual status edit in the SQL Editor during testing, which is
 * exactly how the QR-code-missing bug this recovery path fixes was
 * originally produced. Exported so both call sites share this one
 * implementation rather than duplicating the issuance logic.
 */
export async function issueTicketsForOrder(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string
) {
  const { data: items } = await admin
    .from("order_items")
    .select("id")
    .eq("order_id", orderId)
    .is("qr_code", null);

  let issuedCount = 0;
  for (const item of items ?? []) {
    const { error } = await admin
      .from("order_items")
      .update({ qr_code: generateQrToken() })
      .eq("id", item.id)
      .is("qr_code", null);
    if (!error) issuedCount += 1;
  }

  // Send the confirmation email only the first time tickets are actually
  // issued for this order — not on every idempotent re-check — so a
  // customer never gets duplicate receipts from the webhook and the
  // checkout success page both settling the same order.
  if (issuedCount > 0) {
    await sendTicketConfirmationEmail(admin, orderId);
  }
}

/**
 * The single place an order is ever transitioned to 'paid'. Called from the
 * Paystack webhook (primary, reliable path) and from the checkout success
 * page (best-effort immediate UI feedback) — both funnel through here so
 * there's exactly one settlement code path, not two copies that could drift.
 *
 * Always re-verifies with Paystack server-to-server and cross-checks the
 * amount against our own order record before trusting anything — never
 * marks an order paid just because a client reached a "success" URL.
 */
export async function settleOrderByReference(
  reference: string
): Promise<SettleResult> {
  const verification = await verifyTransaction(reference);

  if (!verification.ok) {
    return { status: "error", error: verification.error };
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, total_amount")
    .eq("payment_reference", reference)
    .single();

  if (!order) {
    return { status: "not_found" };
  }

  // Idempotent: webhook and success-page can both call this for the same
  // reference without double-processing.
  if (order.status === "paid") {
    await issueTicketsForOrder(admin, order.id); // covers a rare crash-after-paid-before-issue case
    return { status: "paid" };
  }

  if (!verification.success) {
    return { status: "pending" };
  }

  const expectedPesewas = Math.round(Number(order.total_amount) * 100);
  if (verification.amountPesewas !== expectedPesewas) {
    await admin
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id)
      .eq("status", "pending");
    return { status: "failed" };
  }

  await admin
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id)
    .eq("status", "pending");

  await issueTicketsForOrder(admin, order.id);

  return { status: "paid" };
}
