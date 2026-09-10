import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Releases inventory held by pending orders older than `olderThanMinutes`
 * by calling expire_pending_orders() — the Postgres function does the
 * actual work (row-locked, atomic per order). Server-only: uses the
 * service-role client because this isn't tied to any one user's session —
 * it's a maintenance sweep, meant to be called from the cron route only.
 */
export async function expirePendingOrders(olderThanMinutes = 30): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("expire_pending_orders", {
    p_older_than_minutes: olderThanMinutes,
  });

  if (error) {
    throw new Error(error.message || "Failed to expire pending orders.");
  }

  return (data as number) ?? 0;
}
