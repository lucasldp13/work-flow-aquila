import { NextRequest, NextResponse } from "next/server";
import { requireProfile, requireRole, handleApiError, ApiError } from "@/lib/api/helpers";

// Projetos conclui a montagem da equipe e encaminha ao Financeiro.
// Exige ao menos um integrante cadastrado.
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["projetos"]);

    const { data: demand, error: demandError } = await supabase.from("demands").select("status").eq("id", params.id).single();
    if (demandError) throw demandError;
    if (demand.status !== "equipe_em_montagem") {
      throw new ApiError(400, "A demanda não está na etapa 'Equipe em montagem'.");
    }

    const { count } = await supabase.from("demand_team_members").select("id", { count: "exact", head: true }).eq("demand_id", params.id);
    if (!count) {
      throw new ApiError(400, "Cadastre ao menos um integrante da equipe antes de encaminhar ao Financeiro.");
    }

    const { error: rpc1 } = await supabase.rpc("transition_demand", { p_demand_id: params.id, p_novo_status: "equipe_definida" });
    if (rpc1) throw rpc1;

    const { data: updated, error: rpc2 } = await supabase.rpc("transition_demand", { p_demand_id: params.id, p_novo_status: "em_processamento_financeiro" });
    if (rpc2) throw rpc2;

    return NextResponse.json({ demand: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
