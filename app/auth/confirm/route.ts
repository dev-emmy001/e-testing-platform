import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { getSafeRedirectPath } from "@/utils/auth/redirect";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
