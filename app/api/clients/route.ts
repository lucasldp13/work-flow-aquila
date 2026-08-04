import { NextRequest, NextResponse } from "next/server";
import { requireProfile, handleApiError } from "@/lib/api/helpers";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireProfile();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    let query = supabase.from("clients").select("id, name, cnpj").order("name").limit(20);
    if (q) query = query.or(`name.ilike.%${q}%,cnpj.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ clients: data });
  } catch (error) {
    return handleApiError(error);
  }
}
