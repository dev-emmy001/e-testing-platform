import Link from "next/link";
import { redirect } from "next/navigation";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { signOutAction, startTestSessionAction } from "@/app/actions";
import { getCurrentUserContext } from "@/utils/auth/session";
import {
  formatDateTime,
  getRoleClasses,
  getSearchParamValue,
  getStatusClasses,
} from "@/utils/format";
import type { SessionRecord, TestRecord } from "@/utils/test-sessions";

type HomePageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
    view?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const error = getSearchParamValue(params.error);
  const message = getSearchParamValue(params.message);
  const view = getSearchParamValue(params.view);
  const { profile, supabase, user } = await getCurrentUserContext();

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="surface-card rounded-4xl p-8 lg:p-12">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-(--color-indigo-light) px-4 py-2 text-sm font-semibold text-(--color-indigo)">
              <span className="h-2.5 w-2.5 rounded-full bg-(--color-green)" />
              Trainee testing platform
            </div>

            <h1 className="max-w-2xl text-5xl font-display tracking-tight text-gray-900">
              Timed assessments for ongoing ighub cohorts.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-700">
              Trainees sign in by magic link, complete a randomized test, and
              get their score immediately. Admins manage question libraries,
              results, retakes, and CSV exports from one interface.
            </p>

            <div className="mt-8">
              <FlashBanner error={error} message={message} />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="primary-button inline-flex items-center justify-center px-6 py-3 text-sm"
              >
                Sign in with magic link
              </Link>
              <a
                href="#platform-features"
                className="secondary-button inline-flex items-center justify-center px-6 py-3 text-sm"
              >
                View platform features
              </a>
            </div>
          </section>

          <section
            id="platform-features"
            className="surface-card rounded-4xl p-8 lg:p-10"
          >
            <h2 className="text-3xl font-bold text-gray-900">
              Built for fast operations
            </h2>
            <div className="mt-6 space-y-4">
              <article className="rounded-[1.75rem] bg-gray-100 p-5">
                <p className="text-sm font-semibold text-(--color-indigo)">
                  Magic-link sign-in
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-700">
                  No passwords to manage. The auth callback restores the session
                  directly in the app.
                </p>
              </article>
              <article className="rounded-[1.75rem] bg-gray-100 p-5">
                <p className="text-sm font-semibold text-(--color-indigo)">
                  Randomized question delivery
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-700">
                  Each attempt draws a locked subset from the bank, so trainees
                  do not all receive the same set.
                </p>
              </article>
              <article className="rounded-[1.75rem] bg-gray-100 p-5">
                <p className="text-sm font-semibold text-(--color-indigo)">
                  Admin visibility
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-700">
                  Track completions, adjust retakes, and export session-level
                  and answer-level data to CSV.
                </p>
              </article>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (profile?.role === "admin" && view !== "trainee") {
    redirect("/admin");
  }

  const [{ data: activeTests }, { data: sessions }] = await Promise.all([
    supabase
      .from("tests")
      .select(
        "id, title, time_limit_mins, questions_per_attempt, is_active, created_at",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .returns<TestRecord[]>(),
    supabase
      .from("test_sessions")
      .select(
        "id, test_id, trainee_id, started_at, expires_at, submitted_at, status, score, total_questions, attempt_number, retakes_remaining",
      )
      .eq("trainee_id", user.id)
      .order("started_at", { ascending: false })
      .returns<SessionRecord[]>(),
  ]);

  const latestSessionsByTest = new Map<string, SessionRecord>();

  for (const session of sessions ?? []) {
    if (!latestSessionsByTest.has(session.test_id)) {
      latestSessionsByTest.set(session.test_id, session);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-8">
      <section className="surface-card rounded-4xl p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`status-pill ${getRoleClasses(profile?.role ?? "trainee")}`}
              >
                {profile?.role ?? "trainee"}
              </span>
              {profile?.role === "admin" ? (
                <Link
                  href="/admin"
                  className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm"
                >
                  Open admin console
                </Link>
              ) : null}
            </div>

            <h1 className="mt-4 text-4xl font-bold text-gray-900">
              Welcome back
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-700">
              Start a new active test, resume an assessment already in progress,
              or review the results from completed attempts.
            </p>
          </div>

          <form action={signOutAction}>
            <SubmitButton
              pendingLabel="Signing out..."
              className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              Sign out
            </SubmitButton>
          </form>
        </div>

        <div className="mt-6">
          <FlashBanner error={error} message={message} />
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {(activeTests ?? []).map((test) => {
            const latestSession = latestSessionsByTest.get(test.id);
            const isLiveSession = latestSession?.status === "in_progress";
            const canStartNewAttempt =
              !latestSession ||
              latestSession.retakes_remaining > 0 ||
              isLiveSession;

            return (
              <article key={test.id} className="surface-card rounded-4xl p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
                      Active assessment
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-gray-900">
                      {test.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-gray-700">
                      {test.questions_per_attempt} randomized questions ·{" "}
                      {test.time_limit_mins} minute limit
                    </p>
                    {latestSession ? (
                      <p className="mt-3 text-sm text-gray-600">
                        Latest attempt: {latestSession.attempt_number} · retakes
                        remaining: {latestSession.retakes_remaining}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-gray-600">
                        No attempts recorded yet.
                      </p>
                    )}
                  </div>

                  {isLiveSession ? (
                    <Link
                      href={`/test/${latestSession.id}`}
                      className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
                    >
                      Resume attempt {latestSession.attempt_number}
                    </Link>
                  ) : (
                    <form action={startTestSessionAction}>
                      <input type="hidden" name="testId" value={test.id} />
                      <SubmitButton
                        pendingLabel="Starting..."
                        disabled={!canStartNewAttempt}
                        className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
                      >
                        {latestSession
                          ? "Start next attempt"
                          : "Start assessment"}
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </article>
            );
          })}

          {!activeTests?.length ? (
            <section className="surface-card rounded-4xl p-8 text-sm text-gray-700">
              No active tests are available yet. Check back when your cohort
              assessment has been published.
            </section>
          ) : null}
        </div>

        <section className="surface-card rounded-4xl p-6">
          <h2 className="text-2xl font-bold text-gray-900">Attempt history</h2>
          <div className="mt-5 space-y-3">
            {(sessions ?? []).length ? (
              (sessions ?? []).map((session) => {
                const href =
                  session.status === "in_progress"
                    ? `/test/${session.id}`
                    : `/results/${session.id}`;

                return (
                  <Link
                    key={session.id}
                    href={href}
                    className="block rounded-3xl border border-gray-300 bg-white px-4 py-4 transition hover:border-(--color-indigo)"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {(activeTests ?? []).find(
                            (test) => test.id === session.test_id,
                          )?.title ?? "Assessment"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Attempt {session.attempt_number} ·{" "}
                          {formatDateTime(session.started_at)}
                        </p>
                      </div>
                      <span
                        className={`status-pill ${getStatusClasses(session.status)}`}
                      >
                        {session.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-700">
                      Score: {session.score ?? 0}/
                      {session.total_questions ?? "—"}
                    </p>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-gray-700">
                Your attempt history will appear here after you start a test.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
