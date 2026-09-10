import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScannerClient from "@/components/staff/ScannerClient";
import { createClient } from "@/lib/supabase/server";

export default async function StaffScanPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/staff/scan");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Staff and organizers can both reach the scanner UI; scan_ticket()
  // enforces the actual per-event permission for every individual scan
  // (organizer must own the event; staff must have an event_staff
  // assignment for it) — this is just the page-level role gate.
  if (profile?.role !== "staff" && profile?.role !== "organizer") {
    redirect("/account");
  }

  return (
    <>
      <Navbar />
      <main className="container-page flex justify-center py-10">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-ink">Scan tickets</h1>
          <p className="mt-1 text-sm text-ink/50">
            Point the camera at a ticket&apos;s QR code, or enter the code
            manually.
          </p>

          <div className="mt-6">
            <ScannerClient />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
