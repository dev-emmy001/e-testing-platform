import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashToast } from "@/components/flash-toast";
import { TestEditorForm } from "@/components/test-editor-form";
import { updateTestAction } from "@/app/actions";
import { requireAdminContext } from "@/utils/auth/session";
import { readFlash } from "@/utils/flash";
import {
  formatDateTime,
  formatPercentage,
  getStatusClasses,
} from "@/utils/format";
import {
  buildAdminTestTraineeSummaryRecords,
  buildTestLibraryQuestions,
  getQuestionBankGap,
} from "@/utils/admin-tests";
import {
  getQuestionTypeLabel,
  type QuestionCategoryRecord,
  type QuestionRecord,
  type TestQuestionLinkRecord,
} from "@/utils/question-library";
import type { SessionRecord, TestRecord } from "@/utils/test-sessions";

type AdminTestDetailPageProps = {
  params: Promise<{
    testId: string;
  }>;
};

type ProfileRow = {
  email: string;
  id: string;
};

type TestLibraryQuestionRecord = Pick<
  QuestionRecord,
  "category_id" | "id" | "question_text" | "title" | "type"
>;

function getScoreLabel(session: SessionRecord) {
  const baseLabel = `${session.score ?? 0}/${session.total_questions ?? "—"}`;
  const percentageLabel = formatPercentage(
    session.score,
    session.total_questions,
  );

  return percentageLabel === "—"
    ? baseLabel
    : `${baseLabel} (${percentageLabel})`;
}

export default async function AdminTestDetailPage({
  params,
}: AdminTestDetailPageProps) {
  const [{ testId }, { error, message }] = await Promise.all([
    params,
    readFlash(),
  ]);
  const { supabase } = await requireAdminContext(`/admin/tests/${testId}`);

  const [
    { data: test },
    { data: categories },
    { data: questions },
    { data: testQuestions },
    { data: sessions },
  ] = await Promise.all([
    supabase
      .from("tests")
      .select(
        "id, title, time_limit_mins, questions_per_attempt, is_active, created_at",
      )
      .eq("id", testId)
      .maybeSingle<TestRecord>(),
    supabase
      .from("question_categories")
      .select("id, name, created_at")
      .order("name", { ascending: true })
      .returns<QuestionCategoryRecord[]>(),
    supabase
      .from("questions")
      .select("id, title, question_text, type, category_id")
      .order("created_at", { ascending: false })
      .returns<TestLibraryQuestionRecord[]>(),
    supabase
      .from("test_questions")
      .select("test_id, question_id")
      .returns<TestQuestionLinkRecord[]>(),
    supabase
      .from("test_sessions")
      .select(
        "id, test_id, trainee_id, started_at, expires_at, submitted_at, status, score, total_questions, attempt_number, retakes_remaining",
      )
      .eq("test_id", testId)
      .order("started_at", { ascending: false })
      .returns<SessionRecord[]>(),
  ]);

  if (!test) {
    notFound();
  }

  const categoryRows = categories ?? [];
  const libraryQuestions = buildTestLibraryQuestions(
    questions ?? [],
    categoryRows,
    testQuestions ?? [],
  );
  const selectedQuestionIds = (testQuestions ?? [])
    .filter((questionLink) => questionLink.test_id === test.id)
    .map((questionLink) => questionLink.question_id);
  const selectedQuestionIdSet = new Set(selectedQuestionIds);
  const selectedQuestions = libraryQuestions.filter((question) =>
    selectedQuestionIdSet.has(question.id),
  );
  const sessionRows = sessions ?? [];
  const traineeIds = Array.from(
    new Set(sessionRows.map((session) => session.trainee_id)),
  );
  const { data: profiles } = traineeIds.length
    ? await supabase
        .from("profiles")
        .select("id, email")
        .in("id", traineeIds)
        .returns<ProfileRow[]>()
    : { data: [] as ProfileRow[] };
  const profileEmailById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.email]),
  );
  const traineeSummaries = buildAdminTestTraineeSummaryRecords(
    sessionRows,
    profileEmailById,
  );
  const questionCount = selectedQuestions.length;
  const bankGap = getQuestionBankGap(
    questionCount,
    test.questions_per_attempt,
  );
  const lastActivityAt =
    sessionRows[0]?.submitted_at ?? sessionRows[0]?.started_at ?? test.created_at;
  const scoredSessions = sessionRows.filter(
    (session) =>
      session.status === "submitted" &&
      session.score != null &&
      session.total_questions != null &&
      session.total_questions > 0,
  );
  const averageScoreLabel = scoredSessions.length
    ? `${Math.round(
        scoredSessions.reduce((total, session) => {
          return total + (session.score! / session.total_questions!) * 100;
        }, 0) / scoredSessions.length,
      )}%`
    : "—";
  const statCards = [
    {
      label: "Question pool",
      value: `${questionCount}/${test.questions_per_attempt}`,
      tone: bankGap === 0 ? "text-[color:var(--color-cyan)]" : "text-[color:var(--color-orange)]",
    },
    {
      label: "Trainees",
      value: traineeSummaries.length,
      tone: "text-[color:var(--color-indigo)]",
    },
    {
      label: "Attempts",
      value: sessionRows.length,
      tone: "text-[color:var(--color-green)]",
    },
    {
      label: "Average score",
      value: averageScoreLabel,
      tone: "text-[color:var(--color-purple)]",
    },
  ];

  return (
    <>
      <FlashToast error={error} message={message} />

      <section className="surface-card rounded-4xl p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[color:var(--color-gray-600)]">
              <Link href="/admin/tests" className="font-semibold text-[color:var(--color-indigo)]">
                Tests
              </Link>
              <span>/</span>
              <span>{test.title}</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className={`status-pill ${
                  test.is_active
                    ? "bg-[color:var(--color-green)] text-white"
                    : "bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]"
                }`}
              >
                {test.is_active ? "Active" : "Draft"}
              </span>
              <span
                className={`status-pill ${
                  bankGap === 0
                    ? "bg-[color:var(--color-cyan)] text-white"
                    : "bg-[color:var(--color-orange)] text-white"
                }`}
              >
                {bankGap === 0
                  ? "Question pool ready"
                  : `${bankGap} more question${bankGap === 1 ? "" : "s"} needed`}
              </span>
            </div>

            <h2 className="mt-4 text-4xl font-bold text-[color:var(--color-gray-900)]">
              {test.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-gray-700)]">
              Edit test settings, review the linked questions, and inspect who
              has already taken this assessment.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/tests/new"
              className="secondary-button inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              Create another test
            </Link>
            <Link
              href={`/api/admin/export/${test.id}`}
              className="primary-button inline-flex items-center justify-center px-5 py-3 text-sm"
            >
              Export CSV
            </Link>
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
          Created {formatDateTime(test.created_at)}. Latest activity was{" "}
          {formatDateTime(lastActivityAt)}.
        </div>
      </section>

      <section className="surface-card rounded-4xl p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[color:var(--color-gray-900)]">
              Test settings
            </h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-gray-700)]">
              Update the title, timing, publish state, and linked question pool
              from one place.
            </p>
          </div>

          <Link
            href="/admin/questions"
            className="text-sm font-semibold text-[color:var(--color-indigo)]"
          >
            Open question library
          </Link>
        </div>

        <div className="mt-8">
          <TestEditorForm
            action={updateTestAction}
            categories={categoryRows}
            defaultIsActive={test.is_active}
            defaultQuestionsPerAttempt={test.questions_per_attempt}
            defaultTimeLimitMins={test.time_limit_mins}
            defaultTitle={test.title}
            emptyMessage="The library is empty. Add questions from the question dashboard first."
            libraryQuestions={libraryQuestions}
            pendingLabel="Saving..."
            selectedQuestionIds={selectedQuestionIds}
            selectorSummaryLabel="Adjust the question pool for this test"
            submitLabel="Save changes"
            testId={test.id}
          />
        </div>
      </section>

      <section className="surface-card rounded-4xl p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[color:var(--color-gray-900)]">
              Linked questions
            </h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-gray-700)]">
              This is the reusable pool available to this test. Open any
              question to inspect the source record in the library.
            </p>
          </div>

          <p className="text-sm text-[color:var(--color-gray-600)]">
            {selectedQuestions.length} selected question
            {selectedQuestions.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-6">
          {selectedQuestions.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {selectedQuestions.map((question) => (
                <Link
                  key={question.id}
                  href={`/admin/questions?questionId=${question.id}`}
                  className="rounded-[1.75rem] border border-[color:var(--color-gray-300)]/70 bg-white p-5 transition hover:border-[color:var(--color-indigo)]"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="status-pill bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]">
                      {question.categoryName}
                    </span>
                    <span className="status-pill bg-[color:var(--color-gray-100)] text-[color:var(--color-gray-700)]">
                      {getQuestionTypeLabel(question.type)}
                    </span>
                  </div>

                  <h4 className="mt-4 text-xl font-bold text-[color:var(--color-gray-900)]">
                    {question.title}
                  </h4>
                  <p className="mt-3 text-sm text-[color:var(--color-gray-600)]">
                    Used in {question.linkedTestCount} test
                    {question.linkedTestCount === 1 ? "" : "s"} across the
                    library.
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-[color:var(--color-gray-300)] bg-white px-5 py-6 text-sm text-[color:var(--color-gray-700)]">
              No questions are linked to this test yet.
            </div>
          )}
        </div>
      </section>

      <section className="surface-card rounded-4xl p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[color:var(--color-gray-900)]">
              Trainee activity
            </h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-gray-700)]">
              Review which trainees have taken this test and inspect each
              recorded attempt below.
            </p>
          </div>

          <p className="text-sm text-[color:var(--color-gray-600)]">
            {traineeSummaries.length} trainee
            {traineeSummaries.length === 1 ? "" : "s"} with activity
          </p>
        </div>

        <div className="mt-6">
          {traineeSummaries.length ? (
            <div className="grid gap-4 xl:grid-cols-3">
              {traineeSummaries.map((trainee) => (
                <article
                  key={trainee.traineeId}
                  className="rounded-[1.75rem] bg-[color:var(--color-gray-100)] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-purple)]">
                        Trainee
                      </p>
                      <h4 className="mt-2 break-all text-lg font-bold text-[color:var(--color-gray-900)]">
                        {trainee.email}
                      </h4>
                    </div>

                    <span className={`status-pill ${getStatusClasses(trainee.latestStatus)}`}>
                      {trainee.latestStatus.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-gray-500)]">
                        Attempts
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[color:var(--color-gray-900)]">
                        {trainee.totalAttempts}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-gray-500)]">
                        Latest score
                      </p>
                      <p className="mt-2 text-sm font-bold text-[color:var(--color-gray-900)]">
                        {trainee.latestScoreLabel}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-[color:var(--color-gray-600)]">
                    Latest attempt #{trainee.latestAttemptNumber} · retakes
                    remaining: {trainee.retakesRemaining}
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--color-gray-600)]">
                    Last activity: {formatDateTime(trainee.lastActivityAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-[color:var(--color-gray-300)] bg-white px-5 py-6 text-sm text-[color:var(--color-gray-700)]">
              No trainee has taken this test yet.
            </div>
          )}
        </div>

        {sessionRows.length ? (
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-gray-500)]">
                  <th className="px-3 py-2">Trainee</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Attempt</th>
                  <th className="px-3 py-2">Started</th>
                  <th className="px-3 py-2">Last activity</th>
                  <th className="px-3 py-2">Retakes</th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.map((session) => (
                  <tr
                    key={session.id}
                    className="rounded-[1.5rem] bg-white text-sm text-[color:var(--color-gray-900)]"
                  >
                    <td className="rounded-l-[1.5rem] px-3 py-4 font-medium">
                      {profileEmailById.get(session.trainee_id) ?? "Unknown trainee"}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`status-pill ${getStatusClasses(session.status)}`}>
                        {session.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-4">{getScoreLabel(session)}</td>
                    <td className="px-3 py-4">{session.attempt_number}</td>
                    <td className="px-3 py-4">{formatDateTime(session.started_at)}</td>
                    <td className="px-3 py-4">
                      {formatDateTime(session.submitted_at ?? session.started_at)}
                    </td>
                    <td className="rounded-r-[1.5rem] px-3 py-4">
                      {session.retakes_remaining}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  );
}
