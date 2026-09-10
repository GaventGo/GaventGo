"use client";

import { useState } from "react";
import TicketTypeForm from "@/components/organizer/TicketTypeForm";
import TicketTypeRow from "@/components/organizer/TicketTypeRow";
import type { TicketTypeRow as TicketTypeRowType } from "@/types/database";

export default function TicketTypeManager({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: TicketTypeRowType[];
}) {
  const [showAddForm, setShowAddForm] = useState(ticketTypes.length === 0);

  return (
    <div>
      {ticketTypes.length === 0 ? (
        <p className="text-sm text-ink/50">
          No ticket types yet — add your first one below.
        </p>
      ) : (
        <div className="space-y-3">
          {ticketTypes.map((ticket) => (
            <TicketTypeRow key={ticket.id} eventId={eventId} ticket={ticket} />
          ))}
        </div>
      )}

      <div className="mt-6">
        {showAddForm ? (
          <div className="rounded-2xl border border-dashed border-black/10 p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">
              Add a ticket type
            </h3>
            <TicketTypeForm
              eventId={eventId}
              onSuccess={() => setShowAddForm(false)}
              onCancel={
                ticketTypes.length > 0 ? () => setShowAddForm(false) : undefined
              }
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-black/20"
          >
            + Add ticket type
          </button>
        )}
      </div>
    </div>
  );
}
