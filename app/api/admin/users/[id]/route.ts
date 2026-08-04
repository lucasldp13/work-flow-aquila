import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, requireRole, handleApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "comercial", "juridico", "projetos", "financeiro"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { profile } = await requireProfile();
    requireRole(profile, ["admin"]);

    const body = schema.parse(await request.json());
    const admin = createAdminSupabaseClient();

    const { data: user, error } = await admin
      .from("profiles")
      .update({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      })
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
