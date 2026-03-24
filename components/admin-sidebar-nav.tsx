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
            className={`block rounded-3xl border px-4 py-4 transition ${
              isActive
                ? "border-(--color-indigo) bg-(--color-indigo-light) text-(--color-indigo)"
                : "border-transparent text-gray-700 hover:border-gray-300 hover:bg-(--color-indigo-light)/60 hover:text-(--color-indigo)"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p
                  className={`mt-1 text-xs leading-5 ${
                    isActive ? "text-(--color-indigo)/80" : "text-gray-500"
                  }`}
                >
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
