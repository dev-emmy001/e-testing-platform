import Link from "next/link";
import { requireAdminContext } from "@/utils/auth/session";
import {
  formatDateTime,
  formatPercentage,
  getStatusClasses,
} from "@/utils/format";
import { getProfileDisplayName, getProfileMetaLine } from "@/utils/profile";
import type { TestQuestionLinkRecord } from "@/utils/question-library";
import type { SessionRecord, TestRecord } from "@/utils/test-sessions";

type QuestionRow = {
  id: string;
};

type ProfileRow = {
  email: string;
  id: string;
  name: string | null;
  role: string;
  track: string | null;
};

type DashboardTestSummary = {
  attemptCount: number;
  averageScore: string;
  bankGap: number;
  expiredCount: number;
  lastActivity: string | null;
  liveCount: number;
  questionCount: number;
  submittedCount: number;
  test: TestRecord;
};

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
});

function formatCompactNumber(value: number) {
  return compactNumberFormatter.format(value);
}

function getScoredSessions(sessions: SessionRecord[]) {
  return sessions.filter(
    (session) =>
      session.status === "submitted" &&
      session.score != null &&
      session.total_questions != null &&
      session.total_questions > 0,
  );
}

function getAverageScoreLabel(sessions: SessionRecord[]) {
  const scoredSessions = getScoredSessions(sessions);

  if (!scoredSessions.length) {
    return "—";
  }

  const averagePercentage = Math.round(
    scoredSessions.reduce((total, session) => {
      return total + (session.score! / session.total_questions!) * 100;
    }, 0) / scoredSessions.length,
  );

  return `${averagePercentage}%`;
}

function buildTestSummaries(
  tests: TestRecord[],
  testQuestionLinks: TestQuestionLinkRecord[],
  sessions: SessionRecord[],
) {
  const questionCountsByTest = new Map<string, number>();
  const sessionsByTest = new Map<string, SessionRecord[]>();

  for (const link of testQuestionLinks) {
    questionCountsByTest.set(
      link.test_id,
      (questionCountsByTest.get(link.test_id) ?? 0) + 1,
    );
  }

  for (const session of sessions) {
    const existing = sessionsByTest.get(session.test_id) ?? [];
    existing.push(session);
    sessionsByTest.set(session.test_id, existing);
  }

  return tests
    .map<DashboardTestSummary>((test) => {
      const relatedSessions = sessionsByTest.get(test.id) ?? [];
      const questionCount = questionCountsByTest.get(test.id) ?? 0;
      const lastActivity =
        relatedSessions[0]?.submitted_at ??
        relatedSessions[0]?.started_at ??
        null;

      return {
        attemptCount: relatedSessions.length,
        averageScore: getAverageScoreLabel(relatedSessions),
        bankGap: Math.max(test.questions_per_attempt - questionCount, 0),
        expiredCount: relatedSessions.filter(
          (session) => session.status === "expired",
        ).length,
        lastActivity,
        liveCount: relatedSessions.filter(
          (session) => session.status === "in_progress",
        ).length,
        questionCount,
        submittedCount: relatedSessions.filter(
          (session) => session.status === "submitted",
        ).length,
        test,
      };
    })
    .sort((left, right) => {
      if (left.test.is_active !== right.test.is_active) {
        return left.test.is_active ? -1 : 1;
      }

      if (left.attemptCount !== right.attemptCount) {
        return right.attemptCount - left.attemptCount;
      }

      return left.test.title.localeCompare(right.test.title);
    });
}

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdminContext("/admin");

  const [
    { data: tests },
    { data: questions },
    { data: testQuestions },
    { data: sessions },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("tests")
      .select(
        "id, title, time_limit_mins, questions_per_attempt, is_active, created_at",
      )
      .order("created_at", { ascending: false })
      .returns<TestRecord[]>(),
    supabase.from("questions").select("id").returns<QuestionRow[]>(),
    supabase
      .from("test_questions")
      .select("test_id, question_id")
      .returns<TestQuestionLinkRecord[]>(),
    supabase
      .from("test_sessions")
      .select(
        "id, test_id, trainee_id, started_at, expires_at, submitted_at, status, score, total_questions, attempt_number, retakes_remaining",
      )
      .order("started_at", { ascending: false })
      .returns<SessionRecord[]>(),
    supabase
      .from("profiles")
      .select("id, email, name, role, track")
      .returns<ProfileRow[]>(),
  ]);

  const testRows = tests ?? [];
  const questionRows = questions ?? [];
  const testQuestionRows = testQuestions ?? [];
  const sessionRows = sessions ?? [];
  const profileRows = profiles ?? [];

  const activeTestCount = testRows.filter((test) => test.is_active).length;
  const traineeProfiles = profileRows.filter(
    (profile) => profile.role === "trainee",
  );
  const liveSessions = sessionRows.filter(
    (session) => session.status === "in_progress",
  );
  const submittedSessions = sessionRows.filter(
    (session) => session.status === "submitted",
  );
  const expiredSessions = sessionRows.filter(
    (session) => session.status === "expired",
  );
  const completionBase = submittedSessions.length + expiredSessions.length;
  const completionRate =
    completionBase > 0
      ? `${Math.round((submittedSessions.length / completionBase) * 100)}%`
      : "—";
  const scoredSessions = getScoredSessions(sessionRows);
  const averageScoreLabel = getAverageScoreLabel(sessionRows);
  const testSummaries = buildTestSummaries(
    testRows,
    testQuestionRows,
    sessionRows,
  );
  const profileMap = new Map(
    profileRows.map((profile) => [profile.id, profile]),
  );
  const testTitleMap = new Map(
    testSummaries.map((summary) => [summary.test.id, summary.test.title]),
  );
  const questionBankAlerts = testSummaries.filter(
    (summary) => summary.test.is_active && summary.bankGap > 0,
  );

  const statCards = [
    {
      label: "Active tests",
      value: activeTestCount,
      meta: `${testRows.length} total configured`,
      tone: "text-[color:var(--color-indigo)]",
    },
    {
      label: "Question bank",
      value: questionRows.length,
      meta: `${questionBankAlerts.length} active test alerts`,
      tone: "text-[color:var(--color-purple)]",
    },
    {
      label: "Live attempts",
      value: liveSessions.length,
      meta: `${expiredSessions.length} expired attempts`,
      tone: "text-[color:var(--color-cyan)]",
    },
    {
      label: "Completion rate",
      value: completionRate,
      meta: `${submittedSessions.length} submitted attempts`,
      tone: "text-[color:var(--color-green)]",
    },
    {
      label: "Average score",
      value: averageScoreLabel,
      meta: `${formatCompactNumber(scoredSessions.length)} scored sessions`,
      tone: "text-[color:var(--color-orange)]",
    },
    {
      label: "Trainees",
      value: traineeProfiles.length,
      meta: `${profileRows.filter((profile) => profile.role === "admin").length} admins`,
      tone: "text-[color:var(--color-gray-900)]",
    },
  ];

  const watchlist = [
    ...questionBankAlerts.slice(0, 3).map((summary) => ({
      href: "/admin/tests",
      label: summary.test.title,
      detail:
        summary.bankGap === 1
          ? "Needs 1 more selected question to meet the configured draw size."
          : `Needs ${summary.bankGap} more selected questions to support full random draws.`,
      tone: "bg-[color:var(--color-orange)] text-white",
    })),
    ...(expiredSessions.length
      ? [
          {
            href: "/admin/results",
            label: "Expired attempts need review",
            detail: `${expiredSessions.length} sessions ended before submission and may need trainee follow-up.`,
            tone: "bg-[color:var(--color-indigo)] text-white",
          },
        ]
      : []),
    ...(!activeTestCount && testRows.length
      ? [
          {
            href: "/admin/tests",
            label: "No live assessment is published",
            detail:
              "There are configured tests, but none of them are active for trainees yet.",
            tone: "bg-[color:var(--color-purple)] text-white",
          },
        ]
      : []),
  ].slice(0, 4);

  return (
    <div className="space-y-4">
      <section className="surface-card overflow-hidden rounded-4xl p-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
              Admin dashboard
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold text-gray-900">
              Run the assessment platform from one operational view.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-700">
              Monitor active tests, spot question-bank gaps, follow recent
              attempts, and jump straight into the admin workflow that needs
              attention.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/admin/tests"
                className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
              >
                Manage tests
              </Link>
              <Link
                href="/admin/results"
                className="secondary-button inline-flex items-center justify-center px-5 py-3 text-sm"
              >
                Review results
              </Link>
              <Link
                href="/admin/questions"
                className="secondary-button inline-flex items-center justify-center px-5 py-3 text-sm"
              >
                Open question library
              </Link>
            </div>
          </div>

          <article className="rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(61,58,142,0.96),rgba(123,93,167,0.9))] p-6 text-white shadow-[0_24px_60px_rgba(61,58,142,0.2)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              Live snapshot
            </p>
            <p className="mt-3 text-4xl font-display">
              {liveSessions.length ? liveSessions.length : "No"} live attempts
            </p>
            <p className="mt-3 text-sm leading-7 text-white/80">
              {questionBankAlerts.length
                ? `${questionBankAlerts.length} active tests need more selected questions before every draw can be fully randomized.`
                : "All active tests currently have enough selected questions to cover their configured draw size."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/15 bg-white/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Submitted
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {submittedSessions.length}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/15 bg-white/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Avg score
                </p>
                <p className="mt-2 text-2xl font-bold">{averageScoreLabel}</p>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {statCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[1.75rem] border border-gray-300/60 bg-gray-100 px-5 py-5"
            >
              <p className="text-sm font-semibold text-gray-500">
                {card.label}
              </p>
              <p className={`mt-3 text-4xl font-display ${card.tone}`}>
                {typeof card.value === "number"
                  ? formatCompactNumber(card.value)
                  : card.value}
              </p>
              <p className="mt-2 text-sm text-gray-600">{card.meta}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="surface-card rounded-4xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Attention queue
              </h3>
              <p className="mt-2 text-sm text-gray-700">
                Immediate admin follow-up items surfaced from live platform
                data.
              </p>
            </div>

            <Link
              href="/admin/tests"
              className="text-sm font-semibold text-(--color-indigo)"
            >
              View setup
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {watchlist.length ? (
              watchlist.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block rounded-3xl border border-gray-300 bg-white px-4 py-4 transition hover:border-(--color-indigo)"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {item.detail}
                      </p>
                    </div>
                    <span className={`status-pill ${item.tone}`}>Action</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-4 py-5">
                <p className="font-semibold text-gray-900">
                  No urgent admin blockers
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Active tests are stocked, and there are no expired attempts
                  waiting for intervention.
                </p>
              </div>
            )}
          </div>
        </article>

        <article className="surface-card rounded-4xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Recent activity
              </h3>
              <p className="mt-2 text-sm text-gray-700">
                Latest assessment attempts across all trainees.
              </p>
            </div>

            <Link
              href="/admin/results"
              className="text-sm font-semibold text-(--color-indigo)"
            >
              Full history
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {sessionRows.length ? (
              sessionRows.slice(0, 6).map((session) => {
                const traineeProfile = profileMap.get(session.trainee_id);

                return (
                  <div
                    key={session.id}
                    className="rounded-3xl border border-gray-300 bg-white px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {traineeProfile
                            ? getProfileDisplayName(traineeProfile)
                            : "Unknown trainee"}
                        </p>
                        {traineeProfile ? (
                          <p className="mt-1 text-sm text-gray-600">
                            {getProfileMetaLine(traineeProfile)}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm text-gray-600">
                          {testTitleMap.get(session.test_id) ?? "Unknown test"}{" "}
                          · attempt {session.attempt_number}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`status-pill ${getStatusClasses(session.status)}`}
                        >
                          {session.status.replace("_", " ")}
                        </span>
                        <span className="status-pill bg-gray-100 text-gray-700">
                          {formatPercentage(
                            session.score,
                            session.total_questions,
                          )}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-gray-500">
                      {formatDateTime(
                        session.submitted_at ?? session.started_at,
                      )}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-4 py-5">
                <p className="font-semibold text-gray-900">
                  No attempts recorded yet
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Session activity will start appearing here as soon as trainees
                  begin their tests.
                </p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="surface-card rounded-4xl p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Test performance board
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-700">
              Keep the publishing state, selected-question coverage, and outcome
              volume for every test in view.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/tests"
              className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm"
            >
              Edit tests
            </Link>
            <Link
              href="/admin/questions"
              className="secondary-button inline-flex items-center justify-center px-4 py-2 text-sm"
            >
              Open library
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {testSummaries.length ? (
            testSummaries.map((summary) => (
              <article
                key={summary.test.id}
                className="rounded-[1.75rem] border border-gray-300 bg-white p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xl font-bold text-gray-900">
                        {summary.test.title}
                      </h4>
                      <span
                        className={`status-pill ${
                          summary.test.is_active
                            ? "bg-(--color-green) text-white"
                            : "bg-(--color-indigo-light) text-(--color-indigo)"
                        }`}
                      >
                        {summary.test.is_active ? "Active" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {summary.test.questions_per_attempt} questions per attempt
                      · {summary.test.time_limit_mins} minute limit
                    </p>
                  </div>

                  <Link
                    href={`/api/admin/export/${summary.test.id}`}
                    className="primary-button inline-flex items-center justify-center px-4 py-2 text-sm"
                  >
                    Export CSV
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1.25rem] bg-gray-100 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Selected
                    </p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      {summary.questionCount}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-gray-100 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Attempts
                    </p>
                    <p className="mt-2 text-2xl font-bold text-(--color-indigo)">
                      {summary.attemptCount}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-gray-100 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Submitted
                    </p>
                    <p className="mt-2 text-2xl font-bold text-(--color-green)">
                      {summary.submittedCount}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-gray-100 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      Avg score
                    </p>
                    <p className="mt-2 text-2xl font-bold text-(--color-orange)">
                      {summary.averageScore}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {summary.bankGap > 0 ? (
                      <span className="status-pill bg-(--color-orange) text-white">
                        {summary.bankGap} question
                        {summary.bankGap === 1 ? "" : "s"} short
                      </span>
                    ) : (
                      <span className="status-pill bg-(--color-green) text-white">
                        Selection ready
                      </span>
                    )}
                    {summary.liveCount > 0 ? (
                      <span className="status-pill bg-(--color-cyan) text-white">
                        {summary.liveCount} live
                      </span>
                    ) : null}
                    {summary.expiredCount > 0 ? (
                      <span className="status-pill bg-(--color-indigo) text-white">
                        {summary.expiredCount} expired
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm text-gray-500">
                    Last activity: {formatDateTime(summary.lastActivity)}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-gray-300 bg-white px-5 py-6 text-sm text-gray-700">
              No tests have been configured yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
