import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container-page grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-purple-700">
            Now live across Ghana
          </span>

          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Discover.
            <br />
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              Book.
            </span>{" "}
            Go.
          </h1>

          <p className="mt-6 max-w-md text-lg text-ink/60">
            Find amazing events, buy tickets online, and enter with ease.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/events"
              className="inline-flex items-center justify-center rounded-full bg-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-card-hover transition hover:bg-purple-700"
            >
              Explore Events
            </Link>
            <Link
              href="/organizers/create"
              className="inline-flex items-center justify-center rounded-full border border-ink/10 bg-white px-7 py-3.5 text-sm font-semibold text-ink transition hover:border-ink/20"
            >
              Create Event
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-6 text-sm text-ink/50">
            <span>Instant QR tickets</span>
            <span className="h-1 w-1 rounded-full bg-ink/20" />
            <span>Secure digital payments</span>
            <span className="h-1 w-1 rounded-full bg-ink/20" />
            <span>Scan &amp; go entry</span>
          </div>
        </div>

        {/* Signature element: a ticket card mid-transfer into a QR check-in,
            grounding the hero in the actual product mechanic. */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-brand opacity-20 blur-3xl" />

          <div className="overflow-hidden rounded-3xl bg-white shadow-card-hover">
            <div className="relative h-40 bg-gradient-brand">
              <div className="absolute bottom-4 left-5 text-white">
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                  Afrobeats Live
                </p>
                <p className="text-lg font-bold">Sat, 12 Sep · Accra</p>
              </div>
            </div>

            <div className="relative px-5 pb-6 pt-7 ticket-tear">
              <span className="ticket-notch-left" aria-hidden />
              <span className="ticket-notch-right" aria-hidden />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-ink/40">Ticket holder</p>
                  <p className="text-sm font-semibold text-ink">
                    Ama Owusu
                  </p>
                  <p className="mt-3 text-xs text-ink/40">Type</p>
                  <p className="text-sm font-semibold text-ink">VIP</p>
                </div>

                <div
                  className="grid h-20 w-20 shrink-0 grid-cols-5 grid-rows-5 gap-[3px] rounded-lg bg-ink p-2"
                  aria-hidden
                >
                  {Array.from({ length: 25 }).map((_, i) => (
                    <span
                      key={i}
                      className={
                        [3, 5, 8, 11, 13, 15, 17, 19, 21, 23].includes(i)
                          ? "rounded-[1px] bg-white/20"
                          : "rounded-[1px] bg-white"
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Verified for entry
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
