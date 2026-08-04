import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, requireRole, handleApiError, ApiError } from "@/lib/api/helpers";

const schema = z.object({
  nome: z.string().min(1, "Informe o nome do integrante."),
  funcao: z.string().min(1, "Informe a função do integrante."),
  periodoInicio: z.string().optional().or(z.literal("")),
  periodoFim: z.string().optional().or(z.literal("")),
  responsabilidades: z.string().optional(),
  valorPrevisto: z.number().nonnegative().nullable().optional(),
  observacoes: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["projetos"]);

    const { data: demand, error: demandError } = await supabase.from("demands").select("status").eq("id", params.id).single();
    if (demandError) throw demandError;
    if (demand.status !== "equipe_em_montagem") {
      throw new ApiError(400, "A equipe só pode ser montada enquanto a demanda estiver na etapa 'Equipe em montagem'.");
    }

    const body = schema.parse(await request.json());

    const { data: member, error } = await supabase
      .from("demand_team_members")
      .insert({
        demand_id: params.id,
        nome: body.nome,
        funcao: body.funcao,
        periodo_inicio: body.periodoInicio || null,
        periodo_fim: body.periodoFim || null,
        responsabilidades: body.responsabilidades || null,
        valor_previsto: body.valorPrevisto ?? null,
        observacoes: body.observacoes || null,
        created_by: profile.id,
      })
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
