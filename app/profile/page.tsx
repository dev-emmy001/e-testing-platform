import Link from "next/link";
import { FlashToast } from "@/components/flash-toast";
import { SubmitButton } from "@/components/submit-button";
import { updateProfileAction } from "@/app/actions";
import { getDashboardPathForRole } from "@/utils/auth/redirect";
import { requireUserContext } from "@/utils/auth/session";
import { readFlash } from "@/utils/flash";
import { getRoleClasses } from "@/utils/format";
import {
  getProfileDisplayName,
  normalizeProfileText,
} from "@/utils/profile";

export default async function ProfilePage() {
  const [{ error, message }, { profile, user }] = await Promise.all([
    readFlash(),
    requireUserContext("/profile", { allowIncompleteProfile: true }),
  ]);
  const dashboardPath = getDashboardPathForRole(profile?.role);
  const prefilledName = normalizeProfileText(profile?.name);
  const prefilledTrack = normalizeProfileText(profile?.track);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12 lg:px-8">
      <FlashToast error={error} message={message} />

      <section className="surface-card w-full rounded-4xl p-8 lg:p-10">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`status-pill ${getRoleClasses(profile?.role ?? "trainee")}`}
              >
                {profile?.role ?? "trainee"}
              </span>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
                Profile settings
              </p>
            </div>
            <h1 className="mt-4 text-4xl font-bold text-gray-900">
              Update your account details.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-700">
              Keep your name and track current so your dashboard, results, and
              admin reporting stay accurate.
            </p>
          </div>

          <Link
            href={dashboardPath}
            className="secondary-button inline-flex items-center justify-center px-5 py-3 text-sm"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div className="space-y-5">
            <div className="rounded-3xl bg-gray-100 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Signed in as
              </p>
              <p className="mt-2 break-all text-lg font-bold text-gray-900">
                {user.email ?? profile?.email ?? "Unknown account"}
              </p>
              <p className="mt-3 text-sm text-gray-600">
                Displayed as {getProfileDisplayName(profile)} across the
                platform.
              </p>
            </div>

            <div className="rounded-3xl border border-[color:var(--color-cyan)]/30 bg-[color:var(--color-cyan)]/10 px-5 py-5 text-sm leading-7 text-gray-700">
              Your email is managed by Supabase sign-in. This page updates the
              profile details the platform uses for greetings, cohort grouping,
              and admin reporting.
            </div>
          </div>

          <form action={updateProfileAction} className="grid gap-5">
            <div className="grid gap-2">
              <label
                htmlFor="name"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500"
              >
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                defaultValue={prefilledName}
                placeholder="Ada Eze"
                className="field-shell w-full px-4 py-3 text-base outline-none ring-0 transition focus:border-[color:var(--color-indigo)]"
              />
            </div>

            <div className="grid gap-2">
              <label
                htmlFor="track"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500"
              >
                Track
              </label>
              <input
                id="track"
                name="track"
                type="text"
                required
                defaultValue={prefilledTrack}
                placeholder="Frontend Development"
                className="field-shell w-full px-4 py-3 text-base outline-none ring-0 transition focus:border-[color:var(--color-indigo)]"
              />
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700">
              Use the same track name your cohort and administrators recognize.
            </div>

            <div className="flex flex-wrap gap-3">
              <SubmitButton
                pendingLabel="Saving changes..."
                className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
              >
                Save changes
              </SubmitButton>

              <Link
                href={dashboardPath}
                className="secondary-button inline-flex items-center justify-center px-5 py-3 text-sm"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
