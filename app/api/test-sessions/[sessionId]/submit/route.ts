import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { finalizeSession } from "@/utils/test-sessions";

type SubmitRouteProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: SubmitRouteProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url), 303);
  }

  const formData = await request.formData();
  const submittedAnswers = Object.fromEntries(
    Array.from(formData.entries()).flatMap(([key, value]) => {
      if (!key.startsWith("answer:") || typeof value !== "string") {
        return [];
      }

      return [[key.replace("answer:", ""), value.trim()]];
    }),
  );

  try {
    await finalizeSession(sessionId, user.id, submittedAnswers);
  } catch {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  return NextResponse.redirect(new URL(`/results/${sessionId}`, request.url), 303);
}
