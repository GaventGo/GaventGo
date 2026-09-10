"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createTicketType,
  updateTicketType,
  type TicketTypeFormState,
} from "@/lib/actions/tickets";
import type { TicketTypeRow } from "@/types/database";

const initialState: TicketTypeFormState = { error: null, success: false };

function inputClass() {
  return "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20";
}

function labelClass() {
  return "mb-1.5 block text-sm font-medium text-ink";
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export default function TicketTypeForm({
  eventId,
  ticketType,
  onSuccess,
  onCancel,
}: {
  eventId: string;
  ticketType?: TicketTypeRow;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(ticketType);
  const [state, formAction] = useFormState(
    isEdit ? updateTicketType : createTicketType,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
    }
    // Only re-run when success flips — onSuccess is expected to be a
    // stable-enough callback from the parent for this form's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  const idPrefix = ticketType?.id ?? "new";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      {ticketType && (
        <input type="hidden" name="ticketTypeId" value={ticketType.id} />
      )}

      <div>
        <label className={labelClass()} htmlFor={`name-${idPrefix}`}>
          Ticket name
        </label>
        <input
          id={`name-${idPrefix}`}
          name="name"
          type="text"
          defaultValue={ticketType?.name}
          required
          placeholder="Regular, VIP, Early Bird…"
          className={inputClass()}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass()} htmlFor={`price-${idPrefix}`}>
            Price (GH₵)
          </label>
          <input
            id={`price-${idPrefix}`}
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={ticketType?.price}
            required
            className={inputClass()}
          />
        </div>
        <div>
          <label className={labelClass()} htmlFor={`quantity-${idPrefix}`}>
            Quantity
          </label>
          <input
            id={`quantity-${idPrefix}`}
            name="quantity"
            type="number"
            min="1"
            step="1"
            defaultValue={ticketType?.quantity}
            required
            className={inputClass()}
          />
          {ticketType && ticketType.sold > 0 && (
            <p className="mt-1.5 text-xs text-ink/40">
              {ticketType.sold} already sold — quantity can&apos;t go below
              that.
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton label={isEdit ? "Save changes" : "Add ticket type"} />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-black/10 bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:border-black/20"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
