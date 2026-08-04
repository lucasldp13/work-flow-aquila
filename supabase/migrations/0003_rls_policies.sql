-- ============================================================================
-- Row Level Security — todas as tabelas
-- Princípios:
--  * Todos os perfis internos autenticados podem visualizar o andamento
--    geral (SELECT amplo nas tabelas de workflow).
--  * Apenas o setor "dono" da etapa atual (ou admin) pode alterar a demanda.
--  * Dados financeiros detalhados (pagamentos) ficam restritos a
--    Financeiro/Admin — os demais setores veem apenas o resumo agregado
--    (view demand_financeiro_resumo).
--  * Toda escrita em profiles e em email_notifications acontece via rotas
--    de servidor usando a service role (não há policies de INSERT/UPDATE
--    de cliente para essas tabelas).
-- ============================================================================

alter table profiles enable row level security;
alter table clients enable row level security;
alter table demands enable row level security;
alter table demand_documents enable row level security;
alter table demand_comments enable row level security;
alter table demand_status_history enable row level security;
alter table demand_minuta_envios enable row level security;
alter table demand_signatures enable row level security;
alter table demand_team_members enable row level security;
alter table demand_payments enable row level security;
alter table email_notifications enable row level security;
alter table notifications enable row level security;
alter table app_settings enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------

create policy profiles_select_all on profiles
  for select using (auth.uid() is not null);

-- O próprio usuário pode atualizar seu registro (ex.: nome); um trigger
-- (enforce_profile_self_update, em 0002) impede que role/active sejam
-- alterados por quem não é admin — evita subquery recursiva na policy.
create policy profiles_update_self on profiles
  for update using (auth.uid() = id or is_admin());

-- ----------------------------------------------------------------------------
-- CLIENTS
-- ----------------------------------------------------------------------------

create policy clients_select_all on clients
  for select using (auth.uid() is not null);

create policy clients_insert on clients
  for insert with check (auth_role() in ('comercial', 'admin'));

create policy clients_update on clients
  for update using (auth_role() in ('comercial', 'admin'));

-- ----------------------------------------------------------------------------
-- DEMANDS
-- ----------------------------------------------------------------------------

create policy demands_select_all on demands
  for select using (auth.uid() is not null);

create policy demands_insert on demands
  for insert with check (auth_role() in ('comercial', 'admin'));

create policy demands_update on demands
  for update
  using (is_admin() or auth_role() = demand_owner_role(status))
  with check (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- DOCUMENTS
-- ----------------------------------------------------------------------------

create policy demand_documents_select_all on demand_documents
  for select using (auth.uid() is not null);

create policy demand_documents_insert on demand_documents
  for insert with check (
    is_admin() or exists (
      select 1 from demands d
       where d.id = demand_id
         and auth_role() = demand_owner_role(d.status)
    )
  );

-- ----------------------------------------------------------------------------
-- COMMENTS (dúvidas, respostas, devoluções)
-- ----------------------------------------------------------------------------

create policy demand_comments_select_all on demand_comments
  for select using (auth.uid() is not null);

create policy demand_comments_insert on demand_comments
  for insert with check (auth.uid() is not null and (user_id = auth.uid() or user_id is null));

create policy demand_comments_update on demand_comments
  for update using (user_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------------------
-- STATUS HISTORY
-- ----------------------------------------------------------------------------

create policy demand_status_history_select_all on demand_status_history
  for select using (auth.uid() is not null);

create policy demand_status_history_insert on demand_status_history
  for insert with check (usuario_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------------------
-- MINUTA — envio (somente Jurídico/Admin)
-- ----------------------------------------------------------------------------

create policy demand_minuta_envios_select_all on demand_minuta_envios
  for select using (auth.uid() is not null);

create policy demand_minuta_envios_insert on demand_minuta_envios
  for insert with check (auth_role() in ('juridico', 'admin'));

-- ----------------------------------------------------------------------------
-- ASSINATURA (somente Jurídico/Admin anexam o contrato assinado)
-- ----------------------------------------------------------------------------

create policy demand_signatures_select_all on demand_signatures
  for select using (auth.uid() is not null);

create policy demand_signatures_insert on demand_signatures
  for insert with check (auth_role() in ('juridico', 'admin'));

-- ----------------------------------------------------------------------------
-- EQUIPE (somente Projetos/Admin, e apenas com a demanda em montagem)
-- ----------------------------------------------------------------------------

create policy demand_team_members_select_all on demand_team_members
  for select using (auth.uid() is not null);

create policy demand_team_members_insert on demand_team_members
  for insert with check (
    is_admin() or (
      auth_role() = 'projetos' and exists (
        select 1 from demands d
         where d.id = demand_id
           and d.status = 'equipe_em_montagem'
      )
    )
  );

create policy demand_team_members_update on demand_team_members
  for update using (
    is_admin() or (
      auth_role() = 'projetos' and exists (
        select 1 from demands d
         where d.id = demand_id
           and d.status = 'equipe_em_montagem'
      )
    )
  );

create policy demand_team_members_delete on demand_team_members
  for delete using (
    is_admin() or (
      auth_role() = 'projetos' and exists (
        select 1 from demands d
         where d.id = demand_id
           and d.status = 'equipe_em_montagem'
      )
    )
  );

-- ----------------------------------------------------------------------------
-- PAGAMENTOS — restrito a Financeiro/Admin (dados financeiros confidenciais)
-- ----------------------------------------------------------------------------

create policy demand_payments_select on demand_payments
  for select using (auth_role() in ('financeiro', 'admin'));

create policy demand_payments_insert on demand_payments
  for insert with check (auth_role() in ('financeiro', 'admin'));

create policy demand_payments_update on demand_payments
  for update using (auth_role() in ('financeiro', 'admin'));

-- ----------------------------------------------------------------------------
-- E-MAIL NOTIFICATIONS — leitura para admin e para o comercial responsável
-- (escrita somente via service role no backend)
-- ----------------------------------------------------------------------------

create policy email_notifications_select on email_notifications
  for select using (
    is_admin()
    or auth_role() in ('comercial', 'juridico')
    or exists (
      select 1 from demands d
       where d.id = demand_id
         and d.comercial_responsavel_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- NOTIFICAÇÕES INTERNAS — cada usuário só vê e altera as suas
-- ----------------------------------------------------------------------------

create policy notifications_select_own on notifications
  for select using (user_id = auth.uid());

create policy notifications_update_own on notifications
  for update using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- APP SETTINGS — leitura geral, escrita somente admin
-- ----------------------------------------------------------------------------

create policy app_settings_select_all on app_settings
  for select using (auth.uid() is not null);

create policy app_settings_upsert on app_settings
  for insert with check (is_admin());

create policy app_settings_update on app_settings
  for update using (is_admin());
