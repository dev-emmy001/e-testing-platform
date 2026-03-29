import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthEntryScreen } from "@/components/auth-entry-screen";
import { FlashToast } from "@/components/flash-toast";
import { SubmitButton } from "@/components/submit-button";
import { signOutAction, startTestSessionAction } from "@/app/actions";
import { getOnboardingPath } from "@/utils/auth/redirect";
import { getCurrentUserContext } from "@/utils/auth/session";
import { readFlash } from "@/utils/flash";
import {
  formatDateTime,
  getRoleClasses,
  getSearchParamValue,
  getStatusClasses,
} from "@/utils/format";
import {
  getProfileDisplayName,
  getProfileMetaLine,
  isProfileComplete,
} from "@/utils/profile";
import type { SessionRecord, TestRecord } from "@/utils/test-sessions";

type HomePageProps = {
  searchParams: Promise<{
    view?: string | string[];
    next?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const [params, { error, message }] = await Promise.all([
    searchParams,
    readFlash(),
  ]);
  const view = getSearchParamValue(params.view);
  const nextPath = getSearchParamValue(params.next);
  const { profile, supabase, user } = await getCurrentUserContext();

  if (!user) {
    return <AuthEntryScreen error={error} message={message} nextPath={nextPath} />;
  }

  if (!isProfileComplete(profile)) {
    redirect(getOnboardingPath(nextPath));
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
  const profileDisplayName = getProfileDisplayName(profile);
  const profileMetaLine = getProfileMetaLine(profile);

  for (const session of sessions ?? []) {
    if (!latestSessionsByTest.has(session.test_id)) {
      latestSessionsByTest.set(session.test_id, session);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-8">
      <FlashToast error={error} message={message} />

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
              Welcome back,{" "}
              <span className="text-(--color-indigo)">{profileDisplayName}</span>
            </h1>
            {profileMetaLine ? (
              <p className="mt-3 text-sm font-medium text-gray-600">
                {profileMetaLine}
              </p>
            ) : null}
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
