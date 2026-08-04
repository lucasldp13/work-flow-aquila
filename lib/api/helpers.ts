import "server-only";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface SessionProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

// Recupera o usuário autenticado + seu perfil (papel/status). Lança 401 se
// não houver sessão e 403 se o perfil estiver inativo.
export async function requireProfile(): Promise<{ supabase: ReturnType<typeof createServerSupabaseClient>; profile: SessionProfile }> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError(401, "Sessão não encontrada. Faça login novamente.");
  }

  const { data: profile, error } = await supabase.from("profiles").select("id, name, email, role, active").eq("id", user.id).single();

  if (error || !profile) {
    throw new ApiError(403, "Perfil de usuário não encontrado.");
  }

  if (!profile.active) {
    throw new ApiError(403, "Seu usuário está inativo. Fale com um administrador.");
  }

  return { supabase, profile };
}

export function requireRole(profile: SessionProfile, allowed: UserRole[]) {
  if (profile.role === "admin") return;
  if (!allowed.includes(profile.role)) {
    throw new ApiError(403, "Você não tem permissão para executar esta ação.");
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  const message = error instanceof Error ? error.message : "Erro inesperado no servidor.";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
