import { formatPercentage } from "@/utils/format";
import { getProfileDisplayName, getProfileTrack } from "@/utils/profile";
import {
  buildQuestionUsageCountMap,
  buildTestQuestionIdsMap,
  getQuestionTitle,
  type QuestionCategoryRecord,
  type QuestionRecord,
  type QuestionType,
  type TestQuestionLinkRecord,
} from "@/utils/question-library";
import type { SessionRecord, TestRecord } from "@/utils/test-sessions";

type TestLibraryQuestionSource = Pick<
  QuestionRecord,
  "category_id" | "id" | "question_text" | "title" | "type"
>;

type TestDashboardQuestionSource = Pick<QuestionRecord, "category_id" | "id">;

export type TestLibraryQuestion = {
  categoryId: string | null;
  categoryName: string;
  id: string;
  linkedTestCount: number;
  title: string;
  type: QuestionType;
};

export type AdminTestDashboardRecord = {
  attemptCount: number;
  averageScoreLabel: string;
  bankGap: number;
  categoryCoverage: number;
  createdAt: string | null;
  expiredCount: number;
  id: string;
  isActive: boolean;
  latestActivityAt: string | null;
  liveCount: number;
  questionCount: number;
  questionsPerAttempt: number;
  searchText: string;
  submittedCount: number;
  timeLimitMins: number;
  title: string;
  traineeCount: number;
};

export type AdminTestTraineeSummary = {
  displayName: string;
  email: string;
  expiredCount: number;
  lastActivityAt: string | null;
  latestAttemptNumber: number;
  latestScoreLabel: string;
  latestStatus: SessionRecord["status"];
  liveCount: number;
  retakesRemaining: number;
  submittedCount: number;
  track: string | null;
  totalAttempts: number;
  traineeId: string;
};

type AdminTestProfileIdentity = {
  email: string;
  name: string | null;
  track: string | null;
};

function getSessionActivityAt(
  session: Pick<SessionRecord, "started_at" | "submitted_at">,
) {
  return session.submitted_at ?? session.started_at;
}

function getTimestamp(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

function getLatestActivityAt(
  sessions: Array<Pick<SessionRecord, "started_at" | "submitted_at">>,
) {
  if (!sessions.length) {
    return null;
  }

  return sessions.reduce<string | null>((latest, session) => {
    const current = getSessionActivityAt(session);

    if (!latest) {
      return current;
    }

    return getTimestamp(current) > getTimestamp(latest) ? current : latest;
  }, null);
}

function getAverageScoreLabel(
  sessions: Array<
    Pick<SessionRecord, "score" | "status" | "total_questions">
  >,
) {
  const scoredSessions = sessions.filter(
    (session) =>
      session.status === "submitted" &&
      session.score != null &&
      session.total_questions != null &&
      session.total_questions > 0,
  );

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

function getScoreLabel(session: Pick<SessionRecord, "score" | "total_questions">) {
  const baseLabel = `${session.score ?? 0}/${session.total_questions ?? "—"}`;
  const percentageLabel = formatPercentage(
    session.score,
    session.total_questions,
  );

  return percentageLabel === "—"
    ? baseLabel
    : `${baseLabel} (${percentageLabel})`;
}

export function getQuestionBankGap(
  questionCount: number,
  questionsPerAttempt: number,
) {
  return Math.max(questionsPerAttempt - questionCount, 0);
}

export function buildTestLibraryQuestions(
  questions: TestLibraryQuestionSource[],
  categories: QuestionCategoryRecord[],
  testQuestionLinks: TestQuestionLinkRecord[],
) {
  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const questionUsageCount = buildQuestionUsageCountMap(testQuestionLinks);

  return questions
    .map<TestLibraryQuestion>((question) => ({
      categoryId: question.category_id,
      categoryName:
        categoryNameById.get(question.category_id ?? "") ?? "Uncategorized",
      id: question.id,
      linkedTestCount: questionUsageCount.get(question.id) ?? 0,
      title: getQuestionTitle(question),
      type: question.type,
    }))
    .sort((left, right) => {
      const categoryComparison = left.categoryName.localeCompare(
        right.categoryName,
      );

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      return left.title.localeCompare(right.title);
    });
}

export function buildAdminTestDashboardRecords(
  tests: TestRecord[],
  testQuestionLinks: TestQuestionLinkRecord[],
  questions: TestDashboardQuestionSource[],
  sessions: SessionRecord[],
) {
  const testQuestionIdsMap = buildTestQuestionIdsMap(testQuestionLinks);
  const questionCategoryById = new Map(
    questions.map((question) => [question.id, question.category_id]),
  );
  const sessionsByTest = new Map<string, SessionRecord[]>();

  for (const session of sessions) {
    const existingSessions = sessionsByTest.get(session.test_id) ?? [];
    existingSessions.push(session);
    sessionsByTest.set(session.test_id, existingSessions);
  }

  return tests.map<AdminTestDashboardRecord>((test) => {
    const selectedQuestionIds = testQuestionIdsMap.get(test.id) ?? [];
    const relatedSessions = sessionsByTest.get(test.id) ?? [];
    const traineeIds = new Set(
      relatedSessions.map((session) => session.trainee_id),
    );
    const categoryCoverage = new Set(
      selectedQuestionIds
        .map((questionId) => questionCategoryById.get(questionId))
        .filter(Boolean),
    ).size;
    const questionCount = selectedQuestionIds.length;
    const bankGap = getQuestionBankGap(
      questionCount,
      test.questions_per_attempt,
    );

    return {
      attemptCount: relatedSessions.length,
      averageScoreLabel: getAverageScoreLabel(relatedSessions),
      bankGap,
      categoryCoverage,
      createdAt: test.created_at ?? null,
      expiredCount: relatedSessions.filter(
        (session) => session.status === "expired",
      ).length,
      id: test.id,
      isActive: test.is_active,
      latestActivityAt: getLatestActivityAt(relatedSessions),
      liveCount: relatedSessions.filter(
        (session) => session.status === "in_progress",
      ).length,
      questionCount,
      questionsPerAttempt: test.questions_per_attempt,
      searchText: [
        test.title,
        test.is_active ? "active" : "draft",
        bankGap > 0 ? "needs questions" : "ready",
      ]
        .join(" ")
        .toLowerCase(),
      submittedCount: relatedSessions.filter(
        (session) => session.status === "submitted",
      ).length,
      timeLimitMins: test.time_limit_mins,
      title: test.title,
      traineeCount: traineeIds.size,
    };
  });
}

export function buildAdminTestTraineeSummaryRecords(
  sessions: SessionRecord[],
  profileById: Map<string, AdminTestProfileIdentity>,
) {
  const sessionsByTrainee = new Map<string, SessionRecord[]>();

  for (const session of sessions) {
    const existingSessions = sessionsByTrainee.get(session.trainee_id) ?? [];
    existingSessions.push(session);
    sessionsByTrainee.set(session.trainee_id, existingSessions);
  }

  return Array.from(sessionsByTrainee.entries())
    .map<AdminTestTraineeSummary>(([traineeId, traineeSessions]) => {
      const latestSession = traineeSessions.reduce((latest, session) => {
        if (!latest) {
          return session;
        }

        return getTimestamp(getSessionActivityAt(session)) >
          getTimestamp(getSessionActivityAt(latest))
          ? session
          : latest;
      }, traineeSessions[0]);

      return {
        displayName: getProfileDisplayName(profileById.get(traineeId)),
        email: profileById.get(traineeId)?.email ?? "Unknown trainee",
        expiredCount: traineeSessions.filter(
          (session) => session.status === "expired",
        ).length,
        lastActivityAt: latestSession
          ? getSessionActivityAt(latestSession)
          : null,
        latestAttemptNumber: latestSession?.attempt_number ?? 1,
        latestScoreLabel: latestSession ? getScoreLabel(latestSession) : "—",
        latestStatus: latestSession?.status ?? "expired",
        liveCount: traineeSessions.filter(
          (session) => session.status === "in_progress",
        ).length,
        retakesRemaining: latestSession?.retakes_remaining ?? 0,
        submittedCount: traineeSessions.filter(
          (session) => session.status === "submitted",
        ).length,
        track: getProfileTrack(profileById.get(traineeId)),
        totalAttempts: traineeSessions.length,
        traineeId,
      };
    })
    .sort((left, right) => {
      const activityComparison =
        getTimestamp(right.lastActivityAt) - getTimestamp(left.lastActivityAt);

      if (activityComparison !== 0) {
        return activityComparison;
      }

      return left.displayName.localeCompare(right.displayName);
    });
}
