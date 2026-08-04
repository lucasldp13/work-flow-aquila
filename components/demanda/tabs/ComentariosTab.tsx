"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { formatDateTime } from "@/lib/utils/format";
import { apiRequest } from "@/lib/api/fetcher";
import type { DemandDetailPayload, SessionInfo } from "../types";
import type { CommentType } from "@/types/database";

const TIPO_LABEL: Record<CommentType, string> = {
  duvida: "Dúvida",
  resposta: "Resposta",
  comentario: "Comentário",
  devolucao: "Devolução",
};

const TIPO_COLOR: Record<CommentType, string> = {
  duvida: "bg-amber-100 text-amber-800 border-amber-200",
  resposta: "bg-blue-100 text-blue-800 border-blue-200",
  comentario: "bg-slate-100 text-slate-700 border-slate-200",
  devolucao: "bg-rose-100 text-rose-800 border-rose-200",
};

export function ComentariosTab({ data, onChanged }: { data: DemandDetailPayload; session: SessionInfo; onChanged: () => Promise<void> }) {
  const [tipo, setTipo] = useState<Exclude<CommentType, "devolucao">>("duvida");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!mensagem.trim()) {
      setError("Escreva uma mensagem antes de enviar.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await apiRequest(`/api/demands/${data.demand.id}/comments`, { method: "POST", body: JSON.stringify({ tipo, mensagem }) });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao registrar.");
      return;
    }
    setMensagem("");
    await onChanged();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Registrar dúvida, resposta ou comentário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="duvida">Dúvida (para o consultor)</option>
            <option value="resposta">Resposta do consultor</option>
            <option value="comentario">Comentário geral</option>
          </Select>
          <Textarea label="Mensagem" value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Descreva a dúvida, resposta ou comentário…" />
          <Button onClick={handleSubmit} loading={loading}>
            Registrar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.comments.length === 0 && <p className="text-sm text-slate-400">Nenhum registro ainda.</p>}
          {data.comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <Badge className={TIPO_COLOR[c.tipo]}>{TIPO_LABEL[c.tipo]}</Badge>
                <span className="text-xs text-slate-400">
                  {c.author?.name ?? "—"} · {formatDateTime(c.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{c.mensagem}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
