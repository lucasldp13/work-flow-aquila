-- ============================================================================
-- Dados demonstrativos — Workflow Aquila
--
-- Cria 6 usuários demo diretamente nas tabelas do Supabase Auth (o trigger
-- on_auth_user_created cria o profile correspondente automaticamente) e um
-- conjunto de clientes/demandas cobrindo as principais etapas do workflow.
--
-- Senha de todos os usuários demo: Senha123!
--
-- Rode com: supabase db reset   (aplica as migrations e depois este seed)
-- ou:       psql "$DATABASE_URL" -f supabase/seed.sql
-- ============================================================================

do $$
declare
  v_admin_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_comercial_id uuid := 'a0000000-0000-4000-8000-000000000002';
  v_juridico_id uuid := 'a0000000-0000-4000-8000-000000000003';
  v_projetos_id uuid := 'a0000000-0000-4000-8000-000000000004';
  v_financeiro_id uuid := 'a0000000-0000-4000-8000-000000000005';
  v_comercial2_id uuid := 'a0000000-0000-4000-8000-000000000006';

  v_cliente1 uuid;
  v_cliente2 uuid;
  v_cliente3 uuid;
  v_cliente4 uuid;
  v_cliente5 uuid;

  v_demanda1 uuid;
  v_demanda2 uuid;
  v_demanda3 uuid;
  v_demanda4 uuid;
  v_demanda5 uuid;
  v_demanda6 uuid;

  v_doc uuid;
  v_senha_hash text := crypt('Senha123!', gen_salt('bf'));
begin
  -- --------------------------------------------------------------------
  -- Usuários demo (auth.users) — um por perfil, mais um comercial extra
  -- --------------------------------------------------------------------
  -- Observação: além de confirmation_token/recovery_token, é preciso
  -- zerar explicitamente email_change (sem default no schema do GoTrue)
  -- — deixá-lo NULL causa erro 500 ("converting NULL to string") no login
  -- por senha em algumas versões do Auth.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
     'admin@aquila.com.br', v_senha_hash, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"Administrador Aquila","role":"admin"}',
     now(), now(), '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_comercial_id, 'authenticated', 'authenticated',
     'comercial@aquila.com.br', v_senha_hash, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"Carla Comercial","role":"comercial"}',
     now(), now(), '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_juridico_id, 'authenticated', 'authenticated',
     'juridico@aquila.com.br', v_senha_hash, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"João Jurídico","role":"juridico"}',
     now(), now(), '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_projetos_id, 'authenticated', 'authenticated',
     'projetos@aquila.com.br', v_senha_hash, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"Paula Projetos","role":"projetos"}',
     now(), now(), '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_financeiro_id, 'authenticated', 'authenticated',
     'financeiro@aquila.com.br', v_senha_hash, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"Fábio Financeiro","role":"financeiro"}',
     now(), now(), '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_comercial2_id, 'authenticated', 'authenticated',
     'comercial2@aquila.com.br', v_senha_hash, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"Bruno Comercial","role":"comercial"}',
     now(), now(), '', '', '')
  on conflict (id) do nothing;

  -- identities (necessário para login por e-mail/senha em algumas versões do GoTrue)
  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  select gen_random_uuid(), u.id::text, u.id,
         jsonb_build_object('sub', u.id::text, 'email', u.email),
         'email', now(), now(), now()
  from auth.users u
  where u.id in (v_admin_id, v_comercial_id, v_juridico_id, v_projetos_id, v_financeiro_id, v_comercial2_id)
  on conflict do nothing;

  -- --------------------------------------------------------------------
  -- Configurações administrativas
  -- --------------------------------------------------------------------
  insert into app_settings (chave, valor, updated_by) values
    ('juridico_destinatarios', jsonb_build_object('emails', jsonb_build_array('juridico@aquila.com.br')), v_admin_id),
    ('prazo_juridico', jsonb_build_object('dias', 4, 'tipo', 'uteis'), v_admin_id)
  on conflict (chave) do nothing;

  -- --------------------------------------------------------------------
  -- Clientes
  -- --------------------------------------------------------------------
  insert into clients (name, cnpj, created_by) values
    ('Grupo Horizonte Ltda.', '12.345.678/0001-90', v_comercial_id) returning id into v_cliente1;
  insert into clients (name, cnpj, created_by) values
    ('Metalúrgica São Bento S.A.', '98.765.432/0001-10', v_comercial_id) returning id into v_cliente2;
  insert into clients (name, cnpj, created_by) values
    ('Construtora Vale Verde', '11.222.333/0001-44', v_comercial2_id) returning id into v_cliente3;
  insert into clients (name, cnpj, created_by) values
    ('TechFarma Distribuidora', '22.333.444/0001-55', v_comercial_id) returning id into v_cliente4;
  insert into clients (name, cnpj, created_by) values
    ('Rede Alfa Educação', '33.444.555/0001-66', v_comercial2_id) returning id into v_cliente5;

  -- --------------------------------------------------------------------
  -- Demanda 1: recém recebida do consultor (comercial ainda analisando)
  -- --------------------------------------------------------------------
  insert into demands (client_id, nome_demanda, consultor_nome, consultor_email, valor, markup, escopo, prazo,
                        contatos, signatario_email, status, comercial_responsavel_id, created_by)
  values (v_cliente1, 'Diagnóstico organizacional e plano de ação 2026', 'Ricardo Alves', 'ricardo.alves@consultores.com.br',
          185000.00, 22.5, 'Diagnóstico organizacional completo com entrevistas, mapeamento de processos e plano de ação para 12 meses.',
          current_date + interval '60 days', '[{"nome":"Marina Souza","cargo":"Diretora Administrativa","email":"marina@horizonte.com.br","telefone":"(11) 98888-1111"}]'::jsonb,
          'marina@horizonte.com.br', 'em_analise_comercial', v_comercial_id, v_comercial_id)
  returning id into v_demanda1;

  insert into demand_status_history (demand_id, status_anterior, status_novo, usuario_id, justificativa)
  values (v_demanda1, null, 'recebida_comercial', v_comercial_id, null),
         (v_demanda1, 'recebida_comercial', 'em_analise_comercial', v_comercial_id, null);

  insert into demand_comments (demand_id, user_id, tipo, mensagem) values
    (v_demanda1, v_comercial_id, 'duvida', 'Consultor, poderia confirmar se o escopo inclui as filiais de Campinas e Sorocaba?');

  -- --------------------------------------------------------------------
  -- Demanda 2: encaminhada ao Jurídico, dentro do prazo
  -- --------------------------------------------------------------------
  insert into demands (client_id, nome_demanda, consultor_nome, consultor_email, valor, markup, escopo, prazo,
                        contatos, signatario_email, status, comercial_responsavel_id,
                        juridico_prazo_inicio, juridico_prazo_dias, juridico_prazo_tipo, juridico_prazo_limite, created_by)
  values (v_cliente2, 'Reestruturação da área de compras', 'Fernanda Lima', 'fernanda.lima@consultores.com.br',
          260000.00, 20, 'Reestruturação completa da área de compras, incluindo governança e política de fornecedores.',
          current_date + interval '90 days', '[{"nome":"Eduardo Prado","cargo":"CFO","email":"eduardo@saobento.com.br","telefone":"(41) 97777-2222"}]'::jsonb,
          'eduardo@saobento.com.br', 'em_validacao_juridica', v_comercial_id,
          now() - interval '1 day', 4, 'uteis', current_date + interval '3 days', v_comercial_id)
  returning id into v_demanda2;

  insert into demand_status_history (demand_id, status_anterior, status_novo, usuario_id, justificativa) values
    (v_demanda2, null, 'recebida_comercial', v_comercial_id, null),
    (v_demanda2, 'recebida_comercial', 'em_analise_comercial', v_comercial_id, null),
    (v_demanda2, 'em_analise_comercial', 'encaminhada_juridico', v_comercial_id, null),
    (v_demanda2, 'encaminhada_juridico', 'em_validacao_juridica', v_juridico_id, null);

  -- --------------------------------------------------------------------
  -- Demanda 3: minuta enviada, aguardando assinaturas
  -- --------------------------------------------------------------------
  insert into demands (client_id, nome_demanda, consultor_nome, consultor_email, valor, markup, escopo, prazo,
                        contatos, signatario_email, status, comercial_responsavel_id,
                        juridico_prazo_inicio, juridico_prazo_dias, juridico_prazo_tipo, juridico_prazo_limite, created_by)
  values (v_cliente3, 'Implantação de escritório de projetos (PMO)', 'Ricardo Alves', 'ricardo.alves@consultores.com.br',
          320000.00, 25, 'Implantação de PMO corporativo com metodologia própria e capacitação de equipe interna.',
          current_date + interval '120 days', '[{"nome":"Juliana Matos","cargo":"CEO","email":"juliana@valeverde.com.br","telefone":"(31) 96666-3333"}]'::jsonb,
          'juliana@valeverde.com.br', 'aguardando_assinaturas', v_comercial2_id,
          now() - interval '5 days', 4, 'uteis', current_date - interval '1 day', v_comercial2_id)
  returning id into v_demanda3;

  insert into demand_documents (demand_id, tipo, nome_arquivo, caminho_arquivo, uploaded_by) values
    (v_demanda3, 'proposta', 'proposta-vale-verde.pdf', v_demanda3 || '/proposta-vale-verde.pdf', v_comercial2_id);

  insert into demand_documents (demand_id, tipo, nome_arquivo, caminho_arquivo, uploaded_by) values
    (v_demanda3, 'minuta', 'minuta-contrato-vale-verde.pdf', v_demanda3 || '/minuta-contrato-vale-verde.pdf', v_juridico_id)
  returning id into v_doc;

  insert into demand_minuta_envios (demand_id, usuario_id, destinatario_email, documento_id) values
    (v_demanda3, v_juridico_id, 'juliana@valeverde.com.br', v_doc);

  insert into demand_status_history (demand_id, status_anterior, status_novo, usuario_id, justificativa) values
    (v_demanda3, null, 'recebida_comercial', v_comercial2_id, null),
    (v_demanda3, 'recebida_comercial', 'em_analise_comercial', v_comercial2_id, null),
    (v_demanda3, 'em_analise_comercial', 'encaminhada_juridico', v_comercial2_id, null),
    (v_demanda3, 'encaminhada_juridico', 'em_validacao_juridica', v_juridico_id, null),
    (v_demanda3, 'em_validacao_juridica', 'minuta_em_elaboracao', v_juridico_id, null),
    (v_demanda3, 'minuta_em_elaboracao', 'minuta_enviada', v_juridico_id, null),
    (v_demanda3, 'minuta_enviada', 'aguardando_assinaturas', v_juridico_id, null);

  -- --------------------------------------------------------------------
  -- Demanda 4: contrato assinado, equipe em montagem
  -- --------------------------------------------------------------------
  insert into demands (client_id, nome_demanda, consultor_nome, consultor_email, valor, markup, escopo, prazo,
                        contatos, signatario_email, status, comercial_responsavel_id, created_by)
  values (v_cliente4, 'Consultoria em gestão de estoques e logística', 'Camila Duarte', 'camila.duarte@consultores.com.br',
          145000.00, 18, 'Otimização da cadeia logística e política de estoques mínimos.',
          current_date + interval '75 days', '[{"nome":"André Ferraz","cargo":"Diretor de Operações","email":"andre@techfarma.com.br","telefone":"(11) 95555-4444"}]'::jsonb,
          'andre@techfarma.com.br', 'equipe_em_montagem', v_comercial_id, v_comercial_id)
  returning id into v_demanda4;

  insert into demand_documents (demand_id, tipo, nome_arquivo, caminho_arquivo, uploaded_by) values
    (v_demanda4, 'proposta', 'proposta-techfarma.pdf', v_demanda4 || '/proposta-techfarma.pdf', v_comercial_id);

  insert into demand_documents (demand_id, tipo, nome_arquivo, caminho_arquivo, uploaded_by) values
    (v_demanda4, 'minuta', 'minuta-techfarma.pdf', v_demanda4 || '/minuta-techfarma.pdf', v_juridico_id);

  insert into demand_documents (demand_id, tipo, nome_arquivo, caminho_arquivo, uploaded_by) values
    (v_demanda4, 'contrato_assinado', 'contrato-assinado-techfarma.pdf', v_demanda4 || '/contrato-assinado-techfarma.pdf', v_juridico_id)
  returning id into v_doc;

  insert into demand_signatures (demand_id, documento_id, data_assinatura, usuario_id) values
    (v_demanda4, v_doc, current_date - interval '3 days', v_juridico_id);

  insert into demand_status_history (demand_id, status_anterior, status_novo, usuario_id, justificativa) values
    (v_demanda4, null, 'recebida_comercial', v_comercial_id, null),
    (v_demanda4, 'recebida_comercial', 'em_analise_comercial', v_comercial_id, null),
    (v_demanda4, 'em_analise_comercial', 'encaminhada_juridico', v_comercial_id, null),
    (v_demanda4, 'encaminhada_juridico', 'em_validacao_juridica', v_juridico_id, null),
    (v_demanda4, 'em_validacao_juridica', 'minuta_em_elaboracao', v_juridico_id, null),
    (v_demanda4, 'minuta_em_elaboracao', 'minuta_enviada', v_juridico_id, null),
    (v_demanda4, 'minuta_enviada', 'aguardando_assinaturas', v_juridico_id, null),
    (v_demanda4, 'aguardando_assinaturas', 'contrato_assinado', v_juridico_id, null),
    (v_demanda4, 'contrato_assinado', 'equipe_em_montagem', v_juridico_id, null);

  insert into demand_team_members (demand_id, nome, funcao, periodo_inicio, periodo_fim, responsabilidades, valor_previsto, created_by)
  values (v_demanda4, 'Patrícia Nunes', 'Gerente de Projeto', current_date, current_date + interval '75 days',
          'Coordenação geral do projeto e relacionamento com o cliente', 28000, v_projetos_id);

  -- --------------------------------------------------------------------
  -- Demanda 5: em processamento financeiro
  -- --------------------------------------------------------------------
  insert into demands (client_id, nome_demanda, consultor_nome, consultor_email, valor, markup, escopo, prazo,
                        contatos, signatario_email, status, comercial_responsavel_id, created_by)
  values (v_cliente5, 'Programa de capacitação de lideranças', 'Fernanda Lima', 'fernanda.lima@consultores.com.br',
          98000.00, 15, 'Programa de capacitação de lideranças em 4 módulos presenciais.',
          current_date + interval '45 days', '[{"nome":"Sérgio Melo","cargo":"Diretor de Pessoas","email":"sergio@redealfa.com.br","telefone":"(19) 94444-5555"}]'::jsonb,
          'sergio@redealfa.com.br', 'em_processamento_financeiro', v_comercial2_id, v_comercial2_id)
  returning id into v_demanda5;

  insert into demand_team_members (demand_id, nome, funcao, periodo_inicio, periodo_fim, responsabilidades, valor_previsto, created_by)
  values
    (v_demanda5, 'Renato Cardoso', 'Facilitador Sênior', current_date, current_date + interval '45 days', 'Condução dos módulos presenciais', 32000, v_projetos_id),
    (v_demanda5, 'Bianca Rocha', 'Analista de Projetos', current_date, current_date + interval '45 days', 'Apoio logístico e materiais', 12000, v_projetos_id);

  insert into demand_payments (demand_id, beneficiario, valor, vencimento, status, observacoes, created_by) values
    (v_demanda5, 'Renato Cardoso', 16000, current_date + interval '15 days', 'programado', 'Primeira parcela — 50%', v_financeiro_id),
    (v_demanda5, 'Renato Cardoso', 16000, current_date + interval '45 days', 'pendente', 'Segunda parcela — 50%', v_financeiro_id),
    (v_demanda5, 'Bianca Rocha', 12000, current_date - interval '2 days', 'atrasado', 'Pagamento único', v_financeiro_id);

  insert into demand_status_history (demand_id, status_anterior, status_novo, usuario_id, justificativa) values
    (v_demanda5, null, 'recebida_comercial', v_comercial2_id, null),
    (v_demanda5, 'recebida_comercial', 'em_analise_comercial', v_comercial2_id, null),
    (v_demanda5, 'em_analise_comercial', 'encaminhada_juridico', v_comercial2_id, null),
    (v_demanda5, 'encaminhada_juridico', 'em_validacao_juridica', v_juridico_id, null),
    (v_demanda5, 'em_validacao_juridica', 'minuta_em_elaboracao', v_juridico_id, null),
    (v_demanda5, 'minuta_em_elaboracao', 'minuta_enviada', v_juridico_id, null),
    (v_demanda5, 'minuta_enviada', 'aguardando_assinaturas', v_juridico_id, null),
    (v_demanda5, 'aguardando_assinaturas', 'contrato_assinado', v_juridico_id, null),
    (v_demanda5, 'contrato_assinado', 'equipe_em_montagem', v_juridico_id, null),
    (v_demanda5, 'equipe_em_montagem', 'equipe_definida', v_projetos_id, null),
    (v_demanda5, 'equipe_definida', 'em_processamento_financeiro', v_projetos_id, null);

  -- --------------------------------------------------------------------
  -- Demanda 6: devolvida ao comercial (exemplo de trava com justificativa)
  -- --------------------------------------------------------------------
  insert into demands (client_id, nome_demanda, consultor_nome, consultor_email, valor, markup, escopo, prazo,
                        contatos, signatario_email, status, comercial_responsavel_id, devolucao_motivo, created_by)
  values (v_cliente1, 'Revisão da política comercial', 'Camila Duarte', 'camila.duarte@consultores.com.br',
          75000.00, 20, 'Revisão e atualização da política comercial e de descontos.',
          current_date + interval '30 days', '[{"nome":"Marina Souza","cargo":"Diretora Administrativa","email":"marina@horizonte.com.br","telefone":"(11) 98888-1111"}]'::jsonb,
          '', 'devolvida_comercial', v_comercial_id,
          'Faltam os dados completos do CNPJ da contratante e o e-mail do responsável pela assinatura não foi informado.', v_comercial_id)
  returning id into v_demanda6;

  insert into demand_status_history (demand_id, status_anterior, status_novo, usuario_id, justificativa) values
    (v_demanda6, null, 'recebida_comercial', v_comercial_id, null),
    (v_demanda6, 'recebida_comercial', 'em_analise_comercial', v_comercial_id, null),
    (v_demanda6, 'em_analise_comercial', 'encaminhada_juridico', v_comercial_id, null),
    (v_demanda6, 'encaminhada_juridico', 'em_validacao_juridica', v_juridico_id, null),
    (v_demanda6, 'em_validacao_juridica', 'devolvida_comercial', v_juridico_id,
     'Faltam os dados completos do CNPJ da contratante e o e-mail do responsável pela assinatura não foi informado.');

  insert into demand_comments (demand_id, user_id, tipo, mensagem) values
    (v_demanda6, v_juridico_id, 'devolucao', 'Faltam os dados completos do CNPJ da contratante e o e-mail do responsável pela assinatura não foi informado.');

end $$;
