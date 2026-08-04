"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface NotificationItem {
  id: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.notifications ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const unread = items.filter((i) => !i.lida).length;

  async function markRead(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, lida: true } : i)));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Notificações</div>
          <div className="max-h-96 overflow-y-auto">
            {!loaded && <p className="px-4 py-6 text-center text-sm text-slate-400">Carregando…</p>}
            {loaded && items.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">Nenhuma notificação.</p>}
            {items.map((item) => (
              <a
                key={item.id}
                href={item.link ?? "#"}
                onClick={() => markRead(item.id)}
                className={cn("block border-b border-slate-50 px-4 py-3 text-sm hover:bg-slate-50", !item.lida && "bg-brand-50/40")}
              >
                <p className={cn("text-slate-800", !item.lida && "font-semibold")}>{item.mensagem}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
