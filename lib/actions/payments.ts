"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/payments/paystack";

export interface InitiatePaymentResult {
  error: string | null;
  authorizationUrl: string | null;
}

function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  // Fall back to the request's own host so this works in preview/dev
  // without needing NEXT_PUBLIC_SITE_URL set.
  const h = headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "";
}

export async function initiatePayment(
  orderId: string
): Promise<InitiatePaymentResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in to continue.", authorizationUrl: null };
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, total_amount, status, payment_reference")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { error: "Order not found.", authorizationUrl: null };
  }

  if (order.user_id !== user.id) {
    return { error: "You don't have access to this order.", authorizationUrl: null };
  }

  if (order.status !== "pending") {
    return {
      error: `This order is already ${order.status}.`,
      authorizationUrl: null,
    };
  }

  const reference = order.payment_reference ?? `gvg_${orderId}_${Date.now()}`;

  const result = await initializeTransaction({
    email: user.email!,
    amountPesewas: Math.round(Number(order.total_amount) * 100),
    reference,
    callbackUrl: `${siteOrigin()}/checkout/success`,
  });

  if (!result.ok) {
    return { error: result.error, authorizationUrl: null };
  }

  // Allowed by the narrow "orders_update_own_pending_reference" policy —
  // this client can only ever touch payment_reference on its own pending
  // order, nothing else.
  await supabase
    .from("orders")
    .update({ payment_reference: reference })
    .eq("id", orderId);

  return { error: null, authorizationUrl: result.authorizationUrl };
}
