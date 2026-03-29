import Link from "next/link";
import { AdminTestsDashboard } from "@/components/admin-tests-dashboard";
import { FlashToast } from "@/components/flash-toast";
import { requireAdminContext } from "@/utils/auth/session";
import { readFlash } from "@/utils/flash";
import { buildAdminTestDashboardRecords } from "@/utils/admin-tests";
import type { QuestionRecord, TestQuestionLinkRecord } from "@/utils/question-library";
import type { SessionRecord, TestRecord } from "@/utils/test-sessions";

type TestDashboardQuestionRecord = Pick<QuestionRecord, "category_id" | "id">;

export default async function AdminTestsPage() {
  const { error, message } = await readFlash();
  const { supabase } = await requireAdminContext("/admin/tests");

  const [{ data: tests }, { data: questions }, { data: testQuestions }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("tests")
        .select(
          "id, title, time_limit_mins, questions_per_attempt, is_active, created_at",
        )
        .order("created_at", { ascending: false })
        .returns<TestRecord[]>(),
      supabase
        .from("questions")
        .select("id, category_id")
        .returns<TestDashboardQuestionRecord[]>(),
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
    ]);

  const dashboardRecords = buildAdminTestDashboardRecords(
    tests ?? [],
    testQuestions ?? [],
    questions ?? [],
    sessions ?? [],
  );
  const activeTestCount = dashboardRecords.filter((test) => test.isActive).length;
  const readyTestCount = dashboardRecords.filter((test) => test.bankGap === 0).length;
  const totalAttempts = dashboardRecords.reduce(
    (total, test) => total + test.attemptCount,
    0,
  );
  const liveAttemptCount = dashboardRecords.reduce(
    (total, test) => total + test.liveCount,
    0,
  );
  const statCards = [
    {
      label: "Total tests",
      value: dashboardRecords.length,
      tone: "text-[color:var(--color-indigo)]",
    },
    {
      label: "Active tests",
      value: activeTestCount,
      tone: "text-[color:var(--color-green)]",
    },
    {
      label: "Draw-ready",
      value: readyTestCount,
      tone: "text-[color:var(--color-cyan)]",
    },
    {
      label: "Attempts logged",
      value: totalAttempts,
      tone: "text-[color:var(--color-orange)]",
    },
  ];

  return (
    <>
      <FlashToast error={error} message={message} />

      <section className="surface-card rounded-4xl p-8">
        <div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
              Tests
            </p>
            <h2 className="mt-2 text-4xl font-bold text-[color:var(--color-gray-900)]">
              Review the full assessment catalog
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-gray-700)]">
              Each test keeps its own timing, question pool, and trainee
              history. Open a test to manage the full details.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
                {card.label}
              </p>
              <p className={`mt-3 text-4xl font-bold ${card.tone}`}>{card.value}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-[1.75rem] bg-[color:var(--color-gray-100)] px-5 py-4 text-sm text-[color:var(--color-gray-700)]">
          {liveAttemptCount
            ? `${liveAttemptCount} live attempt${liveAttemptCount === 1 ? "" : "s"} currently in progress.`
            : "No live attempts are currently in progress."}
        </div>
      </section>

      <section className="surface-card rounded-4xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
              Actions
            </p>
            <h3 className="mt-2 text-2xl font-bold text-[color:var(--color-gray-900)]">
              Create and manage test content
            </h3>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/tests/new"
              className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              Create test
            </Link>
            <Link
              href="/admin/questions"
              className="secondary-button inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              Open question library
            </Link>
          </div>
        </div>
      </section>

      <AdminTestsDashboard tests={dashboardRecords} />
    </>
  );
}
