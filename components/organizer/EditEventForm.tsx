"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { updateEvent, type UpdateEventFormState } from "@/lib/actions/events";
import type { EventWithTicketTypes } from "@/types/database";

const initialState: UpdateEventFormState = { error: null, success: false };

const CATEGORY_OPTIONS = [
  { value: "music", label: "Music" },
  { value: "comedy", label: "Comedy" },
  { value: "sports", label: "Sports" },
  { value: "conferences", label: "Conferences" },
  { value: "parties", label: "Parties" },
  { value: "other", label: "Other" },
];

function labelClass() {
  return "mb-1.5 block text-sm font-medium text-ink";
}

function inputClass() {
  return "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20";
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export default function EditEventForm({
  event,
}: {
  event: EventWithTicketTypes;
}) {
  const router = useRouter();
  const boundAction = updateEvent.bind(null, event.id);
  const [state, formAction] = useFormState(boundAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.push(`/organizers/events/${event.id}`);
    }
  }, [state.success, router, event.id]);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className={labelClass()} htmlFor="title">
          Event title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={event.title}
          className={inputClass()}
        />
      </div>

      <div>
        <label className={labelClass()} htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={event.description}
          className={inputClass()}
        />
      </div>

      <div>
        <label className={labelClass()} htmlFor="category">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={event.category}
          className={inputClass()}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass()} htmlFor="venue">
            Venue
          </label>
          <input
            id="venue"
            name="venue"
            type="text"
            required
            defaultValue={event.venue}
            className={inputClass()}
          />
        </div>
        <div>
          <label className={labelClass()} htmlFor="city">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            defaultValue={event.city}
            className={inputClass()}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass()} htmlFor="eventDate">
            Date
          </label>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            required
            defaultValue={event.event_date}
            className={inputClass()}
          />
        </div>
        <div>
          <label className={labelClass()} htmlFor="eventTime">
            Time
          </label>
          <input
            id="eventTime"
            name="eventTime"
            type="time"
            required
            defaultValue={event.event_time}
            className={inputClass()}
          />
        </div>
      </div>

      {event.ticket_types.some((t) => t.sold > 0) && (
        <p className="rounded-xl bg-orange-50 px-4 py-3 text-xs text-orange-700">
          This event already has tickets sold. Changing the date or venue
          won't automatically notify people who already bought a ticket —
          you'll need to let them know yourself.
        </p>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
