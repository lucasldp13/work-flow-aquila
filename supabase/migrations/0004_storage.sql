-- ============================================================================
-- Storage — bucket privado para documentos do workflow
-- Nenhuma policy de acesso direto é criada para "anon"/"authenticated":
-- todo upload/leitura de arquivo passa por uma rota de servidor
-- (Next.js API Route) que usa a service role, valida o perfil do usuário
-- e o tipo de documento antes de gerar uma URL assinada de curta duração.
-- Isso garante que documentos confidenciais nunca fiquem publicamente
-- acessíveis e que o controle de acesso por perfil seja aplicado de forma
-- centralizada no backend.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos', 'documentos', false, 26214400)
on conflict (id) do nothing;

-- Nenhuma policy adicional é necessária: por padrão, com RLS habilitado no
-- storage.objects (padrão do Supabase) e sem policies para os papéis
-- "anon"/"authenticated", somente a service role (que ignora RLS) consegue
-- ler/gravar objetos deste bucket.
