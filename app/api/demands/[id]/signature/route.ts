import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, requireRole, handleApiError, ApiError } from "@/lib/api/helpers";

const schema = z.object({
  documentoId: z.string().uuid(),
  dataAssinatura: z.string().min(1, "Informe a data da assinatura."),
});

// Registra o contrato assinado anexado manualmente. Enquanto este passo não
// é concluído, a demanda não pode avançar para Projetos — a trava é dupla:
// aqui (nenhuma outra rota move para equipe_em_montagem) e na RLS
// (demand_team_members só aceita inserts quando status = equipe_em_montagem).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["juridico"]);

    const body = schema.parse(await request.json());

    const { data: demand, error: demandError } = await supabase.from("demands").select("status").eq("id", params.id).single();
    if (demandError) throw demandError;

    if (demand.status !== "aguardando_assinaturas") {
      throw new ApiError(400, "O contrato assinado só pode ser anexado quando a demanda estiver 'Aguardando assinaturas'.");
    }

    const { data: document, error: docError } = await supabase
      .from("demand_documents")
      .select("id, tipo")
      .eq("id", body.documentoId)
      .eq("demand_id", params.id)
      .single();
    if (docError) throw docError;
    if (document.tipo !== "contrato_assinado") {
      throw new ApiError(400, "O documento selecionado não é do tipo 'Contrato assinado'.");
    }

    const { error: sigError } = await supabase.from("demand_signatures").insert({
      demand_id: params.id,
      documento_id: document.id,
      data_assinatura: body.dataAssinatura,
      usuario_id: profile.id,
    });
    if (sigError) throw sigError;

    const { error: rpc1 } = await supabase.rpc("transition_demand", { p_demand_id: params.id, p_novo_status: "contrato_assinado" });
    if (rpc1) throw rpc1;

    const { data: updated, error: rpc2 } = await supabase.rpc("transition_demand", { p_demand_id: params.id, p_novo_status: "equipe_em_montagem" });
    if (rpc2) throw rpc2;

    return NextResponse.json({ demand: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
