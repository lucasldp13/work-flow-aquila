-- ============================================================================
-- Valor bruto — calculado automaticamente a partir do valor líquido
-- informado pelo Comercial e do markup: valor_bruto = valor / (1 - markup/100)
-- O cálculo é feito na aplicação (lib/workflow/pricing.ts) sempre que
-- `valor` ou `markup` são gravados, e o resultado fica persistido aqui
-- para uso em listagens, relatórios e no detalhe da demanda.
-- ============================================================================

alter table demands add column valor_bruto numeric(14,2);
