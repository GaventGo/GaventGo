import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import type { EventCategory, EventWithTicketTypes } from "@/types/database";

const CATEGORY_OPTIONS: { value: EventCategory | "all"; label: string }[] = [
  { value: "all", label: "All categories" },
  { value: "music", label: "Music" },
  { value: "comedy", label: "Comedy" },
  { value: "sports", label: "Sports" },
  { value: "conferences", label: "Conferences" },
  { value: "parties", label: "Parties" },
  { value: "other", label: "Other" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

async function getEvents(category?: string, q?: string) {
  const supabase = createClient();

  let query = supabase
    .from("events")
    .select("*, ticket_types(*)")
    .eq("status", "published")
    .gte("event_date", new Date().toISOString().slice(0, 10))
    .order("event_date", { ascending: true });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }
  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data, error } = await query;
  return { events: (data ?? []) as unknown as EventWithTicketTypes[], error };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  const category = searchParams.category ?? "all";
  const q = searchParams.q ?? "";
  const { events, error } = await getEvents(category, q);

  return (
    <>
      <Navbar />
      <main className="container-page py-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Browse events
          </h1>
          <p className="mt-2 text-ink/50">
            Find something happening near you.
          </p>
        </div>

        <form
          action="/events"
          method="GET"
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search events…"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20 sm:max-w-xs"
          />
          <select
            name="category"
            defaultValue={category}
            className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20 sm:w-52"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Search
          </button>
        </form>

        {error ? (
          <div className="mt-10 rounded-2xl border border-error/20 bg-error/5 px-6 py-14 text-center">
            <p className="text-sm font-medium text-error">
              Something went wrong loading events. Please try again shortly.
            </p>
          </div>
        ) : events.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
            <p className="text-sm text-ink/50">
              No events match your search. Try a different keyword or
              category.
            </p>
            <Link
              href="/events"
              className="mt-4 inline-block text-sm font-semibold text-purple-600 hover:text-purple-700"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const prices = event.ticket_types.map((t) => t.price);
              const fromPrice = prices.length ? Math.min(...prices) : null;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-purple-50">
                    {event.poster_url && (
                      <Image
                        src={event.poster_url}
                        alt={event.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink">
                      {formatDate(event.event_date)}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col px-5 py-5">
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
                        View event →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
