import Link from "next/link";
import type { ReactNode } from "react";
import { SubmitButton } from "@/components/submit-button";
import { signOutAction } from "@/app/actions";
import { requireAdminContext } from "@/utils/auth/session";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/tests", label: "Tests" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/trainees", label: "Trainees" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireAdminContext("/admin");

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="surface-card rounded-[2rem] p-6">
          <div className="rounded-[1.75rem] bg-[color:var(--color-indigo)] px-5 py-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Admin console
            </p>
            <h1 className="mt-3 text-3xl font-bold">ighub Testing</h1>
            <p className="mt-2 text-sm text-white/80">{profile.email}</p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[color:var(--color-gray-700)] transition hover:bg-[color:var(--color-indigo-light)] hover:text-[color:var(--color-indigo)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 space-y-3">
            <Link
              href="/"
              className="secondary-button inline-flex w-full items-center justify-center px-5 py-3 text-sm"
            >
              Open trainee view
            </Link>

            <form action={signOutAction}>
              <SubmitButton
                pendingLabel="Signing out..."
                className="primary-button inline-flex w-full items-center justify-center px-5 py-3 text-sm"
              >
                Sign out
              </SubmitButton>
            </form>
          </div>
        </aside>

        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
