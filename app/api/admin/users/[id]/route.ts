import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, requireRole, handleApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "comercial", "juridico", "projetos", "financeiro"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { profile } = await requireProfile();
    requireRole(profile, ["admin"]);

    const body = schema.parse(await request.json());
    const admin = createAdminSupabaseClient();

    // Redefinição de senha por um admin, sem depender de e-mail: útil
    // enquanto o SMTP não está configurado ou quando o usuário não tem
    // acesso ao próprio e-mail para receber o link de recuperação.
    if (body.password !== undefined) {
      const { error: authError } = await admin.auth.admin.updateUserById(params.id, { password: body.password });
      if (authError) throw authError;
    }

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
