"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";
import type { DemandDetailPayload, SessionInfo } from "./types";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import { GeralTab } from "./tabs/GeralTab";
import { DocumentosTab } from "./tabs/DocumentosTab";
import { ComentariosTab } from "./tabs/ComentariosTab";
import { EquipeTab } from "./tabs/EquipeTab";
import { FinanceiroTab } from "./tabs/FinanceiroTab";
import { TimelineTab } from "./tabs/TimelineTab";

const TABS = [
  { key: "geral", label: "Visão geral" },
  { key: "documentos", label: "Documentos" },
  { key: "comentarios", label: "Comentários e pendências" },
  { key: "equipe", label: "Equipe" },
  { key: "financeiro", label: "Financeiro" },
  { key: "timeline", label: "Linha do tempo" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function DemandDetailClient({ initialData, session }: { initialData: DemandDetailPayload; session: SessionInfo }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<TabKey>("geral");

  const reload = useCallback(async () => {
    const res = await fetch(`/api/demands/${data.demand.id}`, { cache: "no-store" });
    if (res.ok) {
      const fresh = await res.json();
      setData(fresh);
    }
    router.refresh();
  }, [data.demand.id, router]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{data.demand.clients?.name}</p>
          <h1 className="text-xl font-semibold text-slate-900">{data.demand.nome_demanda}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consultor: {data.demand.consultor_nome} ({data.demand.consultor_email}) · Valor: {formatCurrency(data.demand.valor)}
          </p>
        </div>
        <StatusBadge status={data.demand.status} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.key ? "border-brand-700 text-brand-800" : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "geral" && <GeralTab data={data} session={session} onChanged={reload} />}
        {activeTab === "documentos" && <DocumentosTab data={data} session={session} onChanged={reload} />}
        {activeTab === "comentarios" && <ComentariosTab data={data} session={session} onChanged={reload} />}
        {activeTab === "equipe" && <EquipeTab data={data} session={session} onChanged={reload} />}
        {activeTab === "financeiro" && <FinanceiroTab data={data} session={session} onChanged={reload} />}
        {activeTab === "timeline" && <TimelineTab data={data} />}
      </div>
    </div>
  );
}
