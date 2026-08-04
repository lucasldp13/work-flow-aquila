import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireProfile, requireRole, handleApiError, appUrl, ApiError } from "@/lib/api/helpers";
import { checkMinutaEnvio } from "@/lib/workflow/validations";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { notifySignatario } from "@/lib/email/notify";

const schema = z.object({
  confirmarEmail: z.string(),
});

// Validade do link de download da minuta enviado por e-mail ao cliente.
const MINUTA_LINK_VALID_SECONDS = 7 * 24 * 60 * 60; // 7 dias

// Implementa a trava obrigatória do botão "Registrar envio da minuta":
// revalida no backend as mesmas quatro condições exigidas na interface
// (minuta anexada, e-mail preenchido, e-mail válido, confirmação idêntica)
// antes de gravar o envio e avançar o status para "Aguardando assinaturas".
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["juridico"]);

    const body = schema.parse(await request.json());

    const { data: demand, error: demandError } = await supabase
      .from("demands")
      .select("status, signatario_email, nome_demanda, clients(name)")
      .eq("id", params.id)
      .single();
    if (demandError) throw demandError;

    if (demand.status !== "minuta_em_elaboracao") {
      throw new ApiError(400, "A minuta só pode ser enviada quando a demanda estiver na etapa 'Minuta em elaboração'.");
    }

    const { data: minutaDoc } = await supabase
      .from("demand_documents")
      .select("id, nome_arquivo, caminho_arquivo")
      .eq("demand_id", params.id)
      .eq("tipo", "minuta")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const check = checkMinutaEnvio({
      minutaAnexada: Boolean(minutaDoc),
      signatarioEmail: demand.signatario_email ?? "",
      confirmarEmail: body.confirmarEmail,
    });

    if (!check.liberado) {
      return NextResponse.json({ error: "Não é possível registrar o envio da minuta.", pendencias: check.pendencias }, { status: 400 });
    }

    const { error: envioError } = await supabase.from("demand_minuta_envios").insert({
      demand_id: params.id,
      usuario_id: profile.id,
      destinatario_email: demand.signatario_email!,
      documento_id: minutaDoc!.id,
    });
    if (envioError) throw envioError;

    const { error: rpc1 } = await supabase.rpc("transition_demand", { p_demand_id: params.id, p_novo_status: "minuta_enviada" });
    if (rpc1) throw rpc1;

    const { data: updated, error: rpc2 } = await supabase.rpc("transition_demand", { p_demand_id: params.id, p_novo_status: "aguardando_assinaturas" });
    if (rpc2) throw rpc2;

    const admin = createAdminSupabaseClient();
    const { data: signed, error: signError } = await admin.storage
      .from("documentos")
      .createSignedUrl(minutaDoc!.caminho_arquivo, MINUTA_LINK_VALID_SECONDS, { download: minutaDoc!.nome_arquivo });
    if (signError) throw signError;

    const validoAte = format(new Date(Date.now() + MINUTA_LINK_VALID_SECONDS * 1000), "dd/MM/yyyy", { locale: ptBR });

    await notifySignatario({
      demandId: params.id,
      actionKey: `minuta-cliente:${params.id}`,
      cliente: (demand as unknown as { clients: { name: string } | null }).clients?.name ?? "",
      demanda: demand.nome_demanda,
      signatarioEmail: demand.signatario_email!,
      linkMinuta: signed.signedUrl,
      validoAte,
      createdBy: profile.id,
      linkSistema: appUrl(`/demandas/${params.id}`),
    });

    return NextResponse.json({ demand: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
