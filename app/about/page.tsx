import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="container-page max-w-2xl py-16">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          About GaventGo
        </h1>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-ink/70">
          <p>
            GaventGo is a digital ticketing platform built for events in
            Ghana — concerts, comedy shows, conferences, parties, and
            everything in between. We handle the ticketing, payments, and
            entry so organizers can focus on running a great event, and
            attendees can discover and book with a few taps.
          </p>
          <p>
            Every ticket sold through GaventGo comes with a unique QR code
            for fast, paperless check-in at the door — no printed tickets,
            no long queues, no guesswork for door staff.
          </p>
          <p>
            We're just getting started, and we're building this platform
            in the open, learning from every organizer and every event we
            support along the way.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
