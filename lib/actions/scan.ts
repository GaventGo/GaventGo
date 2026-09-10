"use server";

import { createClient } from "@/lib/supabase/server";
import type { ScanTicketPayload } from "@/types/database";

export interface ScanResult {
  error: string | null;
  payload: ScanTicketPayload | null;
}

/**
 * Thin wrapper around the scan_ticket() RPC — all the real logic
 * (authorization, "already scanned" handling, marking checked-in +
 * assigning a wristband) lives in that Postgres function, atomically. This
 * action's job is just to require a logged-in caller and translate the
 * result/error for the scanner UI.
 */
export async function scanTicket(qrCode: string): Promise<ScanResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in to scan tickets.", payload: null };
  }

  const trimmed = qrCode.trim();
  if (!trimmed) {
    return { error: "Enter or scan a ticket code.", payload: null };
  }

  const { data, error } = await supabase.rpc("scan_ticket", {
    p_qr_code: trimmed,
  });

  if (error) {
    return {
      error: error.message || "Couldn't scan this ticket. Please try again.",
      payload: null,
    };
  }

  return { error: null, payload: data as unknown as ScanTicketPayload };
}
