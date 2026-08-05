"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Building2 } from "lucide-react";

// Página aberta a partir do link enviado por resetPasswordForEmail. O
// Supabase estabelece uma sessão temporária de recuperação a partir do
// token na URL (tratado no browser client) — por isso esta rota fica em
// PUBLIC_PATHS no middleware, senão o usuário seria redirecionado para o
// login antes do JS conseguir ler o token.
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [sessaoValida, setSessaoValida] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setSessaoValida(Boolean(data.user));
      setChecking(false);
    });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (senha.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);

    if (updateError) {
      setError("Não foi possível redefinir a senha. Solicite um novo link e tente de novo.");
      return;
    }

    setSucesso(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Workflow Aquila</h1>
          <p className="mt-1 text-sm text-slate-300">Redefinir senha</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {checking && <p className="text-sm text-slate-500">Verificando link…</p>}

          {!checking && !sessaoValida && (
            <Alert variant="error" title="Link inválido ou expirado">
              Solicite um novo link em &quot;Esqueci minha senha&quot; na tela de login.
            </Alert>
          )}

          {!checking && sessaoValida && !sucesso && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">Escolha uma nova senha</h2>
              <Input
                label="Nova senha"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />
              {error && <Alert variant="error">{error}</Alert>}
              <Button type="submit" className="w-full" loading={loading}>
                Salvar nova senha
              </Button>
            </form>
          )}

          {sucesso && (
            <Alert variant="success" title="Senha redefinida com sucesso">
              Você já pode entrar com a nova senha. Redirecionando para o login…
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
