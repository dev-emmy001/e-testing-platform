import { NextResponse, type NextRequest } from "next/server";
import { resolveCurrentUserRole } from "@/utils/auth/profile";
import { getProfileDisplayName } from "@/utils/profile";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type ExportRouteProps = {
  params: Promise<{
    testId: string;
  }>;
};

type ExportSession = {
  attempt_number: number;
  id: string;
  score: number | null;
  started_at: string;
  status: string;
  submitted_at: string | null;
  test_id: string;
  total_questions: number | null;
  trainee_id: string;
};

type ExportAnswer = {
  is_correct: boolean | null;
  question_id: string;
  selected_answer: string | null;
  session_id: string;
};

type ExportSessionQuestion = {
  position: number;
  question_id: string;
  question_text: string;
  session_id: string;
};

type ExportProfile = {
  email: string;
  id: string;
  name: string | null;
  track: string | null;
};

function escapeCsv(value: string | number | boolean | null | undefined) {
  const rawValue = value == null ? "" : String(value);

  if (/[",\n]/.test(rawValue)) {
    return `"${rawValue.replaceAll('"', '""')}"`;
  }

  return rawValue;
}

export async function GET(request: NextRequest, { params }: ExportRouteProps) {
  const { testId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const role = await resolveCurrentUserRole(supabase, user);

  if (role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const admin = createAdminClient();
  const { data: test } = await admin
    .from("tests")
    .select("id, title")
    .eq("id", testId)
    .maybeSingle<{ id: string; title: string }>();

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const { data: sessions } = await admin
    .from("test_sessions")
    .select(
      "id, test_id, trainee_id, started_at, submitted_at, status, score, total_questions, attempt_number",
    )
    .eq("test_id", testId)
    .order("started_at", { ascending: false })
    .returns<ExportSession[]>();

  const sessionIds = (sessions ?? []).map((session) => session.id);
  const traineeIds = Array.from(new Set((sessions ?? []).map((session) => session.trainee_id)));

  const [{ data: profiles }, { data: answers }, { data: sessionQuestions }] = await Promise.all([
    traineeIds.length
      ? admin
          .from("profiles")
          .select("id, email, name, track")
          .in("id", traineeIds)
          .returns<ExportProfile[]>()
      : Promise.resolve({ data: [] }),
    sessionIds.length
      ? admin
          .from("answers")
          .select("session_id, question_id, selected_answer, is_correct")
          .in("session_id", sessionIds)
          .returns<ExportAnswer[]>()
      : Promise.resolve({ data: [] }),
    sessionIds.length
      ? admin
          .from("session_questions")
          .select("session_id, question_id, question_text, position")
          .in("session_id", sessionIds)
          .returns<ExportSessionQuestion[]>()
      : Promise.resolve({ data: [] }),
  ]);
  const sessionQuestionMap = new Map(
    (sessionQuestions ?? []).map((sessionQuestion) => [
      `${sessionQuestion.session_id}:${sessionQuestion.question_id}`,
      sessionQuestion,
    ]),
  );
  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  const answersBySessionId = new Map<string, ExportAnswer[]>();

  for (const answer of answers ?? []) {
    const currentAnswers = answersBySessionId.get(answer.session_id) ?? [];
    currentAnswers.push(answer);
    answersBySessionId.set(answer.session_id, currentAnswers);
  }

  for (const sessionAnswers of answersBySessionId.values()) {
    sessionAnswers.sort((left, right) => {
      const leftPosition =
        sessionQuestionMap.get(`${left.session_id}:${left.question_id}`)?.position ??
        Number.MAX_SAFE_INTEGER;
      const rightPosition =
        sessionQuestionMap.get(`${right.session_id}:${right.question_id}`)?.position ??
        Number.MAX_SAFE_INTEGER;

      return leftPosition - rightPosition;
    });
  }

  const snapshotMissing = Boolean(sessionIds.length) && !sessionQuestions?.length;
  const questionIds =
    snapshotMissing || !sessionQuestions?.length
      ? Array.from(
          new Set((answers ?? []).map((answer) => answer.question_id).filter(Boolean)),
        )
      : [];
  const { data: questions } = questionIds.length
    ? await admin
        .from("questions")
        .select("id, question_text")
        .in("id", questionIds)
    : { data: [] };
  const questionMap = new Map((questions ?? []).map((question) => [question.id as string, question.question_text as string]));

  const rows = [
    [
      "test_title",
      "trainee_name",
      "trainee_email",
      "trainee_track",
      "session_id",
      "attempt_number",
      "status",
      "score",
      "total_questions",
      "started_at",
      "submitted_at",
      "question_text",
      "selected_answer",
      "is_correct",
    ].join(","),
  ];

  for (const session of sessions ?? []) {
    const sessionAnswers = answersBySessionId.get(session.id) ?? [null];
    const traineeProfile = profileMap.get(session.trainee_id);

    for (const answer of sessionAnswers) {
      rows.push(
        [
          escapeCsv(test.title),
          escapeCsv(
            traineeProfile
              ? getProfileDisplayName(traineeProfile)
              : "Unknown trainee",
          ),
          escapeCsv(traineeProfile?.email ?? ""),
          escapeCsv(traineeProfile?.track ?? ""),
          escapeCsv(session.id),
          escapeCsv(session.attempt_number),
          escapeCsv(session.status),
          escapeCsv(session.score ?? ""),
          escapeCsv(session.total_questions ?? ""),
          escapeCsv(session.started_at),
          escapeCsv(session.submitted_at ?? ""),
          escapeCsv(
            answer
              ? sessionQuestionMap.get(`${answer.session_id}:${answer.question_id}`)
                  ?.question_text ??
                  questionMap.get(answer.question_id) ??
                  ""
              : "",
          ),
          escapeCsv(answer?.selected_answer ?? ""),
          escapeCsv(answer?.is_correct ?? ""),
        ].join(","),
      );
    }
  }

  return new Response(rows.join("\n"), {
    headers: {
      "Content-Disposition": `attachment; filename="results-${testId}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
