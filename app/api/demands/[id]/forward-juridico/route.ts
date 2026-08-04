import { NextRequest, NextResponse } from "next/server";
import { requireProfile, requireRole, handleApiError, appUrl, ApiError } from "@/lib/api/helpers";
import { notifyJuridico } from "@/lib/email/notify";
import { calcularPrazoLimite } from "@/lib/workflow/validations";
import { isTransitionAllowed } from "@/lib/workflow/statuses";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Comercial encaminha a demanda ao Jurídico: valida a transição de status
// (impede pular etapas), calcula o prazo jurídico com base na configuração
// do administrador (dias úteis/corridos) e dispara a notificação
// automática por e-mail.
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["comercial"]);

    const { data: demand, error } = await supabase.from("demands").select("*, clients(name)").eq("id", params.id).single();
    if (error) throw error;

    if (!isTransitionAllowed(demand.status, "encaminhada_juridico")) {
      throw new ApiError(400, `Não é possível encaminhar ao Jurídico a partir do status atual (${demand.status}).`);
    }

    const { data: prazoSetting } = await supabase.from("app_settings").select("valor").eq("chave", "prazo_juridico").maybeSingle();
    const prazoConfig = (prazoSetting?.valor as { dias?: number; tipo?: "uteis" | "corridos" } | null) ?? { dias: 4, tipo: "uteis" };
    const dias = prazoConfig.dias ?? 4;
    const tipo = prazoConfig.tipo ?? "uteis";
    const inicio = new Date();
    const limite = calcularPrazoLimite(inicio, dias, tipo);

    const { error: rpcError } = await supabase.rpc("transition_demand", {
      p_demand_id: params.id,
      p_novo_status: "encaminhada_juridico",
    });
    if (rpcError) throw rpcError;

    const { data: updated, error: updateError } = await supabase
      .from("demands")
      .update({
        juridico_prazo_inicio: inicio.toISOString(),
        juridico_prazo_dias: dias,
        juridico_prazo_tipo: tipo,
        juridico_prazo_limite: limite.toISOString().slice(0, 10),
      })
      .eq("id", params.id)
      .select("*, clients(name)")
      .single();
    if (updateError) throw updateError;

    await notifyJuridico({
      demandId: params.id,
      actionKey: `encaminhar:${params.id}:${inicio.toISOString().slice(0, 16)}`,
      cliente: (updated as unknown as { clients: { name: string } | null }).clients?.name ?? "",
      demanda: updated.nome_demanda,
      usuarioComercial: profile.name,
      tipoAtualizacao: "Demanda encaminhada ao Jurídico para validação",
      prazoJuridico: `${format(limite, "dd/MM/yyyy", { locale: ptBR })} (${dias} dias ${tipo === "uteis" ? "úteis" : "corridos"})`,
      link: appUrl(`/demandas/${params.id}`),
      createdBy: profile.id,
    });

    return NextResponse.json({ demand: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
