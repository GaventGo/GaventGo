import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import { getPayoutLedger } from "@/lib/actions/payouts";
import PayoutLedger from "@/components/organizer/PayoutLedger";

export default async function AdminPayoutsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const ledger = await getPayoutLedger();

  // getPayoutLedger() returns null for anyone whose email doesn't match
  // PLATFORM_ADMIN_EMAIL — the same not-found response a random organizer
  // or customer would get, rather than a page that reveals this exists.
  if (ledger === null) {
    redirect("/");
  }

  return (
    <>
      <Navbar />
      <main className="container-page py-12">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Organizer payouts
        </h1>
        <p className="mt-2 text-sm text-ink/50">
          What each organizer is owed from ticket sales, and what you've
          already paid them. All money currently settles into your own
          Paystack account — this page is bookkeeping only, it doesn't move
          any money itself.
        </p>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-card">
          <PayoutLedger initialRows={ledger} />
        </div>
      </main>
      <Footer />
    </>
  );
}
