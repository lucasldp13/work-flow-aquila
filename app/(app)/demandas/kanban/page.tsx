import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { KANBAN_COLUMNS, STATUS_LABELS } from "@/lib/workflow/statuses";
import { formatCurrency } from "@/lib/utils/format";
import { isPrazoVencido } from "@/lib/workflow/validations";
import type { DemandStatus } from "@/types/database";

export default async function KanbanPage() {
  const supabase = createServerSupabaseClient();
  const { data: demands } = await supabase
    .from("demands")
    .select("id, nome_demanda, status, valor, juridico_prazo_limite, clients(name)")
    .order("updated_at", { ascending: false });

  const all = demands ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Kanban de demandas</h1>
        <p className="text-sm text-slate-500">Visão do andamento geral por etapa do workflow.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => {
          const items = all.filter((d) => column.status.includes(d.status as DemandStatus));
          return (
            <div key={column.titulo} className="w-72 shrink-0 rounded-xl bg-slate-100/70 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-slate-700">{column.titulo}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((d) => (
                  <Link
                    key={d.id}
                    href={`/demandas/${d.id}`}
                    className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">{d.nome_demanda}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{(d as unknown as { clients: { name: string } | null }).clients?.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">{formatCurrency(d.valor)}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{STATUS_LABELS[d.status as DemandStatus]}</span>
                    </div>
                    {d.juridico_prazo_limite && isPrazoVencido(d.juridico_prazo_limite) && (
                      <p className="mt-1.5 text-[11px] font-semibold text-rose-600">Prazo jurídico vencido</p>
                    )}
                  </Link>
                ))}
                {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-slate-400">Vazio</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
