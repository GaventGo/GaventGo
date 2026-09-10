import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="container-page max-w-2xl py-16">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Terms of Service
        </h1>
        <p className="mt-2 text-xs text-ink/40">Last updated: [add date]</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink/70">
          <section>
            <h2 className="text-lg font-semibold text-ink">1. Overview</h2>
            <p className="mt-2">
              GaventGo is a ticketing platform that lets organizers list
              events and sell tickets, and lets customers discover events
              and buy tickets. By creating an account or buying a ticket,
              you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">2. Accounts</h2>
            <p className="mt-2">
              You're responsible for keeping your account credentials
              secure and for all activity under your account. You must
              provide accurate information when you sign up.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              3. Buying tickets
            </h2>
            <p className="mt-2">
              When you buy a ticket, you receive a unique digital ticket
              with a QR code for entry. Tickets are tied to the specific
              event and date listed at the time of purchase. Payments are
              processed securely through Paystack; GaventGo does not store
              your card details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              4. Refunds and cancellations
            </h2>
            <p className="mt-2">
              Refunds for individual orders are handled at the discretion
              of the organizer running that event. If an organizer cancels
              an event entirely, all paid orders for that event are
              automatically refunded. Refunds are returned to your original
              payment method and may take a few business days to appear,
              depending on your bank or payment provider.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              5. Organizer responsibilities
            </h2>
            <p className="mt-2">
              Organizers are responsible for the accuracy of their event
              listings, for delivering the event as advertised, and for
              handling refund requests fairly. GaventGo provides the
              ticketing and payment infrastructure but is not the organizer
              of any event listed on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              6. Prohibited conduct
            </h2>
            <p className="mt-2">
              You may not use GaventGo to resell tickets at inflated
              prices without authorization, create fraudulent events,
              attempt to bypass or manipulate the platform's security or
              payment systems, or use another person's ticket or account
              without permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              7. Limitation of liability
            </h2>
            <p className="mt-2">
              GaventGo is not liable for losses arising from an event
              being cancelled, changed, or not meeting your expectations,
              beyond facilitating the refund process described above. We
              aim for high availability but don't guarantee the platform
              will be free of interruptions or errors.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              8. Changes to these terms
            </h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use
              of GaventGo after changes take effect means you accept the
              updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">9. Contact</h2>
            <p className="mt-2">
              Questions about these terms? Reach us via the{" "}
              <a
                href="/contact"
                className="font-semibold text-purple-600 hover:text-purple-700"
              >
                Contact page
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
