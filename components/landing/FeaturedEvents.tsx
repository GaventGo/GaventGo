import Image from "next/image";
import Link from "next/link";
import type { EventWithTicketTypes } from "@/types/database";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function FeaturedEvents({
  events,
}: {
  events: EventWithTicketTypes[];
}) {
  return (
    <section className="container-page py-16">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Featured events
          </h2>
          <p className="mt-2 text-ink/50">
            Handpicked and trending across Ghana right now.
          </p>
        </div>
        <Link
          href="/events"
          className="hidden shrink-0 text-sm font-semibold text-purple-600 hover:text-purple-700 sm:block"
        >
          View all →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <p className="text-sm text-ink/50">
            No events published yet. Check back soon.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((event) => {
            const prices = event.ticket_types.map((t) => t.price);
            const fromPrice = prices.length ? Math.min(...prices) : null;

            return (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="relative h-40 w-full overflow-hidden bg-purple-50">
                  {event.poster_url && (
                    <Image
                      src={event.poster_url}
                      alt={event.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 25vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink">
                    {formatDate(event.event_date)}
                  </span>
                </div>

                <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 ticket-tear">
                  <span className="ticket-notch-left" aria-hidden />
                  <span className="ticket-notch-right" aria-hidden />

                  <span className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                    {categoryLabel(event.category)}
                  </span>
                  <h3 className="mt-1 line-clamp-1 text-base font-bold text-ink">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink/50">
                    {event.venue}, {event.city}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">
                      {fromPrice !== null
                        ? `From GH₵${fromPrice}`
                        : "Tickets coming soon"}
                    </span>
                    <span className="text-xs font-semibold text-purple-600">
                      Get ticket →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/events"
        className="mt-8 flex items-center justify-center text-sm font-semibold text-purple-600 hover:text-purple-700 sm:hidden"
      >
        View all events →
      </Link>
    </section>
  );
}
