"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface DailySales {
  date: string; // YYYY-MM-DD
  revenue: number;
  ticketsSold: number;
}

export interface TicketTypeBreakdown {
  name: string;
  sold: number;
  revenue: number;
}

export interface EventAnalytics {
  salesByDay: DailySales[];
  byTicketType: TicketTypeBreakdown[];
  totalPaidTickets: number;
  scannedCount: number;
  checkInRate: number; // 0-100
}

/**
 * Computes analytics for one event, organizer-only. Ownership is checked
 * here explicitly (same pattern as refunds/orders/staff) since organizers
 * have no standing RLS read access to other people's orders — the admin
 * client is only used after that check passes, scoped to this one event.
 */
export async function getEventAnalytics(
  eventId: string
): Promise<EventAnalytics | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, organizer_id")
    .eq("id", eventId)
    .single();

  if (!event || event.organizer_id !== user.id) return null;

  const { data: orders } = await admin
    .from("orders")
    .select(
      "id, total_amount, created_at, status, order_items(quantity, subtotal, scanned_at, ticket_types(name))"
    )
    .eq("event_id", eventId)
    .eq("status", "paid");

  const byDayMap = new Map<string, DailySales>();
  const byTypeMap = new Map<string, TicketTypeBreakdown>();
  let totalPaidTickets = 0;
  let scannedCount = 0;

  for (const order of orders ?? []) {
    const day = new Date(order.created_at).toISOString().slice(0, 10);
    const existingDay = byDayMap.get(day) ?? {
      date: day,
      revenue: 0,
      ticketsSold: 0,
    };

    const items = (order as any).order_items as {
      quantity: number;
      subtotal: number;
      scanned_at: string | null;
      ticket_types: { name: string } | null;
    }[];

    for (const item of items ?? []) {
      totalPaidTickets += item.quantity;
      if (item.scanned_at) scannedCount += item.quantity;

      existingDay.revenue += Number(item.subtotal);
      existingDay.ticketsSold += item.quantity;

      const typeName = item.ticket_types?.name ?? "Ticket";
      const existingType = byTypeMap.get(typeName) ?? {
        name: typeName,
        sold: 0,
        revenue: 0,
      };
      existingType.sold += item.quantity;
      existingType.revenue += Number(item.subtotal);
      byTypeMap.set(typeName, existingType);
    }

    byDayMap.set(day, existingDay);
  }

  const salesByDay = Array.from(byDayMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const byTicketType = Array.from(byTypeMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  const checkInRate =
    totalPaidTickets > 0 ? (scannedCount / totalPaidTickets) * 100 : 0;

  return {
    salesByDay,
    byTicketType,
    totalPaidTickets,
    scannedCount,
    checkInRate,
  };
}
