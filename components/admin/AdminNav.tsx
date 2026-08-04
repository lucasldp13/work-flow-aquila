"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/admin/usuarios", label: "Usuários e permissões" },
  { href: "/admin/configuracoes", label: "Configurações e e-mails" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "border-b-2 px-3 py-2.5 text-sm font-medium",
            pathname === item.href ? "border-brand-700 text-brand-800" : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
