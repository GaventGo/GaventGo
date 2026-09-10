"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inviteStaff, removeStaff } from "@/lib/actions/staff";

export interface StaffMember {
  userId: string;
  email: string;
  fullName: string;
}

export default function StaffManager({
  eventId,
  initialStaff,
}: {
  eventId: string;
  initialStaff: StaffMember[];
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await inviteStaff(eventId, trimmed);

      if (result.error) {
        setError(result.error);
        return;
      }

      setEmail("");
      // We don't get the invited user's name back from the RPC, and a
      // full refetch isn't worth it for a list this small — show what we
      // know until the page is next reloaded.
      setStaff((prev) => [
        ...prev,
        { userId: trimmed, email: trimmed, fullName: "" },
      ]);
    });
  }

  function handleRemove(userId: string) {
    setRemovingId(userId);
    startTransition(async () => {
      const result = await removeStaff(eventId, userId);
      if (!result.error) {
        setStaff((prev) => prev.filter((s) => s.userId !== userId));
      }
      setRemovingId(null);
    });
  }

  return (
    <div>
      <form onSubmit={handleInvite} className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="staff@example.com"
          className="min-w-[220px] flex-1 rounded-full border border-black/10 px-4 py-2 text-sm focus:border-purple-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add staff"}
        </button>
      </form>

      <p className="mt-2 text-xs text-ink/40">
        They need an existing GaventGo account (any account type) — this
        grants scan access to this event only, without changing anything
        else about their account.
      </p>

      {error && (
        <p className="mt-2 text-xs font-medium text-error">{error}</p>
      )}

      {staff.length > 0 && (
        <ul className="mt-4 divide-y divide-black/5 border-t border-black/5">
          {staff.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="text-sm text-ink">
                {member.fullName || member.email}
              </span>
              <button
                type="button"
                disabled={isPending && removingId === member.userId}
                onClick={() => handleRemove(member.userId)}
                className="text-xs font-semibold text-ink/40 transition hover:text-error disabled:opacity-50"
              >
                {isPending && removingId === member.userId
                  ? "Removing…"
                  : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
