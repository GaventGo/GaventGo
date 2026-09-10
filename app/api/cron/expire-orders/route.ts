import { NextResponse } from "next/server";
import { expirePendingOrders } from "@/lib/orders/expirePendingOrders";

/**
 * Meant to be hit on a schedule (Vercel Cron, or any external scheduler) —
 * see vercel.json. If CRON_SECRET is set, the request must present it as a
 * bearer token; if unset, the route still works (useful in local dev) but
 * logs a warning, since an unauthenticated maintenance endpoint shouldn't
 * ship to production unprotected.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn(
      "CRON_SECRET is not set — /api/cron/expire-orders is unauthenticated. Set it before deploying."
    );
  }

  try {
    const expiredCount = await expirePendingOrders(30);
    return NextResponse.json({ expired: expiredCount });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to expire pending orders.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
