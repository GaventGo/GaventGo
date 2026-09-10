import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CreateEventForm from "@/components/organizer/CreateEventForm";
import { createClient } from "@/lib/supabase/server";

export default async function CreateEventPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "organizer") {
    redirect("/account");
  }

  return (
    <>
      <Navbar />
      <main className="container-page flex justify-center py-12">
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Create an event
          </h1>
          <p className="mt-1 text-ink/50">
            Fill in the details below. You can save as a draft and publish
            later.
          </p>

          <div className="mt-8">
            <CreateEventForm organizerId={user.id} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
