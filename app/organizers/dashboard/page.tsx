import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
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

export default async function OrganizerDashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "organizer") {
    redirect("/account");
  }

  const { data: events } = await supabase
    .from("events")
    .select("*, ticket_types(quantity, sold)")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  const allEvents = (events ?? []) as unknown as EventWithTicketTypes[];
  const publishedCount = allEvents.filter(
    (e) => e.status === "published"
  ).length;
  const draftCount = allEvents.filter((e) => e.status === "draft").length;

  return (
    <>
      <Navbar />
      <main className="container-page py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Welcome, {profile?.full_name || "Organizer"}
            </h1>
            <p className="mt-1 text-ink/50">Here&apos;s how your events are doing.</p>
          </div>
          <Link
            href="/organizers/create"
            className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            + Create event
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-xs font-medium text-ink/40">Total events</p>
            <p className="mt-2 text-3xl font-extrabold text-ink">
              {allEvents.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-xs font-medium text-ink/40">Published</p>
            <p className="mt-2 text-3xl font-extrabold text-success">
              {publishedCount}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-card">
            <p className="text-xs font-medium text-ink/40">Drafts</p>
            <p className="mt-2 text-3xl font-extrabold text-ink/40">
              {draftCount}
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl bg-white shadow-card">
          <div className="border-b border-black/5 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/40">
              Your events
            </h2>
          </div>

          {allEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-sm text-ink/50">
                You haven&apos;t created any events yet.
              </p>
              <Link
                href="/organizers/create"
                className="mt-5 inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                Create your first event
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {allEvents.map((event) => {
                const capacity = event.ticket_types.reduce(
                  (sum, t) => sum + t.quantity,
                  0
                );
                const sold = event.ticket_types.reduce(
                  (sum, t) => sum + t.sold,
                  0
                );

                return (
                  <li
                    key={event.id}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {event.title}
                      </p>
                      <p className="text-xs text-ink/40">
                        {event.venue}, {event.city} ·{" "}
                        {new Date(event.event_date).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </p>
                      {capacity > 0 && (
                        <p className="mt-1 text-xs text-ink/40">
                          {sold} sold · {capacity - sold} remaining ·{" "}
                          {capacity} capacity
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClasses(
                          event.status
                        )}`}
                      >
                        {event.status}
                      </span>
                      <Link
                        href={`/organizers/events/${event.id}`}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                      >
                        Manage →
                      </Link>
                      {event.status === "published" && (
                        <Link
                          href={`/events/${event.slug}`}
                          className="text-xs font-semibold text-ink/40 hover:text-ink"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
