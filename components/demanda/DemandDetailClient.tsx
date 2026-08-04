"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";
import type { DemandDetailPayload, SessionInfo } from "./types";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { diasRestantes, isPrazoVencido } from "@/lib/workflow/validations";
import { Clock } from "lucide-react";
import { GeralTab } from "./tabs/GeralTab";
import { DocumentosTab } from "./tabs/DocumentosTab";
import { ComentariosTab } from "./tabs/ComentariosTab";
import { EquipeTab } from "./tabs/EquipeTab";
import { FinanceiroTab } from "./tabs/FinanceiroTab";
import { TimelineTab } from "./tabs/TimelineTab";

const ALL_TABS = [
  { key: "geral", label: "Visão geral", roles: null },
  { key: "documentos", label: "Documentos", roles: null },
  { key: "comentarios", label: "Comentários e pendências", roles: null },
  { key: "equipe", label: "Equipe", roles: ["projetos", "admin"] },
  { key: "financeiro", label: "Financeiro", roles: ["financeiro", "admin"] },
  { key: "timeline", label: "Linha do tempo", roles: null },
] as const;

type TabKey = (typeof ALL_TABS)[number]["key"];

export function DemandDetailClient({ initialData, session }: { initialData: DemandDetailPayload; session: SessionInfo }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<TabKey>("geral");

  // Cada perfil só vê as abas relevantes ao seu setor — Equipe é exclusiva
  // de Projetos/Admin e Financeiro é exclusivo de Financeiro/Admin, para
  // não misturar informação de setores diferentes na mesma tela.
  const TABS = ALL_TABS.filter((tab) => tab.roles === null || (tab.roles as readonly string[]).includes(session.role));

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
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={data.demand.status} />
          <PrazoJuridicoBadge data={data} />
        </div>
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

// Status em que o prazo de 4 dias do Jurídico (para enviar a minuta ao
// cliente) ainda está correndo — some da tela depois que a minuta é
// enviada, pois o prazo já foi cumprido.
const STATUS_COM_PRAZO_ATIVO = ["encaminhada_juridico", "em_validacao_juridica", "minuta_em_elaboracao"];

function PrazoJuridicoBadge({ data }: { data: DemandDetailPayload }) {
  const { demand } = data;
  if (!demand.juridico_prazo_limite || !STATUS_COM_PRAZO_ATIVO.includes(demand.status)) return null;

  const vencido = isPrazoVencido(demand.juridico_prazo_limite);
  const restantes = diasRestantes(demand.juridico_prazo_limite);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        vencido ? "border-rose-300 bg-rose-50 text-rose-700" : "border-amber-300 bg-amber-50 text-amber-800"
      )}
      title={`Prazo do Jurídico para enviar a minuta ao cliente: ${formatDate(demand.juridico_prazo_limite)}`}
    >
      <Clock className="h-3.5 w-3.5" />
      {vencido ? "Prazo do Jurídico vencido" : `Prazo do Jurídico: ${restantes} dia(s) — até ${formatDate(demand.juridico_prazo_limite)}`}
    </div>
  );
}
