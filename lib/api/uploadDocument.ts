"use client";

import { createClient } from "@/lib/supabase/client";
import { apiRequest } from "./fetcher";
import type { DocumentType } from "@/types/database";

export interface UploadDocumentResult {
  ok: boolean;
  error?: string;
}

// Envia um documento em duas etapas: (1) pede ao backend uma URL assinada
// e envia o arquivo DIRETO ao Supabase Storage a partir do navegador —
// sem passar pela função serverless da Vercel, que tem limite de payload
// (~4.5MB) e travava o envio de arquivos maiores; (2) confirma no backend
// para registrar os metadados do documento na demanda.
export async function uploadDemandDocument(demandId: string, file: File, tipo: DocumentType): Promise<UploadDocumentResult> {
  const signResult = await apiRequest<{ path: string; token: string }>(`/api/demands/${demandId}/documents/sign`, {
    method: "POST",
    body: JSON.stringify({ tipo, nomeArquivo: file.name, tamanhoBytes: file.size }),
  });

  if (!signResult.ok || !signResult.data) {
    return { ok: false, error: signResult.error ?? "Não foi possível iniciar o envio do arquivo." };
  }

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .uploadToSignedUrl(signResult.data.path, signResult.data.token, file, {
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message || "Falha ao enviar o arquivo para o armazenamento." };
  }

  const confirmResult = await apiRequest(`/api/demands/${demandId}/documents/confirm`, {
    method: "POST",
    body: JSON.stringify({ tipo, nomeArquivo: file.name, caminhoArquivo: signResult.data.path, tamanhoBytes: file.size }),
  });

  if (!confirmResult.ok) {
    return { ok: false, error: confirmResult.error ?? "Arquivo enviado, mas não foi possível registrá-lo na demanda." };
  }

  return { ok: true };
}
