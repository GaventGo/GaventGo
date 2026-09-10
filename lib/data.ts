import { EventCategory } from "@/types";

// Static UI data for the category tiles on the landing page (icons only —
// actual event data now comes from Supabase, see app/page.tsx and
// app/events/page.tsx).
export const categories: { name: EventCategory; icon: string }[] = [
  { name: "Music", icon: "🎵" },
  { name: "Comedy", icon: "🎤" },
  { name: "Sports", icon: "🏆" },
  { name: "Conferences", icon: "🎯" },
  { name: "Parties", icon: "🎉" },
];
