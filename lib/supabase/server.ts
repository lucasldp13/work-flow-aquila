import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

// Cliente Supabase para uso em Server Components, Route Handlers e Server
// Actions. Propaga a sessão do usuário via cookies — a RLS do banco se
// aplica normalmente (ou seja, este cliente NÃO tem privilégios elevados).
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Chamado a partir de um Server Component: pode ser ignorado
            // porque o middleware já cuida de renovar a sessão.
          }
        },
      },
    }
  );
}
