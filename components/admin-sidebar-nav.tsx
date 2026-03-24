"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavItem = {
  description: string;
  href: string;
  label: string;
};

type AdminSidebarNavProps = {
  items: AdminNavItem[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebarNav({ items }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 space-y-2">
      {items.map((item) => {
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-[1.5rem] border px-4 py-4 transition ${
              isActive
                ? "border-[color:var(--color-indigo)] bg-[color:var(--color-indigo-light)] text-[color:var(--color-indigo)]"
                : "border-transparent text-[color:var(--color-gray-700)] hover:border-[color:var(--color-gray-300)] hover:bg-[color:var(--color-indigo-light)]/60 hover:text-[color:var(--color-indigo)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p
                  className={`mt-1 text-xs leading-5 ${
                    isActive ? "text-[color:var(--color-indigo)]/80" : "text-[color:var(--color-gray-500)]"
                  }`}
                >
                  {item.description}
                </p>
              </div>
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                  isActive ? "bg-[color:var(--color-indigo)]" : "bg-[color:var(--color-gray-300)]"
                }`}
              />
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
