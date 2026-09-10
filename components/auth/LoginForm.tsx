"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import FormField from "@/components/auth/FormField";
import { signIn, type AuthFormState } from "@/lib/actions/auth";

const initialState: AuthFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Logging in…" : "Log in"}
    </button>
  );
}

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState(signIn, initialState);

  return (
    <>
      <form action={formAction} className="mt-8 space-y-5">
        {next && <input type="hidden" name="next" value={next} />}
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
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
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
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-purple-600 hover:text-purple-700"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
