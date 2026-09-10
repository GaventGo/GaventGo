"use client";

import { useState, useTransition, type FormEvent } from "react";
import { recordPayout, type OrganizerLedgerRow } from "@/lib/actions/payouts";

export default function PayoutLedger({
  initialRows,
}: {
  initialRows: OrganizerLedgerRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [openId, setOpenId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent, organizerId: string) {
    e.preventDefault();
    setError("");

    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    startTransition(async () => {
      const result = await recordPayout(organizerId, value, note);

      if (result.error) {
        setError(result.error);
        return;
      }

      setRows((prev) =>
        prev.map((row) =>
          row.organizerId === organizerId
            ? {
                ...row,
                alreadyPaid: row.alreadyPaid + value,
                balanceDue: row.balanceDue - value,
              }
            : row
        )
      );
      setAmount("");
      setNote("");
      setOpenId(null);
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-ink/40">No organizers yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.organizerId} className="rounded-2xl border border-black/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                {row.organizerName || row.organizerEmail}
              </p>
              <p className="text-xs text-ink/40">{row.organizerEmail}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-ink">
                GH₵{row.balanceDue.toFixed(2)}
              </p>
              <p className="text-xs text-ink/40">balance due</p>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-ink/40">Gross sales</dt>
              <dd className="font-semibold text-ink">
                GH₵{row.grossSales.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-ink/40">Platform fee</dt>
              <dd className="font-semibold text-ink">{row.feePercent}%</dd>
            </div>
            <div>
              <dt className="text-ink/40">Owed after fee</dt>
              <dd className="font-semibold text-ink">
                GH₵{row.netOwed.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-ink/40">Already paid</dt>
              <dd className="font-semibold text-ink">
                GH₵{row.alreadyPaid.toFixed(2)}
              </dd>
            </div>
          </dl>

          {openId === row.organizerId ? (
            <form
              onSubmit={(e) => handleSubmit(e, row.organizerId)}
              className="mt-3 space-y-2 border-t border-black/5 pt-3"
            >
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount (GH₵)"
                  className="w-32 rounded-full border border-black/10 px-3 py-1.5 text-sm focus:border-purple-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (optional, e.g. bank ref)"
                  className="flex-1 rounded-full border border-black/10 px-3 py-1.5 text-sm focus:border-purple-600 focus:outline-none"
                />
              </div>
              {error && (
                <p className="text-xs font-medium text-error">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Confirm payout"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(null);
                    setError("");
                  }}
                  className="rounded-full border border-black/10 px-4 py-1.5 text-xs font-semibold text-ink"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-ink/40">
                This only records that you already paid them manually (e.g.
                bank transfer) — it doesn't move any money itself.
              </p>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setOpenId(row.organizerId)}
              className="mt-3 text-xs font-semibold text-purple-600 hover:text-purple-700"
            >
              Record a payout →
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
