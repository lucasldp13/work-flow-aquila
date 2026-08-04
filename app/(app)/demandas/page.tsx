import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/demanda/StatusBadge";
import { DemandFilters } from "@/components/demanda/DemandFilters";
import { DemandRowDelete } from "@/components/demanda/DemandRowDelete";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { isPrazoVencido } from "@/lib/workflow/validations";
import type { DemandStatus } from "@/types/database";

export default async function DemandasListPage({ searchParams }: { searchParams: { q?: string; status?: string } }) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = profile?.role === "admin";

  let query = supabase
    .from("demands")
    .select("id, nome_demanda, consultor_nome, status, valor, updated_at, juridico_prazo_limite, clients(name)")
    .order("updated_at", { ascending: false });

  if (searchParams.status) query = query.eq("status", searchParams.status as DemandStatus);
  if (searchParams.q) query = query.or(`nome_demanda.ilike.%${searchParams.q}%,consultor_nome.ilike.%${searchParams.q}%`);

  const { data: demands } = await query;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Demandas</h1>
          <p className="text-sm text-slate-500">Todas as demandas do workflow, com busca e filtro por status.</p>
        </div>
      </div>

      <DemandFilters />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Demanda</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Prazo jurídico</th>
                <th className="px-5 py-3">Atualizado em</th>
                {isAdmin && <th className="px-5 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(demands ?? []).map((d) => (
                <tr key={d.id} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">
                    <Link href={`/demandas/${d.id}`} className="hover:underline">
                      {d.nome_demanda}
                    </Link>
                    <p className="text-xs font-normal text-slate-400">Consultor: {d.consultor_nome}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{(d as unknown as { clients: { name: string } | null }).clients?.name}</td>
                  <td className="px-5 py-3 text-slate-600">{formatCurrency(d.valor)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={d.status as DemandStatus} />
                  </td>
                  <td className="px-5 py-3">
                    {d.juridico_prazo_limite ? (
                      <span className={isPrazoVencido(d.juridico_prazo_limite) && d.status !== "concluida" ? "font-semibold text-rose-600" : "text-slate-500"}>
                        {formatDate(d.juridico_prazo_limite)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(d.updated_at)}</td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <DemandRowDelete demandId={d.id} demandName={d.nome_demanda} />
                    </td>
                  )}
                </tr>
              ))}
              {(demands ?? []).length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-5 py-10 text-center text-slate-400">
                    Nenhuma demanda encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
