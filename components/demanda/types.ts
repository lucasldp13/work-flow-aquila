import type { CommentType, Contato, DemandStatus, DocumentType, PaymentStatus, PrazoTipo, UserRole } from "@/types/database";

export interface DemandDetail {
  id: string;
  client_id: string;
  nome_demanda: string;
  consultor_nome: string;
  consultor_email: string;
  valor: number | null;
  markup: number | null;
  valor_bruto: number | null;
  solucoes: string[];
  prazo: string | null;
  contatos: Contato[];
  signatario_email: string | null;
  status: DemandStatus;
  comercial_responsavel_id: string | null;
  juridico_prazo_inicio: string | null;
  juridico_prazo_dias: number | null;
  juridico_prazo_tipo: PrazoTipo | null;
  juridico_prazo_limite: string | null;
  devolucao_motivo: string | null;
  created_at: string;
  updated_at: string;
  clients: { id: string; name: string; cnpj: string } | null;
  comercial: { id: string; name: string; email: string } | null;
}

export interface DemandDocumentItem {
  id: string;
  tipo: DocumentType;
  nome_arquivo: string;
  confidencial: boolean;
  created_at: string;
  uploader: { name: string } | null;
}

export interface DemandCommentItem {
  id: string;
  tipo: CommentType;
  mensagem: string;
  resolvido: boolean;
  created_at: string;
  author: { name: string } | null;
}

export interface DemandHistoryItem {
  id: string;
  status_anterior: DemandStatus | null;
  status_novo: DemandStatus;
  justificativa: string | null;
  created_at: string;
  author: { name: string } | null;
}

export interface DemandTeamMemberItem {
  id: string;
  nome: string;
  funcao: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  responsabilidades: string | null;
  valor_previsto: number | null;
  observacoes: string | null;
  created_at: string;
}

export interface DemandPaymentItem {
  id: string;
  beneficiario: string;
  valor: number;
  vencimento: string;
  status: PaymentStatus;
  observacoes: string | null;
  comprovante_id: string | null;
  created_at: string;
}

export interface DemandFinanceResumo {
  demand_id: string;
  total_previsto: number;
  total_pago: number;
  saldo_pendente: number;
  qtd_atrasados: number;
}

export interface DemandSignature {
  id: string;
  data_assinatura: string;
  document: { nome_arquivo: string } | null;
}

export interface DemandMinutaEnvio {
  id: string;
  destinatario_email: string;
  enviado_em: string;
}

export interface DemandDetailPayload {
  demand: DemandDetail;
  documents: DemandDocumentItem[];
  comments: DemandCommentItem[];
  history: DemandHistoryItem[];
  team: DemandTeamMemberItem[];
  payments: DemandPaymentItem[];
  financeResumo: DemandFinanceResumo | null;
  signature: DemandSignature | null;
  minutaEnvio: DemandMinutaEnvio | null;
  canManagePayments: boolean;
}

export interface SessionInfo {
  id: string;
  name: string;
  role: UserRole;
}
