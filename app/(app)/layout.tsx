import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ROLE_LABELS } from "@/lib/workflow/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id, name, role, active").eq("id", user.id).single();

  if (!profile || !profile.active) redirect("/login");

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar role={profile.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar name={profile.name} roleLabel={ROLE_LABELS[profile.role]} />
        <MobileNav role={profile.role} />
        <main className="flex-1 bg-slate-50 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
