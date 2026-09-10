"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundTransaction } from "@/lib/payments/paystack";
import { sendRefundEmail } from "@/lib/email/refundConfirmation";

export interface RefundResult {
  error: string | null;
  success: boolean;
}

/**
 * Does the actual refund work for one order: Paystack call, status update,
 * confirmation email. Shared by refundOrder() below (single order,
 * organizer-initiated, permission-checked against that one order) and by
 * cancelEvent() in lib/actions/events.ts (bulk, after event-level ownership
 * is already confirmed once for the whole batch) — extracted so both share
 * one implementation instead of duplicating the Paystack-call-plus-email
 * sequence. Not itself permission-checked; callers must confirm the caller
 * is authorized before calling this.
 */
export async function performRefund(
  admin: ReturnType<typeof createAdminClient>,
  order: { id: string; status: string; payment_reference: string | null }
): Promise<RefundResult> {
  if (order.status !== "paid") {
    return {
      error: `Only paid orders can be refunded (this order is ${order.status}).`,
      success: false,
    };
  }

  if (!order.payment_reference) {
    return {
      error: "This order has no payment reference to refund.",
      success: false,
    };
  }

  const refund = await refundTransaction(order.payment_reference);
  if (!refund.ok) {
    return { error: refund.error, success: false };
  }

  const { data: updated } = await admin
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", order.id)
    .eq("status", "paid")
    .select("id");

  // Only send the email if this call actually flipped the status (guards
  // against a double-click or retry sending two refund emails for the
  // same refund).
  if (updated && updated.length > 0) {
    await sendRefundEmail(admin, order.id);
  }

  return { error: null, success: true };
}

/**
 * Refunds a full order: calls Paystack's refund API, then marks the order
 * 'refunded'. Only the organizer who owns the order's event may do this —
 * checked here explicitly (not via RLS, since organizers have no standing
 * read access to other people's orders; same pattern used for the
 * checked-in count on the event management page).
 *
 * A refunded order's status is no longer 'paid', so scan_ticket() already
 * refuses to check in any of its tickets going forward — no separate
 * "void the QR codes" step is needed.
 */
export async function refundOrder(orderId: string): Promise<RefundResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in.", success: false };
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, payment_reference, events(organizer_id)")
    .eq("id", orderId)
    .single();

  if (!order) {
    return { error: "Order not found.", success: false };
  }

  const organizerId = (order as unknown as { events: { organizer_id: string } | null })
    .events?.organizer_id;

  if (!organizerId || organizerId !== user.id) {
    return {
      error: "You don't have permission to refund this order.",
      success: false,
    };
  }

  return performRefund(admin, order);
}
