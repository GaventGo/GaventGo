import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import EditEventForm from "@/components/organizer/EditEventForm";
import { createClient } from "@/lib/supabase/server";
import type { EventWithTicketTypes } from "@/types/database";

export default async function EditEventPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select("*, ticket_types(*)")
    .eq("id", params.id)
    .single();

  if (!event) {
    notFound();
  }

  const typedEvent = event as unknown as EventWithTicketTypes;

  if (typedEvent.organizer_id !== user.id) {
    redirect("/organizers/dashboard");
  }

  return (
    <>
      <Navbar />
      <main className="container-page max-w-2xl py-12">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Edit event
        </h1>
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-card">
          <EditEventForm event={typedEvent} />
        </div>
      </main>
      <Footer />
    </>
  );
}
