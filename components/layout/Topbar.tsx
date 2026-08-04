"use client";

import { NotificationsBell } from "./NotificationsBell";
import { LogOut } from "lucide-react";

export function Topbar({ name, roleLabel }: { name: string; roleLabel: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="md:hidden text-sm font-semibold text-slate-900">Workflow Aquila</div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <NotificationsBell />
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
            {name
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium leading-tight text-slate-800">{name}</p>
            <p className="text-[11px] leading-tight text-slate-500">{roleLabel}</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Sair" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
