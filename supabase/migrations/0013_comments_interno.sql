-- Permite marcar um comentário como visível apenas para o setor de quem o
-- escreveu (+ Admin), evitando que anotações internas de um setor (ex.:
-- Jurídico) apareçam misturadas na tela de outro setor (ex.: Comercial).
-- Comentários não marcados como internos continuam visíveis para todos os
-- perfis com acesso à demanda, como já era o comportamento (ex.: devolução
-- ao Comercial, que precisa continuar visível para o Comercial agir).
alter table demand_comments add column if not exists interno boolean not null default false;
