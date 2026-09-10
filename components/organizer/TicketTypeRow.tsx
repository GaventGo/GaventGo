"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import TicketTypeForm from "@/components/organizer/TicketTypeForm";
import {
  deleteTicketType,
  type TicketTypeFormState,
} from "@/lib/actions/tickets";
import type { TicketTypeRow as TicketTypeRowType } from "@/types/database";

const initialState: TicketTypeFormState = { error: null, success: false };

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-semibold text-error transition hover:text-error/80 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export default function TicketTypeRow({
  eventId,
  ticket,
}: {
  eventId: string;
  ticket: TicketTypeRowType;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteState, deleteAction] = useFormState(
    deleteTicketType,
    initialState
  );

  const remaining = Math.max(0, ticket.quantity - ticket.sold);
  const soldOut = remaining <= 0;

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-black/5 p-4">
        <TicketTypeForm
          eventId={eventId}
          ticketType={ticket}
          onSuccess={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-ink">{ticket.name}</p>
        <p className="text-xs text-ink/40">
          GH₵{ticket.price} · Qty {ticket.quantity} · Sold {ticket.sold} ·{" "}
          {soldOut ? (
            <span className="font-semibold text-error">Sold out</span>
          ) : (
            `${remaining} remaining`
          )}
        </p>
        {deleteState.error && (
          <p role="alert" className="mt-1 text-xs font-medium text-error">
            {deleteState.error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs font-semibold text-purple-600 hover:text-purple-700"
        >
          Edit
        </button>
        <form
          action={deleteAction}
          onSubmit={(e) => {
            if (
              !window.confirm(`Delete "${ticket.name}"? This can't be undone.`)
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="ticketTypeId" value={ticket.id} />
          <DeleteButton />
        </form>
      </div>
    </div>
  );
}
