import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workflow Aquila",
  description: "Gestão do fluxo interno entre Comercial, Jurídico, Projetos e Financeiro",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans text-slate-900">{children}</body>
    </html>
  );
}
