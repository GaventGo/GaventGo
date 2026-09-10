"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error: string | null;
}

const initialAccountTypes = ["customer", "organizer"] as const;

export async function signUp(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const accountTypeRaw = String(formData.get("accountType") ?? "customer");

  if (!fullName || !email || !password) {
    return { error: "Please fill in your name, email, and password." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // Never trust a client-supplied role beyond this allowlist — the DB
  // trigger clamps it too, but we validate here for a clean error message.
  const accountType = initialAccountTypes.includes(accountTypeRaw as any)
    ? accountTypeRaw
    : "customer";

  const supabase = createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone || null,
        role: accountType, // clamped server-side by the DB trigger too
      },
    },
  });

  if (error) {
    const message = error.message.toLowerCase().includes("already")
      ? "An account with this email already exists. Try logging in instead."
      : error.message;
    return { error: message };
  }

  redirect(accountType === "organizer" ? "/organizers/dashboard" : "/account");
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = profile?.role ?? "customer";
  const next = String(formData.get("next") ?? "");

  // Only honor "next" for customers landing back on an in-flight checkout —
  // organizers always go to their dashboard regardless, and we only ever
  // redirect to a relative, same-site path (never an absolute/external URL).
  if (role === "customer" && next.startsWith("/")) {
    redirect(next);
  }

  redirect(role === "organizer" ? "/organizers/dashboard" : "/account");
}

export async function signOut(_formData: FormData) {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
