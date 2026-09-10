import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PaymentButton from "@/components/checkout/PaymentButton";
import { createClient } from "@/lib/supabase/server";
import type { OrderWithDetails } from "@/types/database";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CheckoutPage({
  params,
}: {
  params: { orderId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/checkout/${params.orderId}`);
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      "*, events(title, slug, event_date, event_time, venue, city), order_items(*, ticket_types(name))"
    )
    .eq("id", params.orderId)
    .single();

  if (!order) {
    notFound();
  }

  const typedOrder = order as unknown as OrderWithDetails;

  if (typedOrder.user_id !== user.id) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="container-page flex justify-center py-12">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold text-ink">Checkout</h1>
          <p className="mt-1 text-sm text-ink/50">
            Review your order before paying.
          </p>

          <div className="mt-8 rounded-2xl bg-white p-6 shadow-card">
            {typedOrder.events && (
              <div>
                <h2 className="text-lg font-bold text-ink">
                  {typedOrder.events.title}
                </h2>
                <p className="mt-1 text-sm text-ink/50">
                  {formatDate(typedOrder.events.event_date)} ·{" "}
                  {typedOrder.events.event_time} · {typedOrder.events.venue},{" "}
                  {typedOrder.events.city}
                </p>
              </div>
            )}

            <ul className="mt-6 divide-y divide-black/5 border-y border-black/5">
              {typedOrder.order_items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {item.ticket_types?.name ?? "Ticket"}
                    </p>
                    <p className="text-xs text-ink/40">
                      GH₵{item.unit_price} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-ink">
                    GH₵{item.subtotal}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-medium text-ink/50">Total</span>
              <span className="text-xl font-extrabold text-ink">
                GH₵{typedOrder.total_amount}
              </span>
            </div>

            <div className="mt-6">
              {typedOrder.status === "pending" ? (
                <PaymentButton orderId={typedOrder.id} />
              ) : typedOrder.status === "expired" ? (
                <div className="rounded-xl bg-error/10 px-4 py-3 text-center text-sm font-medium text-error">
                  This order expired before payment was completed and the
                  tickets were released.{" "}
                  {typedOrder.events && (
                    <Link
                      href={`/events/${typedOrder.events.slug}`}
                      className="font-semibold underline"
                    >
                      Select tickets again
                    </Link>
                  )}
                </div>
              ) : (
                <p className="rounded-xl bg-black/5 px-4 py-3 text-center text-sm font-medium text-ink/60">
                  This order is {typedOrder.status}.
                </p>
              )}
            </div>
          </div>

          <Link
            href="/account"
            className="mt-6 block text-center text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            View my orders
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
