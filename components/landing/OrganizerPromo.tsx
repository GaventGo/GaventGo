import Link from "next/link";

const points = [
  "Create and publish events in minutes",
  "Set multiple ticket types and prices",
  "Track sales and check-ins in real time",
  "Scan tickets at the door with any phone",
];

export default function OrganizerPromo() {
  return (
    <section className="container-page py-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-brand px-8 py-14 sm:px-14 sm:py-16">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-white/10"
          aria-hidden
        />

        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
              For organizers
            </span>
            <h2 className="mt-5 max-w-lg text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Run your next event without the spreadsheet chaos
            </h2>
            <p className="mt-4 max-w-md text-white/80">
              GaventGo handles ticketing, payments, and entry so you can
              focus on the event itself.
            </p>

            <Link
              href="/organizers/create"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-purple-700 transition hover:bg-white/90"
            >
              Create your first event
            </Link>
          </div>

          <ul className="space-y-3">
            {points.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3.5 text-sm font-medium text-white backdrop-blur-sm"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-purple-700">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
