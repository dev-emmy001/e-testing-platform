import { NextResponse, type NextRequest } from "next/server";
import { resolveCurrentUserRole } from "@/utils/auth/profile";
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

  const [{ data: profiles }, { data: questions }, { data: answers }] = await Promise.all([
    traineeIds.length
      ? admin
          .from("profiles")
          .select("id, email")
          .in("id", traineeIds)
      : Promise.resolve({ data: [] }),
    admin.from("questions").select("id, question_text").eq("test_id", testId),
    sessionIds.length
      ? admin
          .from("answers")
          .select("session_id, question_id, selected_answer, is_correct")
          .in("session_id", sessionIds)
          .returns<ExportAnswer[]>()
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id as string, profile.email as string]));
  const questionMap = new Map((questions ?? []).map((question) => [question.id as string, question.question_text as string]));
  const answersBySessionId = new Map<string, ExportAnswer[]>();

  for (const answer of answers ?? []) {
    const currentAnswers = answersBySessionId.get(answer.session_id) ?? [];
    currentAnswers.push(answer);
    answersBySessionId.set(answer.session_id, currentAnswers);
  }

  const rows = [
    [
      "test_title",
      "trainee_email",
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

    for (const answer of sessionAnswers) {
      rows.push(
        [
          escapeCsv(test.title),
          escapeCsv(profileMap.get(session.trainee_id) ?? ""),
          escapeCsv(session.id),
          escapeCsv(session.attempt_number),
          escapeCsv(session.status),
          escapeCsv(session.score ?? ""),
          escapeCsv(session.total_questions ?? ""),
          escapeCsv(session.started_at),
          escapeCsv(session.submitted_at ?? ""),
          escapeCsv(answer ? questionMap.get(answer.question_id) ?? "" : ""),
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
