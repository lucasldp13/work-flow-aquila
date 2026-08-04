// Tipos do banco de dados (Supabase). Escritos manualmente a partir das
// migrations em supabase/migrations — mantenha em sincronia ao alterar o
// schema. Para gerar automaticamente a partir de um projeto real, use:
//   npx supabase gen types typescript --project-id <id> > types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "admin" | "comercial" | "juridico" | "projetos" | "financeiro";

export type DemandStatus =
  | "recebida_comercial"
  | "em_analise_comercial"
  | "aguardando_retorno_consultor"
  | "encaminhada_juridico"
  | "em_validacao_juridica"
  | "devolvida_comercial"
  | "minuta_em_elaboracao"
  | "minuta_enviada"
  | "aguardando_assinaturas"
  | "contrato_assinado"
  | "equipe_em_montagem"
  | "equipe_definida"
  | "em_processamento_financeiro"
  | "concluida";

export type DocumentType = "proposta" | "minuta" | "contrato_assinado" | "equipe" | "comprovante" | "outro";
export type CommentType = "duvida" | "resposta" | "comentario" | "devolucao";
export type PaymentStatus = "pendente" | "programado" | "pago" | "atrasado" | "cancelado";
export type EmailStatus = "pendente" | "enviado" | "falhou";
export type PrazoTipo = "uteis" | "corridos";

export interface Contato {
  nome: string;
  cargo?: string;
  email: string;
  telefone?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: UserRole;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; name: string; email: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      clients: {
        Row: {
          id: string;
          name: string;
          cnpj: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["clients"]["Row"]> & { name: string; cnpj: string };
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
      };
      consultores: {
        Row: {
          id: string;
          nome: string;
          email: string;
          categoria: string | null;
          ativo: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["consultores"]["Row"]> & { nome: string; email: string };
        Update: Partial<Database["public"]["Tables"]["consultores"]["Row"]>;
      };
      demands: {
        Row: {
          id: string;
          client_id: string;
          nome_demanda: string;
          consultor_nome: string;
          consultor_email: string;
          valor: number | null;
          markup: number | null;
          escopo: string | null;
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
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["demands"]["Row"]> & {
          client_id: string;
          nome_demanda: string;
          consultor_nome: string;
          consultor_email: string;
        };
        Update: Partial<Database["public"]["Tables"]["demands"]["Row"]>;
      };
      demand_documents: {
        Row: {
          id: string;
          demand_id: string;
          tipo: DocumentType;
          nome_arquivo: string;
          caminho_arquivo: string;
          tamanho_bytes: number | null;
          confidencial: boolean;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["demand_documents"]["Row"]> & {
          demand_id: string;
          tipo: DocumentType;
          nome_arquivo: string;
          caminho_arquivo: string;
        };
        Update: Partial<Database["public"]["Tables"]["demand_documents"]["Row"]>;
      };
      demand_comments: {
        Row: {
          id: string;
          demand_id: string;
          user_id: string | null;
          tipo: CommentType;
          mensagem: string;
          resolvido: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["demand_comments"]["Row"]> & { demand_id: string; mensagem: string };
        Update: Partial<Database["public"]["Tables"]["demand_comments"]["Row"]>;
      };
      demand_status_history: {
        Row: {
          id: string;
          demand_id: string;
          status_anterior: DemandStatus | null;
          status_novo: DemandStatus;
          usuario_id: string | null;
          justificativa: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["demand_status_history"]["Row"]> & {
          demand_id: string;
          status_novo: DemandStatus;
        };
        Update: Partial<Database["public"]["Tables"]["demand_status_history"]["Row"]>;
      };
      demand_minuta_envios: {
        Row: {
          id: string;
          demand_id: string;
          usuario_id: string | null;
          destinatario_email: string;
          documento_id: string | null;
          enviado_em: string;
        };
        Insert: Partial<Database["public"]["Tables"]["demand_minuta_envios"]["Row"]> & {
          demand_id: string;
          destinatario_email: string;
        };
        Update: Partial<Database["public"]["Tables"]["demand_minuta_envios"]["Row"]>;
      };
      demand_signatures: {
        Row: {
          id: string;
          demand_id: string;
          documento_id: string;
          data_assinatura: string;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["demand_signatures"]["Row"]> & {
          demand_id: string;
          documento_id: string;
          data_assinatura: string;
        };
        Update: Partial<Database["public"]["Tables"]["demand_signatures"]["Row"]>;
      };
      demand_team_members: {
        Row: {
          id: string;
          demand_id: string;
          nome: string;
          funcao: string;
          periodo_inicio: string | null;
          periodo_fim: string | null;
          responsabilidades: string | null;
          valor_previsto: number | null;
          observacoes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["demand_team_members"]["Row"]> & {
          demand_id: string;
          nome: string;
          funcao: string;
        };
        Update: Partial<Database["public"]["Tables"]["demand_team_members"]["Row"]>;
      };
      demand_payments: {
        Row: {
          id: string;
          demand_id: string;
          beneficiario: string;
          valor: number;
          vencimento: string;
          status: PaymentStatus;
          comprovante_id: string | null;
          observacoes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["demand_payments"]["Row"]> & {
          demand_id: string;
          beneficiario: string;
          valor: number;
          vencimento: string;
        };
        Update: Partial<Database["public"]["Tables"]["demand_payments"]["Row"]>;
      };
      email_notifications: {
        Row: {
          id: string;
          demand_id: string | null;
          action_key: string;
          destinatarios: string[];
          assunto: string;
          corpo_html: string | null;
          status: EmailStatus;
          tentativas: number;
          ultimo_erro: string | null;
          enviado_em: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["email_notifications"]["Row"]> & {
          action_key: string;
          destinatarios: string[];
          assunto: string;
        };
        Update: Partial<Database["public"]["Tables"]["email_notifications"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          demand_id: string | null;
          mensagem: string;
          link: string | null;
          lida: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & { user_id: string; mensagem: string };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      app_settings: {
        Row: {
          chave: string;
          valor: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["app_settings"]["Row"]> & { chave: string; valor: Json };
        Update: Partial<Database["public"]["Tables"]["app_settings"]["Row"]>;
      };
    };
    Views: {
      demand_financeiro_resumo: {
        Row: {
          demand_id: string;
          total_previsto: number;
          total_pago: number;
          saldo_pendente: number;
          qtd_atrasados: number;
        };
      };
    };
    Functions: {
      transition_demand: {
        Args: { p_demand_id: string; p_novo_status: DemandStatus; p_justificativa?: string | null };
        Returns: Database["public"]["Tables"]["demands"]["Row"];
      };
    };
  };
}
