import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TicketCard from "@/components/tickets/TicketCard";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderQrDataUrl } from "@/lib/tickets/qr";
import { issueTicketsForOrder } from "@/lib/payments/settle";

export default async function TicketDisplayPage({
  params,
}: {
  params: { orderItemId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/account/tickets/${params.orderItemId}`);
  }

  const { data: item } = await supabase
    .from("order_items")
    .select(
      "*, ticket_types(name), orders(id, status, user_id, events(title, event_date, event_time, venue, city))"
    )
    .eq("id", params.orderItemId)
    .single();

  if (!item) {
    notFound();
  }

  const typedItem = item as any;

  // RLS (order_items_select_own) already scopes this, but check explicitly
  // too — same belt-and-suspenders pattern as the rest of the app.
  if (typedItem.orders?.user_id !== user.id) {
    notFound();
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as { full_name: string | null } | null;

  const order = typedItem.orders;
  const event = order?.events;

  // Recovery path: an order can end up 'paid' with no qr_code if its
  // status was ever set outside settleOrderByReference (a manual SQL edit
  // during testing is the known real-world case) — the normal settlement
  // flow is already idempotent and self-healing, but this covers rows that
  // never went through it at all. Safe to call unconditionally here: it's
  // a no-op for any order_item that already has a qr_code.
  let qrCode: string | null = typedItem.qr_code;

  if (order?.status === "paid" && !qrCode) {
    const admin = createAdminClient();
    await issueTicketsForOrder(admin, order.id);

    const { data: refreshedRaw } = await admin
      .from("order_items")
      .select("qr_code")
      .eq("id", typedItem.id)
      .single();

    const refreshed = refreshedRaw as { qr_code: string | null } | null;

    qrCode = refreshed?.qr_code ?? null;
  }

  if (order?.status !== "paid" || !qrCode) {
    return (
      <>
        <Navbar />
        <main className="container-page flex justify-center py-16">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-card">
            <h1 className="text-lg font-bold text-ink">
              Ticket not available yet
            </h1>
            <p className="mt-2 text-sm text-ink/50">
              This ticket will appear here once payment is confirmed.
            </p>
            {order && (
              <Link
                href={`/checkout/${order.id}`}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                Complete payment
              </Link>
            )}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const qrDataUrl = await renderQrDataUrl(qrCode);

  return (
    <>
      <Navbar />
      <main className="container-page py-12">
        <Link
          href="/account"
          className="text-sm font-semibold text-purple-600 hover:text-purple-700"
        >
          ← Back to my tickets
        </Link>

        <div className="mt-6">
          <TicketCard
            eventTitle={event?.title ?? "Event"}
            eventDateLabel={
              event
                ? new Date(event.event_date).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }) + ` · ${event.event_time}`
                : ""
            }
            eventVenue={event?.venue ?? ""}
            eventCity={event?.city ?? ""}
            ticketTypeName={typedItem.ticket_types?.name ?? "Ticket"}
            quantity={typedItem.quantity}
            holderName={profile?.full_name || user.email || "Ticket holder"}
            qrDataUrl={qrDataUrl}
            scannedAt={typedItem.scanned_at}
            wristbandId={typedItem.wristband_id}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}