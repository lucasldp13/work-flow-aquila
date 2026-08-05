import type { DemandStatus, DocumentType, UserRole } from "@/types/database";
import { STATUS_OWNER } from "./statuses";

// Espelha, na camada de aplicação, as regras de RLS do banco — usado para
// habilitar/desabilitar ações na interface. A autoridade final continua
// sendo o Postgres (RLS + função transition_demand), mas replicar aqui
// evita "piscar" botões que o backend vai recusar.

export function canEditDemandAtStatus(role: UserRole, status: DemandStatus): boolean {
  if (role === "admin") return true;
  return STATUS_OWNER[status] === role;
}

export function canCreateDemand(role: UserRole): boolean {
  return role === "admin" || role === "comercial";
}

export function canManageTeam(role: UserRole, status: DemandStatus): boolean {
  if (role === "admin") return true;
  return role === "projetos" && status === "equipe_em_montagem";
}

export function canManagePayments(role: UserRole): boolean {
  return role === "admin" || role === "financeiro";
}

export function canViewPayments(role: UserRole): boolean {
  return role === "admin" || role === "financeiro";
}

export function canManageMinuta(role: UserRole): boolean {
  return role === "admin" || role === "juridico";
}

export function canAccessAdmin(role: UserRole): boolean {
  return role === "admin";
}

// Controla quem pode baixar cada tipo de documento — usado pela rota de
// geração de URL assinada. Mantém documentos confidenciais restritos ao(s)
// setor(es) pertinente(s), mesmo que o andamento geral da demanda seja
// visível para todos.
const DOCUMENT_ACCESS: Record<DocumentType, UserRole[]> = {
  proposta: ["admin", "comercial", "juridico"],
  minuta: ["admin", "juridico"],
  contrato_assinado: ["admin", "juridico", "projetos"],
  equipe: ["admin", "projetos", "financeiro"],
  comprovante: ["admin", "financeiro"],
  outro: ["admin", "comercial", "juridico"],
};

export function canViewDocument(role: UserRole, tipo: DocumentType): boolean {
  if (role === "admin") return true;
  return DOCUMENT_ACCESS[tipo]?.includes(role) ?? false;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  comercial: "Comercial",
  juridico: "Jurídico",
  projetos: "Projetos",
  financeiro: "Financeiro",
};

export const SECTOR_HOME_PATH: Record<UserRole, string> = {
  admin: "/dashboard",
  comercial: "/dashboard",
  juridico: "/dashboard",
  projetos: "/dashboard",
  financeiro: "/dashboard",
};
