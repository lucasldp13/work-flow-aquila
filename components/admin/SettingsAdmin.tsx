"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { apiRequest } from "@/lib/api/fetcher";
import { formatDateTime } from "@/lib/utils/format";
import { isValidEmail } from "@/lib/workflow/validations";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import type { EmailStatus } from "@/types/database";

interface Settings {
  juridico_destinatarios?: { emails: string[] };
  prazo_juridico?: { dias: number; tipo: "uteis" | "corridos" };
  minuta_confirmacao_interna?: { emails: string[]; texto: string };
}

interface EmailLogItem {
  id: string;
  assunto: string;
  destinatarios: string[];
  status: EmailStatus;
  tentativas: number;
  ultimo_erro: string | null;
  created_at: string;
  enviado_em: string | null;
  demand: { nome_demanda: string } | null;
}

const STATUS_COLOR: Record<EmailStatus, string> = {
  pendente: "bg-slate-100 text-slate-700 border-slate-200",
  enviado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  falhou: "bg-rose-100 text-rose-800 border-rose-200",
};

export function SettingsAdmin() {
  const [settings, setSettings] = useState<Settings>({});
  const [emailInput, setEmailInput] = useState("");
  const [prazoDias, setPrazoDias] = useState(4);
  const [prazoTipo, setPrazoTipo] = useState<"uteis" | "corridos">("uteis");
  const [minutaEmailInput, setMinutaEmailInput] = useState("");
  const [minutaTexto, setMinutaTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logs, setLogs] = useState<EmailLogItem[]>([]);

  async function loadSettings() {
    const result = await apiRequest<{ settings: Settings }>("/api/admin/settings");
    if (result.ok && result.data) {
      setSettings(result.data.settings);
      setPrazoDias(result.data.settings.prazo_juridico?.dias ?? 4);
      setPrazoTipo(result.data.settings.prazo_juridico?.tipo ?? "uteis");
      setMinutaTexto(result.data.settings.minuta_confirmacao_interna?.texto ?? "");
    }
  }

  async function loadLogs() {
    const result = await apiRequest<{ emails: EmailLogItem[] }>("/api/admin/emails");
    if (result.ok && result.data) setLogs(result.data.emails);
  }

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  const destinatarios = settings.juridico_destinatarios?.emails ?? [];
  const minutaDestinatarios = settings.minuta_confirmacao_interna?.emails ?? [];

  async function addEmail() {
    if (!isValidEmail(emailInput)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (destinatarios.includes(emailInput)) {
      setError("Este e-mail já está na lista.");
      return;
    }
    setError(null);
    await saveDestinatarios([...destinatarios, emailInput]);
    setEmailInput("");
  }

  async function removeEmail(email: string) {
    await saveDestinatarios(destinatarios.filter((e) => e !== email));
  }

  async function saveDestinatarios(emails: string[]) {
    setLoading(true);
    const result = await apiRequest("/api/admin/settings", { method: "PUT", body: JSON.stringify({ juridicoDestinatarios: emails }) });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao salvar.");
      return;
    }
    setSuccess("Destinatários atualizados.");
    await loadSettings();
  }

  async function addMinutaEmail() {
    if (!isValidEmail(minutaEmailInput)) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (minutaDestinatarios.includes(minutaEmailInput)) {
      setError("Este e-mail já está na lista.");
      return;
    }
    setError(null);
    await saveMinutaDestinatarios([...minutaDestinatarios, minutaEmailInput]);
    setMinutaEmailInput("");
  }

  async function removeMinutaEmail(email: string) {
    await saveMinutaDestinatarios(minutaDestinatarios.filter((e) => e !== email));
  }

  async function saveMinutaDestinatarios(emails: string[]) {
    setLoading(true);
    const result = await apiRequest("/api/admin/settings", { method: "PUT", body: JSON.stringify({ minutaConfirmacaoEmails: emails }) });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao salvar.");
      return;
    }
    setSuccess("Destinatários atualizados.");
    await loadSettings();
  }

  async function saveMinutaTexto() {
    setLoading(true);
    setError(null);
    const result = await apiRequest("/api/admin/settings", { method: "PUT", body: JSON.stringify({ minutaConfirmacaoTexto: minutaTexto }) });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao salvar o texto.");
      return;
    }
    setSuccess("Texto do e-mail interno atualizado.");
    await loadSettings();
  }

  async function savePrazo() {
    setLoading(true);
    setError(null);
    const result = await apiRequest("/api/admin/settings", { method: "PUT", body: JSON.stringify({ prazoDias, prazoTipo }) });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao salvar prazo.");
      return;
    }
    setSuccess("Prazo jurídico atualizado.");
    await loadSettings();
  }

  async function retryFailed() {
    setLoading(true);
    await apiRequest("/api/email/retry", { method: "POST" });
    setLoading(false);
    await loadLogs();
  }

  return (
    <div className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Destinatários do Jurídico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">E-mails que recebem a notificação automática sempre que o Comercial cadastra, anexa documentos, atualiza ou encaminha uma demanda.</p>
          <div className="flex flex-wrap gap-2">
            {destinatarios.map((email) => (
              <Badge key={email} className="gap-1.5 border-brand-200 bg-brand-50 text-brand-800">
                {email}
                <button onClick={() => removeEmail(email)} aria-label="Remover">
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {destinatarios.length === 0 && <p className="text-xs text-slate-400">Nenhum destinatário configurado.</p>}
          </div>
          <div className="flex gap-2">
            <Input placeholder="email@aquila.com.br" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
            <Button onClick={addEmail} loading={loading}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prazo jurídico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Prazo padrão para elaboração e envio da minuta, contado a partir do momento em que a demanda é encaminhada ao Jurídico.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Quantidade de dias" type="number" min={1} value={prazoDias} onChange={(e) => setPrazoDias(Number(e.target.value))} />
            <Select label="Tipo de contagem" value={prazoTipo} onChange={(e) => setPrazoTipo(e.target.value as "uteis" | "corridos")}>
              <option value="uteis">Dias úteis</option>
              <option value="corridos">Dias corridos</option>
            </Select>
          </div>
          <Button onClick={savePrazo} loading={loading}>
            Salvar prazo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confirmação interna de envio da minuta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            O envio da minuta ao cliente é feito manualmente pelo Jurídico (fora do sistema). Quando ele registra esse envio em &quot;Registrar envio da minuta&quot;, o sistema
            avisa automaticamente os destinatários abaixo, com o texto que você definir.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Destinatários internos</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {minutaDestinatarios.map((email) => (
                <Badge key={email} className="gap-1.5 border-brand-200 bg-brand-50 text-brand-800">
                  {email}
                  <button onClick={() => removeMinutaEmail(email)} aria-label="Remover">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {minutaDestinatarios.length === 0 && <p className="text-xs text-slate-400">Nenhum destinatário configurado.</p>}
            </div>
            <div className="flex gap-2">
              <Input placeholder="email@aquila.com.br" value={minutaEmailInput} onChange={(e) => setMinutaEmailInput(e.target.value)} />
              <Button onClick={addMinutaEmail} loading={loading}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>

          <div>
            <Textarea
              label="Texto do e-mail"
              value={minutaTexto}
              onChange={(e) => setMinutaTexto(e.target.value)}
              placeholder="Ex.: A minuta contratual foi registrada como enviada ao cliente. Acompanhe o andamento da assinatura pelo sistema."
            />
            <Button className="mt-2" onClick={saveMinutaTexto} loading={loading}>
              Salvar texto
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Log de e-mails automáticos</CardTitle>
          <Button size="sm" variant="outline" onClick={retryFailed} loading={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Reprocessar falhas
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{log.assunto}</p>
                  <p className="text-xs text-slate-500">
                    {log.demand?.nome_demanda} · {log.destinatarios.join(", ")} · {formatDateTime(log.enviado_em ?? log.created_at)}
                  </p>
                  {log.ultimo_erro && <p className="text-xs text-rose-500">{log.ultimo_erro}</p>}
                </div>
                <Badge className={STATUS_COLOR[log.status]}>
                  {log.status} ({log.tentativas}x)
                </Badge>
              </div>
            ))}
            {logs.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhum e-mail registrado ainda.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
