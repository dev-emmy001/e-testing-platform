export function getSafeRedirectPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}
