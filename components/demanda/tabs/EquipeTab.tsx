"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { apiRequest } from "@/lib/api/fetcher";
import { Trash2, Users } from "lucide-react";
import type { DemandDetailPayload, SessionInfo } from "../types";
import { STATUS_ORDER } from "@/lib/workflow/statuses";

export function EquipeTab({ data, session, onChanged }: { data: DemandDetailPayload; session: SessionInfo; onChanged: () => Promise<void> }) {
  const { demand } = data;
  const aindaNaoChegou = STATUS_ORDER.indexOf(demand.status) < STATUS_ORDER.indexOf("equipe_em_montagem");
  const emMontagem = demand.status === "equipe_em_montagem";
  const podeEditar = session.role === "projetos" && emMontagem;

  if (aindaNaoChegou) {
    return (
      <Alert variant="info" title="Aguardando contrato assinado">
        A área de Projetos só recebe a demanda depois que o contrato assinado for anexado e registrado pelo Jurídico.
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      {podeEditar && <NovoMembroForm demandId={demand.id} onChanged={onChanged} />}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Equipe do projeto</CardTitle>
          {podeEditar && data.team.length > 0 && <ForwardButton demandId={demand.id} onChanged={onChanged} />}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {data.team.map((member) => (
              <div key={member.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {member.nome} · <span className="font-normal text-slate-500">{member.funcao}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(member.periodo_inicio)} — {formatDate(member.periodo_fim)}
                      {member.valor_previsto ? ` · ${formatCurrency(member.valor_previsto)}` : ""}
                    </p>
                    {member.responsabilidades && <p className="mt-1 text-sm text-slate-600">{member.responsabilidades}</p>}
                    {member.observacoes && <p className="mt-1 text-xs text-slate-400">{member.observacoes}</p>}
                  </div>
                </div>
                {podeEditar && <RemoveMemberButton demandId={demand.id} memberId={member.id} onChanged={onChanged} />}
              </div>
            ))}
            {data.team.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhum integrante cadastrado ainda.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NovoMembroForm({ demandId, onChanged }: { demandId: string; onChanged: () => Promise<void> }) {
  const [nome, setNome] = useState("");
  const [funcao, setFuncao] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [responsabilidades, setResponsabilidades] = useState("");
  const [valorPrevisto, setValorPrevisto] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!nome.trim() || !funcao.trim()) {
      setError("Informe nome e função do integrante.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${demandId}/team`, {
      method: "POST",
      body: JSON.stringify({
        nome,
        funcao,
        periodoInicio: periodoInicio || undefined,
        periodoFim: periodoFim || undefined,
        responsabilidades,
        valorPrevisto: valorPrevisto ? Number(valorPrevisto) : null,
        observacoes,
      }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao adicionar integrante.");
      return;
    }
    setNome("");
    setFuncao("");
    setPeriodoInicio("");
    setPeriodoFim("");
    setResponsabilidades("");
    setValorPrevisto("");
    setObservacoes("");
    await onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adicionar integrante</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <Alert variant="error">{error}</Alert>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input label="Função" required value={funcao} onChange={(e) => setFuncao(e.target.value)} />
          <Input label="Início" type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
          <Input label="Fim" type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
          <Input label="Valor previsto (R$)" type="number" min="0" step="0.01" value={valorPrevisto} onChange={(e) => setValorPrevisto(e.target.value)} />
        </div>
        <Textarea label="Responsabilidades" value={responsabilidades} onChange={(e) => setResponsabilidades(e.target.value)} />
        <Textarea label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        <Button onClick={handleSubmit} loading={loading}>
          Adicionar à equipe
        </Button>
      </CardContent>
    </Card>
  );
}

function RemoveMemberButton({ demandId, memberId, onChanged }: { demandId: string; memberId: string; onChanged: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  async function handleRemove() {
    setLoading(true);
    await apiRequest(`/api/demands/${demandId}/team/${memberId}`, { method: "DELETE" });
    setLoading(false);
    await onChanged();
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleRemove} disabled={loading} aria-label="Remover integrante">
      <Trash2 className="h-4 w-4 text-rose-500" />
    </Button>
  );
}

function ForwardButton({ demandId, onChanged }: { demandId: string; onChanged: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleForward() {
    setLoading(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${demandId}/team/forward`, { method: "POST" });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao encaminhar ao Financeiro.");
      return;
    }
    await onChanged();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-rose-600">{error}</span>}
      <Button size="sm" onClick={handleForward} loading={loading}>
        Concluir equipe e encaminhar ao Financeiro
      </Button>
    </div>
  );
}
