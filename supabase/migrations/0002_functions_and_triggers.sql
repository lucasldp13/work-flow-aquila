-- ============================================================================
-- Funções auxiliares, triggers de updated_at, criação automática de perfil
-- e função transacional de transição de status
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helpers de papel do usuário autenticado
-- ----------------------------------------------------------------------------

create or replace function auth_role()
returns user_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth_role() = 'admin', false);
$$;

-- ----------------------------------------------------------------------------
-- Papel "dono" da etapa atual da demanda — usado nas policies de RLS
-- ----------------------------------------------------------------------------

create or replace function demand_owner_role(s demand_status)
returns user_role
language sql
immutable
as $$
  select case s
    when 'recebida_comercial' then 'comercial'::user_role
    when 'em_analise_comercial' then 'comercial'::user_role
    when 'aguardando_retorno_consultor' then 'comercial'::user_role
    when 'devolvida_comercial' then 'comercial'::user_role
    when 'encaminhada_juridico' then 'juridico'::user_role
    when 'em_validacao_juridica' then 'juridico'::user_role
    when 'minuta_em_elaboracao' then 'juridico'::user_role
    when 'minuta_enviada' then 'juridico'::user_role
    when 'aguardando_assinaturas' then 'juridico'::user_role
    when 'contrato_assinado' then 'juridico'::user_role
    when 'equipe_em_montagem' then 'projetos'::user_role
    when 'equipe_definida' then 'projetos'::user_role
    when 'em_processamento_financeiro' then 'financeiro'::user_role
    when 'concluida' then 'financeiro'::user_role
  end;
$$;

-- ----------------------------------------------------------------------------
-- updated_at automático
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger demands_set_updated_at
  before update on demands
  for each row execute function set_updated_at();

create trigger demand_payments_set_updated_at
  before update on demand_payments
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Criação automática de profile ao criar usuário no Supabase Auth
-- (o painel administrativo define name/role via user_metadata)
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'comercial'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Impede que um usuário não-admin altere seu próprio papel (role) ou status
-- (active) via update direto — só o painel administrativo (admin) pode.
-- ----------------------------------------------------------------------------

create or replace function public.enforce_profile_self_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_admin() then
    if new.role is distinct from old.role or new.active is distinct from old.active then
      raise exception 'Apenas administradores podem alterar papel (role) ou status (active) de um perfil';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_enforce_self_update
  before update on profiles
  for each row execute function public.enforce_profile_self_update();

-- ----------------------------------------------------------------------------
-- Transição transacional de status + registro na linha do tempo
-- Executada com privilégios do chamador (security invoker): a RLS de
-- `demands` e `demand_status_history` continua valendo, garantindo que
-- somente o setor dono da etapa atual (ou admin) possa transicionar.
-- As regras finas de "não pular etapa" e campos obrigatórios são
-- validadas antes, na camada de aplicação (lib/workflow).
-- ----------------------------------------------------------------------------

create or replace function public.transition_demand(
  p_demand_id uuid,
  p_novo_status demand_status,
  p_justificativa text default null
)
returns demands
language plpgsql
security invoker
as $$
declare
  v_status_atual demand_status;
  v_row demands;
begin
  select status into v_status_atual from demands where id = p_demand_id for update;

  if v_status_atual is null then
    raise exception 'Demanda não encontrada';
  end if;

  update demands
     set status = p_novo_status,
         devolucao_motivo = case when p_novo_status = 'devolvida_comercial' then p_justificativa else devolucao_motivo end
   where id = p_demand_id
   returning * into v_row;

  insert into demand_status_history (demand_id, status_anterior, status_novo, usuario_id, justificativa)
  values (p_demand_id, v_status_atual, p_novo_status, auth.uid(), p_justificativa);

  return v_row;
end;
$$;
