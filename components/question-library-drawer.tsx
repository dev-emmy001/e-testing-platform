"use client";

import type { ReactNode } from "react";
import { useEffect, useEffectEvent } from "react";

type QuestionLibraryDrawerProps = {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  eyebrow: string;
  onClose: () => void;
  title: string;
};

export function QuestionLibraryDrawer({
  actions,
  children,
  description,
  eyebrow,
  onClose,
  title,
}: QuestionLibraryDrawerProps) {
  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close question drawer"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(26,26,46,0.38)]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-library-drawer-title"
        className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto border-l border-[rgba(196,196,216,0.55)] bg-[rgba(255,255,255,0.96)] p-6 shadow-[0_24px_60px_rgba(26,26,46,0.22)] backdrop-blur-xl sm:p-8"
      >
        <div className="space-y-6">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
                {eyebrow}
              </p>
              <h2
                id="question-library-drawer-title"
                className="mt-2 text-3xl font-bold text-gray-900"
              >
                {title}
              </h2>
              {description ? (
                <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-700">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {actions}
              <button
                type="button"
                onClick={onClose}
                className="secondary-button px-4 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </header>

          {children}
        </div>
      </aside>
    </div>
  );
}
