import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, requireRole, handleApiError } from "@/lib/api/helpers";

const schema = z.object({
  juridicoDestinatarios: z.array(z.string().email()).optional(),
  prazoDias: z.number().int().positive().optional(),
  prazoTipo: z.enum(["uteis", "corridos"]).optional(),
});

export async function GET() {
  try {
    const { supabase } = await requireProfile();
    const { data, error } = await supabase.from("app_settings").select("*");
    if (error) throw error;

    const settingsMap = Object.fromEntries((data ?? []).map((row) => [row.chave, row.valor]));
    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["admin"]);

    const body = schema.parse(await request.json());

    if (body.juridicoDestinatarios) {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ chave: "juridico_destinatarios", valor: { emails: body.juridicoDestinatarios }, updated_by: profile.id }, { onConflict: "chave" });
      if (error) throw error;
    }

    if (body.prazoDias || body.prazoTipo) {
      const { data: current } = await supabase.from("app_settings").select("valor").eq("chave", "prazo_juridico").maybeSingle();
      const currentValor = (current?.valor as { dias?: number; tipo?: string } | null) ?? {};
      const { error } = await supabase.from("app_settings").upsert(
        {
          chave: "prazo_juridico",
          valor: { dias: body.prazoDias ?? currentValor.dias ?? 4, tipo: body.prazoTipo ?? currentValor.tipo ?? "uteis" },
          updated_by: profile.id,
        },
        { onConflict: "chave" }
      );
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
