-- ============================================================================
-- Views auxiliares
-- ============================================================================

-- Resumo financeiro agregado por demanda — visível a todos os perfis
-- internos, sem expor beneficiários/valores individuais de cada pagamento.
-- Importante: esta view NÃO usa security_invoker, propositalmente. Ela roda
-- com o privilégio do papel que executou a migração (que ignora RLS em
-- demand_payments), enquanto o acesso de cada usuário final é controlado
-- pelo GRANT abaixo — assim todos veem o agregado, mas o SELECT direto na
-- tabela demand_payments continua restrito a Financeiro/Admin pela RLS.
create view demand_financeiro_resumo
as
select
  demand_id,
  coalesce(sum(valor) filter (where status <> 'cancelado'), 0) as total_previsto,
  coalesce(sum(valor) filter (where status = 'pago'), 0) as total_pago,
  coalesce(sum(valor) filter (where status in ('pendente', 'programado', 'atrasado')), 0) as saldo_pendente,
  count(*) filter (where status = 'atrasado') as qtd_atrasados
from demand_payments
group by demand_id;

grant select on demand_financeiro_resumo to authenticated;
