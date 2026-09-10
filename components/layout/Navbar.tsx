import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

async function getViewer() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return {
    name: profile?.full_name || user.email || "Account",
    role: (profile?.role ?? "customer") as UserRole,
  };
}

export default async function Navbar() {
  const viewer = await getViewer();

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-canvas/80 backdrop-blur-md">
      <nav className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-icon.png"
            alt="GaventGo"
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-ink">
            GaventGo
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/events"
            className="text-sm font-medium text-ink/70 transition hover:text-ink"
          >
            Events
          </Link>

          {!viewer && (
            <>
              <Link
                href="/events"
                className="text-sm font-medium text-ink/70 transition hover:text-ink"
              >
                For Customers
              </Link>
              <Link
                href="/organizers/create"
                className="text-sm font-medium text-ink/70 transition hover:text-ink"
              >
                For Organizers
              </Link>
            </>
          )}

          {viewer?.role === "customer" && (
            <Link
              href="/account"
              className="text-sm font-medium text-ink/70 transition hover:text-ink"
            >
              My Tickets
            </Link>
          )}

          {viewer?.role === "organizer" && (
            <>
              <Link
                href="/organizers/dashboard"
                className="text-sm font-medium text-ink/70 transition hover:text-ink"
              >
                Organizer Dashboard
              </Link>
              <Link
                href="/organizers/create"
                className="text-sm font-medium text-ink/70 transition hover:text-ink"
              >
                Create Event
              </Link>
              <Link
                href="/staff/scan"
                className="text-sm font-medium text-ink/70 transition hover:text-ink"
              >
                Scan Tickets
              </Link>
            </>
          )}

          {viewer?.role === "staff" && (
            <Link
              href="/staff/scan"
              className="text-sm font-medium text-ink/70 transition hover:text-ink"
            >
              Scan Tickets
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!viewer ? (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-ink/70 transition hover:text-ink sm:block"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-600"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/account"
                className="hidden text-sm font-medium text-ink/70 transition hover:text-ink sm:block"
              >
                {viewer.name}
              </Link>
              <form action="/logout" method="POST">
                <button
                  type="submit"
                  className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-black/20"
                >
                  Log out
                </button>
              </form>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
