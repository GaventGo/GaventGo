"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/actions/orders";
import type { TicketTypeRow } from "@/types/database";

export default function TicketSelector({
  eventId,
  eventSlug,
  ticketTypes,
}: {
  eventId: string;
  eventSlug: string;
  ticketTypes: TicketTypeRow[];
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remainingFor(ticket: TicketTypeRow) {
    return Math.max(0, ticket.quantity - ticket.sold);
  }

  function setQuantity(ticket: TicketTypeRow, next: number) {
    const remaining = remainingFor(ticket);
    const clamped = Math.max(0, Math.min(next, remaining));
    setQuantities((prev) => ({ ...prev, [ticket.id]: clamped }));
  }

  const total = useMemo(() => {
    return ticketTypes.reduce((sum, ticket) => {
      const qty = quantities[ticket.id] ?? 0;
      return sum + qty * ticket.price;
    }, 0);
  }, [quantities, ticketTypes]);

  const hasSelection = Object.values(quantities).some((qty) => qty > 0);

  function handleCheckout() {
    setError(null);
    const items = ticketTypes
      .map((ticket) => ({
        ticketTypeId: ticket.id,
        quantity: quantities[ticket.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);

    startTransition(async () => {
      const result = await createOrder(eventId, items);

      if (result.requiresLogin) {
        router.push(`/login?next=/events/${eventSlug}`);
        return;
      }

      if (result.error || !result.orderId) {
        setError(result.error ?? "Couldn't start checkout. Please try again.");
        return;
      }

      router.push(`/checkout/${result.orderId}`);
    });
  }

  if (ticketTypes.length === 0) {
    return (
      <p className="mt-3 text-sm text-ink/50">
        Ticket types for this event haven&apos;t been added yet.
      </p>
    );
  }

  return (
    <div>
      <ul className="mt-4 space-y-3">
        {ticketTypes.map((ticket) => {
          const remaining = remainingFor(ticket);
          const soldOut = remaining <= 0;
          const qty = quantities[ticket.id] ?? 0;

          return (
            <li
              key={ticket.id}
              className="rounded-2xl border border-black/5 px-4 py-3.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {ticket.name}
                  </p>
                  <p className="text-xs text-ink/40">
                    {soldOut ? "Sold out" : `${remaining} remaining`}
                  </p>
                </div>
                <span className="text-sm font-bold text-ink">
                  GH₵{ticket.price}
                </span>
              </div>

              {!soldOut && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(ticket, qty - 1)}
                      disabled={qty <= 0}
                      aria-label={`Decrease ${ticket.name} quantity`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-ink transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-sm font-semibold text-ink">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(ticket, qty + 1)}
                      disabled={qty >= remaining}
                      aria-label={`Increase ${ticket.name} quantity`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-ink transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  {qty > 0 && (
                    <span className="text-xs font-semibold text-ink/50">
                      GH₵{qty * ticket.price} subtotal
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
        <span className="text-sm font-medium text-ink/50">Total</span>
        <span className="text-lg font-extrabold text-ink">GH₵{total}</span>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={!hasSelection || isPending}
        className="mt-4 w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Preparing checkout…" : "Continue to checkout"}
      </button>
    </div>
  );
}
