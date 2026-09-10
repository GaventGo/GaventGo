import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. Bypasses RLS entirely — this is the ONE
 * place in the codebase allowed to do that, and only because it's used from
 * contexts with no user session to check against (Paystack's webhook, and
 * the payment-verification redirect target), where a trusted server needs
 * to mark an order 'paid' on the customer's behalf.
 *
 * NEVER import this file from a Client Component or anything shipped to the
 * browser. Only import it from Route Handlers / server-only modules. It
 * reads SUPABASE_SERVICE_ROLE_KEY, which has no NEXT_PUBLIC_ prefix and is
 * therefore never bundled into client JS.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — payment settlement requires it. See .env.local.example."
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
