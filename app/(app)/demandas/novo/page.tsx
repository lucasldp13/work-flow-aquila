import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NovoDemandaForm } from "@/components/demanda/NovoDemandaForm";

export default async function NovaDemandaPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  if (profile?.role !== "comercial" && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nova demanda</h1>
        <p className="text-sm text-slate-500">Cadastre a proposta recebida do consultor para iniciar o workflow.</p>
      </div>
      <NovoDemandaForm />
    </div>
  );
}
