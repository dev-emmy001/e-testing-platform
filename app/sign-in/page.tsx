import Link from "next/link";
import { redirect } from "next/navigation";
import { FlashBanner } from "@/components/flash-banner";
import { getCurrentUserContext } from "@/utils/auth/session";
import { getSearchParamValue } from "@/utils/format";
import { SignInForm } from "./sign-in-form";

type SignInPageProps = {
  searchParams: Promise<{
    message?: string | string[];
    next?: string | string[];
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const nextPath = getSearchParamValue(params.next);
  const message = getSearchParamValue(params.message);
  const { profile, user } = await getCurrentUserContext();

  if (user) {
    redirect(profile?.role === "admin" ? "/admin" : "/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface-card rounded-4xl p-8 lg:p-12">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-(--color-indigo-light) px-4 py-2 text-sm font-semibold text-(--color-indigo)">
            <span className="h-2.5 w-2.5 rounded-full bg-(--color-cyan)" />
            Innovation Growth Hub
          </div>

          <h1 className="max-w-2xl text-4xl font-display tracking-tight text-gray-900 sm:text-5xl">
            Magic-link access for trainee assessments.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-700">
            Sign in with the email address registered for your cohort. Your link
            will take you back here, restore your session, and send you straight
            to the right dashboard.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="surface-card rounded-3xl p-5">
              <p className="text-sm font-semibold text-(--color-indigo)">
                60-minute timed tests
              </p>
              <p className="mt-2 text-sm text-gray-700">
                Countdown is synced to the server-side expiry time.
              </p>
            </div>
            <div className="surface-card rounded-3xl p-5">
              <p className="text-sm font-semibold text-(--color-indigo)">
                Instant scoring
              </p>
              <p className="mt-2 text-sm text-gray-700">
                Results are graded automatically when you submit or time
                expires.
              </p>
            </div>
            <div className="surface-card rounded-3xl p-5">
              <p className="text-sm font-semibold text-(--color-indigo)">
                Admin controls
              </p>
              <p className="mt-2 text-sm text-gray-700">
                Operators can manage tests, exports, and retakes without SQL
                access.
              </p>
            </div>
          </div>
        </section>

        <section className="surface-card rounded-4xl p-8 lg:p-10">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
              Sign in
            </p>
            <h2 className="text-3xl font-bold text-gray-900">
              Request your access link
            </h2>
            <p className="text-sm leading-7 text-gray-700">
              Use the exact email invited to the training platform. The magic
              link lands in your inbox immediately.
            </p>
          </div>

          <div className="mt-6">
            <FlashBanner message={message} />
          </div>

          <div className="mt-6">
            <SignInForm nextPath={nextPath} />
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Need to switch accounts? Return to the{" "}
            <Link href="/" className="font-semibold text-(--color-indigo)">
              main dashboard
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
