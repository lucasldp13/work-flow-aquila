import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, requireRole, handleApiError, appUrl } from "@/lib/api/helpers";
import { notifyJuridico } from "@/lib/email/notify";
import { canEditDemandAtStatus } from "@/lib/workflow/permissions";
import { canViewPayments } from "@/lib/workflow/permissions";
import { deleteDemandFiles } from "@/lib/storage/cleanup";
import { calcularValorBruto } from "@/lib/workflow/pricing";

const contatoSchema = z.object({
  nome: z.string().min(1),
  cargo: z.string().optional(),
  email: z.string().email(),
  telefone: z.string().optional(),
});

const updateDemandSchema = z.object({
  nomeDemanda: z.string().min(1).optional(),
  valor: z.number().nonnegative().nullable().optional(),
  markup: z.number().nullable().optional(),
  solucoes: z.array(z.string()).optional(),
  prazo: z.string().nullable().optional(),
  contatos: z.array(contatoSchema).optional(),
  signatarioEmail: z.string().email().nullable().optional().or(z.literal("")),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();

    const { data: demand, error } = await supabase
      .from("demands")
      .select(
        `*, clients(id, name, cnpj),
         comercial:profiles!demands_comercial_responsavel_id_fkey(id, name, email)`
      )
      .eq("id", params.id)
      .single();
    if (error) throw error;

    const [{ data: documents }, { data: comments }, { data: history }, { data: team }, { data: financeResumo }, { data: signature }, { data: minutaEnvio }] =
      await Promise.all([
        supabase.from("demand_documents").select("*, uploader:profiles!demand_documents_uploaded_by_fkey(name)").eq("demand_id", params.id).order("created_at", { ascending: false }),
        supabase.from("demand_comments").select("*, author:profiles!demand_comments_user_id_fkey(name)").eq("demand_id", params.id).order("created_at", { ascending: true }),
        supabase.from("demand_status_history").select("*, author:profiles!demand_status_history_usuario_id_fkey(name)").eq("demand_id", params.id).order("created_at", { ascending: true }),
        supabase.from("demand_team_members").select("*").eq("demand_id", params.id).order("created_at", { ascending: true }),
        supabase.from("demand_financeiro_resumo").select("*").eq("demand_id", params.id).maybeSingle(),
        supabase.from("demand_signatures").select("*, document:demand_documents(nome_arquivo)").eq("demand_id", params.id).maybeSingle(),
        supabase.from("demand_minuta_envios").select("*").eq("demand_id", params.id).order("enviado_em", { ascending: false }).limit(1).maybeSingle(),
      ]);

    let payments: unknown[] = [];
    if (canViewPayments(profile.role)) {
      const { data } = await supabase.from("demand_payments").select("*").eq("demand_id", params.id).order("vencimento", { ascending: true });
      payments = data ?? [];
    }

    return NextResponse.json({
      demand,
      documents,
      comments,
      history,
      team,
      payments,
      financeResumo,
      signature,
      minutaEnvio,
      canManagePayments: canViewPayments(profile.role),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["comercial"]);

    const { data: current, error: currentError } = await supabase
      .from("demands")
      .select("status, nome_demanda, valor, markup, clients(name)")
      .eq("id", params.id)
      .single();
    if (currentError) throw currentError;

    if (!canEditDemandAtStatus(profile.role, current.status)) {
      return NextResponse.json({ error: "Esta demanda não está mais na etapa do Comercial e não pode ser editada por você." }, { status: 403 });
    }

    const body = updateDemandSchema.parse(await request.json());
    const updatePayload: Record<string, unknown> = {};
    if (body.nomeDemanda !== undefined) updatePayload.nome_demanda = body.nomeDemanda;
    if (body.valor !== undefined) updatePayload.valor = body.valor;
    if (body.markup !== undefined) updatePayload.markup = body.markup;
    if (body.solucoes !== undefined) updatePayload.solucoes = body.solucoes;
    if (body.prazo !== undefined) updatePayload.prazo = body.prazo || null;
    if (body.contatos !== undefined) updatePayload.contatos = body.contatos;
    if (body.signatarioEmail !== undefined) updatePayload.signatario_email = body.signatarioEmail || null;

    if (body.valor !== undefined || body.markup !== undefined) {
      const valorEfetivo = body.valor !== undefined ? body.valor : current.valor;
      const markupEfetivo = body.markup !== undefined ? body.markup : current.markup;
      const { valorBruto } = calcularValorBruto(valorEfetivo, markupEfetivo);
      updatePayload.valor_bruto = valorBruto;
    }

    const { data: demand, error } = await supabase.from("demands").update(updatePayload).eq("id", params.id).select("*, clients(name)").single();
    if (error) throw error;

    const minuto = new Date().toISOString().slice(0, 16);
    await notifyJuridico({
      demandId: params.id,
      actionKey: `atualizacao:${params.id}:${minuto}`,
      cliente: (demand as unknown as { clients: { name: string } | null }).clients?.name ?? "",
      demanda: demand.nome_demanda,
      usuarioComercial: profile.name,
      tipoAtualizacao: "Informações comerciais atualizadas",
      link: appUrl(`/demandas/${params.id}`),
      createdBy: profile.id,
    });

    return NextResponse.json({ demand });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}

// Exclusão definitiva de uma demanda — normalmente restrita ao
// Administrador (acesso total). Exceção: o próprio Comercial que acabou
// de criar a demanda pode desfazê-la, mas só enquanto ela ainda está
// "recebida_comercial" (ninguém mais mexeu) — usado para desfazer o
// cadastro quando o anexo obrigatório da proposta falha. Remove primeiro
// os documentos no Storage e, em seguida, a linha da demanda; as tabelas
// filhas (comentários, histórico, equipe, pagamentos etc.) são removidas
// em cascata pelo banco.
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();

    const { data: demand, error: findError } = await supabase
      .from("demands")
      .select("id, nome_demanda, status, created_by")
      .eq("id", params.id)
      .maybeSingle();
    if (findError) throw findError;
    if (!demand) {
      return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });
    }

    const podeExcluirComoCriador = profile.role === "comercial" && demand.created_by === profile.id && demand.status === "recebida_comercial";
    if (profile.role !== "admin" && !podeExcluirComoCriador) {
      return NextResponse.json({ error: "Você não tem permissão para excluir esta demanda." }, { status: 403 });
    }

    await deleteDemandFiles(params.id);

    const { error: deleteError } = await supabase.from("demands").delete().eq("id", params.id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
