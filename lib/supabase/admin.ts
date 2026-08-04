import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Cliente com a service role key — ignora RLS. Uso exclusivo em código de
// servidor confiável (Route Handlers), nunca importado por código de
// cliente. Usado para: enviar e-mails/gravar o log de notificações, gerar
// URLs assinadas de documentos privados e operações do painel administrativo
// (criação/edição de usuários).
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_URL precisam estar configurados no ambiente do servidor."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
