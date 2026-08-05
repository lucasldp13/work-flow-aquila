import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { requireProfile, handleApiError, ApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { canEditDemandAtStatus } from "@/lib/workflow/permissions";
import type { DocumentType } from "@/types/database";

const DOCUMENT_TYPES: DocumentType[] = ["proposta", "minuta", "contrato_assinado", "equipe", "comprovante", "outro"];
// 50MB é o teto máximo permitido pelo plano atual do Supabase (Free) para
// upload de arquivos — tanto no limite global do projeto quanto no bucket
// "documentos" (ver migration 0014). Não é possível configurar um valor
// maior sem upgrade de plano.
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

const schema = z.object({
  tipo: z.string(),
  nomeArquivo: z.string().min(1),
  tamanhoBytes: z.number().nonnegative(),
});

// Primeiro passo do upload: gera uma URL assinada para que o navegador
// envie o arquivo DIRETO ao Supabase Storage, sem passar pela função
// serverless da Vercel — evita o limite de payload (~4.5MB) que travava
// o envio de arquivos maiores (a barra de progresso ficava girando para
// sempre porque a função nunca recebia o arquivo completo).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    const body = schema.parse(await request.json());
    const tipo = (DOCUMENT_TYPES.includes(body.tipo as DocumentType) ? body.tipo : "outro") as DocumentType;

    if (body.tamanhoBytes > MAX_SIZE_BYTES) {
      throw new ApiError(400, "Arquivo excede o limite de 50MB.");
    }

    const { data: demand, error } = await supabase.from("demands").select("status").eq("id", params.id).single();
    if (error) throw error;
    if (!canEditDemandAtStatus(profile.role, demand.status)) {
      throw new ApiError(403, "Sua área não pode anexar documentos nesta etapa da demanda.");
    }

    const extension = body.nomeArquivo.includes(".") ? body.nomeArquivo.split(".").pop() : "";
    const path = `${params.id}/${tipo}/${randomUUID()}${extension ? `.${extension}` : ""}`;

    const admin = createAdminSupabaseClient();
    const { data: signed, error: signError } = await admin.storage.from("documentos").createSignedUploadUrl(path);
    if (signError) throw signError;

    return NextResponse.json({ path: signed.path, token: signed.token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
