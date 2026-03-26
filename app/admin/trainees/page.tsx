import { FlashBanner } from "@/components/flash-banner";
import {
  AdminTraineesDashboard,
  type AdminTraineeRecord,
  type AdminTraineeSession,
} from "@/components/admin-trainees-dashboard";
import { requireAdminContext } from "@/utils/auth/session";
import { getSearchParamValue } from "@/utils/format";
import type { SessionRecord, TestRecord } from "@/utils/test-sessions";

type AdminTraineesPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

type TraineeProfile = {
  email: string;
  id: string;
  role: string;
};

function buildTraineeSession(
  session: SessionRecord,
  testMap: Map<string, { isActive: boolean; title: string }>,
): AdminTraineeSession {
  const test = testMap.get(session.test_id);

  return {
    attemptNumber: session.attempt_number,
    expiresAt: session.expires_at,
    id: session.id,
    isActiveTest: test?.isActive ?? false,
    lastActivityAt: session.submitted_at ?? session.started_at,
    resultCapturedAfterExpiry:
      session.status === "expired" &&
      Boolean(session.submitted_at) &&
      (session.score != null || session.total_questions != null),
    retakesRemaining: session.retakes_remaining,
    score: session.score,
    startedAt: session.started_at,
    status: session.status,
    submittedAt: session.submitted_at,
    testId: session.test_id,
    testTitle: test?.title ?? "Unknown test",
    totalQuestions: session.total_questions,
  };
}

function buildTraineeRecords(
  trainees: TraineeProfile[],
  tests: TestRecord[],
  sessions: SessionRecord[],
) {
  const activeTestCount = tests.filter((test) => test.is_active).length;
  const testMap = new Map(
    tests.map((test) => [
      test.id,
      {
        isActive: test.is_active,
        title: test.title,
      },
    ]),
  );
  const sessionsByTrainee = new Map<string, SessionRecord[]>();

  for (const session of sessions) {
    const existing = sessionsByTrainee.get(session.trainee_id) ?? [];
    existing.push(session);
    sessionsByTrainee.set(session.trainee_id, existing);
  }

  return trainees.map<AdminTraineeRecord>((trainee) => {
    const traineeSessions = sessionsByTrainee.get(trainee.id) ?? [];
    const latestSessionsByTest = new Map<string, SessionRecord>();

    for (const session of traineeSessions) {
      if (!latestSessionsByTest.has(session.test_id)) {
        latestSessionsByTest.set(session.test_id, session);
      }
    }

    const latestSessions = Array.from(latestSessionsByTest.values())
      .map((session) => buildTraineeSession(session, testMap))
      .sort((left, right) => {
        if (left.isActiveTest !== right.isActiveTest) {
          return left.isActiveTest ? -1 : 1;
        }

        return left.testTitle.localeCompare(right.testTitle);
      });
    const allSessions = traineeSessions.map((session) =>
      buildTraineeSession(session, testMap),
    );

    return {
      activeCompletedCount: latestSessions.filter(
        (session) => session.isActiveTest && session.status !== "in_progress",
      ).length,
      activeTestCount,
      allSessions,
      email: trainee.email,
      id: trainee.id,
      lastActivityAt: allSessions[0]?.lastActivityAt ?? null,
      latestExpiredCount: latestSessions.filter(
        (session) => session.status === "expired",
      ).length,
      latestInProgressCount: latestSessions.filter(
        (session) => session.status === "in_progress",
      ).length,
      latestSessions,
      latestSubmittedCount: latestSessions.filter(
        (session) => session.status === "submitted",
      ).length,
      resultCapturedAfterExpiryCount: latestSessions.filter(
        (session) => session.resultCapturedAfterExpiry,
      ).length,
      role: trainee.role,
      totalAttempts: allSessions.length,
    };
  });
}

export default async function AdminTraineesPage({
  searchParams,
}: AdminTraineesPageProps) {
  const params = await searchParams;
  const error = getSearchParamValue(params.error);
  const message = getSearchParamValue(params.message);
  const { supabase } = await requireAdminContext("/admin/trainees");

  const [{ data: trainees }, { data: tests }, { data: sessions }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, role")
        .eq("role", "trainee")
        .order("email", { ascending: true })
        .returns<TraineeProfile[]>(),
      supabase
        .from("tests")
        .select("id, title, time_limit_mins, questions_per_attempt, is_active")
        .order("title", { ascending: true })
        .returns<TestRecord[]>(),
      supabase
        .from("test_sessions")
        .select(
          "id, test_id, trainee_id, started_at, expires_at, submitted_at, status, score, total_questions, attempt_number, retakes_remaining",
        )
        .order("started_at", { ascending: false })
        .returns<SessionRecord[]>(),
    ]);

  const traineeRecords = buildTraineeRecords(
    trainees ?? [],
    tests ?? [],
    sessions ?? [],
  );

  return (
    <>
      <section className="surface-card rounded-4xl p-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
          Trainees
        </h2>
        <h2 className="mt-2 text-4xl font-bold text-gray-900">
          Track completion progress and manage retakes
        </h2>

        <div className="mt-6">
          <FlashBanner error={error} message={message} />
        </div>
      </section>

      <AdminTraineesDashboard trainees={traineeRecords} />
    </>
  );
}
