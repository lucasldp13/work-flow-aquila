"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Building2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("E-mail ou senha inválidos. Verifique e tente novamente.");
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get("redirectTo") || "/dashboard";
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Workflow Aquila</h1>
          <p className="mt-1 text-sm text-slate-300">Gestão do fluxo Comercial · Jurídico · Projetos · Financeiro</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h2 className="mb-6 text-lg font-semibold text-slate-900">Entrar no sistema</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="E-mail"
              type="email"
              required
              autoComplete="email"
              placeholder="seuemail@aquila.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Senha"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <Alert variant="error">{error}</Alert>}
            <Button type="submit" className="w-full" loading={loading}>
              Entrar
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Acesso restrito a colaboradores autorizados. Em caso de dúvidas, procure o administrador do sistema.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
