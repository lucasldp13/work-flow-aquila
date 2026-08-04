"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea, Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { apiRequest } from "@/lib/api/fetcher";
import { checkMinutaEnvio, isValidEmail } from "@/lib/workflow/validations";
import { diasRestantes, isPrazoVencido } from "@/lib/workflow/validations";
import { formatDate } from "@/lib/utils/format";
import { FileText } from "lucide-react";
import type { DemandDetailPayload, SessionInfo } from "./types";

export function ActionPanel({ data, session, onChanged }: { data: DemandDetailPayload; session: SessionInfo; onChanged: () => Promise<void> }) {
  const { demand } = data;
  const { role } = session;

  if (role === "comercial" || role === "admin") {
    if (demand.status === "recebida_comercial") return <SimpleTransitionCard title="Iniciar análise comercial" description="Confirme o recebimento e inicie a análise da proposta enviada pelo consultor." novoStatus="em_analise_comercial" demandId={demand.id} onChanged={onChanged} label="Iniciar análise" />;

    if (demand.status === "em_analise_comercial") {
      return <ComercialAnaliseActions data={data} onChanged={onChanged} />;
    }

    if (demand.status === "aguardando_retorno_consultor") {
      return <SimpleTransitionCard title="Aguardando retorno do consultor" description="Assim que o consultor responder as dúvidas registradas, retome a análise." novoStatus="em_analise_comercial" demandId={demand.id} onChanged={onChanged} label="Retomar análise" />;
    }

    if (demand.status === "devolvida_comercial") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Devolvida pelo Jurídico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert variant="warning" title="Motivo da devolução">
              {demand.devolucao_motivo}
            </Alert>
            <SimpleTransitionButton demandId={demand.id} novoStatus="em_analise_comercial" label="Revisar e reenviar para análise" onChanged={onChanged} />
          </CardContent>
        </Card>
      );
    }
  }

  if (role === "juridico" || role === "admin") {
    if (demand.status === "encaminhada_juridico") {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Demanda recebida do Comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {demand.juridico_prazo_limite && (
              <PrazoInfo limite={demand.juridico_prazo_limite} dias={demand.juridico_prazo_dias} tipo={demand.juridico_prazo_tipo} />
            )}
            <SimpleTransitionButton demandId={demand.id} novoStatus="em_validacao_juridica" label="Iniciar validação jurídica" onChanged={onChanged} />
          </CardContent>
        </Card>
      );
    }

    if (demand.status === "em_validacao_juridica") {
      return <JuridicoValidacaoActions data={data} onChanged={onChanged} />;
    }

    if (demand.status === "minuta_em_elaboracao") {
      return <MinutaEnvioPanel data={data} onChanged={onChanged} />;
    }

    if (demand.status === "aguardando_assinaturas") {
      return <AssinaturaPanel data={data} onChanged={onChanged} />;
    }
  }

  return null;
}

function PrazoInfo({ limite, dias, tipo }: { limite: string; dias: number | null; tipo: string | null }) {
  const restantes = diasRestantes(limite);
  const vencido = isPrazoVencido(limite);
  return (
    <Alert variant={vencido ? "error" : "warning"} title={`Prazo jurídico: ${dias ?? 4} dias ${tipo === "corridos" ? "corridos" : "úteis"} para enviar ao cliente`}>
      Limite: <strong>{formatDate(limite)}</strong>. {vencido ? "Prazo vencido." : `${restantes} dia(s) restante(s).`}
    </Alert>
  );
}

function PropostaLink({ data }: { data: DemandDetailPayload }) {
  const proposta = [...data.documents].filter((d) => d.tipo === "proposta").sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const [loading, setLoading] = useState(false);

  if (!proposta) {
    return (
      <Alert variant="warning">Nenhuma proposta comercial foi anexada pelo Comercial ainda — verifique antes de elaborar a minuta.</Alert>
    );
  }

  async function handleOpen() {
    setLoading(true);
    const res = await fetch(`/api/documents/${proposta.id}/download`);
    const json = await res.json();
    setLoading(false);
    if (res.ok) window.open(json.url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-left hover:bg-brand-100"
    >
      <FileText className="h-5 w-5 shrink-0 text-brand-700" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-brand-900">Abrir proposta comercial recebida</span>
        <span className="block truncate text-xs text-brand-700">{proposta.nome_arquivo}</span>
      </span>
    </button>
  );
}

function SimpleTransitionButton({
  demandId,
  novoStatus,
  label,
  onChanged,
}: {
  demandId: string;
  novoStatus: string;
  label: string;
  onChanged: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${demandId}/transition`, { method: "POST", body: JSON.stringify({ novoStatus }) });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao atualizar status.");
      return;
    }
    await onChanged();
  }

  return (
    <div className="space-y-2">
      {error && <Alert variant="error">{error}</Alert>}
      <Button onClick={handleClick} loading={loading}>
        {label}
      </Button>
    </div>
  );
}

function SimpleTransitionCard({
  title,
  description,
  novoStatus,
  demandId,
  onChanged,
  label,
}: {
  title: string;
  description: string;
  novoStatus: string;
  demandId: string;
  onChanged: () => Promise<void>;
  label: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">{description}</p>
        <SimpleTransitionButton demandId={demandId} novoStatus={novoStatus} label={label} onChanged={onChanged} />
      </CardContent>
    </Card>
  );
}

function ComercialAnaliseActions({ data, onChanged }: { data: DemandDetailPayload; onChanged: () => Promise<void> }) {
  const [loadingForward, setLoadingForward] = useState(false);
  const [loadingAguardar, setLoadingAguardar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const temProposta = data.documents.some((d) => d.tipo === "proposta");

  async function handleForward() {
    setLoadingForward(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${data.demand.id}/forward-juridico`, { method: "POST" });
    setLoadingForward(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao encaminhar ao Jurídico.");
      return;
    }
    await onChanged();
  }

  async function handleAguardar() {
    setLoadingAguardar(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${data.demand.id}/transition`, { method: "POST", body: JSON.stringify({ novoStatus: "aguardando_retorno_consultor" }) });
    setLoadingAguardar(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao atualizar status.");
      return;
    }
    await onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise comercial</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Ajuste as informações comerciais na seção acima, registre dúvidas na aba de comentários e, quando estiver tudo certo, encaminhe ao Jurídico.
        </p>
        {!temProposta && (
          <Alert variant="warning">
            Anexe a proposta recebida do consultor na aba <strong>Documentos</strong> (tipo &quot;Proposta comercial&quot;) para poder encaminhar ao Jurídico.
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleAguardar} loading={loadingAguardar}>
            Marcar aguardando retorno do consultor
          </Button>
          <Button onClick={handleForward} loading={loadingForward} disabled={!temProposta}>
            Encaminhar ao Jurídico
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JuridicoValidacaoActions({ data, onChanged }: { data: DemandDetailPayload; onChanged: () => Promise<void> }) {
  const [showDevolucao, setShowDevolucao] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [loadingAprovar, setLoadingAprovar] = useState(false);
  const [loadingDevolver, setLoadingDevolver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAprovar() {
    setLoadingAprovar(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${data.demand.id}/transition`, { method: "POST", body: JSON.stringify({ novoStatus: "minuta_em_elaboracao" }) });
    setLoadingAprovar(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao aprovar.");
      return;
    }
    await onChanged();
  }

  async function handleDevolver() {
    if (!justificativa.trim()) {
      setError("Informe o motivo da devolução.");
      return;
    }
    setLoadingDevolver(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${data.demand.id}/transition`, {
      method: "POST",
      body: JSON.stringify({ novoStatus: "devolvida_comercial", justificativa }),
    });
    setLoadingDevolver(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao devolver ao Comercial.");
      return;
    }
    await onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validação jurídica</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.demand.juridico_prazo_limite && (
          <PrazoInfo limite={data.demand.juridico_prazo_limite} dias={data.demand.juridico_prazo_dias} tipo={data.demand.juridico_prazo_tipo} />
        )}
        <PropostaLink data={data} />
        <p className="text-sm text-slate-600">Valide dados comerciais, documentos, solução e condições. Aprove para elaborar a minuta ou devolva ao Comercial com justificativa.</p>
        {error && <Alert variant="error">{error}</Alert>}
        {!showDevolucao ? (
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleAprovar} loading={loadingAprovar}>
              Aprovar e iniciar minuta
            </Button>
            <Button variant="danger" onClick={() => setShowDevolucao(true)}>
              Devolver ao Comercial
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/50 p-4">
            <Textarea label="Motivo da devolução" required value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Descreva o que precisa ser ajustado…" />
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleDevolver} loading={loadingDevolver}>
                Confirmar devolução
              </Button>
              <Button variant="ghost" onClick={() => setShowDevolucao(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MinutaEnvioPanel({ data, onChanged }: { data: DemandDetailPayload; onChanged: () => Promise<void> }) {
  const [confirmarEmail, setConfirmarEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minutaAnexada = data.documents.some((d) => d.tipo === "minuta");
  const check = checkMinutaEnvio({
    minutaAnexada,
    signatarioEmail: data.demand.signatario_email ?? "",
    confirmarEmail,
  });

  async function handleRegistrar() {
    setLoading(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${data.demand.id}/minuta-envio`, { method: "POST", body: JSON.stringify({ confirmarEmail }) });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível registrar o envio.");
      return;
    }
    await onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Envio da minuta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.demand.juridico_prazo_limite && (
          <PrazoInfo limite={data.demand.juridico_prazo_limite} dias={data.demand.juridico_prazo_dias} tipo={data.demand.juridico_prazo_tipo} />
        )}
        <PropostaLink data={data} />
        <p className="text-sm text-slate-600">
          Anexe a minuta na aba <strong>Documentos</strong> (tipo &quot;Minuta contratual&quot;) e confirme o e-mail do responsável pela assinatura para liberar o envio. Ao registrar,
          o sistema envia automaticamente um e-mail a esse endereço com o link para baixar a minuta.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="E-mail do responsável pela assinatura" value={data.demand.signatario_email ?? ""} disabled />
          <Input
            label="Confirmar e-mail"
            required
            value={confirmarEmail}
            onChange={(e) => setConfirmarEmail(e.target.value)}
            error={confirmarEmail && data.demand.signatario_email && confirmarEmail !== data.demand.signatario_email ? "Os e-mails não coincidem." : undefined}
          />
        </div>
        {!check.liberado && (
          <Alert variant="warning" title="Pendências para liberar o envio">
            <ul className="list-inside list-disc space-y-0.5">
              {check.pendencias.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Alert>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        <Button onClick={handleRegistrar} disabled={!check.liberado} loading={loading}>
          Registrar envio da minuta
        </Button>
      </CardContent>
    </Card>
  );
}

function AssinaturaPanel({ data, onChanged }: { data: DemandDetailPayload; onChanged: () => Promise<void> }) {
  const contratoDocs = data.documents.filter((d) => d.tipo === "contrato_assinado");
  const [documentoId, setDocumentoId] = useState(contratoDocs[0]?.id ?? "");
  const [dataAssinatura, setDataAssinatura] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liberado = Boolean(documentoId) && Boolean(dataAssinatura);

  async function handleRegistrar() {
    setLoading(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${data.demand.id}/signature`, {
      method: "POST",
      body: JSON.stringify({ documentoId, dataAssinatura }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível registrar a assinatura.");
      return;
    }
    await onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aguardando assinaturas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Anexe o contrato assinado na aba <strong>Documentos</strong> (tipo &quot;Contrato assinado&quot;) e registre a data da assinatura para liberar a demanda a Projetos.
        </p>
        {contratoDocs.length === 0 ? (
          <Alert variant="warning">Nenhum documento do tipo &quot;Contrato assinado&quot; foi anexado ainda.</Alert>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Documento do contrato assinado</label>
              <select
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={documentoId}
                onChange={(e) => setDocumentoId(e.target.value)}
              >
                {contratoDocs.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.nome_arquivo}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Data da assinatura" type="date" value={dataAssinatura} onChange={(e) => setDataAssinatura(e.target.value)} required />
          </div>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        <Button onClick={handleRegistrar} disabled={!liberado} loading={loading}>
          Registrar contrato assinado
        </Button>
      </CardContent>
    </Card>
  );
}

// Reexporta a validação de e-mail para eventuais usos futuros (mantém a
// mesma fonte de verdade entre client e server).
export { isValidEmail };
