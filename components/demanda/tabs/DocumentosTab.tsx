"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { formatDateTime } from "@/lib/utils/format";
import { canEditDemandAtStatus, canViewDocument } from "@/lib/workflow/permissions";
import { Download, FileText, Lock, UploadCloud } from "lucide-react";
import type { DemandDetailPayload, SessionInfo } from "../types";
import type { DocumentType } from "@/types/database";

const TIPO_LABEL: Record<DocumentType, string> = {
  proposta: "Proposta comercial",
  minuta: "Minuta contratual",
  contrato_assinado: "Contrato assinado",
  equipe: "Documento da equipe",
  comprovante: "Comprovante de pagamento",
  outro: "Outro",
};

export function DocumentosTab({ data, session, onChanged }: { data: DemandDetailPayload; session: SessionInfo; onChanged: () => Promise<void> }) {
  const podeAnexar = canEditDemandAtStatus(session.role, data.demand.status);
  const [tipo, setTipo] = useState<DocumentType>("outro");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", tipo);
    const res = await fetch(`/api/demands/${data.demand.id}/documents`, { method: "POST", body: formData });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Erro ao enviar documento.");
      return;
    }
    setFile(null);
    await onChanged();
  }

  async function handleDownload(id: string) {
    const res = await fetch(`/api/documents/${id}/download`);
    const json = await res.json();
    if (res.ok) {
      window.open(json.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-5">
      {podeAnexar && (
        <Card>
          <CardHeader>
            <CardTitle>Anexar documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <Alert variant="error">{error}</Alert>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Select label="Tipo de documento" value={tipo} onChange={(e) => setTipo(e.target.value as DocumentType)}>
                {Object.entries(TIPO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Arquivo</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleUpload} loading={loading} className="w-full sm:w-auto">
                  <UploadCloud className="h-4 w-4" /> Enviar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documentos anexados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {data.documents.map((doc) => {
              const podeVer = canViewDocument(session.role, doc.tipo);
              return (
                <div key={doc.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{doc.nome_arquivo}</p>
                      <p className="text-xs text-slate-500">
                        {TIPO_LABEL[doc.tipo]} · {doc.uploader?.name ?? "—"} · {formatDateTime(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  {podeVer ? (
                    <Button variant="outline" size="sm" onClick={() => handleDownload(doc.id)}>
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Lock className="h-3.5 w-3.5" /> Restrito
                    </span>
                  )}
                </div>
              );
            })}
            {data.documents.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-400">Nenhum documento anexado ainda.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
