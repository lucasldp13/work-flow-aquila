-- ============================================================================
-- Permite que o Administrador exclua demandas (ex.: remover dados de
-- demonstração/teste). Nenhum outro perfil pode excluir.
-- As tabelas filhas (documentos, comentários, histórico, equipe,
-- pagamentos, envios de minuta, assinaturas, notificações de e-mail e
-- internas) têm "on delete cascade" para demand_id e são removidas
-- automaticamente pelo Postgres — a limpeza dos arquivos no Storage é
-- feita pela rota de API antes de excluir a linha da demanda.
-- ============================================================================

create policy demands_delete on demands
  for delete using (is_admin());
