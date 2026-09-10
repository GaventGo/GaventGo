import { sendEmail, emailConfigured } from "@/lib/email/resend";
import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sends the customer a notification after their order is refunded. Same
 * best-effort, non-blocking pattern as sendTicketConfirmationEmail: any
 * failure here is swallowed so a refund can never fail or roll back
 * because an email didn't go out. Called from refundOrder() right after
 * Paystack confirms the refund and the order status is updated.
 */
export async function sendRefundEmail(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string
) {
  if (!emailConfigured()) return;

  try {
    const { data: order } = await admin
      .from("orders")
      .select("total_amount, events(title), profiles(email, full_name)")
      .eq("id", orderId)
      .single();

    if (!order) return;

    const profile = (order as any).profiles as {
      email: string;
      full_name: string;
    } | null;
    const event = (order as any).events as { title: string } | null;

    if (!profile?.email || !event) return;

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="margin-bottom:4px;">Your order has been refunded</h2>
        <p>Hi ${profile.full_name || "there"},</p>
        <p>
          Your order for <strong>${event.title}</strong> has been refunded.
          GH₵${order.total_amount} will be returned to your original
          payment method — Paystack typically takes a few business days
          to complete this.
        </p>
        <p style="color:#888;font-size:13px;margin-top:24px;">
          Your ticket(s) for this order are no longer valid for entry. If
          you have any questions about this refund, please contact the
          event organizer.
        </p>
      </div>
    `;

    await sendEmail({
      to: profile.email,
      subject: `Refund confirmed for ${event.title}`,
      html,
    });
  } catch {
    // Never let an email failure surface as a refund failure.
  }
}
