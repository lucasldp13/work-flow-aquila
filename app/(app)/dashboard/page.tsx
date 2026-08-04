import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/demanda/StatusBadge";
import { ROLE_LABELS } from "@/lib/workflow/permissions";
import { STATUS_OWNER } from "@/lib/workflow/statuses";
import { isPrazoVencido } from "@/lib/workflow/validations";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ClipboardList, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { DemandStatus } from "@/types/database";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  const { data: demands } = await supabase
    .from("demands")
    .select("id, nome_demanda, status, valor, updated_at, juridico_prazo_limite, clients(name)")
    .order("updated_at", { ascending: false });

  const all = demands ?? [];
  const total = all.length;
  const concluidas = all.filter((d) => d.status === "concluida").length;
  const pendentes = total - concluidas;
  const atrasadas = all.filter((d) => isPrazoVencido(d.juridico_prazo_limite) && d.status !== "concluida" && STATUS_OWNER[d.status as DemandStatus] === "juridico").length;
  const minhas = all.filter((d) => STATUS_OWNER[d.status as DemandStatus] === profile!.role);

  const kpis = [
    { label: "Total de demandas", value: total, icon: ClipboardList, color: "text-brand-700 bg-brand-50" },
    { label: "Pendentes", value: pendentes, icon: Clock, color: "text-amber-700 bg-amber-50" },
    { label: "Prazo jurídico atrasado", value: atrasadas, icon: AlertTriangle, color: "text-rose-700 bg-rose-50" },
    { label: "Concluídas", value: concluidas, icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Olá, {profile!.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500">Painel do setor {ROLE_LABELS[profile!.role]} — visão geral do workflow.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{kpi.value}</p>
                <p className="text-xs text-slate-500">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Demandas recentes</CardTitle>
            <Link href="/demandas" className="text-xs font-medium text-brand-700 hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {all.slice(0, 8).map((d) => (
                <Link key={d.id} href={`/demandas/${d.id}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{d.nome_demanda}</p>
                    <p className="truncate text-xs text-slate-500">
                      {(d as unknown as { clients: { name: string } | null }).clients?.name} · {formatCurrency(d.valor)}
                    </p>
                  </div>
                  <StatusBadge status={d.status as DemandStatus} />
                </Link>
              ))}
              {all.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhuma demanda cadastrada ainda.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aguardando {ROLE_LABELS[profile!.role]}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {minhas.slice(0, 8).map((d) => (
                <Link key={d.id} href={`/demandas/${d.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                  <p className="truncate text-sm text-slate-800">{d.nome_demanda}</p>
                  {d.juridico_prazo_limite && (
                    <span className={`shrink-0 text-xs ${isPrazoVencido(d.juridico_prazo_limite) ? "font-semibold text-rose-600" : "text-slate-400"}`}>
                      {formatDate(d.juridico_prazo_limite)}
                    </span>
                  )}
                </Link>
              ))}
              {minhas.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhuma demanda pendente para seu setor.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
