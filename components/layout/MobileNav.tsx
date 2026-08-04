"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { canAccessAdmin } from "@/lib/workflow/permissions";
import type { UserRole } from "@/types/database";

export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/demandas", label: "Lista" },
    { href: "/demandas/kanban", label: "Kanban" },
    ...(role === "comercial" || role === "admin" ? [{ href: "/demandas/novo", label: "Nova" }] : []),
    ...(canAccessAdmin(role) ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
              active ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
