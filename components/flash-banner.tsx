type FlashBannerProps = {
  error?: string | null;
  message?: string | null;
};

export function FlashBanner({ error, message }: FlashBannerProps) {
  if (!error && !message) {
    return null;
  }

  const toneClasses = error
    ? "border-[color:var(--color-orange)]/40 bg-[color:var(--color-orange)]/10 text-[color:var(--color-gray-900)]"
    : "border-[color:var(--color-cyan)]/40 bg-[color:var(--color-cyan)]/10 text-[color:var(--color-gray-900)]";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClasses}`}>
      {error ?? message}
    </div>
  );
}
