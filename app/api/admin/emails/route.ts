import { NextResponse } from "next/server";
import { requireProfile, requireRole, handleApiError } from "@/lib/api/helpers";

export async function GET() {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["admin"]);

    const { data, error } = await supabase
      .from("email_notifications")
      .select("*, demand:demands(nome_demanda)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return NextResponse.json({ emails: data });
  } catch (error) {
    return handleApiError(error);
  }
}
