import "server-only";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getEmailTransport, getEmailFrom } from "./transport";
import {
  buildJuridicoNotificationHtml,
  buildJuridicoNotificationSubject,
  buildMinutaConfirmacaoInternaHtml,
  buildMinutaConfirmacaoInternaSubject,
} from "./templates";

export const MAX_EMAIL_ATTEMPTS = 3;
const INLINE_RETRY_DELAYS_MS = [1500, 4000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type NotifyResult =
  | { skipped: true; reason: "ja_enviado" | "sem_destinatarios" }
  | { skipped: false; enviado: true }
  | { skipped: false; enviado: false; erro: string };

interface TrackedEmailParams {
  demandId: string;
  /**
   * Chave de deduplicação: identifica de forma única a ação que disparou o
   * e-mail (ex.: `documento:<id-do-documento>`, `encaminhar:<demand-id>`).
   * Junto com demand_id, tem uma constraint UNIQUE no banco — nunca duas
   * notificações são enviadas para a mesma ação.
   */
  actionKey: string;
  destinatarios: string[];
  assunto: string;
  html: string;
  createdBy?: string | null;
  /** Mensagem registrada como notificação interna caso todas as tentativas falhem. */
  mensagemFalhaInterna: (erro: string) => string;
  link: string;
  semDestinatariosErro?: string;
}

// Núcleo compartilhado de envio rastreado: deduplicação por
// (demand_id, action_key), registro em email_notifications e até
// MAX_EMAIL_ATTEMPTS novas tentativas com pequeno backoff antes de avisar
// internamente quem precisa saber que o envio falhou.
async function sendTrackedEmail(params: TrackedEmailParams): Promise<NotifyResult> {
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

  if (params.destinatarios.length === 0) {
    await upsertEmailLog(supabase, params, {
      status: "falhou",
      tentativas: (existing?.tentativas ?? 0) + 1,
      ultimoErro: params.semDestinatariosErro ?? "Nenhum destinatário configurado.",
    });
    return { skipped: true, reason: "sem_destinatarios" };
  }

  const logId = await upsertEmailLog(supabase, params, {
    status: "pendente",
    tentativas: existing?.tentativas ?? 0,
  });

  let ultimoErro = "";
  for (let tentativa = 1; tentativa <= MAX_EMAIL_ATTEMPTS; tentativa++) {
    try {
      const transport = getEmailTransport();
      await transport.sendMail({
        from: getEmailFrom(),
        to: params.destinatarios,
        subject: params.assunto,
        html: params.html,
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

  if (params.createdBy) {
    await supabase.from("notifications").insert({
      user_id: params.createdBy,
      demand_id: params.demandId,
      mensagem: params.mensagemFalhaInterna(ultimoErro),
      link: params.link,
    });
  }

  return { skipped: false, enviado: false, erro: ultimoErro };
}

async function upsertEmailLog(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  params: TrackedEmailParams,
  extra: { status: "pendente" | "falhou"; tentativas: number; ultimoErro?: string }
) {
  const { data, error } = await supabase
    .from("email_notifications")
    .upsert(
      {
        demand_id: params.demandId,
        action_key: params.actionKey,
        destinatarios: params.destinatarios,
        assunto: params.assunto,
        corpo_html: params.html,
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

export interface NotifyJuridicoParams {
  demandId: string;
  actionKey: string;
  cliente: string;
  demanda: string;
  usuarioComercial: string;
  tipoAtualizacao: string;
  prazoJuridico?: string | null;
  link: string;
  createdBy?: string | null;
}

// Envia (com deduplicação e novas tentativas) a notificação automática ao
// Jurídico sempre que o Comercial cadastra/atualiza/anexa/encaminha uma
// demanda. Roda inteiramente no backend, após a ação do Comercial ter sido
// concluída com sucesso no banco.
export async function notifyJuridico(params: NotifyJuridicoParams): Promise<NotifyResult> {
  const supabase = createAdminSupabaseClient();
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

  return sendTrackedEmail({
    demandId: params.demandId,
    actionKey: params.actionKey,
    destinatarios,
    assunto,
    html,
    createdBy: params.createdBy,
    link: params.link,
    semDestinatariosErro: "Nenhum destinatário do Jurídico configurado no painel administrativo.",
    mensagemFalhaInterna: (erro) => `Falha ao enviar e-mail de notificação ao Jurídico sobre "${params.demanda}": ${erro}`,
  });
}

export interface NotifyMinutaConfirmacaoParams {
  demandId: string;
  actionKey: string;
  cliente: string;
  demanda: string;
  destinatarioCliente: string;
  usuarioJuridico: string;
  link: string;
  createdBy?: string | null;
}

// Confirmação interna (equipe Aquila) de que o Jurídico registrou o envio
// da minuta ao cliente — o envio ao cliente em si continua manual, fora
// do sistema. Destinatários e o texto da mensagem são configuráveis pelo
// administrador (chave "minuta_confirmacao_interna" em app_settings).
export async function notifyMinutaConfirmacaoInterna(params: NotifyMinutaConfirmacaoParams): Promise<NotifyResult> {
  const supabase = createAdminSupabaseClient();
  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("valor")
    .eq("chave", "minuta_confirmacao_interna")
    .maybeSingle();

  const configuracao = settingsRow?.valor as { emails?: string[]; texto?: string } | null;
  const destinatarios = (configuracao?.emails ?? []).filter(Boolean);
  const texto = configuracao?.texto?.trim() || "A minuta contratual foi registrada como enviada ao cliente.";

  const assunto = buildMinutaConfirmacaoInternaSubject(params.cliente);
  const dataHora = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const html = buildMinutaConfirmacaoInternaHtml({
    cliente: params.cliente,
    demanda: params.demanda,
    destinatarioCliente: params.destinatarioCliente,
    usuarioJuridico: params.usuarioJuridico,
    dataHora,
    texto,
    link: params.link,
  });

  return sendTrackedEmail({
    demandId: params.demandId,
    actionKey: params.actionKey,
    destinatarios,
    assunto,
    html,
    createdBy: params.createdBy,
    link: params.link,
    semDestinatariosErro: "Nenhum destinatário da confirmação interna de envio da minuta configurado no painel administrativo.",
    mensagemFalhaInterna: (erro) => `Falha ao enviar a confirmação interna de envio da minuta sobre "${params.demanda}": ${erro}`,
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
