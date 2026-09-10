"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Link from "next/link";
import { createEvent, type CreateEventFormState } from "@/lib/actions/events";
import PosterUpload from "@/components/organizer/PosterUpload";

const initialState: CreateEventFormState = {
  error: null,
  success: false,
  slug: null,
  status: null,
};

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
      {pending ? "Creating…" : "Create event"}
    </button>
  );
}

export default function CreateEventForm({
  organizerId,
}: {
  organizerId: string;
}) {
  const [state, formAction] = useFormState(createEvent, initialState);
  const [eventId] = useState(() => crypto.randomUUID());
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  if (state.success) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-2xl text-success">
          ✓
        </span>
        <h2 className="mt-4 text-lg font-bold text-ink">Event created</h2>
        <p className="mt-1 text-sm text-ink/50">
          {state.status === "published"
            ? "Your event is live and visible to customers."
            : "Saved as a draft — publish it from your dashboard when ready."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {state.status === "published" && state.slug && (
            <Link
              href={`/events/${state.slug}`}
              className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
            >
              View event
            </Link>
          )}
          <Link
            href="/organizers/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:border-black/20"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

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
          placeholder="Afrobeats Live"
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
          placeholder="What should attendees expect?"
          className={inputClass()}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass()} htmlFor="category">
            Category
          </label>
          <select id="category" name="category" className={inputClass()}>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass()} htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue="draft" className={inputClass()}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
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
            placeholder="El Wak Sports Stadium"
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
            placeholder="Accra"
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
            className={inputClass()}
          />
        </div>
      </div>

      <div>
        <label className={labelClass()}>Event poster</label>
        <PosterUpload
          organizerId={organizerId}
          eventId={eventId}
          currentPosterUrl={posterUrl}
          onUploaded={setPosterUrl}
        />
        <input type="hidden" name="id" value={eventId} />
        <input type="hidden" name="posterUrl" value={posterUrl ?? ""} />
      </div>

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
