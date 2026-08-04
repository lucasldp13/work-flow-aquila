import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const BUCKET = "documentos";

// Lista recursivamente todos os arquivos sob um prefixo (ex.: o id de uma
// demanda) e os remove do Storage. Usado ao excluir uma demanda, para não
// deixar documentos órfãos no bucket privado.
export async function deleteDemandFiles(demandId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const paths = await listAllFiles(admin, demandId);
  if (paths.length === 0) return;

  const { error } = await admin.storage.from(BUCKET).remove(paths);
  if (error) throw error;
}

async function listAllFiles(admin: ReturnType<typeof createAdminSupabaseClient>, prefix: string): Promise<string[]> {
  const { data: entries, error } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;
  if (!entries) return [];

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = `${prefix}/${entry.name}`;
    if (entry.id === null) {
      // Entrada sem id representa uma "pasta" (prefixo) — desce um nível.
      const nested = await listAllFiles(admin, fullPath);
      files.push(...nested);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}
