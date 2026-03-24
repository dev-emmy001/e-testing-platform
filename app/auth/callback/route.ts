import { type NextRequest, NextResponse } from "next/server";
import { resolveCurrentUserRole } from "@/utils/auth/profile";
import { getPostAuthRedirectPath } from "@/utils/auth/redirect";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await resolveCurrentUserRole(supabase, user) : null;

  return NextResponse.redirect(
    new URL(getPostAuthRedirectPath(next, role), request.url),
  );
}
