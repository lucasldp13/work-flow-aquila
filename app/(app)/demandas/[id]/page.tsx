import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DemandDetailClient } from "@/components/demanda/DemandDetailClient";
import { canViewPayments } from "@/lib/workflow/permissions";
import type { DemandDetailPayload } from "@/components/demanda/types";

export default async function DemandaDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("id, name, role").eq("id", user!.id).single();

  const { data: demand, error } = await supabase
    .from("demands")
    .select("*, clients(id, name, cnpj), comercial:profiles!demands_comercial_responsavel_id_fkey(id, name, email)")
    .eq("id", params.id)
    .single();

  if (error || !demand) notFound();

  const [{ data: documents }, { data: comments }, { data: history }, { data: team }, { data: financeResumo }, { data: signature }, { data: minutaEnvio }] =
    await Promise.all([
      supabase.from("demand_documents").select("*, uploader:profiles!demand_documents_uploaded_by_fkey(name)").eq("demand_id", params.id).order("created_at", { ascending: false }),
      supabase.from("demand_comments").select("*, author:profiles!demand_comments_user_id_fkey(name)").eq("demand_id", params.id).order("created_at", { ascending: true }),
      supabase.from("demand_status_history").select("*, author:profiles!demand_status_history_usuario_id_fkey(name)").eq("demand_id", params.id).order("created_at", { ascending: true }),
      supabase.from("demand_team_members").select("*").eq("demand_id", params.id).order("created_at", { ascending: true }),
      supabase.from("demand_financeiro_resumo").select("*").eq("demand_id", params.id).maybeSingle(),
      supabase.from("demand_signatures").select("*, document:demand_documents(nome_arquivo)").eq("demand_id", params.id).maybeSingle(),
      supabase.from("demand_minuta_envios").select("*").eq("demand_id", params.id).order("enviado_em", { ascending: false }).limit(1).maybeSingle(),
    ]);

  let payments: NonNullable<DemandDetailPayload["payments"]> = [];
  if (canViewPayments(profile!.role)) {
    const { data } = await supabase.from("demand_payments").select("*").eq("demand_id", params.id).order("vencimento", { ascending: true });
    payments = data ?? [];
  }

  const payload: DemandDetailPayload = {
    demand: demand as unknown as DemandDetailPayload["demand"],
    documents: (documents ?? []) as unknown as DemandDetailPayload["documents"],
    comments: (comments ?? []) as unknown as DemandDetailPayload["comments"],
    history: (history ?? []) as unknown as DemandDetailPayload["history"],
    team: team ?? [],
    payments,
    financeResumo: financeResumo ?? null,
    signature: signature as unknown as DemandDetailPayload["signature"],
    minutaEnvio: minutaEnvio ?? null,
    canManagePayments: canViewPayments(profile!.role),
  };

  return <DemandDetailClient initialData={payload} session={{ id: profile!.id, name: profile!.name, role: profile!.role }} />;
}
