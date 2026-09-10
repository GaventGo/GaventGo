"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface TicketTypeFormState {
  error: string | null;
  success: boolean;
}

/**
 * Confirms the current user is logged in, has role='organizer', and owns
 * the event in question. Every ticket-type mutation below calls this first
 * — nothing here is inferred from client-supplied organizer/event ids
 * without checking them against the authenticated session.
 */
async function assertOwnsEvent(eventId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in as an organizer to do this." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "organizer") {
    return { error: "Only organizer accounts can manage ticket types." };
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, organizer_id")
    .eq("id", eventId)
    .single();

  if (!event || event.organizer_id !== user.id) {
    return { error: "You don't have access to this event." };
  }

  return { supabase, userId: user.id };
}

function parsePriceAndQuantity(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "");
  const quantityRaw = String(formData.get("quantity") ?? "");

  const price = Number(priceRaw);
  const quantity = Number(quantityRaw);

  if (!name) return { fieldError: "Ticket name is required." } as const;
  if (!Number.isFinite(price) || price < 0) {
    return { fieldError: "Price cannot be negative." } as const;
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { fieldError: "Quantity must be greater than zero." } as const;
  }

  return { name, price, quantity } as const;
}

export async function createTicketType(
  _prevState: TicketTypeFormState,
  formData: FormData
): Promise<TicketTypeFormState> {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) return { error: "Missing event.", success: false };

  const owns = await assertOwnsEvent(eventId);
  if ("error" in owns) return { error: owns.error, success: false };

  const parsed = parsePriceAndQuantity(formData);
  if ("fieldError" in parsed) return { error: parsed.fieldError, success: false };

  const { error } = await owns.supabase.from("ticket_types").insert({
    event_id: eventId,
    name: parsed.name,
    price: parsed.price,
    quantity: parsed.quantity,
  });

  if (error) {
    return { error: "Couldn't create the ticket type. Please try again.", success: false };
  }

  revalidatePath(`/organizers/events/${eventId}`);
  return { error: null, success: true };
}

export async function updateTicketType(
  _prevState: TicketTypeFormState,
  formData: FormData
): Promise<TicketTypeFormState> {
  const eventId = String(formData.get("eventId") ?? "");
  const ticketTypeId = String(formData.get("ticketTypeId") ?? "");
  if (!eventId || !ticketTypeId) {
    return { error: "Missing ticket type.", success: false };
  }

  const owns = await assertOwnsEvent(eventId);
  if ("error" in owns) return { error: owns.error, success: false };

  const parsed = parsePriceAndQuantity(formData);
  if ("fieldError" in parsed) return { error: parsed.fieldError, success: false };

  const { error } = await owns.supabase
    .from("ticket_types")
    .update({
      name: parsed.name,
      price: parsed.price,
      quantity: parsed.quantity,
    })
    .eq("id", ticketTypeId)
    .eq("event_id", eventId);

  if (error) {
    // Postgres check_violation from the `sold <= quantity` constraint —
    // translate into the message the spec asks for.
    if (error.code === "23514") {
      return {
        error:
          "Quantity can't be lower than the number of tickets already sold.",
        success: false,
      };
    }
    return { error: "Couldn't update the ticket type. Please try again.", success: false };
  }

  revalidatePath(`/organizers/events/${eventId}`);
  return { error: null, success: true };
}

export async function deleteTicketType(
  _prevState: TicketTypeFormState,
  formData: FormData
): Promise<TicketTypeFormState> {
  const eventId = String(formData.get("eventId") ?? "");
  const ticketTypeId = String(formData.get("ticketTypeId") ?? "");
  if (!eventId || !ticketTypeId) {
    return { error: "Missing ticket type.", success: false };
  }

  const owns = await assertOwnsEvent(eventId);
  if ("error" in owns) return { error: owns.error, success: false };

  const { error } = await owns.supabase
    .from("ticket_types")
    .delete()
    .eq("id", ticketTypeId)
    .eq("event_id", eventId);

  if (error) {
    // Raised by the prevent_delete_if_sold trigger when sold > 0.
    return {
      error:
        "This ticket type already has sales and can't be deleted. Edit it instead.",
      success: false,
    };
  }

  revalidatePath(`/organizers/events/${eventId}`);
  return { error: null, success: true };
}
