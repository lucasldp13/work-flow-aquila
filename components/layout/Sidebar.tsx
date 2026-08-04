"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { ROLE_LABELS, canAccessAdmin } from "@/lib/workflow/permissions";
import type { UserRole } from "@/types/database";
import { Building2, LayoutDashboard, KanbanSquare, ListChecks, Settings, PlusCircle } from "lucide-react";

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/demandas", label: "Demandas (lista)", icon: ListChecks },
    { href: "/demandas/kanban", label: "Demandas (Kanban)", icon: KanbanSquare },
    ...(role === "comercial" || role === "admin" ? [{ href: "/demandas/novo", label: "Nova demanda", icon: PlusCircle }] : []),
    ...(canAccessAdmin(role) ? [{ href: "/admin", label: "Administração", icon: Settings }] : []),
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-900">Workflow Aquila</p>
          <p className="text-[11px] leading-tight text-slate-500">{ROLE_LABELS[role]}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 p-4 text-[11px] text-slate-400">Workflow Aquila © {new Date().getFullYear()}</div>
    </aside>
  );
}
