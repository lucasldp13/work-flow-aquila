import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import type { UserRole } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/api/auth/callback"];

// Rotas cujo primeiro segmento exige um perfil específico (além de admin,
// que sempre tem acesso total). Mantém a proteção de rota também no
// middleware, além das checagens em cada página/rota (defesa em profundidade).
const SECTION_ROLES: Record<string, UserRole[]> = {
  admin: ["admin"],
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next") || pathname === "/favicon.ico";

  if (!user && !isPublic) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Propositalmente NÃO pula a tela de login quando já existe uma sessão
  // válida: acessar /login (ou o link raiz do sistema) sempre mostra o
  // formulário — o acesso nunca retoma a página em que o usuário estava.

  if (user) {
    const firstSegment = pathname.split("/")[1];
    const allowedRoles = SECTION_ROLES[firstSegment];
    if (allowedRoles) {
      const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();
      if (!profile || !profile.active || !allowedRoles.includes(profile.role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}
