const steps = [
  {
    step: "01",
    title: "Discover",
    description:
      "Browse events near you or search for exactly what you're into — music, comedy, sports, and more.",
  },
  {
    step: "02",
    title: "Book",
    description:
      "Pick your ticket type, pay securely online, and get your digital QR ticket instantly.",
  },
  {
    step: "03",
    title: "Go",
    description:
      "Show your QR code at the door. Staff scan it, verify it, and hand you your wristband — no lines, no paper.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-ink py-20">
      <div className="container-page">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          How it works
        </h2>
        <p className="mt-2 max-w-md text-white/50">
          From browsing to walking through the gate, in three steps.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              <span className="text-sm font-bold text-orange-600">
                {s.step}
              </span>
              <h3 className="mt-3 text-xl font-bold text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {s.description}
              </p>

              {i < steps.length - 1 && (
                <span
                  className="absolute right-[-1.5rem] top-1 hidden h-px w-8 bg-white/15 md:block"
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
