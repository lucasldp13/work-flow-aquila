import { NextRequest, NextResponse } from "next/server";
import { requireProfile, handleApiError } from "@/lib/api/helpers";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireProfile();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    let query = supabase
      .from("consultores")
      .select("id, nome, email, categoria")
      .eq("ativo", true)
      .order("nome")
      .limit(20);

    if (q) query = query.or(`nome.ilike.%${q}%,email.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ consultores: data });
  } catch (error) {
    return handleApiError(error);
  }
}
