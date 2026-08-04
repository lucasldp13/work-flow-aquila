export interface JuridicoNotificationData {
  cliente: string;
  demanda: string;
  usuarioComercial: string;
  tipoAtualizacao: string;
  dataHora: string;
  prazoJuridico?: string | null;
  link: string;
}

export function buildJuridicoNotificationSubject(cliente: string): string {
  return `Novo documento do Comercial para análise jurídica — ${cliente}`;
}

// Modelo de e-mail profissional, responsivo (tabelas com largura máxima,
// funciona bem em clientes de e-mail corporativos) e sem anexar nenhum
// documento — apenas um link protegido para o sistema, conforme a regra de
// não expor documentos confidenciais por e-mail.
export function buildJuridicoNotificationHtml(data: JuridicoNotificationData): string {
  const linha = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;color:#64748b;font-size:13px;width:170px;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`;

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(buildJuridicoNotificationSubject(data.cliente))}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#1e3a8a;padding:20px 28px;">
                <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.02em;">Workflow Aquila</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.06em;">Notificação automática</p>
                <h1 style="margin:0 0 16px 0;font-size:19px;color:#0f172a;">Novo documento para análise jurídica</h1>
                <p style="margin:0 0 20px 0;font-size:14px;color:#334155;line-height:1.5;">
                  O setor Comercial enviou uma atualização que requer a atenção do Jurídico. Confira os detalhes abaixo:
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 0;margin-bottom:20px;">
                  ${linha("Cliente", data.cliente)}
                  ${linha("Demanda", data.demanda)}
                  ${linha("Responsável Comercial", data.usuarioComercial)}
                  ${linha("Tipo de atualização", data.tipoAtualizacao)}
                  ${linha("Data e horário", data.dataHora)}
                  ${data.prazoJuridico ? linha("Prazo jurídico", data.prazoJuridico) : ""}
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background:#2563eb;">
                      <a href="${data.link}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Acessar demanda no sistema</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
                  Por segurança, os documentos não são anexados a este e-mail. Utilize o link acima para acessá-los diretamente no sistema, com o seu login e permissões de acesso.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:11px;color:#94a3b8;">Esta é uma mensagem automática do Workflow Aquila. Não responda a este e-mail.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
