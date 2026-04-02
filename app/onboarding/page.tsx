import { redirect } from "next/navigation";
import { completeOnboardingAction } from "@/app/actions";
import { FlashToast } from "@/components/flash-toast";
import { SubmitButton } from "@/components/submit-button";
import { getPostAuthRedirectPath } from "@/utils/auth/redirect";
import { requireUserContext } from "@/utils/auth/session";
import { readFlash } from "@/utils/flash";
import { getSearchParamValue } from "@/utils/format";
import {
  getProfileDisplayName,
  isProfileComplete,
  normalizeProfileText,
} from "@/utils/profile";

type OnboardingPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const [params, { error, message }, { profile, user }] = await Promise.all([
    searchParams,
    readFlash(),
    requireUserContext("/onboarding", { allowIncompleteProfile: true }),
  ]);
  const nextPath = getSearchParamValue(params.next);

  if (isProfileComplete(profile)) {
    redirect(getPostAuthRedirectPath(nextPath, profile?.role));
  }

  const prefilledName = normalizeProfileText(profile?.name);
  const prefilledTrack = normalizeProfileText(profile?.track);
  const prefilledSuccessStory = normalizeProfileText(profile?.success_story);
  const prefilledLocation = normalizeProfileText(profile?.location);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12 lg:px-8">
      <FlashToast error={error} message={message} />

      <section className="surface-card w-full rounded-4xl p-8 lg:p-10">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
              Onboarding
            </p>
            <h1 className="mt-4 text-4xl font-bold text-gray-900">
              Tell us who you are before you continue.
            </h1>
            <p className="mt-4 text-sm leading-7 text-gray-700">
              Your name powers welcome messages, and your track helps IGHub
              organize cohorts, reporting, and trainee management across the
              admin console.
            </p>

            <div className="mt-6 rounded-3xl bg-gray-100 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Signed in as
              </p>
              <p className="mt-2 break-all text-lg font-bold text-gray-900">
                {user.email ?? profile?.email ?? "Unknown account"}
              </p>
              <p className="mt-3 text-sm text-gray-600">
                {getProfileDisplayName(profile)} will appear after you save your
                profile.
              </p>
            </div>
          </div>

          <form action={completeOnboardingAction} className="grid gap-5">
            <input type="hidden" name="nextPath" value={nextPath ?? ""} />

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
            <div className="grid gap-2">
              <label
                htmlFor="location"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500"
              >
                Training Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                required
                defaultValue={prefilledLocation}
                placeholder="IGHub Aba / IGHub Umuahia"
                className="field-shell w-full px-4 py-3 text-base outline-none ring-0 transition focus:border-[color:var(--color-indigo)]"
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="successStory"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500"
              >
                Success Story
              </label>
              <textarea
                id="successStory"
                name="successStory"
                required
                minLength={100}
                defaultValue={prefilledSuccessStory}
                placeholder="How has your experience been so far in the training? did your learn something new?, did something feel off?. Respond in details"
                className="field-shell w-full min-h-[120px] resize-y px-4 py-3 text-base outline-none ring-0 transition focus:border-[color:var(--color-indigo)]"
              />
            </div>

            <div className="rounded-3xl border border-[color:var(--color-cyan)]/30 bg-[color:var(--color-cyan)]/10 px-5 py-4 text-sm text-gray-700">
              Use the course name your IGHub cohort recognizes. That value is
              what administrators will use to filter and review trainees.
            </div>

            <SubmitButton
              pendingLabel="Saving profile..."
              className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              Save and continue
            </SubmitButton>
          </form>
        </div>
      </section>
    </main>
  );
}
