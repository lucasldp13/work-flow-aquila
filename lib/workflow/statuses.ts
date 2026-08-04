import type { DemandStatus, UserRole } from "@/types/database";

export const STATUS_LABELS: Record<DemandStatus, string> = {
  recebida_comercial: "Recebida pelo Comercial",
  em_analise_comercial: "Em análise comercial",
  aguardando_retorno_consultor: "Aguardando retorno do consultor",
  encaminhada_juridico: "Encaminhada ao Jurídico",
  em_validacao_juridica: "Em validação jurídica",
  devolvida_comercial: "Devolvida ao Comercial",
  minuta_em_elaboracao: "Minuta em elaboração",
  minuta_enviada: "Minuta enviada",
  aguardando_assinaturas: "Aguardando assinaturas",
  contrato_assinado: "Contrato assinado",
  equipe_em_montagem: "Equipe em montagem",
  equipe_definida: "Equipe definida",
  em_processamento_financeiro: "Em processamento financeiro",
  concluida: "Concluída",
};

// Ordem "canônica" das etapas, usada na linha do tempo e no Kanban.
export const STATUS_ORDER: DemandStatus[] = [
  "recebida_comercial",
  "em_analise_comercial",
  "aguardando_retorno_consultor",
  "encaminhada_juridico",
  "em_validacao_juridica",
  "devolvida_comercial",
  "minuta_em_elaboracao",
  "minuta_enviada",
  "aguardando_assinaturas",
  "contrato_assinado",
  "equipe_em_montagem",
  "equipe_definida",
  "em_processamento_financeiro",
  "concluida",
];

// Colunas do Kanban (agrupam alguns status para caber na tela).
export const KANBAN_COLUMNS: { titulo: string; status: DemandStatus[] }[] = [
  { titulo: "Comercial", status: ["recebida_comercial", "em_analise_comercial", "aguardando_retorno_consultor", "devolvida_comercial"] },
  { titulo: "Jurídico", status: ["encaminhada_juridico", "em_validacao_juridica", "minuta_em_elaboracao", "minuta_enviada"] },
  { titulo: "Assinatura", status: ["aguardando_assinaturas", "contrato_assinado"] },
  { titulo: "Projetos", status: ["equipe_em_montagem", "equipe_definida"] },
  { titulo: "Financeiro", status: ["em_processamento_financeiro"] },
  { titulo: "Concluída", status: ["concluida"] },
];

export const STATUS_OWNER: Record<DemandStatus, UserRole> = {
  recebida_comercial: "comercial",
  em_analise_comercial: "comercial",
  aguardando_retorno_consultor: "comercial",
  devolvida_comercial: "comercial",
  encaminhada_juridico: "juridico",
  em_validacao_juridica: "juridico",
  minuta_em_elaboracao: "juridico",
  minuta_enviada: "juridico",
  aguardando_assinaturas: "juridico",
  contrato_assinado: "juridico",
  equipe_em_montagem: "projetos",
  equipe_definida: "projetos",
  em_processamento_financeiro: "financeiro",
  concluida: "financeiro",
};

// Mapa de transições permitidas: de cada status, para quais outros status
// é possível avançar/retroceder. É a fonte única de verdade que impede que
// etapas sejam puladas — validada tanto na interface (habilita/desabilita
// botões) quanto no backend (rotas de API), antes de chamar a RPC
// transition_demand no banco.
export const ALLOWED_TRANSITIONS: Record<DemandStatus, DemandStatus[]> = {
  recebida_comercial: ["em_analise_comercial"],
  em_analise_comercial: ["aguardando_retorno_consultor", "encaminhada_juridico"],
  aguardando_retorno_consultor: ["em_analise_comercial"],
  encaminhada_juridico: ["em_validacao_juridica"],
  em_validacao_juridica: ["devolvida_comercial", "minuta_em_elaboracao"],
  devolvida_comercial: ["em_analise_comercial"],
  minuta_em_elaboracao: ["minuta_enviada"],
  minuta_enviada: ["aguardando_assinaturas"],
  aguardando_assinaturas: ["contrato_assinado"],
  contrato_assinado: ["equipe_em_montagem"],
  equipe_em_montagem: ["equipe_definida"],
  equipe_definida: ["em_processamento_financeiro"],
  em_processamento_financeiro: ["concluida"],
  concluida: [],
};

export function isTransitionAllowed(from: DemandStatus, to: DemandStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function statusBadgeColor(status: DemandStatus): string {
  if (status === "concluida") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "devolvida_comercial") return "bg-rose-100 text-rose-800 border-rose-200";
  if (STATUS_OWNER[status] === "comercial") return "bg-blue-100 text-blue-800 border-blue-200";
  if (STATUS_OWNER[status] === "juridico") return "bg-purple-100 text-purple-800 border-purple-200";
  if (STATUS_OWNER[status] === "projetos") return "bg-amber-100 text-amber-800 border-amber-200";
  if (STATUS_OWNER[status] === "financeiro") return "bg-teal-100 text-teal-800 border-teal-200";
  return "bg-slate-100 text-slate-800 border-slate-200";
}
