import Image from "next/image";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TicketSelector from "@/components/events/TicketSelector";
import { createClient } from "@/lib/supabase/server";
import type { EventWithTicketTypes } from "@/types/database";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

async function getEvent(slug: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*, ticket_types(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) return null;
  return data as unknown as EventWithTicketTypes;
}

export default async function EventDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const event = await getEvent(params.slug);

  if (!event) {
    notFound();
  }

  const isPastEvent =
    new Date(event.event_date).toISOString().slice(0, 10) <
    new Date().toISOString().slice(0, 10);

  return (
    <>
      <Navbar />
      <main className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="relative h-64 w-full overflow-hidden rounded-3xl bg-purple-50 sm:h-96">
              {event.poster_url && (
                <Image
                  src={event.poster_url}
                  alt={event.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                  priority
                />
              )}
            </div>

            <span className="mt-6 inline-block text-xs font-semibold uppercase tracking-wide text-orange-600">
              {categoryLabel(event.category)}
            </span>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {event.title}
            </h1>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-card">
                <dt className="text-xs font-medium text-ink/40">Date</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {formatDate(event.event_date)}
                </dd>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-card">
                <dt className="text-xs font-medium text-ink/40">Time</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {event.event_time}
                </dd>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-card">
                <dt className="text-xs font-medium text-ink/40">Venue</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {event.venue}
                </dd>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-card">
                <dt className="text-xs font-medium text-ink/40">City</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {event.city}
                </dd>
              </div>
            </dl>

            <div className="mt-8">
              <h2 className="text-lg font-bold text-ink">About this event</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/60">
                {event.description || "No description provided yet."}
              </p>
            </div>
          </div>

          <aside className="h-fit rounded-3xl bg-white p-6 shadow-card lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-ink">Tickets</h2>
            {isPastEvent ? (
              <p className="mt-3 rounded-xl bg-black/5 px-4 py-3 text-sm text-ink/50">
                This event has already taken place. Tickets are no longer
                available for purchase.
              </p>
            ) : (
              <TicketSelector
                eventId={event.id}
                eventSlug={event.slug}
                ticketTypes={event.ticket_types}
              />
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
