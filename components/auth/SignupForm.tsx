"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Link from "next/link";
import FormField from "@/components/auth/FormField";
import { signUp, type AuthFormState } from "@/lib/actions/auth";

const initialState: AuthFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

export default function SignupForm() {
  const [state, formAction] = useFormState(signUp, initialState);
  const [accountType, setAccountType] = useState<"customer" | "organizer">(
    "customer"
  );

  return (
    <>
      <form action={formAction} className="mt-8 space-y-5">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink">
            I&apos;m signing up as
          </span>
          <div className="grid grid-cols-2 gap-3">
            {(["customer", "organizer"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccountType(type)}
                aria-pressed={accountType === type}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold capitalize transition ${
                  accountType === type
                    ? "border-purple-600 bg-purple-50 text-purple-700"
                    : "border-black/10 bg-white text-ink/60 hover:border-black/20"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <input type="hidden" name="accountType" value={accountType} />
        </div>

        <FormField
          label="Full name"
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Ama Owusu"
          required
        />
        <FormField
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <FormField
          label="Phone"
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="024 000 0000"
        />
        <FormField
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />

        {state.error && (
          <p
            role="alert"
            className="rounded-xl bg-error/10 px-4 py-3 text-sm font-medium text-error"
          >
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-ink/50">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-purple-600 hover:text-purple-700"
        >
          Log in
        </Link>
      </p>
    </>
  );
}
