import { NextRequest, NextResponse } from "next/server";
import { requireProfile, handleApiError, ApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { canViewDocument } from "@/lib/workflow/permissions";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();

    const { data: document, error } = await supabase.from("demand_documents").select("*").eq("id", params.id).single();
    if (error) throw error;

    if (!canViewDocument(profile.role, document.tipo)) {
      throw new ApiError(403, "Seu perfil não tem permissão para acessar este documento.");
    }

    const admin = createAdminSupabaseClient();
    const { data: signed, error: signError } = await admin.storage.from("documentos").createSignedUrl(document.caminho_arquivo, 60);
    if (signError) throw signError;

    return NextResponse.json({ url: signed.signedUrl, nomeArquivo: document.nome_arquivo });
  } catch (error) {
    return handleApiError(error);
  }
}
