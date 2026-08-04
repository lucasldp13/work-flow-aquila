import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireProfile, handleApiError, appUrl, ApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { notifyJuridico } from "@/lib/email/notify";
import { canEditDemandAtStatus } from "@/lib/workflow/permissions";
import type { DocumentType } from "@/types/database";

const DOCUMENT_TYPES: DocumentType[] = ["proposta", "minuta", "contrato_assinado", "equipe", "comprovante", "outro"];
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

const TIPO_LABEL: Record<DocumentType, string> = {
  proposta: "Proposta comercial",
  minuta: "Minuta contratual",
  contrato_assinado: "Contrato assinado",
  equipe: "Documento da equipe",
  comprovante: "Comprovante de pagamento",
  outro: "Documento",
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();

    const { data: demand, error: demandError } = await supabase.from("demands").select("id, status, nome_demanda, clients(name)").eq("id", params.id).single();
    if (demandError) throw demandError;

    if (!canEditDemandAtStatus(profile.role, demand.status)) {
      throw new ApiError(403, "Sua área não pode anexar documentos nesta etapa da demanda.");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const tipoRaw = String(formData.get("tipo") ?? "outro");
    const tipo = (DOCUMENT_TYPES.includes(tipoRaw as DocumentType) ? tipoRaw : "outro") as DocumentType;

    if (!(file instanceof File)) {
      throw new ApiError(400, "Nenhum arquivo enviado.");
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new ApiError(400, "Arquivo excede o limite de 25MB.");
    }

    const admin = createAdminSupabaseClient();
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
    const storagePath = `${params.id}/${tipo}/${randomUUID()}${extension ? `.${extension}` : ""}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage.from("documentos").upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: document, error: insertError } = await supabase
      .from("demand_documents")
      .insert({
        demand_id: params.id,
        tipo,
        nome_arquivo: file.name,
        caminho_arquivo: storagePath,
        tamanho_bytes: file.size,
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
    return handleApiError(error);
  }
}
