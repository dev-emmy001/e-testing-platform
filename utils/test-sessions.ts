import { createAdminClient } from "@/utils/supabase/admin";
import { parseOptions } from "@/utils/format";

export type TestRecord = {
  id: string;
  title: string;
  time_limit_mins: number;
  questions_per_attempt: number;
  is_active: boolean;
  created_at?: string | null;
};

export type SessionRecord = {
  id: string;
  test_id: string;
  trainee_id: string;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  status: "in_progress" | "submitted" | "expired";
  score: number | null;
  total_questions: number | null;
  attempt_number: number;
  retakes_remaining: number;
  focus_loss_count: number;
};

type LegacySessionRecord = Omit<
  SessionRecord,
  "attempt_number" | "retakes_remaining" | "focus_loss_count"
> & {
  attempt_number?: number | null;
  retakes_remaining?: number | null;
  focus_loss_count?: number | null;
};

type SessionQuestionRecord = {
  correct_answer: string;
  options: unknown;
  question_id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false";
  position: number;
};

type LegacySessionQuestionRecord = Pick<
  SessionQuestionRecord,
  "position" | "question_id"
>;

type TestQuestionRecord = {
  question_id: string;
};

type LegacyQuestionRecord = {
  id: string;
};

type QuestionRecord = {
  category_id?: string | null;
  id: string;
  type: "multiple_choice" | "true_false";
  question_text: string;
  options: unknown;
  correct_answer: string;
};

type QuestionCategoryLookupRecord = {
  category_id: string | null;
  id: string;
};

type QuestionCategoryRecord = {
  id: string;
  name: string;
};

type AnswerRecord = {
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean | null;
  answered_at: string | null;
};

export type SessionExperience = {
  session: SessionRecord;
  test: Pick<TestRecord, "id" | "title" | "time_limit_mins" | "questions_per_attempt"> | null;
  questions: Array<{
    categoryName: string;
    questionId: string;
    position: number;
    type: "multiple_choice" | "true_false";
    questionText: string;
    options: string[];
    selectedAnswer: string | null;
    isCorrect: boolean | null;
  }>;
};

const LEGACY_SESSION_SELECT =
  "id, test_id, trainee_id, started_at, expires_at, submitted_at, status, score, total_questions";
const SESSION_SELECT = `${LEGACY_SESSION_SELECT}, attempt_number, retakes_remaining, focus_loss_count`;

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function dedupeAnswers(answers: AnswerRecord[]) {
  const map = new Map<string, AnswerRecord>();

  const sorted = [...answers].sort((left, right) =>
    (right.answered_at ?? "").localeCompare(left.answered_at ?? ""),
  );

  for (const answer of sorted) {
    if (!map.has(answer.question_id)) {
      map.set(answer.question_id, answer);
    }
  }

  return map;
}

function normalizeSessionRecord(
  session: LegacySessionRecord,
  defaults?: Partial<Pick<SessionRecord, "attempt_number" | "retakes_remaining" | "focus_loss_count">>,
): SessionRecord {
  return {
    ...session,
    attempt_number: session.attempt_number ?? defaults?.attempt_number ?? 1,
    retakes_remaining:
      session.retakes_remaining ?? defaults?.retakes_remaining ?? 0,
    focus_loss_count: session.focus_loss_count ?? defaults?.focus_loss_count ?? 0,
  };
}

function isMissingSchemaEntityError(error: {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
}) {
  const diagnostics = [
    error.code,
    error.message,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    diagnostics.includes("schema cache") ||
    diagnostics.includes("does not exist") ||
    diagnostics.includes("could not find the table")
  );
}

async function getTestQuestionIds(admin: ReturnType<typeof createAdminClient>, testId: string) {
  const { data: linkedQuestions, error: linkedQuestionsError } = await admin
    .from("test_questions")
    .select("question_id")
    .eq("test_id", testId)
    .returns<TestQuestionRecord[]>();

  if (linkedQuestionsError && !isMissingSchemaEntityError(linkedQuestionsError)) {
    throw linkedQuestionsError;
  }

  const linkedQuestionIds = (linkedQuestions ?? [])
    .map((row) => row.question_id)
    .filter(Boolean);

  // If there was no error querying `test_questions`, return the result (even if empty)
  // because it means the new schema is active.
  if (!linkedQuestionsError) {
    return linkedQuestionIds;
  }

  const { data: legacyQuestions, error: legacyQuestionsError } = await admin
    .from("questions")
    .select("id")
    .eq("test_id", testId)
    .returns<LegacyQuestionRecord[]>();

  if (legacyQuestionsError) {
    if (!linkedQuestionsError || !isMissingSchemaEntityError(legacyQuestionsError)) {
      throw legacyQuestionsError;
    }

    return [];
  }

  const legacyQuestionIds = (legacyQuestions ?? []).map((row) => row.id).filter(Boolean);

  if (legacyQuestionIds.length) {
    console.warn("Using legacy questions.test_id fallback for test session creation.", {
      testId,
    });
  }

  return legacyQuestionIds;
}

async function getQuestionsByIds(
  admin: ReturnType<typeof createAdminClient>,
  questionIds: string[],
) {
  if (!questionIds.length) {
    return [] as QuestionRecord[];
  }

  const { data: questions, error } = await admin
    .from("questions")
    .select("id, type, question_text, options, correct_answer")
    .in("id", questionIds)
    .returns<QuestionRecord[]>();

  if (error) {
    throw error;
  }

  return questions ?? [];
}

async function getQuestionCategoryNameByQuestionId(
  admin: ReturnType<typeof createAdminClient>,
  questionIds: string[],
) {
  const questionCategoryNameById = new Map<string, string>();

  if (!questionIds.length) {
    return questionCategoryNameById;
  }

  const { data: questions, error: questionsError } = await admin
    .from("questions")
    .select("id, category_id")
    .in("id", questionIds)
    .returns<QuestionCategoryLookupRecord[]>();

  if (questionsError) {
    if (isMissingSchemaEntityError(questionsError)) {
      return questionCategoryNameById;
    }

    throw questionsError;
  }

  const categoryIds = Array.from(
    new Set(
      (questions ?? [])
        .map((question) => question.category_id)
        .filter((categoryId): categoryId is string => Boolean(categoryId)),
    ),
  );
  const categoryNameById = new Map<string, string>();

  if (categoryIds.length) {
    const { data: categories, error: categoriesError } = await admin
      .from("question_categories")
      .select("id, name")
      .in("id", categoryIds)
      .returns<QuestionCategoryRecord[]>();

    if (categoriesError) {
      if (!isMissingSchemaEntityError(categoriesError)) {
        throw categoriesError;
      }
    } else {
      for (const category of categories ?? []) {
        categoryNameById.set(category.id, category.name);
      }
    }
  }

  for (const question of questions ?? []) {
    questionCategoryNameById.set(
      question.id,
      categoryNameById.get(question.category_id ?? "") ?? "Uncategorized",
    );
  }

  return questionCategoryNameById;
}

async function getSessionHistoryForUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  testId: string,
) {
  const { data: sessions, error } = await admin
    .from("test_sessions")
    .select(SESSION_SELECT)
    .eq("test_id", testId)
    .eq("trainee_id", userId)
    .order("attempt_number", { ascending: false })
    .returns<SessionRecord[]>();

  if (!error) {
    return sessions ?? [];
  }

  if (!isMissingSchemaEntityError(error)) {
    throw error;
  }

  const { data: legacySessions, error: legacyError } = await admin
    .from("test_sessions")
    .select(LEGACY_SESSION_SELECT)
    .eq("test_id", testId)
    .eq("trainee_id", userId)
    .order("started_at", { ascending: false })
    .returns<LegacySessionRecord[]>();

  if (legacyError) {
    throw legacyError;
  }

  const fallbackSessions = (legacySessions ?? []).map((session, index, allSessions) =>
    normalizeSessionRecord(session, {
      attempt_number: allSessions.length - index,
      retakes_remaining: 0,
      focus_loss_count: 0,
    }),
  );

  if (fallbackSessions.length) {
    console.warn("Using legacy test_sessions fallback for session history.", {
      testId,
      userId,
    });
  }

  return fallbackSessions;
}

async function insertSessionRecord(
  admin: ReturnType<typeof createAdminClient>,
  input: {
    attemptNumber: number;
    expiresAt: string;
    retakesRemaining: number;
    testId: string;
    userId: string;
  },
) {
  const { data: session, error } = await admin
    .from("test_sessions")
    .insert({
      test_id: input.testId,
      trainee_id: input.userId,
      expires_at: input.expiresAt,
      attempt_number: input.attemptNumber,
      retakes_remaining: input.retakesRemaining,
      focus_loss_count: 0,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (!error) {
    return session ?? null;
  }

  if (!isMissingSchemaEntityError(error)) {
    throw error;
  }

  const { data: legacySession, error: legacyError } = await admin
    .from("test_sessions")
    .insert({
      test_id: input.testId,
      trainee_id: input.userId,
      expires_at: input.expiresAt,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (legacyError) {
    throw legacyError;
  }

  console.warn("Using legacy test_sessions fallback for session creation.", {
    testId: input.testId,
    userId: input.userId,
  });

  return legacySession ?? null;
}

async function getSessionById(sessionId: string) {
  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("test_sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle<SessionRecord>();

  if (!error) {
    return session ?? null;
  }

  if (!isMissingSchemaEntityError(error)) {
    throw error;
  }

  const { data: legacySession, error: legacyError } = await admin
    .from("test_sessions")
    .select(LEGACY_SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle<LegacySessionRecord>();

  if (legacyError) {
    throw legacyError;
  }

  if (legacySession) {
    console.warn("Using legacy test_sessions fallback for session lookup.", {
      sessionId,
    });
  }

  return legacySession ? normalizeSessionRecord(legacySession) : null;
}

async function getSessionQuestions(sessionId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("session_questions")
    .select("question_id, position, question_type, question_text, options, correct_answer")
    .eq("session_id", sessionId)
    .order("position", { ascending: true })
    .returns<SessionQuestionRecord[]>();

  if (!error) {
    return data ?? [];
  }

  if (!isMissingSchemaEntityError(error)) {
    throw error;
  }

  const { data: legacySessionQuestions, error: legacyError } = await admin
    .from("session_questions")
    .select("question_id, position")
    .eq("session_id", sessionId)
    .order("position", { ascending: true })
    .returns<LegacySessionQuestionRecord[]>();

  if (legacyError) {
    throw legacyError;
  }

  const questionIds = (legacySessionQuestions ?? [])
    .map((item) => item.question_id)
    .filter(Boolean);
  const questions = await getQuestionsByIds(admin, questionIds);
  const questionsById = new Map(questions.map((question) => [question.id, question]));

  if (questionIds.length) {
    console.warn("Using legacy session_questions fallback without snapshots.", {
      sessionId,
    });
  }

  return (legacySessionQuestions ?? []).flatMap((item) => {
    const question = questionsById.get(item.question_id);

    if (!question) {
      return [];
    }

    return {
      ...item,
      correct_answer: question.correct_answer,
      options: question.options,
      question_text: question.question_text,
      question_type: question.type,
    };
  });
}

async function writeAnswers(
  sessionId: string,
  allowedQuestionIds: Set<string>,
  answerMap: Record<string, string>,
) {
  const admin = createAdminClient();
  const entries = Object.entries(answerMap).filter(
    ([questionId]) => allowedQuestionIds.has(questionId),
  );

  if (!entries.length) {
    return;
  }

  const questionIds = entries.map(([questionId]) => questionId);
  const { error: deleteError } = await admin
    .from("answers")
    .delete()
    .eq("session_id", sessionId)
    .in("question_id", questionIds);

  if (deleteError) {
    throw deleteError;
  }

  const rowsToInsert = entries
    .filter(([, selectedAnswer]) => selectedAnswer)
    .map(([questionId, selectedAnswer]) => ({
      session_id: sessionId,
      question_id: questionId,
      selected_answer: selectedAnswer,
      answered_at: new Date().toISOString(),
    }));

  if (!rowsToInsert.length) {
    return;
  }

  const { error: insertError } = await admin.from("answers").insert(rowsToInsert);

  if (insertError) {
    throw insertError;
  }
}

export async function createSessionForUser(userId: string, testId: string) {
  const admin = createAdminClient();
  const { data: test, error: testError } = await admin
    .from("tests")
    .select("id, title, time_limit_mins, questions_per_attempt, is_active")
    .eq("id", testId)
    .eq("is_active", true)
    .maybeSingle<TestRecord>();

  if (testError) {
    throw testError;
  }

  if (!test) {
    return { error: "That test is not available right now." };
  }

  const sessionHistory = await getSessionHistoryForUser(admin, userId, testId);
  let latestSession = sessionHistory[0] ?? null;

  if (latestSession?.status === "in_progress") {
    const isExpired = new Date(latestSession.expires_at).getTime() <= Date.now();

    if (!isExpired) {
      return { sessionId: latestSession.id };
    }

    const finalized = await finalizeSession(latestSession.id, userId);
    latestSession = finalized.session;
  }

  if (latestSession && latestSession.retakes_remaining <= 0) {
    return { error: "No retakes remain for this test yet." };
  }

  const questionIds = await getTestQuestionIds(admin, testId);

  if (!questionIds.length) {
    return { error: "This test has no questions yet." };
  }

  const selectedQuestionIds = shuffle(questionIds).slice(
    0,
    Math.min(test.questions_per_attempt, questionIds.length),
  );
  const linkedQuestions = await getQuestionsByIds(admin, selectedQuestionIds);
  const selectedQuestionsById = new Map(
    linkedQuestions.map((question) => [question.id, question]),
  );

  if (linkedQuestions.length !== selectedQuestionIds.length) {
    return { error: "This test is being updated right now. Start it again in a moment." };
  }

  const expiresAt = new Date(Date.now() + test.time_limit_mins * 60_000).toISOString();
  const attemptNumber = latestSession ? latestSession.attempt_number + 1 : 1;
  const retakesRemaining = latestSession
    ? Math.max(latestSession.retakes_remaining - 1, 0)
    : 0;

  const session = await insertSessionRecord(admin, {
    attemptNumber,
    expiresAt,
    retakesRemaining,
    testId,
    userId,
  });

  if (!session) {
    return { error: "The test session could not be created." };
  }

  const { error: sessionQuestionsError } = await admin.from("session_questions").insert(
    selectedQuestionIds.flatMap((questionId, index) => {
      const question = selectedQuestionsById.get(questionId);

      if (!question) {
        return [];
      }

      return {
        session_id: session.id,
        question_id: questionId,
        position: index + 1,
        question_type: question.type,
        question_text: question.question_text,
        options: question.options,
        correct_answer: question.correct_answer,
      };
    }),
  );

  if (sessionQuestionsError) {
    throw sessionQuestionsError;
  }

  return { sessionId: session.id };
}

export async function saveAnswerForSession(
  userId: string,
  sessionId: string,
  questionId: string,
  selectedAnswer: string,
) {
  const session = await getSessionById(sessionId);

  if (!session || session.trainee_id !== userId) {
    return { error: "That session could not be found." };
  }

  if (session.status !== "in_progress") {
    return { error: "That session is already closed." };
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return { error: "This test has already expired." };
  }

  const sessionQuestions = await getSessionQuestions(sessionId);
  const allowedQuestionIds = new Set(sessionQuestions.map((item) => item.question_id));

  if (!allowedQuestionIds.has(questionId)) {
    return { error: "That question does not belong to this session." };
  }

  await writeAnswers(sessionId, allowedQuestionIds, {
    [questionId]: selectedAnswer,
  });

  return { ok: true };
}

export async function finalizeSession(
  sessionId: string,
  userId?: string,
  submittedAnswers?: Record<string, string>,
) {
  const admin = createAdminClient();
  const session = await getSessionById(sessionId);

  if (!session) {
    throw new Error("Session not found.");
  }

  if (userId && session.trainee_id !== userId) {
    throw new Error("You do not have access to this session.");
  }

  if (session.status !== "in_progress") {
    return {
      session,
      score: session.score ?? 0,
      totalQuestions: session.total_questions ?? 0,
    };
  }

  const sessionQuestions = await getSessionQuestions(sessionId);
  const allowedQuestionIds = new Set(sessionQuestions.map((item) => item.question_id));
  const isExpired = new Date(session.expires_at).getTime() <= Date.now();

  if (!isExpired && submittedAnswers) {
    await writeAnswers(sessionId, allowedQuestionIds, submittedAnswers);
  }

  const { data: answerRows, error: answersError } = await admin
    .from("answers")
    .select("question_id, selected_answer, is_correct, answered_at")
    .eq("session_id", sessionId)
    .returns<AnswerRecord[]>();

  if (answersError) {
    throw answersError;
  }

  const questionsById = new Map(
    sessionQuestions.map((question) => [question.question_id, question]),
  );
  const latestAnswers = dedupeAnswers(answerRows ?? []);
  let score = 0;

  const gradedAnswers = Array.from(latestAnswers.values()).flatMap((answer) => {
    const question = questionsById.get(answer.question_id);

    if (!question || !answer.selected_answer) {
      return [];
    }

    const isCorrect = answer.selected_answer === question.correct_answer;

    if (isCorrect) {
      score += 1;
    }

    return {
      session_id: sessionId,
      question_id: answer.question_id,
      selected_answer: answer.selected_answer,
      is_correct: isCorrect,
      answered_at: answer.answered_at ?? new Date().toISOString(),
    };
  });

  const answeredQuestionIds = gradedAnswers.map((answer) => answer.question_id);

  if (answeredQuestionIds.length) {
    const { error: clearAnswersError } = await admin
      .from("answers")
      .delete()
      .eq("session_id", sessionId)
      .in("question_id", answeredQuestionIds);

    if (clearAnswersError) {
      throw clearAnswersError;
    }

    const { error: insertAnswersError } = await admin.from("answers").insert(gradedAnswers);

    if (insertAnswersError) {
      throw insertAnswersError;
    }
  }

  const nextStatus = isExpired ? "expired" : "submitted";
  const submittedAt = new Date().toISOString();
  const totalQuestions = sessionQuestions.length;

  const { error: updateError } = await admin
    .from("test_sessions")
    .update({
      status: nextStatus,
      submitted_at: submittedAt,
      score,
      total_questions: totalQuestions,
    })
    .eq("id", sessionId);

  if (updateError) {
    throw updateError;
  }

  const updatedSession = await getSessionById(sessionId);

  return {
    session: updatedSession ?? {
      ...session,
      status: nextStatus,
      submitted_at: submittedAt,
      score,
      total_questions: totalQuestions,
    },
    score,
    totalQuestions,
  };
}

export async function incrementFocusLossCount(sessionId: string) {
  const admin = createAdminClient();
  const session = await getSessionById(sessionId);

  if (!session || session.status !== "in_progress") {
    return { error: "Session is not active.", count: 0 };
  }

  const newCount = session.focus_loss_count + 1;
  const { error } = await admin
    .from("test_sessions")
    .update({ focus_loss_count: newCount })
    .eq("id", sessionId);

  if (error) {
    throw error;
  }

  return { count: newCount };
}

export async function loadSessionExperienceForUser(userId: string, sessionId: string) {
  const admin = createAdminClient();
  const session = await getSessionById(sessionId);

  if (!session || session.trainee_id !== userId) {
    return null;
  }

  const { data: test, error: testError } = await admin
    .from("tests")
    .select("id, title, time_limit_mins, questions_per_attempt")
    .eq("id", session.test_id)
    .maybeSingle<Pick<TestRecord, "id" | "title" | "time_limit_mins" | "questions_per_attempt">>();

  if (testError) {
    throw testError;
  }

  const sessionQuestions = await getSessionQuestions(sessionId);
  const questionCategoryNameById = await getQuestionCategoryNameByQuestionId(
    admin,
    sessionQuestions.map((question) => question.question_id),
  );

  const { data: answers, error: answersError } = await admin
    .from("answers")
    .select("question_id, selected_answer, is_correct, answered_at")
    .eq("session_id", sessionId)
    .returns<AnswerRecord[]>();

  if (answersError) {
    throw answersError;
  }

  const answersByQuestionId = dedupeAnswers(answers ?? []);

  return {
    session,
    test: test ?? null,
    questions: sessionQuestions.map((item) => {
      const answer = answersByQuestionId.get(item.question_id);

      return {
        categoryName:
          questionCategoryNameById.get(item.question_id) ?? "Uncategorized",
        questionId: item.question_id,
        position: item.position,
        type: item.question_type,
        questionText: item.question_text,
        options: parseOptions(item.options),
        selectedAnswer: answer?.selected_answer ?? null,
        isCorrect: answer?.is_correct ?? null,
      };
    }),
  } satisfies SessionExperience;
}

export async function sweepExpiredSessions() {
  const admin = createAdminClient();
  const { data: expiredSessions, error } = await admin
    .from("test_sessions")
    .select("id")
    .eq("status", "in_progress")
    .lt("expires_at", new Date().toISOString());

  if (error) {
    throw error;
  }

  const sweptSessionIds: string[] = [];

  for (const session of expiredSessions ?? []) {
    await finalizeSession(session.id as string);
    sweptSessionIds.push(session.id as string);
  }

  return sweptSessionIds;
}

export async function finalizeExpiredSessionIfNeeded(sessionId: string, userId: string) {
  const session = await getSessionById(sessionId);

  if (!session || session.trainee_id !== userId || session.status !== "in_progress") {
    return false;
  }

  if (new Date(session.expires_at).getTime() > Date.now()) {
    return false;
  }

  await finalizeSession(sessionId, userId);
  return true;
}
