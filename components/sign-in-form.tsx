"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { getSafeRedirectPath } from "@/utils/auth/redirect";
import { createClient } from "@/utils/supabase/client";

type SignInFormProps = {
  nextPath?: string | null;
};

type AuthStep =
  | "email"
  | "existing-options"
  | "new-user"
  | "password"
  | "otp"
  | "set-password";

type EmailStatus = "existing" | "new";

type EmailLookupResponse = {
  isExistingUser: boolean;
};

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("error sending confirmation email")) {
    return "Supabase could not send the authentication email. Check Authentication > Email Templates and SMTP Settings in Supabase, then retry.";
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return "That email and password combination was not accepted.";
  }

  if (
    (normalizedMessage.includes("otp") ||
      normalizedMessage.includes("token") ||
      normalizedMessage.includes("code")) &&
    (normalizedMessage.includes("expired") ||
      normalizedMessage.includes("invalid") ||
      normalizedMessage.includes("used"))
  ) {
    return "The one-time code is invalid, expired, or already used. Request a new code and try again.";
  }

  if (normalizedMessage.includes("weak password")) {
    return "Choose a stronger password with more length and complexity.";
  }

  return message;
}

async function readJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function SignInForm({ nextPath }: SignInFormProps) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const [step, setStep] = useState<AuthStep>("email");
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [email, setEmail] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function getSupabaseClient() {
    let supabase = supabaseRef.current;

    if (!supabase) {
      supabase = createClient();
      supabaseRef.current = supabase;
    }

    return supabase;
  }

  function redirectToDestination() {
    window.location.replace(getSafeRedirectPath(nextPath ?? "/"));
  }

  function resetSensitiveState() {
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setOtpSentTo(null);
  }

  function resetToEmailStep() {
    setStep("email");
    setEmailStatus(null);
    setResolvedEmail("");
    setError(null);
    resetSensitiveState();
  }

  async function lookupEmailAddress(targetEmail: string) {
    const response = await fetch("/api/auth/lookup", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: targetEmail,
      }),
    });
    const payload = (await readJsonSafe(response)) as
      | (EmailLookupResponse & { error?: string })
      | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "We could not continue with that email.");
    }

    return payload;
  }

  async function sendOtp(targetEmail: string) {
    const supabase = getSupabaseClient();
    return supabase.auth.signInWithOtp({
      email: targetEmail,
    });
  }

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    setError(null);

    startTransition(async () => {
      try {
        const payload = await lookupEmailAddress(trimmedEmail);

        if (!payload) {
          throw new Error("We could not continue with that email.");
        }

        setEmail(trimmedEmail);
        setResolvedEmail(trimmedEmail);
        resetSensitiveState();

        if (payload.isExistingUser) {
          setEmailStatus("existing");
          setStep("existing-options");
          return;
        }

        setEmailStatus("new");
        setStep("new-user");
      } catch (lookupError) {
        const message =
          lookupError instanceof Error
            ? lookupError.message
            : "We could not continue with that email.";

        setError(message);
      }
    });
  }

  function handleSendOtp() {
    if (!resolvedEmail) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const { error: authError } = await sendOtp(resolvedEmail);

        if (authError) {
          setError(getAuthErrorMessage(authError.message));
          return;
        }

        setOtp("");
        setPassword("");
        setConfirmPassword("");
        setOtpSentTo(resolvedEmail);
        setStep("otp");
      } catch (clientError) {
        const message =
          clientError instanceof Error
            ? clientError.message
            : "Supabase is not configured for client-side auth.";

        setError(message);
      }
    });
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resolvedEmail) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const supabase = getSupabaseClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password,
        });

        if (authError) {
          setError(getAuthErrorMessage(authError.message));
          return;
        }

        redirectToDestination();
      } catch (clientError) {
        const message =
          clientError instanceof Error
            ? clientError.message
            : "Supabase is not configured for client-side auth.";

        setError(message);
      }
    });
  }

  function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!otpSentTo) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const supabase = getSupabaseClient();
        const { error: authError } = await supabase.auth.verifyOtp({
          email: otpSentTo,
          token: otp,
          type: "email",
        });

        if (authError) {
          setError(getAuthErrorMessage(authError.message));
          return;
        }

        if (emailStatus === "new") {
          setPassword("");
          setConfirmPassword("");
          setStep("set-password");
          return;
        }

        redirectToDestination();
      } catch (clientError) {
        const message =
          clientError instanceof Error
            ? clientError.message
            : "Supabase is not configured for client-side auth.";

        setError(message);
      }
    });
  }

  function handleSetPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The password confirmation does not match.");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const supabase = getSupabaseClient();
        const { error: authError } = await supabase.auth.updateUser({
          password,
        });

        if (authError) {
          setError(getAuthErrorMessage(authError.message));
          return;
        }

        redirectToDestination();
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
    <div className="grid gap-4">
      {otpSentTo && step === "otp" ? (
        <p className="rounded-2xl border border-(--color-cyan)/35 bg-(--color-cyan)/10 px-4 py-3 text-sm text-gray-900">
          We sent a 6-digit code to <strong>{otpSentTo}</strong>. Enter it
          below to continue.
        </p>
      ) : null}

      {step === "email" ? (
        <form onSubmit={handleEmailSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@ighub.org"
              className="field-shell w-full px-4 py-3 text-base outline-none ring-0 transition focus:border-(--color-indigo)"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="primary-button w-full items-center justify-center px-5 py-3 text-sm"
          >
            {isPending ? "Checking email..." : "Continue"}
          </button>
        </form>
      ) : null}

      {step === "existing-options" ? (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-(--color-indigo)/15 bg-[color:var(--color-indigo-light)]/70 px-4 py-3 text-sm text-gray-900">
            <p className="font-semibold">Welcome back</p>
            <p className="mt-1 text-gray-700">
              Continue as <strong>{resolvedEmail}</strong> with a 6-digit code,
              or use your password if you have already set one.
            </p>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={handleSendOtp}
            className="primary-button w-full items-center justify-center px-5 py-3 text-sm"
          >
            {isPending ? "Sending code..." : "Email me a 6-digit code"}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setPassword("");
              setStep("password");
            }}
            className="secondary-button w-full items-center justify-center px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            Use password instead
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={resetToEmailStep}
            className="text-sm font-medium text-(--color-indigo) disabled:cursor-not-allowed disabled:opacity-60"
          >
            Use a different email
          </button>
        </div>
      ) : null}

      {step === "new-user" ? (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-(--color-cyan)/30 bg-(--color-cyan)/10 px-4 py-3 text-sm text-gray-900">
            <p className="font-semibold">First-time sign-in</p>
            <p className="mt-1 text-gray-700">
              We&apos;ll email a 6-digit code to <strong>{resolvedEmail}</strong>.
              After you verify it, you can create a password here for next time.
            </p>
          </div>

          <button
            type="button"
            disabled={isPending}
            onClick={handleSendOtp}
            className="primary-button w-full items-center justify-center px-5 py-3 text-sm"
          >
            {isPending ? "Sending code..." : "Email me a 6-digit code"}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={resetToEmailStep}
            className="text-sm font-medium text-(--color-indigo) disabled:cursor-not-allowed disabled:opacity-60"
          >
            Use a different email
          </button>
        </div>
      ) : null}

      {step === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="grid gap-4">
          <div className="rounded-2xl border border-(--color-indigo)/15 bg-[color:var(--color-indigo-light)]/70 px-4 py-3 text-sm text-gray-900">
            Signing in as <strong>{resolvedEmail}</strong>
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-shell w-full px-4 py-3 text-base outline-none ring-0 transition focus:border-(--color-indigo)"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="primary-button w-full items-center justify-center px-5 py-3 text-sm"
          >
            {isPending ? "Signing in..." : "Sign in with password"}
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSendOtp}
              className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Use a 6-digit code instead
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={resetToEmailStep}
              className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Change email
            </button>
          </div>
        </form>
      ) : null}

      {step === "otp" ? (
        <form onSubmit={handleOtpSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label
              htmlFor="otp"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]"
            >
              Enter 6-digit code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              className="field-shell w-full px-4 py-3 text-center text-base tracking-[0.35em] outline-none ring-0 transition focus:border-(--color-indigo)"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || otp.length !== 6}
            className="primary-button w-full items-center justify-center px-5 py-3 text-sm"
          >
            {isPending ? "Verifying code..." : "Verify code"}
          </button>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSendOtp}
              className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send new code
            </button>
            {emailStatus === "existing" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  setPassword("");
                  setStep("password");
                }}
                className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                Use password instead
              </button>
            ) : null}
            <button
              type="button"
              disabled={isPending}
              onClick={resetToEmailStep}
              className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Change email
            </button>
          </div>
        </form>
      ) : null}

      {step === "set-password" ? (
        <form onSubmit={handleSetPasswordSubmit} className="grid gap-4">
          <div className="rounded-2xl border border-(--color-green)/30 bg-(--color-green)/10 px-4 py-3 text-sm text-gray-900">
            <p className="font-semibold">Email verified</p>
            <p className="mt-1 text-gray-700">
              Create a password for <strong>{resolvedEmail}</strong> so you can
              sign in faster next time.
            </p>
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="new-password"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]"
            >
              Create password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-shell w-full px-4 py-3 text-base outline-none ring-0 transition focus:border-(--color-indigo)"
            />
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="confirm-password"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="field-shell w-full px-4 py-3 text-base outline-none ring-0 transition focus:border-(--color-indigo)"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="primary-button w-full items-center justify-center px-5 py-3 text-sm"
          >
            {isPending ? "Saving password..." : "Save password and continue"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-(--color-orange)/35 bg-(--color-orange)/10 px-4 py-3 text-sm text-gray-900">
          {error}
        </p>
      ) : null}
    </div>
  );
}
