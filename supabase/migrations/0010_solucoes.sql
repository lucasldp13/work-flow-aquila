-- ============================================================================
-- Renomeia "Escopo" (texto livre) para "Solução" (uma ou mais opções
-- pré-definidas do catálogo de soluções da Aquila). Converte o texto já
-- cadastrado em um array de um elemento, para não perder dados.
-- ============================================================================

alter table demands rename column escopo to solucoes;

alter table demands
  alter column solucoes type text[]
  using case when solucoes is null or solucoes = '' then '{}'::text[] else array[solucoes] end;

alter table demands alter column solucoes set default '{}';
