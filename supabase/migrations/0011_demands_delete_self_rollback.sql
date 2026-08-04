-- ============================================================================
-- Permite que o próprio Comercial que criou a demanda a exclua, mas
-- apenas enquanto ela ainda estiver "recebida_comercial" (ninguém além
-- dele mexeu ainda). Usado para desfazer o cadastro quando o anexo
-- obrigatório da proposta falha — a regra de negócio é: o Comercial não
-- pode ter uma demanda registrada sem a proposta anexada.
-- ============================================================================

drop policy demands_delete on demands;

create policy demands_delete on demands
  for delete using (
    is_admin()
    or (auth_role() = 'comercial' and created_by = auth.uid() and status = 'recebida_comercial')
  );
