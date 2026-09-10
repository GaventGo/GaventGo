import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="container-page max-w-2xl py-16">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs text-ink/40">Last updated: [add date]</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink/70">
          <section>
            <h2 className="text-lg font-semibold text-ink">
              1. What we collect
            </h2>
            <p className="mt-2">
              When you create an account, we collect your name, email
              address, and phone number. When you buy a ticket, we record
              the order details (event, ticket type, amount) and the
              payment reference from Paystack — we do not receive or store
              your card number or banking details; Paystack handles that
              directly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              2. How we use it
            </h2>
            <p className="mt-2">
              We use your information to process ticket purchases, send
              order confirmations and refund notifications, issue your
              QR-code tickets, verify tickets at the event door, and
              provide organizers with the sales and check-in information
              needed to run their event.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              3. Who we share it with
            </h2>
            <p className="mt-2">
              We share the minimum necessary information with a small set
              of service providers who help run GaventGo: Paystack
              (payment processing), Resend (sending order and refund
              emails), and Supabase (secure database hosting). We don't
              sell your personal information to third parties.
            </p>
            <p className="mt-2">
              The organizer of an event you buy a ticket for can see your
              name, email, and order details for that event, so they can
              manage their event and respond to questions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              4. Data retention
            </h2>
            <p className="mt-2">
              We keep order and account information for as long as your
              account is active, and as needed to meet our legal and
              accounting obligations (for example, records of payments and
              refunds).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              5. Your rights
            </h2>
            <p className="mt-2">
              You can access or update your profile information from your
              account page at any time. To request deletion of your
              account or data, contact us via the{" "}
              <a
                href="/contact"
                className="font-semibold text-purple-600 hover:text-purple-700"
              >
                Contact page
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">6. Cookies</h2>
            <p className="mt-2">
              We use a session cookie to keep you signed in. We don't use
              third-party advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">
              7. Changes to this policy
            </h2>
            <p className="mt-2">
              We may update this policy as GaventGo evolves. Significant
              changes will be reflected here with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink">8. Contact</h2>
            <p className="mt-2">
              Questions about your data? Reach us via the{" "}
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
