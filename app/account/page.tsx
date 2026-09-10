import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import type { OrderWithDetails } from "@/types/database";

type AccountProfile = {
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
};

function statusBadgeClasses(status: string) {
  switch (status) {
    case "paid":
      return "bg-success/10 text-success";
    case "pending":
      return "bg-orange-50 text-orange-700";
    case "failed":
    case "cancelled":
    case "expired":
      return "bg-error/10 text-error";
    default:
      return "bg-black/5 text-ink/50";
  }
}

export default async function AccountPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, role")
    .eq("id", user.id)
    .single();

  const profile = rawProfile as unknown as AccountProfile | null;

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "*, events(title, event_date, venue, city), order_items(*, ticket_types(name))"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const myOrders = (orders ?? []) as unknown as OrderWithDetails[];

  return (
    <>
      <Navbar />
      <main className="container-page py-12">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          My account
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="h-fit rounded-2xl bg-white p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/40">
              Profile
            </h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs text-ink/40">Name</dt>
                <dd className="text-sm font-semibold text-ink">
                  {profile?.full_name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink/40">Email</dt>
                <dd className="text-sm font-semibold text-ink">
                  {profile?.email || user.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink/40">Phone</dt>
                <dd className="text-sm font-semibold text-ink">
                  {profile?.phone || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink/40">Account type</dt>
                <dd className="text-sm font-semibold capitalize text-ink">
                  {profile?.role || "customer"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/40">
              My tickets
            </h2>

            {myOrders.length === 0 ? (
              <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 px-6 py-16 text-center">
                <p className="text-sm text-ink/50">
                  No tickets yet. Explore events to find your next experience.
                </p>
                <Link
                  href="/events"
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
                >
                  Explore Events
                </Link>
              </div>
            ) : (
              <ul className="mt-4 space-y-4">
                {myOrders.map((order) => (
                  <li
                    key={order.id}
                    className="rounded-2xl border border-black/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {order.events?.title ?? "Event"}
                        </p>
                        {order.events && (
                          <p className="text-xs text-ink/40">
                            {new Date(order.events.event_date).toLocaleDateString(
                              "en-GB",
                              { day: "numeric", month: "short", year: "numeric" }
                            )}{" "}
                            · {order.events.venue}, {order.events.city}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-ink/40">
                          Ordered{" "}
                          {new Date(order.created_at).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "short", year: "numeric" }
                          )}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClasses(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <ul className="mt-3 space-y-2 border-t border-black/5 pt-3">
                      {order.order_items.map((item) => (
                        <li key={item.id} className="text-xs">
                          <div className="flex items-center justify-between text-ink/60">
                            <span>
                              {item.ticket_types?.name ?? "Ticket"}
                              {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                            </span>
                            <span>GH₵{item.subtotal}</span>
                          </div>
                          {order.status === "paid" && (
                            <Link
                              href={`/account/tickets/${item.id}`}
                              className="mt-1 inline-block font-semibold text-purple-600 hover:text-purple-700"
                            >
                              {item.scanned_at
                                ? "View ticket (checked in) →"
                                : "View ticket & QR code →"}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
                      <span className="text-sm font-semibold text-ink">
                        GH₵{order.total_amount}
                      </span>
                      {order.status === "pending" && (
                        <Link
                          href={`/checkout/${order.id}`}
                          className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                        >
                          Complete payment →
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
