"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface OrganizerLedgerRow {
  organizerId: string;
  organizerEmail: string;
  organizerName: string;
  grossSales: number;
  feePercent: number;
  netOwed: number;
  alreadyPaid: number;
  balanceDue: number;
}

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL;

  if (!adminEmail || !user?.email || user.email.toLowerCase() !== adminEmail.toLowerCase()) {
    return null;
  }

  return user;
}

/**
 * Computes what's owed to each organizer: gross sales from currently-'paid'
 * orders only (a refunded order's status is no longer 'paid', so refunded
 * money drops out of this automatically — no separate subtraction needed),
 * minus the platform fee, minus whatever's already been recorded as paid
 * out via the payouts table. Read-only — never writes anything.
 */
export async function getPayoutLedger(): Promise<OrganizerLedgerRow[] | null> {
  const admin_user = await requireAdmin();
  if (!admin_user) return null;

  const admin = createAdminClient();
  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? "0");

  const { data: organizers } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "organizer");

  if (!organizers || organizers.length === 0) return [];

  const rows: OrganizerLedgerRow[] = [];

  for (const org of organizers) {
    const { data: events } = await admin
      .from("events")
      .select("id")
      .eq("organizer_id", org.id);

    const eventIds = (events ?? []).map((e) => e.id);
    let grossSales = 0;

    if (eventIds.length > 0) {
      const { data: orders } = await admin
        .from("orders")
        .select("total_amount")
        .in("event_id", eventIds)
        .eq("status", "paid");

      grossSales = (orders ?? []).reduce(
        (sum, o) => sum + Number(o.total_amount),
        0
      );
    }

    const { data: payouts } = await admin
      .from("payouts")
      .select("amount")
      .eq("organizer_id", org.id);

    const alreadyPaid = (payouts ?? []).reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    const netOwed = grossSales * (1 - feePercent / 100);

    rows.push({
      organizerId: org.id,
      organizerEmail: org.email,
      organizerName: org.full_name || "",
      grossSales,
      feePercent,
      netOwed,
      alreadyPaid,
      balanceDue: netOwed - alreadyPaid,
    });
  }

  return rows.sort((a, b) => b.balanceDue - a.balanceDue);
}

export interface RecordPayoutResult {
  error: string | null;
  success: boolean;
}

export async function recordPayout(
  organizerId: string,
  amount: number,
  note: string
): Promise<RecordPayoutResult> {
  const admin_user = await requireAdmin();
  if (!admin_user) {
    return { error: "Not authorized.", success: false };
  }

  if (!amount || amount <= 0) {
    return { error: "Enter an amount greater than zero.", success: false };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("payouts").insert({
    organizer_id: organizerId,
    amount,
    note: note.trim(),
    created_by: admin_user.id,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}
