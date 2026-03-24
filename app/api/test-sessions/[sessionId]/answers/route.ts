import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { saveAnswerForSession } from "@/utils/test-sessions";

type SaveAnswerRouteProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: SaveAnswerRouteProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    questionId?: string;
    selectedAnswer?: string;
  };

  if (!body.questionId || typeof body.selectedAnswer !== "string") {
    return NextResponse.json({ error: "Question ID and answer are required." }, { status: 400 });
  }

  const result = await saveAnswerForSession(
    user.id,
    sessionId,
    body.questionId,
    body.selectedAnswer,
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
