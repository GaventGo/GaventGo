import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TicketTypeManager from "@/components/organizer/TicketTypeManager";
import EventPosterEditor from "@/components/organizer/EventPosterEditor";
import OrdersList, { type OrderSummary } from "@/components/organizer/OrdersList";
import StaffManager, { type StaffMember } from "@/components/organizer/StaffManager";
import EventAnalyticsPanel from "@/components/organizer/EventAnalyticsPanel";
import CancelEventButton from "@/components/organizer/CancelEventButton";
import { getEventAnalytics } from "@/lib/actions/analytics";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventWithTicketTypes } from "@/types/database";

function statusBadgeClasses(status: string) {
  switch (status) {
    case "published":
      return "bg-success/10 text-success";
    case "draft":
      return "bg-black/5 text-ink/50";
    case "cancelled":
      return "bg-error/10 text-error";
    default:
      return "bg-black/5 text-ink/50";
  }
}

export default async function ManageEventPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select("*, ticket_types(*)")
    .eq("id", params.id)
    .single();

  if (!event) {
    notFound();
  }

  const typedEvent = event as unknown as EventWithTicketTypes;

  // Ownership check — an organizer can only manage their own events, and
  // this is checked here in addition to (not instead of) the RLS policy
  // that already scopes the underlying select.
  if (typedEvent.organizer_id !== user.id) {
    notFound();
  }

  const totalCapacity = typedEvent.ticket_types.reduce(
    (sum, t) => sum + t.quantity,
    0
  );
  const totalSold = typedEvent.ticket_types.reduce((sum, t) => sum + t.sold, 0);

  // Ownership was already confirmed above via the normal RLS-scoped query,
  // so it's safe to use the admin client here purely to cross the
  // customer-owned order_items table for a check-in count — organizers have
  // no standing RLS access to other people's order rows, and this stays
  // read-only and scoped to ticket types that belong to this one event.
  const ticketTypeIds = typedEvent.ticket_types.map((t) => t.id);
  let totalCheckedIn = 0;

  if (ticketTypeIds.length > 0) {
    const admin = createAdminClient();
    const { data: scannedItems } = await admin
      .from("order_items")
      .select("quantity")
      .in("ticket_type_id", ticketTypeIds)
      .not("scanned_at", "is", null);

    totalCheckedIn = (scannedItems ?? []).reduce(
      (sum, item) => sum + item.quantity,
      0
    );
  }

  // Same pattern as the checked-in count above: ownership was already
  // confirmed via the RLS-scoped event query, so it's safe to use the
  // admin client here, read-only, scoped to this one event's orders.
  const admin2 = createAdminClient();
  const { data: rawOrders } = await admin2
    .from("orders")
    .select("id, total_amount, status, created_at, profiles(email)")
    .eq("event_id", typedEvent.id)
    .order("created_at", { ascending: false });

  const orderSummaries: OrderSummary[] = (rawOrders ?? []).map((o) => ({
    id: o.id,
    customerEmail:
      (o as unknown as { profiles: { email: string } | null }).profiles
        ?.email ?? "—",
    totalAmount: o.total_amount,
    status: o.status,
    createdAt: o.created_at,
  }));

  const { data: rawStaff } = await admin2
    .from("event_staff")
    .select("user_id, profiles(email, full_name)")
    .eq("event_id", typedEvent.id);

  const staffMembers: StaffMember[] = (rawStaff ?? []).map((s) => ({
    userId: s.user_id,
    email:
      (s as unknown as { profiles: { email: string; full_name: string } | null })
        .profiles?.email ?? "—",
    fullName:
      (s as unknown as { profiles: { email: string; full_name: string } | null })
        .profiles?.full_name ?? "",
  }));

  const analytics = await getEventAnalytics(typedEvent.id);

  return (
    <>
      <Navbar />
      <main className="container-page py-12">
        <Link
          href="/organizers/dashboard"
          className="text-sm font-semibold text-purple-600 hover:text-purple-700"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {typedEvent.title}
            </h1>
            <p className="mt-1 text-sm text-ink/50">
              {new Date(typedEvent.event_date).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · {typedEvent.event_time} · {typedEvent.venue},{" "}
              {typedEvent.city}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`h-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClasses(
                typedEvent.status
              )}`}
            >
              {typedEvent.status}
            </span>
            {typedEvent.status !== "cancelled" && (
              <Link
                href={`/organizers/events/${typedEvent.id}/edit`}
                className="h-fit rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-ink transition hover:border-black/20"
              >
                Edit
              </Link>
            )}
            <a
              href={`/organizers/events/${typedEvent.id}/export`}
              className="h-fit rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-ink transition hover:border-black/20"
            >
              Download CSV
            </a>
            {typedEvent.status !== "cancelled" && (
              <CancelEventButton eventId={typedEvent.id} />
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <p className="text-xs font-medium text-ink/40">Total capacity</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">
              {totalCapacity}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <p className="text-xs font-medium text-ink/40">Sold</p>
            <p className="mt-1 text-2xl font-extrabold text-success">
              {totalSold}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <p className="text-xs font-medium text-ink/40">Remaining</p>
            <p className="mt-1 text-2xl font-extrabold text-ink/60">
              {totalCapacity - totalSold}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <p className="text-xs font-medium text-ink/40">Checked in</p>
            <p className="mt-1 text-2xl font-extrabold text-purple-600">
              {totalCheckedIn}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/40">
            Event poster
          </h2>
          <div className="mt-4">
            <EventPosterEditor
              eventId={typedEvent.id}
              organizerId={typedEvent.organizer_id}
              currentPosterUrl={typedEvent.poster_url}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/40">
            Ticket types
          </h2>
          <div className="mt-4">
            <TicketTypeManager
              eventId={typedEvent.id}
              ticketTypes={typedEvent.ticket_types}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/40">
            Orders
          </h2>
          <div className="mt-2">
            <OrdersList orders={orderSummaries} />
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/40">
            Analytics
          </h2>
          <div className="mt-4">
            {analytics ? (
              <EventAnalyticsPanel analytics={analytics} />
            ) : (
              <p className="text-sm text-ink/40">Analytics unavailable.</p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/40">
            Door staff
          </h2>
          <div className="mt-4">
            <StaffManager eventId={typedEvent.id} initialStaff={staffMembers} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
