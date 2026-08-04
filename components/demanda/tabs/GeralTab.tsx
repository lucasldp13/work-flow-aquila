"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { canEditDemandAtStatus } from "@/lib/workflow/permissions";
import { apiRequest } from "@/lib/api/fetcher";
import { ActionPanel } from "../ActionPanel";
import type { DemandDetailPayload, SessionInfo } from "../types";

export function GeralTab({ data, session, onChanged }: { data: DemandDetailPayload; session: SessionInfo; onChanged: () => Promise<void> }) {
  const { demand } = data;
  const podeEditar = canEditDemandAtStatus(session.role, demand.status) && session.role !== "admin";
  const [editing, setEditing] = useState(false);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Informações comerciais</CardTitle>
            {podeEditar && !editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <EditForm data={data} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onChanged(); }} />
            ) : (
              <ReadOnlyInfo data={data} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contatos do cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {demand.contatos.length === 0 && <p className="text-sm text-slate-400">Nenhum contato cadastrado.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {demand.contatos.map((c, i) => (
                <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">{c.nome}</p>
                  {c.cargo && <p className="text-xs text-slate-500">{c.cargo}</p>}
                  <p className="mt-1 text-slate-600">{c.email}</p>
                  {c.telefone && <p className="text-slate-500">{c.telefone}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5">
        <ActionPanel data={data} session={session} onChanged={onChanged} />
        <Card>
          <CardHeader>
            <CardTitle>Responsáveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Comercial:</span> {demand.comercial?.name ?? "—"}
            </p>
            <p>
              <span className="text-slate-500">Cliente:</span> {demand.clients?.name}
            </p>
            <p>
              <span className="text-slate-500">CNPJ:</span> {demand.clients?.cnpj}
            </p>
            <p>
              <span className="text-slate-500">Cadastrada em:</span> {formatDate(demand.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReadOnlyInfo({ data }: { data: DemandDetailPayload }) {
  const { demand } = data;
  return (
    <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
      <Info label="Valor" value={formatCurrency(demand.valor)} />
      <Info label="Markup" value={demand.markup ? `${demand.markup}%` : "—"} />
      <Info label="Prazo de execução" value={formatDate(demand.prazo)} />
      <Info label="E-mail do responsável pela assinatura" value={demand.signatario_email ?? "—"} />
      <div className="sm:col-span-2">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Escopo</dt>
        <dd className="mt-1 whitespace-pre-wrap text-slate-700">{demand.escopo || "—"}</dd>
      </div>
    </dl>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-slate-800">{value}</dd>
    </div>
  );
}

function EditForm({ data, onCancel, onSaved }: { data: DemandDetailPayload; onCancel: () => void; onSaved: () => Promise<void> }) {
  const { demand } = data;
  const [valor, setValor] = useState(demand.valor?.toString() ?? "");
  const [markup, setMarkup] = useState(demand.markup?.toString() ?? "");
  const [escopo, setEscopo] = useState(demand.escopo ?? "");
  const [prazo, setPrazo] = useState(demand.prazo ?? "");
  const [signatarioEmail, setSignatarioEmail] = useState(demand.signatario_email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${demand.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        valor: valor ? Number(valor) : null,
        markup: markup ? Number(markup) : null,
        escopo,
        prazo: prazo || null,
        signatarioEmail: signatarioEmail || null,
      }),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao salvar.");
      return;
    }
    await onSaved();
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Valor (R$)" type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
        <Input label="Markup (%)" type="number" step="0.01" value={markup} onChange={(e) => setMarkup(e.target.value)} />
        <Input label="Prazo de execução" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
      </div>
      <Input label="E-mail do responsável pela assinatura" type="email" value={signatarioEmail} onChange={(e) => setSignatarioEmail(e.target.value)} />
      <Textarea label="Escopo" value={escopo} onChange={(e) => setEscopo(e.target.value)} />
      <div className="flex gap-2">
        <Button onClick={handleSave} loading={loading}>
          Salvar alterações
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
