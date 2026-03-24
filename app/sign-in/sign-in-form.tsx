"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { getSafeRedirectPath } from "@/utils/auth/redirect";
import { createClient } from "@/utils/supabase/client";

type SignInFormProps = {
  nextPath?: string | null;
};

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("error sending confirmation email")) {
    return "Supabase could not send the magic link email. Check Authentication > Email Templates and SMTP Settings in Supabase, then retry.";
  }

  if (
    normalizedMessage.includes("redirect_to") ||
    normalizedMessage.includes("redirect url")
  ) {
    return "This redirect URL is not allowed by Supabase. Add your app URL ending in /auth/callback under Authentication > URL Configuration > Redirect URLs.";
  }

  return message;
}

export function SignInForm({ nextPath }: SignInFormProps) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSentTo(null);

    startTransition(async () => {
      let supabase = supabaseRef.current;

      try {
        if (!supabase) {
          supabase = createClient();
          supabaseRef.current = supabase;
        }

        const safeNextPath = getSafeRedirectPath(nextPath ?? "/");
        const emailRedirectTo = new URL("/auth/callback", window.location.origin);
        emailRedirectTo.searchParams.set("next", safeNextPath);

        const { error: authError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: emailRedirectTo.toString(),
          },
        });

        if (authError) {
          setError(getAuthErrorMessage(authError.message));
          return;
        }

        setSentTo(email);
        setEmail("");
      } catch (clientError) {
        const message =
          clientError instanceof Error
            ? clientError.message
            : "Supabase is not configured for client-side auth.";

        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-[color:var(--color-gray-700)]">
          Work email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@ighub.org"
          className="field-shell w-full px-4 py-3 text-base outline-none ring-0 transition focus:border-[color:var(--color-indigo)]"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
      >
        {isPending ? "Sending magic link..." : "Send magic link"}
      </button>

      {sentTo ? (
        <p className="rounded-2xl border border-[color:var(--color-cyan)]/35 bg-[color:var(--color-cyan)]/10 px-4 py-3 text-sm text-[color:var(--color-gray-900)]">
          Magic link sent to <strong>{sentTo}</strong>. Open the email on this device to
          continue.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-[color:var(--color-orange)]/35 bg-[color:var(--color-orange)]/10 px-4 py-3 text-sm text-[color:var(--color-gray-900)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
