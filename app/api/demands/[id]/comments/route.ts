import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, handleApiError } from "@/lib/api/helpers";

const schema = z.object({
  tipo: z.enum(["duvida", "resposta", "comentario"]),
  mensagem: z.string().min(1, "A mensagem não pode ficar em branco."),
  interno: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    const body = schema.parse(await request.json());

    const { data: comment, error } = await supabase
      .from("demand_comments")
      .insert({ demand_id: params.id, user_id: profile.id, tipo: body.tipo, mensagem: body.mensagem, interno: body.interno })
      .select("*, author:profiles!demand_comments_user_id_fkey(name)")
      .single();
    if (error) throw error;

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
