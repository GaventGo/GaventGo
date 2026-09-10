import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/landing/Hero";
import FeaturedEvents from "@/components/landing/FeaturedEvents";
import Categories from "@/components/landing/Categories";
import HowItWorks from "@/components/landing/HowItWorks";
import OrganizerPromo from "@/components/landing/OrganizerPromo";
import { createClient } from "@/lib/supabase/server";
import type { EventWithTicketTypes } from "@/types/database";

async function getFeaturedEvents(): Promise<EventWithTicketTypes[]> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("events")
    .select("*, ticket_types(*)")
    .eq("status", "published")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(4);

  if (error || !data) return [];
  return data as unknown as EventWithTicketTypes[];
}

export default async function Home() {
  const featuredEvents = await getFeaturedEvents();

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FeaturedEvents events={featuredEvents} />
        <Categories />
        <HowItWorks />
        <OrganizerPromo />
      </main>
      <Footer />
    </>
  );
}
