import { NextResponse } from "next/server";
import { requireProfile, handleApiError } from "@/lib/api/helpers";

export async function GET() {
  try {
    const { supabase, profile } = await requireProfile();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;

    return NextResponse.json({ notifications: data });
  } catch (error) {
    return handleApiError(error);
  }
}
