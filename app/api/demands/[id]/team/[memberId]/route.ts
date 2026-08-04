import { NextRequest, NextResponse } from "next/server";
import { requireProfile, requireRole, handleApiError } from "@/lib/api/helpers";

export async function DELETE(_request: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["projetos"]);

    const { error } = await supabase.from("demand_team_members").delete().eq("id", params.memberId).eq("demand_id", params.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
