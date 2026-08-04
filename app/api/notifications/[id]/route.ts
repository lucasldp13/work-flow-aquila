import { NextRequest, NextResponse } from "next/server";
import { requireProfile, handleApiError } from "@/lib/api/helpers";

export async function PATCH(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, profile } = await requireProfile();
    const { error } = await supabase.from("notifications").update({ lida: true }).eq("id", params.id).eq("user_id", profile.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
