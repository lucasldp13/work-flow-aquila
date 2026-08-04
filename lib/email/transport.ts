import "server-only";
import nodemailer from "nodemailer";

let cachedTransport: nodemailer.Transporter | null = null;

// Transporte SMTP configurado inteiramente por variáveis de ambiente —
// nenhuma credencial fica hardcoded no código-fonte (ver .env.example).
// Funciona com qualquer provedor SMTP (SES, SendGrid, Gmail Workspace,
// Mailgun, etc.).
export function getEmailTransport(): nodemailer.Transporter {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "Configuração de SMTP ausente. Defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASSWORD no ambiente do servidor."
    );
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransport;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? "Workflow Aquila <nao-responda@aquila.com.br>";
}
