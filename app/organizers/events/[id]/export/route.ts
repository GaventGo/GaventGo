import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ownership check via the normal RLS-scoped client — only after this
  // passes do we reach for the admin client, and only to read order data
  // that belongs to this one already-verified event.
  const { data: event } = await supabase
    .from("events")
    .select("id, title, organizer_id")
    .eq("id", params.id)
    .single();

  if (!event || event.organizer_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data: orders } = await admin
    .from("orders")
    .select(
      "id, status, created_at, profiles(full_name, email), order_items(quantity, unit_price, subtotal, qr_code, scanned_at, wristband_id, ticket_types(name))"
    )
    .eq("event_id", params.id)
    .order("created_at", { ascending: true });

  const header = [
    "Order Date",
    "Order Status",
    "Buyer Name",
    "Buyer Email",
    "Ticket Type",
    "Quantity",
    "Unit Price",
    "Subtotal",
    "QR Code",
    "Checked In",
    "Scanned At",
    "Wristband ID",
  ];

  const rows = [header.join(",")];

  for (const order of (orders ?? []) as any[]) {
    for (const item of order.order_items ?? []) {
      rows.push(
        [
          new Date(order.created_at).toISOString(),
          order.status,
          csvEscape(order.profiles?.full_name ?? ""),
          csvEscape(order.profiles?.email ?? ""),
          csvEscape(item.ticket_types?.name ?? ""),
          String(item.quantity),
          String(item.unit_price),
          String(item.subtotal),
          item.qr_code ?? "",
          item.scanned_at ? "Yes" : "No",
          item.scanned_at ?? "",
          item.wristband_id ?? "",
        ].join(",")
      );
    }
  }

  const csv = rows.join("\n");
  const filename = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-tickets.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
