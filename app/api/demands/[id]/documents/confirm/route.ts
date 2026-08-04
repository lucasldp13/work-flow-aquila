import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, handleApiError, appUrl, ApiError } from "@/lib/api/helpers";
import { notifyJuridico } from "@/lib/email/notify";
import { canEditDemandAtStatus } from "@/lib/workflow/permissions";
import type { DocumentType } from "@/types/database";

const DOCUMENT_TYPES: DocumentType[] = ["proposta", "minuta", "contrato_assinado", "equipe", "comprovante", "outro"];

const TIPO_LABEL: Record<DocumentType, string> = {
  proposta: "Proposta comercial",
  minuta: "Minuta contratual",
  contrato_assinado: "Contrato assinado",
  equipe: "Documento da equipe",
  comprovante: "Comprovante de pagamento",
  outro: "Documento",
};

const schema = z.object({
  tipo: z.string(),
  nomeArquivo: z.string().min(1),
  caminhoArquivo: z.string().min(1),
  tamanhoBytes: z.number().nonnegative().optional(),
});

// Segundo passo do upload: depois que o navegador já enviou o arquivo
// direto ao Storage usando a URL assinada, esta rota apenas registra os
// metadados do documento (payload pequeno, sem o arquivo em si).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    const body = schema.parse(await request.json());
    const tipo = (DOCUMENT_TYPES.includes(body.tipo as DocumentType) ? body.tipo : "outro") as DocumentType;

    if (!body.caminhoArquivo.startsWith(`${params.id}/`)) {
      throw new ApiError(400, "Caminho de arquivo inválido para esta demanda.");
    }

    const { data: demand, error: demandError } = await supabase
      .from("demands")
      .select("id, status, nome_demanda, clients(name)")
      .eq("id", params.id)
      .single();
    if (demandError) throw demandError;

    if (!canEditDemandAtStatus(profile.role, demand.status)) {
      throw new ApiError(403, "Sua área não pode anexar documentos nesta etapa da demanda.");
    }

    const { data: document, error: insertError } = await supabase
      .from("demand_documents")
      .insert({
        demand_id: params.id,
        tipo,
        nome_arquivo: body.nomeArquivo,
        caminho_arquivo: body.caminhoArquivo,
        tamanho_bytes: body.tamanhoBytes ?? null,
        confidencial: true,
        uploaded_by: profile.id,
      })
      .select("*")
      .single();
    if (insertError) throw insertError;

    if (profile.role === "comercial") {
      await notifyJuridico({
        demandId: params.id,
        actionKey: `documento:${document.id}`,
        cliente: (demand as unknown as { clients: { name: string } | null }).clients?.name ?? "",
        demanda: demand.nome_demanda,
        usuarioComercial: profile.name,
        tipoAtualizacao: `Novo anexo: ${TIPO_LABEL[tipo]}`,
        link: appUrl(`/demandas/${params.id}`),
        createdBy: profile.id,
      });
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
