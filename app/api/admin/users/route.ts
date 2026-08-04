import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireProfile, requireRole, handleApiError, ApiError } from "@/lib/api/helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().min(1, "Informe o nome."),
  email: z.string().email("E-mail inválido."),
  role: z.enum(["admin", "comercial", "juridico", "projetos", "financeiro"]),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export async function GET() {
  try {
    const { supabase, profile } = await requireProfile();
    requireRole(profile, ["admin"]);

    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
    if (error) throw error;

    return NextResponse.json({ users: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireProfile();
    requireRole(profile, ["admin"]);

    const body = schema.parse(await request.json());
    const admin = createAdminSupabaseClient();

    const { data: created, error } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name, role: body.role },
    });
    if (error) throw new ApiError(400, error.message);

    // O trigger on_auth_user_created cria o profile automaticamente.
    return NextResponse.json({ user: created.user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return handleApiError(error);
  }
}
