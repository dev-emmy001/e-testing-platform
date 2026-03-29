"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useEffectEvent, useState } from "react";
import { usePathname } from "next/navigation";

const DESKTOP_MIN_WIDTH = 1024;

type AdminMobileSidebarProps = {
  children: ReactNode;
  profileLabel: string;
};

function HamburgerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function AdminMobileSidebar({
  children,
  profileLabel,
}: AdminMobileSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = useEffectEvent(() => {
    setIsOpen(false);
  });

  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  const syncDesktopState = useEffectEvent(() => {
    if (window.innerWidth >= DESKTOP_MIN_WIDTH) {
      closeMenu();
    }
  });

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    syncDesktopState();
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", syncDesktopState);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", syncDesktopState);
    };
  }, [isOpen]);

  return (
    <>
      <div className="lg:hidden">
        <div className="surface-card rounded-4xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
                Admin console
              </p>
              <p className="mt-1 truncate text-sm text-gray-700">
                {profileLabel}
              </p>
            </div>

            <button
              type="button"
              aria-label="Open admin navigation"
              aria-expanded={isOpen}
              aria-controls="admin-mobile-menu"
              onClick={() => setIsOpen(true)}
              className="secondary-button inline-flex items-center gap-2 px-4 py-3 text-sm"
            >
              <HamburgerIcon />
              Menu
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={() => setIsOpen(false)}
          className={`absolute inset-0 bg-[rgba(26,26,46,0.38)] transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          id="admin-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-mobile-menu-title"
          className={`absolute left-0 top-0 h-full w-full max-w-sm overflow-y-auto p-4 transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(event: MouseEvent<HTMLElement>) => {
            const target = event.target;
            if (target instanceof Element && target.closest("a[href]")) {
              setIsOpen(false);
            }
          }}
        >
          <div className="surface-card min-h-full rounded-4xl p-6 shadow-[0_24px_60px_rgba(26,26,46,0.22)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--color-purple)">
                  Navigation
                </p>
                <h2
                  id="admin-mobile-menu-title"
                  className="mt-1 truncate text-lg font-bold text-gray-900"
                >
                  Admin menu
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="secondary-button px-4 py-2 text-sm"
              >
                Close
              </button>
            </div>

            {children}
          </div>
        </aside>
      </div>
    </>
  );
}
