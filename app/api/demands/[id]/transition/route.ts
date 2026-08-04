import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, handleApiError, ApiError } from "@/lib/api/helpers";
import { isTransitionAllowed } from "@/lib/workflow/statuses";
import { canEditDemandAtStatus } from "@/lib/workflow/permissions";
import type { DemandStatus } from "@/types/database";

// Transições "simples" do workflow, sem efeitos colaterais adicionais
// (upload de documento, cálculo de prazo etc.): iniciar análise comercial,
// marcar aguardando retorno do consultor, retomar após devolução, iniciar
// validação jurídica e aprovar (iniciar elaboração da minuta). A devolução
// ao Comercial exige justificativa obrigatória.
const schema = z.object({
  novoStatus: z.custom<DemandStatus>(),
  justificativa: z.string().optional(),
});

const SIMPLE_TRANSITIONS: DemandStatus[] = [
  "em_analise_comercial",
  "aguardando_retorno_consultor",
  "devolvida_comercial",
  "em_validacao_juridica",
  "minuta_em_elaboracao",
];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    const body = schema.parse(await request.json());

    if (!SIMPLE_TRANSITIONS.includes(body.novoStatus)) {
      throw new ApiError(400, "Use a rota específica para esta transição de status.");
    }

    if (body.novoStatus === "devolvida_comercial" && !body.justificativa?.trim()) {
      throw new ApiError(400, "É obrigatório informar o motivo da devolução ao Comercial.");
    }

    const { data: demand, error } = await supabase.from("demands").select("status").eq("id", params.id).single();
    if (error) throw error;

    if (!canEditDemandAtStatus(profile.role, demand.status)) {
      throw new ApiError(403, "Sua área não pode alterar esta demanda na etapa atual.");
    }

    if (!isTransitionAllowed(demand.status, body.novoStatus)) {
      throw new ApiError(400, `Não é possível mover a demanda de "${demand.status}" para "${body.novoStatus}" (etapa não pode ser pulada).`);
    }

    const { data: updated, error: rpcError } = await supabase.rpc("transition_demand", {
      p_demand_id: params.id,
      p_novo_status: body.novoStatus,
      p_justificativa: body.justificativa ?? null,
    });
    if (rpcError) throw rpcError;

    if (body.novoStatus === "devolvida_comercial") {
      await supabase.from("demand_comments").insert({
        demand_id: params.id,
        user_id: profile.id,
        tipo: "devolucao",
        mensagem: body.justificativa!.trim(),
      });
    }

    return NextResponse.json({ demand: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
