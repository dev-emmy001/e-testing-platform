export function getSafeRedirectPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

export function getDashboardPathForRole(role: string | null | undefined) {
  return role === "admin" ? "/admin" : "/";
}

export function getPostAuthRedirectPath(
  next: string | null | undefined,
  role: string | null | undefined,
) {
  const safeNext = getSafeRedirectPath(next);

  if (safeNext !== "/") {
    return safeNext;
  }

  return getDashboardPathForRole(role);
}
