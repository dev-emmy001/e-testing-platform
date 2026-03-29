import type { ReactNode } from "react";
import { AdminMobileSidebar } from "@/components/admin-mobile-sidebar";
import { AdminSidebarContent } from "@/components/admin-sidebar-content";
import type { AdminNavItem } from "@/components/admin-sidebar-nav";
import { requireAdminContext } from "@/utils/auth/session";
import { getProfileDisplayName } from "@/utils/profile";

const navItems: AdminNavItem[] = [
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
    description: "Organize the reusable question library and categories.",
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
  const profileLabel = getProfileDisplayName(profile);

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4 lg:grid lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-4 lg:space-y-0">
        <AdminMobileSidebar profileLabel={profileLabel}>
          <AdminSidebarContent profileLabel={profileLabel} items={navItems} />
        </AdminMobileSidebar>

        <aside className="surface-card scrollbar-hide hidden h-[calc(100vh-2rem)] overflow-y-auto rounded-4xl p-6 lg:sticky lg:top-4 lg:block">
          <AdminSidebarContent profileLabel={profileLabel} items={navItems} />
        </aside>

        <div className="min-w-0 space-y-4">{children}</div>
      </div>
    </div>
  );
}
