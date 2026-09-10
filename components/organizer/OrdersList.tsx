"use client";

import { useState, useTransition } from "react";
import { refundOrder } from "@/lib/actions/refunds";

export interface OrderSummary {
  id: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

function statusClasses(status: string) {
  switch (status) {
    case "paid":
      return "bg-success/10 text-success";
    case "refunded":
      return "bg-black/5 text-ink/50";
    case "failed":
    case "cancelled":
    case "expired":
      return "bg-error/10 text-error";
    default:
      return "bg-orange-50 text-orange-700";
  }
}

export default function OrdersList({ orders }: { orders: OrderSummary[] }) {
  const [rows, setRows] = useState(orders);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorFor, setErrorFor] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function handleRefund(orderId: string) {
    setErrorFor((prev) => ({ ...prev, [orderId]: "" }));
    setPendingId(orderId);

    startTransition(async () => {
      const result = await refundOrder(orderId);

      if (result.error) {
        setErrorFor((prev) => ({ ...prev, [orderId]: result.error! }));
      } else {
        setRows((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: "refunded" } : o))
        );
      }
      setPendingId(null);
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink/40">No orders for this event yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-black/5">
      {rows.map((order) => (
        <li
          key={order.id}
          className="flex flex-wrap items-center justify-between gap-3 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-ink">
              {order.customerEmail}
            </p>
            <p className="text-xs text-ink/40">
              {new Date(order.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              · GH₵{order.totalAmount}
            </p>
            {errorFor[order.id] && (
              <p className="mt-1 text-xs font-medium text-error">
                {errorFor[order.id]}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(
                order.status
              )}`}
            >
              {order.status}
            </span>
            {order.status === "paid" && (
              <button
                type="button"
                disabled={isPending && pendingId === order.id}
                onClick={() => handleRefund(order.id)}
                className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-xs font-semibold text-ink transition hover:border-error hover:text-error disabled:opacity-50"
              >
                {isPending && pendingId === order.id ? "Refunding…" : "Refund"}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
