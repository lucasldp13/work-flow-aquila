"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { apiRequest } from "@/lib/api/fetcher";
import type { DemandDetailPayload, SessionInfo } from "../types";
import type { PaymentStatus } from "@/types/database";
import { STATUS_ORDER } from "@/lib/workflow/statuses";

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pendente: "Pendente",
  programado: "Programado",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<PaymentStatus, string> = {
  pendente: "bg-slate-100 text-slate-700 border-slate-200",
  programado: "bg-blue-100 text-blue-800 border-blue-200",
  pago: "bg-emerald-100 text-emerald-800 border-emerald-200",
  atrasado: "bg-rose-100 text-rose-800 border-rose-200",
  cancelado: "bg-slate-200 text-slate-500 border-slate-300",
};

export function FinanceiroTab({ data, session, onChanged }: { data: DemandDetailPayload; session: SessionInfo; onChanged: () => Promise<void> }) {
  const { demand } = data;
  const aindaNaoChegou = STATUS_ORDER.indexOf(demand.status) < STATUS_ORDER.indexOf("em_processamento_financeiro");
  const podeGerenciar = session.role === "financeiro" && !aindaNaoChegou;

  if (aindaNaoChegou) {
    return (
      <Alert variant="info" title="Aguardando definição da equipe">
        O Financeiro só recebe a demanda depois que a equipe do projeto for definida por Projetos.
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      {data.financeResumo && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ResumoCard label="Total previsto" value={data.financeResumo.total_previsto} />
          <ResumoCard label="Total pago" value={data.financeResumo.total_pago} tone="text-emerald-700" />
          <ResumoCard label="Saldo pendente" value={data.financeResumo.saldo_pendente} tone="text-amber-700" />
        </div>
      )}

      {!data.canManagePayments && (
        <Alert variant="info">Os detalhes de pagamentos (beneficiário, valor, vencimento) são visíveis apenas para Financeiro e Administrador.</Alert>
      )}

      {podeGerenciar && <NovoPagamentoForm demandId={demand.id} onChanged={onChanged} />}

      {data.canManagePayments && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Pagamentos</CardTitle>
            {podeGerenciar && demand.status === "em_processamento_financeiro" && <ConcluirButton demandId={demand.id} onChanged={onChanged} />}
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {data.payments.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.beneficiario}</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(p.valor)} · Vencimento: {formatDate(p.vencimento)}
                    </p>
                    {p.observacoes && <p className="text-xs text-slate-400">{p.observacoes}</p>}
                  </div>
                  {podeGerenciar ? (
                    <StatusSelect demandId={demand.id} paymentId={p.id} status={p.status} onChanged={onChanged} />
                  ) : (
                    <Badge className={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  )}
                </div>
              ))}
              {data.payments.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhum pagamento cadastrado ainda.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResumoCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`mt-1 text-xl font-semibold ${tone ?? "text-slate-900"}`}>{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  );
}

function NovoPagamentoForm({ demandId, onChanged }: { demandId: string; onChanged: () => Promise<void> }) {
  const [beneficiario, setBeneficiario] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!beneficiario.trim() || !valor || !vencimento) {
      setError("Preencha beneficiário, valor e vencimento.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${demandId}/payments`, {
      method: "POST",
      body: JSON.stringify({ beneficiario, valor: Number(valor), vencimento, observacoes }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao cadastrar pagamento.");
      return;
    }
    setBeneficiario("");
    setValor("");
    setVencimento("");
    setObservacoes("");
    await onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <Alert variant="error">{error}</Alert>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label="Beneficiário" required value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} />
          <Input label="Valor (R$)" type="number" min="0" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} />
          <Input label="Vencimento" type="date" required value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
        </div>
        <Textarea label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        <Button onClick={handleSubmit} loading={loading}>
          Cadastrar pagamento
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusSelect({ demandId, paymentId, status, onChanged }: { demandId: string; paymentId: string; status: PaymentStatus; onChanged: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  async function handleChange(novoStatus: PaymentStatus) {
    setLoading(true);
    await apiRequest(`/api/demands/${demandId}/payments/${paymentId}`, { method: "PATCH", body: JSON.stringify({ status: novoStatus }) });
    setLoading(false);
    await onChanged();
  }

  return (
    <Select
      value={status}
      disabled={loading}
      onChange={(e) => handleChange(e.target.value as PaymentStatus)}
      className={`w-auto ${STATUS_COLOR[status]}`}
    >
      {Object.entries(STATUS_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
}

function ConcluirButton({ demandId, onChanged }: { demandId: string; onChanged: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConcluir() {
    setLoading(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${demandId}/conclude`, { method: "POST" });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao concluir demanda.");
      return;
    }
    await onChanged();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-rose-600">{error}</span>}
      <Button size="sm" onClick={handleConcluir} loading={loading}>
        Concluir demanda
      </Button>
    </div>
  );
}
