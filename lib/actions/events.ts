"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { performRefund } from "@/lib/actions/refunds";
import type { EventCategory, EventStatus } from "@/types/database";

export interface CreateEventFormState {
  error: string | null;
  success: boolean;
  slug: string | null;
  status: EventStatus | null;
}

const ALLOWED_CATEGORIES: EventCategory[] = [
  "music",
  "comedy",
  "sports",
  "conferences",
  "parties",
  "other",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "event"}-${suffix}`;
}

export async function createEvent(
  _prevState: CreateEventFormState,
  formData: FormData
): Promise<CreateEventFormState> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You need to be logged in as an organizer to create an event.",
      success: false,
      slug: null,
      status: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "organizer") {
    return {
      error: "Only organizer accounts can create events.",
      success: false,
      slug: null,
      status: null,
    };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "other");
  const venue = String(formData.get("venue") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "");
  const eventTime = String(formData.get("eventTime") ?? "");
  const posterUrl = String(formData.get("posterUrl") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "draft");

  if (!title || !venue || !city || !eventDate || !eventTime) {
    return {
      error: "Please fill in title, venue, city, date, and time.",
      success: false,
      slug: null,
      status: null,
    };
  }

  const category = ALLOWED_CATEGORIES.includes(categoryRaw as EventCategory)
    ? (categoryRaw as EventCategory)
    : "other";
  const status: EventStatus = statusRaw === "published" ? "published" : "draft";
  const slug = slugify(title);

  // The poster upload widget generates a UUID client-side (before this
  // event row exists) so it can upload straight to its final
  // event-posters/{organizer_id}/{event_id}/... path. If present and
  // well-formed, use it as the row's id instead of letting the DB default
  // generate one, so the poster we already uploaded actually points at the
  // right event. There's no security concern in accepting a client-chosen
  // primary key here — it's just an identifier, not an authorization
  // boundary — but it's validated as a plausible UUID regardless, since a
  // garbage value would otherwise fail the insert outright.
  const clientId = String(formData.get("id") ?? "").trim();
  const idOverride = UUID_RE.test(clientId) ? clientId : undefined;

  const { error } = await supabase.from("events").insert({
    ...(idOverride ? { id: idOverride } : {}),
    organizer_id: user.id,
    title,
    slug,
    description,
    category,
    venue,
    city,
    event_date: eventDate,
    event_time: eventTime,
    poster_url: posterUrl || null,
    status,
  });

  if (error) {
    return {
      error: "Couldn't create the event. Please try again.",
      success: false,
      slug: null,
      status: null,
    };
  }

  return { error: null, success: true, slug, status };
}

export interface UpdatePosterFormState {
  error: string | null;
  success: boolean;
}

/**
 * Persists a poster URL (already uploaded to Supabase Storage client-side —
 * see components/organizer/PosterUpload.tsx) onto an existing event. The
 * actual file bytes never pass through this action; it just records where
 * they ended up, after confirming the caller owns the event.
 */
export async function updateEventPoster(
  eventId: string,
  posterUrl: string
): Promise<UpdatePosterFormState> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in.", success: false };
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, organizer_id")
    .eq("id", eventId)
    .single();

  if (!event || event.organizer_id !== user.id) {
    return { error: "You don't have access to this event.", success: false };
  }

  const { error } = await supabase
    .from("events")
    .update({ poster_url: posterUrl })
    .eq("id", eventId);

  if (error) {
    return {
      error: "Couldn't save the poster. Please try again.",
      success: false,
    };
  }

  revalidatePath(`/organizers/events/${eventId}`);
  revalidatePath("/organizers/dashboard");
  return { error: null, success: true };
}

export interface UpdateEventFormState {
  error: string | null;
  success: boolean;
}

/**
 * Edits an existing event's details. Uses the regular RLS-respecting
 * client — organizers already have a direct update policy on their own
 * events (events_update_own), so no admin client is needed here, unlike
 * refunds/orders/staff where organizers have no standing read access to
 * other people's rows. Does not restrict which fields can change even
 * after tickets are sold — deliberately simple for now; there's no
 * automatic notification to existing ticket holders if the date or venue
 * changes, which is a real gap worth knowing about if you rely on this
 * for an event that's already sold tickets.
 */
export async function updateEvent(
  eventId: string,
  _prevState: UpdateEventFormState,
  formData: FormData
): Promise<UpdateEventFormState> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in.", success: false };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "other");
  const venue = String(formData.get("venue") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "");
  const eventTime = String(formData.get("eventTime") ?? "");

  if (!title || !venue || !city || !eventDate || !eventTime) {
    return {
      error: "Please fill in title, venue, city, date, and time.",
      success: false,
    };
  }

  const category = ALLOWED_CATEGORIES.includes(categoryRaw as EventCategory)
    ? (categoryRaw as EventCategory)
    : "other";

  const { error } = await supabase
    .from("events")
    .update({
      title,
      description,
      category,
      venue,
      city,
      event_date: eventDate,
      event_time: eventTime,
    })
    .eq("id", eventId)
    .eq("organizer_id", user.id);

  if (error) {
    return {
      error: "Couldn't save your changes. Please try again.",
      success: false,
    };
  }

  revalidatePath(`/organizers/events/${eventId}`);
  revalidatePath("/organizers/dashboard");
  revalidatePath("/events");
  return { error: null, success: true };
}

export interface CancelEventResult {
  error: string | null;
  success: boolean;
  refundedCount: number;
}

/**
 * Cancels an event: sets status to 'cancelled' (which already removes it
 * from public listings, since those only ever show status = 'published'),
 * then automatically refunds every currently-paid order for it — an
 * organizer can't sell/deliver on a cancelled event, so those customers
 * shouldn't have to separately ask for their money back one by one.
 *
 * Known gap: an order that's mid-checkout (customer on Paystack's payment
 * page right now) isn't touched by this and isn't re-checked against
 * event status when it settles afterward — settle.ts only verifies the
 * Paystack transaction itself. That's a narrow timing window, not
 * something this migration closes; flagging it rather than leaving it
 * silently unhandled.
 */
export async function cancelEvent(eventId: string): Promise<CancelEventResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in.", success: false, refundedCount: 0 };
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, organizer_id, status")
    .eq("id", eventId)
    .single();

  if (!event || event.organizer_id !== user.id) {
    return {
      error: "You don't have access to this event.",
      success: false,
      refundedCount: 0,
    };
  }

  if (event.status === "cancelled") {
    return { error: "This event is already cancelled.", success: false, refundedCount: 0 };
  }

  const { error: statusError } = await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", eventId)
    .eq("organizer_id", user.id);

  if (statusError) {
    return {
      error: "Couldn't cancel the event. Please try again.",
      success: false,
      refundedCount: 0,
    };
  }

  const admin = createAdminClient();
  const { data: paidOrders } = await admin
    .from("orders")
    .select("id, status, payment_reference")
    .eq("event_id", eventId)
    .eq("status", "paid");

  let refundedCount = 0;
  for (const order of paidOrders ?? []) {
    const result = await performRefund(admin, order);
    if (result.success) refundedCount += 1;
  }

  revalidatePath(`/organizers/events/${eventId}`);
  revalidatePath("/organizers/dashboard");
  revalidatePath("/events");
  return { error: null, success: true, refundedCount };
}
