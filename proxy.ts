import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getProxySessionContext } from "@/utils/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, role, user } = await getProxySessionContext(request);
  const { pathname } = request.nextUrl;
  const isProtectedAppRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/test") ||
    pathname.startsWith("/results");

  if (pathname.startsWith("/sign-in") && user) {
    const redirectTarget = role === "admin" ? "/admin" : "/";
    const redirectResponse = NextResponse.redirect(new URL(redirectTarget, request.url));

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  if (!user && isProtectedAppRoute) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);

    const redirectResponse = NextResponse.redirect(signInUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
