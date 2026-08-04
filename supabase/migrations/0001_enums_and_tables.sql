-- ============================================================================
-- Workflow Aquila — Schema inicial
-- Perfis, clientes, demandas e todas as tabelas de apoio do workflow
-- Comercial -> Jurídico -> Assinatura -> Projetos -> Financeiro
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

create type user_role as enum (
  'admin',
  'comercial',
  'juridico',
  'projetos',
  'financeiro'
);

create type demand_status as enum (
  'recebida_comercial',
  'em_analise_comercial',
  'aguardando_retorno_consultor',
  'encaminhada_juridico',
  'em_validacao_juridica',
  'devolvida_comercial',
  'minuta_em_elaboracao',
  'minuta_enviada',
  'aguardando_assinaturas',
  'contrato_assinado',
  'equipe_em_montagem',
  'equipe_definida',
  'em_processamento_financeiro',
  'concluida'
);

create type document_type as enum (
  'proposta',
  'minuta',
  'contrato_assinado',
  'equipe',
  'comprovante',
  'outro'
);

create type comment_type as enum (
  'duvida',
  'resposta',
  'comentario',
  'devolucao'
);

create type payment_status as enum (
  'pendente',
  'programado',
  'pago',
  'atrasado',
  'cancelado'
);

create type email_status as enum (
  'pendente',
  'enviado',
  'falhou'
);

create type prazo_tipo as enum (
  'uteis',
  'corridos'
);

-- ----------------------------------------------------------------------------
-- PROFILES (perfis de usuário, vinculados ao auth.users do Supabase)
-- ----------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role user_role not null default 'comercial',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Perfil de cada usuário do sistema (1:1 com auth.users), com papel (role) e status ativo/inativo.';

-- ----------------------------------------------------------------------------
-- CLIENTS
-- ----------------------------------------------------------------------------

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index clients_cnpj_idx on clients (cnpj);

-- ----------------------------------------------------------------------------
-- DEMANDS (núcleo do workflow)
-- ----------------------------------------------------------------------------

create table demands (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  nome_demanda text not null,

  -- dados do consultor que enviou a proposta original
  consultor_nome text not null,
  consultor_email text not null,

  -- dados comerciais
  valor numeric(14,2),
  markup numeric(6,2),
  escopo text,
  prazo date,
  contatos jsonb not null default '[]'::jsonb,

  -- assinatura
  signatario_email text,

  status demand_status not null default 'recebida_comercial',

  comercial_responsavel_id uuid references profiles(id),

  -- prazo jurídico
  juridico_prazo_inicio timestamptz,
  juridico_prazo_dias integer,
  juridico_prazo_tipo prazo_tipo,
  juridico_prazo_limite date,

  -- devolução ao comercial
  devolucao_motivo text,

  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index demands_status_idx on demands (status);
create index demands_client_idx on demands (client_id);

-- ----------------------------------------------------------------------------
-- DOCUMENTS (proposta, minuta, contrato assinado, docs de equipe, comprovantes)
-- ----------------------------------------------------------------------------

create table demand_documents (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands(id) on delete cascade,
  tipo document_type not null,
  nome_arquivo text not null,
  caminho_arquivo text not null,
  tamanho_bytes bigint,
  confidencial boolean not null default true,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index demand_documents_demand_idx on demand_documents (demand_id);

-- ----------------------------------------------------------------------------
-- COMMENTS (dúvidas, respostas, comentários gerais, motivos de devolução)
-- ----------------------------------------------------------------------------

create table demand_comments (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands(id) on delete cascade,
  user_id uuid references profiles(id),
  tipo comment_type not null default 'comentario',
  mensagem text not null,
  resolvido boolean not null default false,
  created_at timestamptz not null default now()
);

create index demand_comments_demand_idx on demand_comments (demand_id);

-- ----------------------------------------------------------------------------
-- STATUS HISTORY (linha do tempo / auditoria)
-- ----------------------------------------------------------------------------

create table demand_status_history (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands(id) on delete cascade,
  status_anterior demand_status,
  status_novo demand_status not null,
  usuario_id uuid references profiles(id),
  justificativa text,
  created_at timestamptz not null default now()
);

create index demand_status_history_demand_idx on demand_status_history (demand_id);

-- ----------------------------------------------------------------------------
-- MINUTA — registro de envio (trava obrigatória controlada na aplicação)
-- ----------------------------------------------------------------------------

create table demand_minuta_envios (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands(id) on delete cascade,
  usuario_id uuid references profiles(id),
  destinatario_email text not null,
  documento_id uuid references demand_documents(id),
  enviado_em timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ASSINATURA — contrato assinado anexado manualmente
-- ----------------------------------------------------------------------------

create table demand_signatures (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands(id) on delete cascade unique,
  documento_id uuid references demand_documents(id) not null,
  data_assinatura date not null,
  usuario_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- EQUIPE DO PROJETO (Projetos)
-- ----------------------------------------------------------------------------

create table demand_team_members (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands(id) on delete cascade,
  nome text not null,
  funcao text not null,
  periodo_inicio date,
  periodo_fim date,
  responsabilidades text,
  valor_previsto numeric(14,2),
  observacoes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index demand_team_members_demand_idx on demand_team_members (demand_id);

-- ----------------------------------------------------------------------------
-- PAGAMENTOS (Financeiro)
-- ----------------------------------------------------------------------------

create table demand_payments (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands(id) on delete cascade,
  beneficiario text not null,
  valor numeric(14,2) not null,
  vencimento date not null,
  status payment_status not null default 'pendente',
  comprovante_id uuid references demand_documents(id),
  observacoes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index demand_payments_demand_idx on demand_payments (demand_id);

-- ----------------------------------------------------------------------------
-- E-MAIL NOTIFICATIONS (log de envios automáticos ao Jurídico etc.)
-- ----------------------------------------------------------------------------

create table email_notifications (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid references demands(id) on delete cascade,
  action_key text not null,
  destinatarios text[] not null,
  assunto text not null,
  corpo_html text,
  status email_status not null default 'pendente',
  tentativas integer not null default 0,
  ultimo_erro text,
  enviado_em timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (demand_id, action_key)
);

create index email_notifications_demand_idx on email_notifications (demand_id);
create index email_notifications_status_idx on email_notifications (status);

-- ----------------------------------------------------------------------------
-- NOTIFICAÇÕES INTERNAS (sino de notificações dentro do app)
-- ----------------------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  demand_id uuid references demands(id) on delete cascade,
  mensagem text not null,
  link text,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, lida);

-- ----------------------------------------------------------------------------
-- CONFIGURAÇÕES DO SISTEMA (painel administrativo)
-- ----------------------------------------------------------------------------

create table app_settings (
  chave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

comment on table app_settings is 'Configurações administráveis: destinatários do Jurídico, prazo (dias úteis/corridos), etc.';
