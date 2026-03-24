import Link from "next/link";
import type { ReactNode } from "react";
import { SubmitButton } from "@/components/submit-button";
import { AdminSidebarNav } from "@/components/admin-sidebar-nav";
import { signOutAction } from "@/app/actions";
import { requireAdminContext } from "@/utils/auth/session";

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    description: "Live metrics, alerts, and recent platform activity.",
  },
  {
    href: "/admin/tests",
    label: "Tests",
    description: "Configure timing, draw size, and publish state.",
  },
  {
    href: "/admin/questions",
    label: "Questions",
    description: "Build and maintain the assessment question bank.",
  },
  {
    href: "/admin/results",
    label: "Results",
    description: "Review attempt history and export CSV reports.",
  },
  {
    href: "/admin/trainees",
    label: "Trainees",
    description: "Track completion progress and manage retakes.",
  },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireAdminContext("/admin");

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="surface-card rounded-4xl p-6 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="rounded-[1.75rem] bg-[linear-gradient(160deg,rgba(61,58,142,1),rgba(41,171,226,0.88))] px-5 py-5 text-white shadow-[0_20px_40px_rgba(42,40,101,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Admin console
            </p>
            <h1 className="mt-3 text-3xl font-bold">ighub Testing</h1>
            <p className="mt-2 text-sm text-white/80">{profile.email}</p>
            <p className="mt-4 text-sm leading-6 text-white/75">
              Secure workspace for assessment operations, publishing, and
              reporting.
            </p>
          </div>

          <AdminSidebarNav items={navItems} />

          <div className="mt-6 space-y-3">
            <Link
              href="/?view=trainee"
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
