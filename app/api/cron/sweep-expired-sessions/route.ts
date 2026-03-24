import { NextResponse, type NextRequest } from "next/server";
import { sweepExpiredSessions } from "@/utils/test-sessions";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionIds = await sweepExpiredSessions();

  return NextResponse.json({
    swept: sessionIds.length,
    sessionIds,
  });
}
