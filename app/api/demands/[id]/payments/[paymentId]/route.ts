import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, requireRole, handleApiError } from "@/lib/api/helpers";

const schema = z.object({
  status: z.enum(["pendente", "programado", "pago", "atrasado", "cancelado"]).optional(),
  observacoes: z.string().optional(),
  comprovanteId: z.string().uuid().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string; paymentId: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["financeiro"]);

    const body = schema.parse(await request.json());
    const updatePayload: Record<string, unknown> = {};
    if (body.status) updatePayload.status = body.status;
    if (body.observacoes !== undefined) updatePayload.observacoes = body.observacoes;
    if (body.comprovanteId) updatePayload.comprovante_id = body.comprovanteId;

    const { data: payment, error } = await supabase
      .from("demand_payments")
      .update(updatePayload)
      .eq("id", params.paymentId)
      .eq("demand_id", params.id)
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ payment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
