-- ============================================================================
-- Guarda a classificação original do cliente (Cliente ativo, Cliente
-- Inativo, Ex-Cliente, Potencial Prospectado, Potencial não Prospectado)
-- importada da base comercial — exibida como referência na busca de
-- clientes ao cadastrar uma nova demanda, para ajudar a diferenciar
-- registros de nomes parecidos.
-- ============================================================================

alter table clients add column classificacao text;
