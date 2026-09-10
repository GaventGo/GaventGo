"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export interface CreateOrderResult {
  error: string | null;
  requiresLogin: boolean;
  orderId: string | null;
}

export interface OrderTicketSelection {
  ticketTypeId: string;
  quantity: number;
}

/**
 * Creates a pending order for the given event + ticket selections. All of
 * the real work — validating the event is published, checking each ticket
 * type belongs to it, locking rows to check remaining inventory, and
 * pricing from the authoritative ticket_types.price — happens inside the
 * create_order() Postgres function, not here. This action's job is just to
 * confirm there's a logged-in user and translate the RPC's result/error
 * into something the UI can show.
 */
export async function createOrder(
  eventId: string,
  items: OrderTicketSelection[]
): Promise<CreateOrderResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Please log in to purchase tickets.",
      requiresLogin: true,
      orderId: null,
    };
  }

  if (!items.length) {
    return {
      error: "Select at least one ticket.",
      requiresLogin: false,
      orderId: null,
    };
  }

  const payload = items.map((item) => ({
    ticket_type_id: item.ticketTypeId,
    quantity: item.quantity,
  })) as unknown as Json;

  const { data, error } = await supabase.rpc("create_order", {
    p_event_id: eventId,
    p_items: payload,
  });

  if (error) {
    return {
      error: error.message || "Couldn't create your order. Please try again.",
      requiresLogin: false,
      orderId: null,
    };
  }

  return { error: null, requiresLogin: false, orderId: data as string };
}
