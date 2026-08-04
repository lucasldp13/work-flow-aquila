import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, requireRole, handleApiError, ApiError } from "@/lib/api/helpers";

const schema = z.object({
  beneficiario: z.string().min(1, "Informe o beneficiário."),
  valor: z.number().positive("Informe um valor válido."),
  vencimento: z.string().min(1, "Informe o vencimento."),
  status: z.enum(["pendente", "programado", "pago", "atrasado", "cancelado"]).default("pendente"),
  observacoes: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["financeiro"]);

    const { data: demand, error: demandError } = await supabase.from("demands").select("status").eq("id", params.id).single();
    if (demandError) throw demandError;
    if (demand.status !== "em_processamento_financeiro" && demand.status !== "concluida") {
      throw new ApiError(400, "Pagamentos só podem ser cadastrados após a equipe ser definida e a demanda chegar ao Financeiro.");
    }

    const body = schema.parse(await request.json());

    const { data: payment, error } = await supabase
      .from("demand_payments")
      .insert({
        demand_id: params.id,
        beneficiario: body.beneficiario,
        valor: body.valor,
        vencimento: body.vencimento,
        status: body.status,
        observacoes: body.observacoes || null,
        created_by: profile.id,
      })
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
