import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { AdminSidebarNav, type AdminNavItem } from "@/components/admin-sidebar-nav";
import { SubmitButton } from "@/components/submit-button";

type AdminSidebarContentProps = {
  profileLabel: string;
  items: AdminNavItem[];
};

export function AdminSidebarContent({
  profileLabel,
  items,
}: AdminSidebarContentProps) {
  return (
    <>
      <div className="rounded-[1.75rem] bg-[linear-gradient(160deg,rgba(61,58,142,1),rgba(41,171,226,0.88))] px-5 py-5 text-white shadow-[0_20px_40px_rgba(42,40,101,0.18)]">
        <h1 className="text-xl font-bold uppercase">Admin console</h1>
        <p className="mt-2 text-sm text-white/80">{profileLabel}</p>
      </div>

      <AdminSidebarNav items={items} />

      <div className="mt-6 space-y-3">
        <Link
          href="/profile"
          className="secondary-button inline-flex w-full items-center justify-center px-5 py-3 text-sm"
        >
          Edit profile
        </Link>

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
    </>
  );
}
