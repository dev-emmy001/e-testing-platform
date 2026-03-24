const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatCountdown(remainingMs: number) {
  const clamped = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => part.toString().padStart(2, "0")).join(":");
}

export function formatPercentage(score: number | null | undefined, total: number | null | undefined) {
  if (!total || total <= 0 || score == null) {
    return "—";
  }

  return `${Math.round((score / total) * 100)}%`;
}

export function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseOptions(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((option) => String(option).trim())
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((option) => String(option).trim())
      .filter(Boolean);
  }

  return [];
}

export function getStatusClasses(status: string) {
  switch (status) {
    case "submitted":
      return "bg-[color:var(--color-green)] text-white";
    case "expired":
      return "bg-[color:var(--color-orange)] text-white";
    case "in_progress":
      return "bg-[color:var(--color-cyan)] text-white";
    default:
      return "bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]";
  }
}

export function getRoleClasses(role: string) {
  return role === "admin"
    ? "bg-[color:var(--color-purple)] text-white"
    : "bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]";
}
