import { headers } from "next/headers";
import type { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailConfigured } from "@/lib/email/resend";

function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  // Same fallback pattern as lib/actions/payments.ts. Guarded because
  // headers() throws if called outside a request scope, and a missing
  // origin should degrade the email link, not break settlement.
  try {
    const h = headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    return host ? `${proto}://${host}` : "";
  } catch {
    return "";
  }
}

/**
 * Sends the customer a receipt after their order settles. Best-effort and
 * non-blocking by design: called (not awaited-to-fail) from
 * settleOrderByReference right after issueTicketsForOrder, and any error
 * here — missing API key, Resend down, whatever — is swallowed so it can
 * never turn a successful payment into a failed one. Links to the
 * customer's ticket page rather than embedding QR images inline, since
 * inline images are unreliable across email clients and the ticket page is
 * already the single source of truth for the QR.
 */
export async function sendTicketConfirmationEmail(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string
) {
  if (!emailConfigured()) return;

  try {
    const { data: order } = await admin
      .from("orders")
      .select(
        "id, total_amount, user_id, events(title, event_date, venue, city), order_items(id, ticket_types(name)), profiles(email, full_name)"
      )
      .eq("id", orderId)
      .single();

    if (!order) return;

    const profile = (order as any).profiles as {
      email: string;
      full_name: string;
    } | null;
    const event = (order as any).events as {
      title: string;
      event_date: string;
      venue: string;
      city: string;
    } | null;
    const items = ((order as any).order_items ?? []) as {
      id: string;
      ticket_types: { name: string } | null;
    }[];

    if (!profile?.email || !event) return;

    const origin = siteOrigin();
    const ticketLines = items
      .map(
        (item) =>
          `<li style="margin-bottom:6px;">${
            item.ticket_types?.name ?? "Ticket"
          } — <a href="${origin}/account/tickets/${item.id}">View ticket & QR code</a></li>`
      )
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="margin-bottom:4px;">You're going to ${event.title}!</h2>
        <p style="color:#555;margin-top:0;">
          ${new Date(event.event_date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })} · ${event.venue}, ${event.city}
        </p>
        <p>Hi ${profile.full_name || "there"}, your order is confirmed.</p>
        <p style="font-weight:bold;">Total paid: GH₵${order.total_amount}</p>
        <p>Your ticket${items.length > 1 ? "s" : ""}:</p>
        <ul style="padding-left:18px;">${ticketLines}</ul>
        <p style="color:#888;font-size:13px;margin-top:24px;">
          Each ticket link shows your unique QR code for check-in at the
          door. You can also find all your tickets any time under
          <a href="${origin}/account">My account</a> on GaventGo.
        </p>
      </div>
    `;

    await sendEmail({
      to: profile.email,
      subject: `Your tickets for ${event.title}`,
      html,
    });
  } catch {
    // Never let an email failure surface as a settlement failure.
  }
}
