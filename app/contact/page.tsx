import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// TODO: replace with a real support email before launch — this is a
// placeholder so the Contact page isn't a dead link.
const SUPPORT_EMAIL = "support@gaventgo.app";

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="container-page max-w-2xl py-16">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Contact us
        </h1>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-ink/70">
          <p>
            Have a question about an order, a ticket, or an event you're
            organizing on GaventGo? We're happy to help.
          </p>
          <p>
            For issues with a specific ticket order, it's usually fastest
            to reach out to the event's organizer directly — their contact
            details are often listed on the event page. For anything else,
            reach us at:
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-block text-lg font-semibold text-purple-600 hover:text-purple-700"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}
