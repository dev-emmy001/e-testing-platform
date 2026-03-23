import { type NextRequest, NextResponse } from "next/server";
import { getSafeRedirectPath } from "@/utils/auth/redirect";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
