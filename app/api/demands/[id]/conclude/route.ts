import { NextRequest, NextResponse } from "next/server";
import { requireProfile, requireRole, handleApiError, ApiError } from "@/lib/api/helpers";

// Financeiro conclui a demanda quando todos os pagamentos previstos
// estiverem quitados (ou cancelados).
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["financeiro"]);

    const { data: demand, error: demandError } = await supabase.from("demands").select("status").eq("id", params.id).single();
    if (demandError) throw demandError;
    if (demand.status !== "em_processamento_financeiro") {
      throw new ApiError(400, "A demanda não está na etapa 'Em processamento financeiro'.");
    }

    const { data: pendentes } = await supabase
      .from("demand_payments")
      .select("id")
      .eq("demand_id", params.id)
      .in("status", ["pendente", "programado", "atrasado"]);

    if (pendentes && pendentes.length > 0) {
      throw new ApiError(400, "Existem pagamentos pendentes, programados ou atrasados. Quite ou cancele todos antes de concluir.");
    }

    const { data: updated, error } = await supabase.rpc("transition_demand", { p_demand_id: params.id, p_novo_status: "concluida" });
    if (error) throw error;

    return NextResponse.json({ demand: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
