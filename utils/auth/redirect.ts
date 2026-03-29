export function getSafeRedirectPath(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

const ONBOARDING_PATH = "/onboarding";

function isOnboardingPath(path: string) {
  return path === ONBOARDING_PATH || path.startsWith(`${ONBOARDING_PATH}?`);
}

export function getDashboardPathForRole(role: string | null | undefined) {
  return role === "admin" ? "/admin" : "/";
}

export function getOnboardingPath(next: string | null | undefined) {
  const safeNext = getSafeRedirectPath(next);

  if (safeNext === "/" || isOnboardingPath(safeNext)) {
    return ONBOARDING_PATH;
  }

  return `${ONBOARDING_PATH}?next=${encodeURIComponent(safeNext)}`;
}

export function getPostAuthRedirectPath(
  next: string | null | undefined,
  role: string | null | undefined,
) {
  const safeNext = getSafeRedirectPath(next);

  if (safeNext !== "/" && !isOnboardingPath(safeNext)) {
    return safeNext;
  }

  return getDashboardPathForRole(role);
}
