-- ============================================================================
-- Confirmação interna de envio da minuta: quando o Jurídico registra que
-- a minuta foi enviada ao cliente (envio esse que continua manual, fora
-- do sistema), um e-mail interno é disparado automaticamente para os
-- destinatários configurados aqui, com um texto editável pelo admin.
-- ============================================================================

insert into app_settings (chave, valor) values
  ('minuta_confirmacao_interna', jsonb_build_object(
    'emails', '[]'::jsonb,
    'texto', 'A minuta contratual foi registrada como enviada ao cliente. Acompanhe o andamento da assinatura pelo sistema.'
  ))
on conflict (chave) do nothing;
