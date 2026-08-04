import "server-only";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getEmailTransport, getEmailFrom } from "./transport";
import { buildJuridicoNotificationHtml, buildJuridicoNotificationSubject } from "./templates";

export const MAX_EMAIL_ATTEMPTS = 3;
const INLINE_RETRY_DELAYS_MS = [1500, 4000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface NotifyJuridicoParams {
  demandId: string;
  /**
   * Chave de deduplicação: identifica de forma única a ação que disparou o
   * e-mail (ex.: `documento:<id-do-documento>`, `encaminhar:<demand-id>`).
   * Junto com demand_id, tem uma constraint UNIQUE no banco — nunca duas
   * notificações são enviadas para a mesma ação.
   */
  actionKey: string;
  cliente: string;
  demanda: string;
  usuarioComercial: string;
  tipoAtualizacao: string;
  prazoJuridico?: string | null;
  link: string;
  createdBy?: string | null;
}

export type NotifyResult =
  | { skipped: true; reason: "ja_enviado" | "sem_destinatarios" }
  | { skipped: false; enviado: true }
  | { skipped: false; enviado: false; erro: string };

// Envia (com deduplicação e novas tentativas) a notificação automática ao
// Jurídico sempre que o Comercial cadastra/atualiza/anexa/encaminha uma
// demanda. Roda inteiramente no backend, após a ação do Comercial ter sido
// concluída com sucesso no banco.
export async function notifyJuridico(params: NotifyJuridicoParams): Promise<NotifyResult> {
  const supabase = createAdminSupabaseClient();

  const { data: existing } = await supabase
    .from("email_notifications")
    .select("id, status, tentativas")
    .eq("demand_id", params.demandId)
    .eq("action_key", params.actionKey)
    .maybeSingle();

  if (existing?.status === "enviado") {
    return { skipped: true, reason: "ja_enviado" };
  }

  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("valor")
    .eq("chave", "juridico_destinatarios")
    .maybeSingle();

  const destinatarios: string[] = ((settingsRow?.valor as { emails?: string[] } | null)?.emails ?? []).filter(Boolean);

  const assunto = buildJuridicoNotificationSubject(params.cliente);
  const dataHora = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const html = buildJuridicoNotificationHtml({
    cliente: params.cliente,
    demanda: params.demanda,
    usuarioComercial: params.usuarioComercial,
    tipoAtualizacao: params.tipoAtualizacao,
    dataHora,
    prazoJuridico: params.prazoJuridico,
    link: params.link,
  });

  if (destinatarios.length === 0) {
    await upsertEmailLog(supabase, params, {
      destinatarios: [],
      assunto,
      html,
      status: "falhou",
      tentativas: (existing?.tentativas ?? 0) + 1,
      ultimoErro: "Nenhum destinatário do Jurídico configurado no painel administrativo.",
    });
    return { skipped: true, reason: "sem_destinatarios" };
  }

  const logId = await upsertEmailLog(supabase, params, {
    destinatarios,
    assunto,
    html,
    status: "pendente",
    tentativas: existing?.tentativas ?? 0,
  });

  let ultimoErro = "";
  for (let tentativa = 1; tentativa <= MAX_EMAIL_ATTEMPTS; tentativa++) {
    try {
      const transport = getEmailTransport();
      await transport.sendMail({
        from: getEmailFrom(),
        to: destinatarios,
        subject: assunto,
        html,
      });

      await supabase
        .from("email_notifications")
        .update({ status: "enviado", tentativas: tentativa, enviado_em: new Date().toISOString(), ultimo_erro: null })
        .eq("id", logId);

      return { skipped: false, enviado: true };
    } catch (error) {
      ultimoErro = error instanceof Error ? error.message : "Erro desconhecido ao enviar e-mail.";
      await supabase.from("email_notifications").update({ status: "falhou", tentativas: tentativa, ultimo_erro: ultimoErro }).eq("id", logId);

      if (tentativa < MAX_EMAIL_ATTEMPTS) {
        await sleep(INLINE_RETRY_DELAYS_MS[tentativa - 1] ?? 4000);
      }
    }
  }

  await notifyComercialDeFalha(supabase, params, ultimoErro);

  return { skipped: false, enviado: false, erro: ultimoErro };
}

async function upsertEmailLog(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  params: NotifyJuridicoParams,
  extra: { destinatarios: string[]; assunto: string; html: string; status: "pendente" | "falhou"; tentativas: number; ultimoErro?: string }
) {
  const { data, error } = await supabase
    .from("email_notifications")
    .upsert(
      {
        demand_id: params.demandId,
        action_key: params.actionKey,
        destinatarios: extra.destinatarios,
        assunto: extra.assunto,
        corpo_html: extra.html,
        status: extra.status,
        tentativas: extra.tentativas,
        ultimo_erro: extra.ultimoErro ?? null,
        created_by: params.createdBy ?? null,
      },
      { onConflict: "demand_id,action_key" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

async function notifyComercialDeFalha(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  params: NotifyJuridicoParams,
  erro: string
) {
  if (!params.createdBy) return;
  await supabase.from("notifications").insert({
    user_id: params.createdBy,
    demand_id: params.demandId,
    mensagem: `Falha ao enviar e-mail de notificação ao Jurídico sobre "${params.demanda}": ${erro}`,
    link: params.link,
  });
}

// Reprocessa notificações que falharam e ainda não atingiram o número
// máximo de tentativas. Pode ser chamado manualmente pelo admin (rota
// /api/email/retry) ou por um cron externo.
export async function retryFailedEmails(limit = 20) {
  const supabase = createAdminSupabaseClient();
  const { data: pendentes } = await supabase
    .from("email_notifications")
    .select("id, demand_id, action_key, destinatarios, assunto, corpo_html, tentativas")
    .eq("status", "falhou")
    .lt("tentativas", MAX_EMAIL_ATTEMPTS)
    .limit(limit);

  const resultados: { id: string; enviado: boolean }[] = [];

  for (const row of pendentes ?? []) {
    try {
      const transport = getEmailTransport();
      await transport.sendMail({
        from: getEmailFrom(),
        to: row.destinatarios,
        subject: row.assunto,
        html: row.corpo_html ?? "",
      });
      await supabase
        .from("email_notifications")
        .update({ status: "enviado", tentativas: row.tentativas + 1, enviado_em: new Date().toISOString(), ultimo_erro: null })
        .eq("id", row.id);
      resultados.push({ id: row.id, enviado: true });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Erro desconhecido ao enviar e-mail.";
      await supabase.from("email_notifications").update({ status: "falhou", tentativas: row.tentativas + 1, ultimo_erro: mensagem }).eq("id", row.id);
      resultados.push({ id: row.id, enviado: false });
    }
  }

  return resultados;
}
