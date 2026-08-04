-- ============================================================================
-- Consultores — lista pré-cadastrada de responsáveis por demandas
-- (nome, e-mail e categoria), usada como sugestão/autocomplete no
-- cadastro de novas demandas pelo Comercial.
-- ============================================================================

create table consultores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  categoria text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index consultores_nome_idx on consultores (nome);

alter table consultores enable row level security;

create policy consultores_select_all on consultores
  for select using (auth.uid() is not null);

create policy consultores_insert on consultores
  for insert with check (is_admin());

create policy consultores_update on consultores
  for update using (is_admin());

create policy consultores_delete on consultores
  for delete using (is_admin());
