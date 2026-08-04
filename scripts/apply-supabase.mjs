import fs from "node:fs";
import path from "node:path";

const REF = process.env.SUPABASE_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!REF || !TOKEN) {
  console.error("Defina SUPABASE_PROJECT_REF e SUPABASE_ACCESS_TOKEN no ambiente.");
  process.exit(1);
}

const files = [
  ...fs
    .readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join("supabase/migrations", f)),
  "supabase/seed.sql",
];

for (const file of files) {
  const sql = fs.readFileSync(file, "utf8");
  process.stdout.write(`Aplicando ${file} ... `);
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("FALHOU");
    console.error(text);
    process.exit(1);
  }
  console.log("OK");
}

console.log("Todas as migrations e o seed foram aplicados com sucesso.");
