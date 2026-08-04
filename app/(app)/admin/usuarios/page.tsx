import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";
import { UsersAdmin } from "@/components/admin/UsersAdmin";

export default async function AdminUsersPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Administração</h1>
        <p className="text-sm text-slate-500">Gerencie usuários, permissões, destinatários e prazos do workflow.</p>
      </div>
      <AdminNav />
      <UsersAdmin />
    </div>
  );
}
