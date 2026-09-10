"use server";

import { createClient } from "@/lib/supabase/server";

export interface StaffActionResult {
  error: string | null;
  success: boolean;
}

/**
 * Grants an existing GaventGo account scan access to one event. Calls the
 * invite_event_staff() SQL function, which does the real permission check
 * (caller must own the event) and the actual role/assignment writes — this
 * is a thin wrapper that just surfaces its result.
 */
export async function inviteStaff(
  eventId: string,
  email: string
): Promise<StaffActionResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in.", success: false };
  }

  const { data, error } = await supabase.rpc("invite_event_staff", {
    p_event_id: eventId,
    p_email: email,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  const result = data as { ok: boolean; error?: string };
  if (!result.ok) {
    return { error: result.error ?? "Could not add staff.", success: false };
  }

  return { error: null, success: true };
}

export async function removeStaff(
  eventId: string,
  userId: string
): Promise<StaffActionResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in.", success: false };
  }

  const { error } = await supabase.rpc("remove_event_staff", {
    p_event_id: eventId,
    p_user_id: userId,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}
