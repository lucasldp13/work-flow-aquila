# CLAUDE.md — Workflow Aquila (contexto completo do projeto)

> Documento gerado por autocompact de alta fidelidade. Serve como única referência de contexto para continuar o desenvolvimento em uma nova sessão, sem perda de histórico.

---

## 1. Objetivo geral do projeto

Construir e operar em produção um **aplicativo web interno de gestão de fluxo de trabalho** para a **Aquila Consultoria**, cobrindo o processo:

```
Comercial → Jurídico → Assinatura → Projetos → Financeiro
```

Requisitos centrais do pedido original:
- Cadastro de propostas pelo setor **Comercial**.
- Notificação automática por e-mail ao **Jurídico** sempre que o Comercial agir sobre uma demanda.
- Prazo obrigatório de **4 dias** para o Jurídico enviar a minuta (contrato) ao cliente.
- **Trava obrigatória** no botão "Registrar envio da minuta", exigindo simultaneamente: (1) minuta anexada, (2) e-mail do signatário preenchido, (3) formato de e-mail válido, (4) confirmação do e-mail batendo com o original.
- Acompanhamento de assinatura, que libera a demanda para **Projetos**.
- Montagem de equipe em Projetos, que libera a demanda para **Financeiro**.
- Controle de pagamentos no Financeiro.
- **5 perfis de acesso** com permissões distintas: Admin, Comercial, Jurídico, Projetos, Financeiro — Admin com **"acesso total"**.
- **14 status nomeados** no fluxo de trabalho.
- Visões em **lista** e **Kanban**.
- Segurança via **RLS** (Row Level Security) no banco.
- Armazenamento privado de documentos.
- Testes automatizados das regras centrais de negócio.
- Documentação completa.

O escopo evoluiu bastante após o build inicial: o usuário passou a operar o sistema em produção, reportando bugs reais e pedindo ajustes de regras de negócio com base no uso efetivo — incluindo pelo menos uma reversão completa de uma funcionalidade já implementada.

**Usuário/proprietário do projeto:** e-mail `escoladegestao@aquila.com.br` (Pablo, conforme skill `aquila-knowledge` disponível no ambiente). Comunicação sempre em português.

---

## 2. Arquitetura e tecnologias utilizadas

- **Framework:** Next.js **14.2.35** (App Router). Rebaixado deliberadamente a partir da v16 que o `create-next-app` instalou automaticamente, por estabilidade/familiaridade. Posteriormente também recebeu patch dentro da própria série 14.2.x por causa de um aviso de segurança.
- **UI:** React 18.3.1 + TypeScript + Tailwind CSS **v3** (não v4).
- **Backend/dados:** Supabase — Postgres, Auth (GoTrue), Storage (bucket privado `documentos`), Row Level Security (RLS).
- **Clientes Supabase:**
  - `@supabase/ssr` para sessão via cookies em Server Components / Route Handlers / Middleware.
  - `@supabase/supabase-js` para cliente admin (service-role) e cliente browser.
- **Upload de arquivos:** URLs assinadas de upload do Supabase Storage (`createSignedUploadUrl` + `uploadToSignedUrl`) para upload direto navegador→Storage, contornando o limite de payload de função serverless da Vercel (~4,5 MB).
- **Download de documentos:** URLs assinadas de download (`createSignedUrl`), com validade limitada, para acesso privado aos documentos.
- **Validação:** Zod nas rotas de API.
- **Testes:** Vitest, com um mock em memória do cliente Supabase (padrão de builder encadeável suportando `select/eq/upsert/update/maybeSingle/single/then`) usado em `tests/email-notify.test.ts`.
- **E-mail:** Nodemailer para envio SMTP (`lib/email/transport.ts`).
- **Datas:** `date-fns` + `date-fns/locale/ptBR` para formatação em português.
- **Deploy:**
  - Supabase: criação/gestão de projeto via **Management API** (`https://api.supabase.com/v1/projects/{ref}/database/query`, `POST` com `{query: sql}` no corpo e header `Authorization: Bearer $SUPABASE_ACCESS_TOKEN`).
  - Vercel: CLI (`vercel link`, `vercel env add`, `vercel deploy --prod`), orquestrado via Bash com `VERCEL_TOKEN`.
- **Importação de planilhas (.xlsx):** lidas via Python `openpyxl` (instalado ad hoc via pip), convertidas em `INSERT` SQL, aplicadas via Management API.

### Infraestrutura publicada
- **URL de produção:** `https://workflow-aquila.vercel.app`
- **Projeto Vercel:** `workflow-aquila` — `projectId: prj_W7KzeUj22bjLt8miQ04CgT9spG9T`, `orgId: team_UYOmwAIWOT74ETNPXq351WdA` (arquivo `.vercel/project.json` presente no repo local, então o link do projeto já existe — falta apenas autenticação/token para publicar).
- Deploy feito via CLI a partir do código local, **não** via integração Git↔Vercel (uma tentativa de `vercel link` de conectar automaticamente um repositório GitHub falhou com erro 400 — não fatal, ignorado, pois o deploy via CLI não depende disso). Isso significa que **push no GitHub não redeploya automaticamente a Vercel** — é preciso rodar o deploy manualmente (CLI ou dashboard "Redeploy").

---

## 3. Decisões tomadas e justificativas

| Decisão | Justificativa |
|---|---|
| Next.js 14.2.x em vez da v16 auto-instalada | Maior estabilidade e familiaridade das ferramentas/testes com a versão. |
| Tailwind v3 em vez de v4 | Evitar quebras de configuração/breaking changes da v4 recém-lançada. |
| Upload direto navegador→Storage via signed URL | A rota de API da Vercel tem limite de ~4,5 MB de payload; proxying de arquivos grandes travava. Resolvido arquitetonicamente, não com paliativo. |
| Modelo de permissão de perfil único por usuário (`profiles.role` enum) | Simplicidade do modelo de dados; Admin cobre o caso de "múltiplos perfis" porque tem bypass universal tanto na RLS (`is_admin() OR ...`) quanto no código (`requireRole`, `canEditDemandAtStatus`). |
| E-mail ao cliente permanece **manual** (não automático) | Após reversão explícita pedida pelo usuário — ver seção 4 e 8. |
| Confirmação interna de envio de minuta é automática e configurável pelo admin | Atende à necessidade de rastreabilidade interna sem expor o sistema a enviar e-mails não supervisionados a clientes externos. |
| SMTP não configurado inicialmente | Decisão explícita do usuário ("Pode seguir sem SMTP por enquanto"), aceitando que notificações por e-mail vão falhar e cair em notificação interna (sininho) até que credenciais reais sejam fornecidas. |
| Deploy via Supabase/Vercel Management API e CLI com tokens colados no chat pelo usuário | Não havia acesso a dashboards; tokens usados só via variáveis de ambiente em comandos Bash, com orientação de revogação passada ao usuário após uso. |
| Clientes: importar TODOS os registros com CNPJ, não só "ativos" | Import inicial só trouxe clientes com classificação "Cliente ativo" (136/5064). Usuário reportou não achar "Prefeitura Municipal de Nova Serrana" buscando "nova serrana" — causa raiz era dado incompleto, não bug de busca. Corrigido importando as 3849 linhas restantes com CNPJ (dedupe por CNPJ), total 3990. Badge de classificação adicionado na UI para diferenciar registros de nome parecido. |

---

## 4. Regras de negócio definidas

1. **Comercial não pode criar uma demanda sem anexar a proposta antes.** Upload obrigatório; rollback automático se o upload falhar; reforçado tanto no backend quanto na UI, inclusive na etapa de encaminhar ao Jurídico (`forward-juridico`).
2. **Notificação automática ao Jurídico** sempre que o Comercial cadastra, atualiza, anexa documento ou encaminha uma demanda (`notifyJuridico`).
3. **Prazo de 4 dias para o Jurídico enviar a minuta**, contado a partir do encaminhamento da demanda ao Jurídico — configurável em dias úteis/corridos pelo admin (`prazo_juridico` em `app_settings`, default 4 dias úteis). Deve ficar **muito visível** na tela (implementado como badge/alerta destacado, `PrazoJuridicoBadge` / `PrazoInfo`).
4. **Trava obrigatória** no botão "Registrar envio da minuta" — 4 condições simultâneas: minuta anexada, e-mail do signatário preenchido, formato válido, confirmação do e-mail batendo (`checkMinutaEnvio` em `lib/workflow/validations.ts`).
5. **Envio da minuta ao cliente é manual**, feito pelo Jurídico fora do sistema, pelo próprio e-mail dele. O sistema **não** dispara e-mail automático ao cliente/signatário externo (regra revertida — ver histórico abaixo).
6. **Confirmação interna automática**: ao registrar o envio da minuta, o sistema dispara automaticamente um e-mail interno (equipe Aquila) confirmando o registro, com destinatários e texto configuráveis pelo admin.
7. **Assinatura registrada** libera a demanda para **Projetos**.
8. **Montagem de equipe completa** em Projetos libera a demanda para **Financeiro**.
9. **Admin tem acesso total** — bypassa toda checagem de role tanto em RLS quanto em `requireRole`/`canEditDemandAtStatus`. Inclui poder editar informações comerciais da demanda em qualquer etapa (bug corrigido — ver seção 8).
10. **Cálculo automático de valor bruto**: `valorBruto = valorLiquido / (1 - markup/100)`, sempre exibido como resultado (nunca digitado diretamente). Se `markup >= 100`, retorna erro em vez de divisão inválida.
11. **Exclusão de demandas**: permitida para Admin (qualquer demanda) ou para o Comercial que criou a demanda, apenas enquanto o status ainda for `recebida_comercial` (autorregulação — não pode excluir depois que already avançou no fluxo).
12. **Telas/ações não devem se misturar entre perfis** — o que é exclusivo do Jurídico não aparece para o Comercial e vice-versa (regras de visibilidade de abas e painéis de ação por `session.role`).
13. **Sempre exigir login explícito**: ao clicar no link do sistema, o usuário deve sempre cair na tela de login, nunca retomar sessão/página anterior automaticamente.
14. **Busca de clientes** deve trazer todos os nomes que contenham o termo buscado (correspondência parcial ampla), não só os classificados como "ativos".
15. **Consultor responsável**: campo com autocomplete pré-carregado a partir da planilha `equipe_ativa.xlsx` (nome, categoria, e-mail).
16. **Campo "Solução"** (renomeado de "Escopo"): múltipla escolha a partir de lista pré-definida (115 opções, vindas do arquivo `Solução.xlsx`), armazenado como `text[]`.
17. **Proposta anexada pelo Comercial** deve ficar visível/acessível para o Jurídico especificamente durante a elaboração da minuta — o Jurídico precisa abrir e analisar a proposta original antes de montar a minuta.

---

## 5. Fluxos implementados

### Máquina de estados (14 status nomeados)
Gerenciada por `ALLOWED_TRANSITIONS` (mapa de transições permitidas, impedindo pular etapas) e `STATUS_OWNER` (mapa de qual perfil pode agir em cada status). Status conhecidos referenciados no código:
- `recebida_comercial`
- `em_analise_comercial`
- `aguardando_retorno_consultor`
- `devolvida_comercial`
- `encaminhada_juridico`
- `em_validacao_juridica`
- `minuta_em_elaboracao`
- `aguardando_assinaturas`
- (+ demais status cobrindo Projetos e Financeiro até conclusão — 14 no total, conforme especificação original)

### Fluxo Comercial
1. Cadastro de nova demanda (`/demandas/novo`), com upload obrigatório da proposta do consultor.
2. Análise comercial (`em_analise_comercial`): ajustar dados, aguardar retorno do consultor, ou encaminhar ao Jurídico (bloqueado sem proposta anexada — `temProposta` check em `ComercialAnaliseActions`).
3. Se devolvida pelo Jurídico (`devolvida_comercial`): exibe motivo, permite revisar e reenviar.

### Fluxo Jurídico
1. Recebe demanda (`encaminhada_juridico`) — mostra prazo de 4 dias (`PrazoInfo`), inicia validação.
2. Validação jurídica (`em_validacao_juridica`, `JuridicoValidacaoActions`): abre a proposta original (`PropostaLink`), aprova (→ `minuta_em_elaboracao`) ou devolve ao Comercial com justificativa obrigatória.
3. Elaboração/envio da minuta (`minuta_em_elaboracao`, `MinutaEnvioPanel`): anexa minuta, envia manualmente ao cliente por fora do sistema, preenche confirmação de e-mail, registra envio (trava obrigatória de 4 condições) — dispara confirmação interna automática.
4. Aguardando assinaturas (`aguardando_assinaturas`, `AssinaturaPanel`): anexa contrato assinado, registra data de assinatura → libera para Projetos.

### Fluxo Projetos
Montagem de equipe (endpoints `/api/demands/[id]/team`, `/team/[memberId]`, `/team/forward`) — completar a equipe libera para Financeiro.

### Fluxo Financeiro
Registro e acompanhamento de pagamentos (`/api/demands/[id]/payments`, `/payments/[paymentId]`), totais calculados.

### Notificações automáticas por e-mail (com rastreamento)
- Núcleo compartilhado: `sendTrackedEmail` em `lib/email/notify.ts`.
- Deduplicação por `UNIQUE(demand_id, action_key)` + upsert.
- Até `MAX_EMAIL_ATTEMPTS = 3` tentativas com backoff (`INLINE_RETRY_DELAYS_MS = [1500, 4000]`).
- Log de cada tentativa na tabela `email_notifications`.
- Em falha final, cria registro na tabela `notifications` (sininho interno) com mensagem explicativa (`mensagemFalhaInterna`).
- Duas notificações implementadas:
  - `notifyJuridico` — ao Jurídico, sempre que Comercial age sobre uma demanda.
  - `notifyMinutaConfirmacaoInterna` — à equipe interna Aquila, ao registrar envio da minuta (substituiu a antiga `notifySignatario`, removida na reversão).
- `retryFailedEmails` — reprocessamento manual (via admin, rota `/api/email/retry`) ou cron externo.

---

## 6. Funcionalidades concluídas

- Build completo inicial: backend, frontend, banco de dados, testes, documentação, conforme especificação detalhada de múltiplas páginas.
- Deploy em produção: Supabase (projeto criado via Management API) + Vercel (deploy via CLI), link `https://workflow-aquila.vercel.app` entregue com logins de demonstração, confirmação de configuração do banco, lista de variáveis de ambiente e orientação de revogação de tokens.
- Exclusão de demandas fictícias, restrita a Admin (e ao próprio criador Comercial em `recebida_comercial`).
- Predefinição de consultores (364 registros de `equipe_ativa.xlsx`), com autocomplete (`ConsultorPicker`).
- Explicação do campo "Prazo de execução".
- Predefinição de clientes: inicialmente 136 (só "ativos"), depois ampliado para 3990 (todos com CNPJ, dedupe), com badge de classificação no `ClientPicker`.
- Cálculo automático de valor bruto a partir de valor líquido + markup, sempre exibido como resultado (`lib/workflow/pricing.ts`, `ValorBrutoPreview`).
- Correção do upload que travava eternamente no Jurídico — migrado para upload via signed URL (`sign` → `uploadToSignedUrl` → `confirm`).
- Busca de clientes corrigida para trazer todos os nomes correspondentes, não só ativos.
- Login sempre exige tela de login explícita, nunca resume sessão anterior automaticamente (`app/page.tsx` redireciona incondicionalmente para `/login`; `lib/supabase/middleware.ts` não redireciona mais usuários autenticados para fora de `/login`).
- Telas/abas restritas por perfil, sem mistura entre setores (`ALL_TABS` com restrições de role em `DemandDetailClient.tsx`).
- Prazo de 4 dias do Jurídico bem visível (`PrazoJuridicoBadge`, `PrazoInfo`).
- Campo "Escopo" renomeado para "Solução", com lista pré-definida de 115 opções (`lib/workflow/solucoes.ts`, `SolucaoPicker`).
- Proposta comercial destacada/acessível no fluxo do Jurídico (`PropostaLink` em `ActionPanel.tsx`).
- Regra: Comercial não pode criar demanda sem anexar a proposta antes (validação em backend + UI, com rollback em falha de upload).
- **Reversão completa** do envio automático de e-mail ao cliente (signatário externo): substituído por confirmação interna automática, com texto e destinatários editáveis pelo admin (`SettingsAdmin.tsx`, card "Confirmação interna de envio da minuta").
- Correção de bug: Admin não conseguia editar informações comerciais da demanda (`GeralTab.tsx` — removida exclusão indevida `&& session.role !== "admin"`).
- Mensagens de falha de notificação (sininho) enriquecidas com informação explícita de remetente/destinatário/responsável, tanto para `notifyJuridico` quanto para `notifyMinutaConfirmacaoInterna`.
- Log de e-mails automáticos no painel admin (`SettingsAdmin.tsx`) agora exibe explicitamente linha "De: ... · Para: ...".
- Validação completa (tsc, ESLint, Vitest — 36 testes em 5 arquivos, build de produção) passando sem erros na última rodada de mudanças.
- Commit e push para a branch `claude/internal-workflow-management-app-v1j2px` feitos (commit mais recente: `5cb0cf7`).

---

## 7. Funcionalidades pendentes

1. **Redeploy em produção na Vercel** — código já commitado e enviado ao GitHub (branch `claude/internal-workflow-management-app-v1j2px`), mas **não publicado ainda**, porque o token da Vercel usado nas sessões anteriores não persiste entre sessões (ambiente efêmero). O projeto já está linkado localmente (`.vercel/project.json`: `projectId: prj_W7KzeUj22bjLt8miQ04CgT9spG9T`, `orgId: team_UYOmwAIWOT74ETNPXq351WdA`), falta só autenticação. **Ação necessária:** usuário fornecer novo Personal Access Token da Vercel, ou publicar manualmente pelo dashboard ("Redeploy" no projeto `workflow-aquila`).
2. **Configuração de SMTP real** — ainda não configurado. Sem isso, nenhum e-mail (Jurídico ou confirmação interna da minuta) sai de fato; tudo cai em notificação interna de falha. **Ação necessária:** usuário fornecer credenciais reais de um servidor SMTP (endereço, porta, usuário, senha) — Gmail, Outlook/Office 365, SendGrid, etc.
3. **Promoção do login Comercial a Admin** — funcionalidade já existe (tela **Administração → Usuários**, componente `UsersAdmin.tsx`, rota `/api/admin/users/[id]` PATCH), mas a troca de perfil em si não foi executada porque exige uma decisão consequente de segurança de conta (qual login específico promover) e não há mais acesso a credenciais de banco na sessão atual para fazer isso diretamente via SQL. **Ação recomendada:** o próprio usuário, logado como Admin, deve ir em Administração → Usuários e trocar o campo "Perfil" do login comercial desejado (`comercial@aquila.com.br` "Carla Comercial" ou `comercial2@aquila.com.br` "Bruno Comercial") para "Administrador".
4. Nenhuma outra pendência funcional identificada nas conversas — todas as demais solicitações explícitas do usuário foram implementadas, validadas e commitadas.

---

## 8. Problemas encontrados e respectivas soluções

| Problema | Causa raiz | Solução |
|---|---|---|
| Next.js 16 auto-instalado incompatível/instável | `create-next-app` puxou a versão mais nova por padrão | Rebaixado para 14.2.35 (+ patch de segurança dentro da série 14.2.x) e Tailwind v3 |
| ESLint flat-config: regra `@typescript-eslint/no-unused-vars` não encontrada | Configuração incompleta | `.eslintrc.json` estendendo `next/core-web-vitals` e `next/typescript` |
| Build com erros "Dynamic server usage" durante geração estática de rotas que usam cookies | Comportamento esperado do Next 14 para rotas dinâmicas que leem cookies (`ƒ` corretamente marcado) | Determinado como **benigno**, não é falha real — confirmado novamente na build mais recente (rotas `/api/clients`, `/api/consultores`, `/api/notifications`, etc.) |
| Erros de TypeScript com joins do Supabase-js inferidos como arrays | Tipo `Database` escrito à mão, sem metadados de Relationships | Casts `as unknown as X` em pontos específicos de chamada |
| `vercel link` tentou conectar repositório GitHub e falhou (erro 400) | Tentativa automática da CLI | Não fatal — deploy via CLI a partir do código local não depende dessa integração |
| `seed.sql`: `INSERT ... VALUES (...), (...) RETURNING id INTO escalar` inválido para múltiplas linhas | Sintaxe PL/pgSQL só suporta `RETURNING INTO` escalar para inserção de uma linha | Separado em `INSERT`s individuais para `demanda3` e `demanda4` |
| **CRÍTICO:** Login por senha retornava HTTP 500 "Database error querying schema" | Coluna `email_change` em `auth.users` sem valor default, ficou `NULL` para usuários demo inseridos manualmente — GoTrue: `sql: Scan error on column index 8, name "email_change": converting NULL to string is unsupported` (diagnosticado via logs do Supabase Auth, endpoint Management API `analytics/endpoints/logs.all`) | (a) `UPDATE` retroativo setando `email_change = ''` para todos os usuários `%@aquila.com.br`; (b) correção permanente em `supabase/seed.sql`, incluindo `email_change` com `''` no INSERT dos 6 usuários demo, com comentário explicativo |
| Upload travava eternamente (spinner infinito no botão "Enviar") | Limite de payload (~4,5 MB) da função serverless da Vercel rejeitava uploads grandes proxied pela rota de API; `await res.json()` no cliente lançava exceção não tratada em resposta não-JSON, então `setLoading(false)` nunca era alcançado | Reescrito para upload direto navegador→Storage via URL assinada (`sign` → `uploadToSignedUrl` → `confirm`); rota antiga `app/api/demands/[id]/documents/route.ts` **deletada**; verificado ponta a ponta com script Node.js standalone contra o Storage de produção real |
| Busca de clientes incompleta | Import inicial trouxe só clientes classificados como "Cliente ativo" (136 de 5064 linhas da planilha) | Import complementar de 3849 registros restantes com CNPJ (dedupe por CNPJ existente), total 3990; badge de `classificacao` adicionado na UI |
| Feature mal interpretada: e-mail automático ao cliente externo | Mensagem ambígua do usuário interpretada inicialmente como pedido de automação de envio ao cliente; segunda mensagem (também ambígua/mal escrita) esclareceu que o envio ao cliente deveria continuar **manual**, e que deveria existir sim um e-mail automático **interno** com texto editável | Revertida a feature de e-mail automático ao cliente; implementada `notifyMinutaConfirmacaoInterna` com card admin de configuração (destinatários + texto). Decisão tomada por julgamento (AskUserQuestion ficou sem resposta), aceita pelo usuário sem correção posterior. |
| Bug: Admin não conseguia editar informações comerciais da demanda | `GeralTab.tsx` tinha `canEditDemandAtStatus(...) && session.role !== "admin"`, excluindo justamente o perfil que deveria ter acesso total | Removida a exclusão — `canEditDemandAtStatus` já retorna `true` para admin independentemente do status |
| `vercel whoami` / tentativa de checar autenticação travou (sessão nova sem token) | Tokens de sessões anteriores não persistem entre sessões efêmeras do ambiente remoto | Processo cancelado (`kill`); documentado como bloqueio pendente — necessário novo token do usuário para publicar |

---

## 9. Arquivos criados ou alterados e sua finalidade

### Migrations (append-only, `supabase/migrations/`)
- `0001`–`0005`: schema inicial (não detalhado individualmente no histórico condensado, mas cobre tabelas centrais: `profiles`, `clients`, `demands`, `demand_documents`, `demand_comments`, `email_notifications`, `notifications`, `app_settings`, etc., com RLS).
- `0006_demands_delete_policy.sql`: política RLS de delete, restrita a admin.
- `0007_consultores.sql`: tabela `consultores` + RLS.
- `0008_valor_bruto.sql`: `alter table demands add column valor_bruto numeric(14,2);`
- `0009_clients_classificacao.sql`: `alter table clients add column classificacao text;`
- `0010_solucoes.sql`: renomeia `escopo`→`solucoes`, converte tipo para `text[]`, default `'{}'`.
- `0011_demands_delete_self_rollback.sql`: recria política `demands_delete` permitindo também `(auth_role() = 'comercial' and created_by = auth.uid() and status = 'recebida_comercial')`, além de `is_admin()`.
- `0012_minuta_confirmacao_interna.sql`: seed da linha `app_settings` para a nova configuração de e-mail de confirmação interna.

### Lógica de domínio (`lib/`)
- `lib/workflow/pricing.ts` — `calcularValorBruto(valorLiquido, markupPercent)`: fórmula `líquido/(1-markup/100)`, com validação de markup < 100%.
- `lib/workflow/solucoes.ts` — `SOLUCOES_DISPONIVEIS: string[]`, 115 opções pré-definidas (de `Solução.xlsx`).
- `lib/workflow/validations.ts` — inclui `checkMinutaEnvio` (trava das 4 condições), `isValidEmail`, `diasRestantes`, `isPrazoVencido`.
- `lib/workflow/permissions.ts` — `canEditDemandAtStatus`, `canViewDocument`, `canViewPayments`, `ROLE_LABELS`; admin sempre `true` incondicionalmente.
- `lib/api/helpers.ts` — `requireRole(profile, allowed)`: bypassa toda checagem quando `profile.role === "admin"`.
- `lib/api/uploadDocument.ts` — `uploadDemandDocument(demandId, file, tipo)`: fluxo sign → upload direto → confirm, contornando limite de payload da Vercel.
- `lib/api/fetcher.ts` — `apiRequest` helper genérico usado no client.
- `lib/email/notify.ts` — núcleo de envio rastreado (`sendTrackedEmail`), `notifyJuridico`, `notifyMinutaConfirmacaoInterna` (substituiu `notifySignatario`), `retryFailedEmails`, `MAX_EMAIL_ATTEMPTS`.
- `lib/email/templates.ts` — `buildJuridicoNotificationHtml/Subject`, `buildMinutaConfirmacaoInternaHtml/Subject` (substituiu `buildMinutaClienteHtml/Subject`), `escapeHtml`.
- `lib/email/transport.ts` — `getEmailTransport`, `getEmailFrom` (Nodemailer).
- `lib/supabase/admin.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts` — clientes Supabase para os diferentes contextos; middleware não redireciona mais usuários autenticados para fora de `/login`.

### Rotas de API (`app/api/`)
- `app/api/demands/[id]/documents/sign/route.ts` e `.../documents/confirm/route.ts` — substituem a antiga rota única de proxy de arquivo (`app/api/demands/[id]/documents/route.ts`, **deletada**), corrigindo o bug de upload travado.
- `app/api/demands/[id]/route.ts` — DELETE permite admin OU (comercial criador em `recebida_comercial`).
- `app/api/demands/[id]/forward-juridico/route.ts` — exige ao menos um `demand_documents` com `tipo='proposta'` antes de permitir a transição.
- `app/api/demands/[id]/minuta-envio/route.ts` — reescrita para chamar `notifyMinutaConfirmacaoInterna` em vez do removido `notifySignatario`; não gera mais URL assinada da minuta para o cliente.
- `app/api/demands/[id]/signature/route.ts`, `.../team/*`, `.../payments/*`, `.../transition/route.ts`, `.../comments/route.ts`, `.../conclude/route.ts` — demais transições/ações do fluxo.
- `app/api/admin/settings/route.ts` — schema Zod estendido com `minutaConfirmacaoEmails`/`minutaConfirmacaoTexto`; PUT faz upsert em `app_settings` (chave `minuta_confirmacao_interna`), preservando campos não enviados.
- `app/api/admin/users/route.ts`, `.../users/[id]/route.ts` — criação de usuário e alteração de perfil (PATCH `role`)/ativação.
- `app/api/admin/emails/route.ts` — log de e-mails automáticos para o painel admin.
- `app/api/email/retry/route.ts` — reprocessamento manual de falhas.
- `app/api/documents/[id]/download/route.ts` — geração de URL assinada de download.
- `app/api/clients/route.ts`, `app/api/consultores/route.ts`, `app/api/notifications/route.ts`, `.../notifications/[id]/route.ts` — listagens e leitura/marcação de notificações.

### Componentes (`components/`)
- `components/demanda/tabs/GeralTab.tsx` — **corrigido**: removida exclusão indevida de admin do acesso de edição (`podeEditar = canEditDemandAtStatus(session.role, demand.status)`, sem `&& session.role !== "admin"`).
- `components/demanda/ActionPanel.tsx` — `PrazoInfo`, `PropostaLink`, `ComercialAnaliseActions` (com `temProposta` bloqueando "Encaminhar ao Jurídico"), `JuridicoValidacaoActions`, `MinutaEnvioPanel` (copy revertida: envio manual ao cliente + aviso interno automático), `AssinaturaPanel`.
- `components/demanda/DemandDetailClient.tsx` — `ALL_TABS` com restrições por perfil; `PrazoJuridicoBadge`.
- `components/demanda/DeleteDemandButton.tsx`, `ValorBrutoPreview.tsx`, `SolucaoPicker.tsx`, `ConsultorPicker` — componentes de suporte.
- `components/admin/SettingsAdmin.tsx` — **alterado**: card "Destinatários do Jurídico", card "Prazo jurídico", novo card "Confirmação interna de envio da minuta" (destinatários + `Textarea` de texto editável), card "Log de e-mails automáticos" agora com linha explícita "De: sistema (Workflow Aquila) · Para: [destinatários]" em cada item.
- `components/admin/UsersAdmin.tsx` — lista de usuários, criação de novo usuário, troca de perfil (`Select` de role) e ativação/desativação — mecanismo já existente para promover um login a Admin.
- `components/admin/AdminNav.tsx` — navegação da área administrativa.
- `components/layout/NotificationsBell.tsx` — sininho de notificações; exibe `mensagem` como texto puro (agora enriquecido com De/Para pela mudança em `lib/email/notify.ts`).
- `components/ui/*` — `Card`, `Input`, `Select`, `Textarea`, `Button`, `Badge`, `Alert` — componentes de UI genéricos.

### Páginas (`app/(app)/...`, `app/`)
- `app/page.tsx` — `redirect("/login")` incondicional (garante tela de login sempre).
- `app/(app)/admin/page.tsx` — redireciona para `/admin/usuarios`.
- `app/(app)/admin/usuarios/page.tsx` — checa `profile.role !== "admin"` → redireciona; renderiza `UsersAdmin`.
- `app/(app)/admin/configuracoes/page.tsx` — renderiza `SettingsAdmin`.
- `app/(app)/demandas/*`, `app/(app)/dashboard/*` — listagem, Kanban, novo cadastro, detalhe da demanda.

### Testes (`tests/`)
- `tests/email-notify.test.ts` — mock `createFakeSupabase`; testes de `notifyJuridico` (5) e `notifyMinutaConfirmacaoInterna` (4, substituindo os antigos testes de `notifySignatario`).
- `tests/statuses.test.ts`, `tests/validations.test.ts`, `tests/permissions.test.ts`, `tests/pricing.test.ts` — regras centrais de negócio.
- Total atual: **36 testes, 5 arquivos, todos passando**.

### Seed / dados demo
- `supabase/seed.sql` — 6 usuários demo (senha `Senha123!` para todos):
  - `admin@aquila.com.br` — "Administrador Aquila" — role `admin`
  - `comercial@aquila.com.br` — "Carla Comercial" — role `comercial`
  - `juridico@aquila.com.br` — "João Jurídico" — role `juridico`
  - `projetos@aquila.com.br` — "Paula Projetos" — role `projetos`
  - `financeiro@aquila.com.br` — "Fábio Financeiro" — role `financeiro`
  - `comercial2@aquila.com.br` — "Bruno Comercial" — role `comercial`
  - Inclui correção crítica: `email_change` explicitamente `''` (não `NULL`) em todos os INSERTs, com comentário explicando o bug do GoTrue.
  - Clientes, demandas e documentos de exemplo cobrindo as principais etapas do fluxo.

### Configuração
- `.eslintrc.json` — estende `next/core-web-vitals` e `next/typescript`.
- `.vercel/project.json` — link do projeto Vercel já configurado localmente.
- `.env.example` — variáveis de ambiente documentadas.

---

## 10. Convenções de código, padrões e boas práticas adotadas

- **Comentários em português**, curtos, só quando explicam o "porquê" não óbvio (ex.: comentário sobre `email_change` no seed, comentário sobre admin em `GeralTab.tsx`).
- **Nomenclatura em português** para conceitos de domínio (nomes de arquivos, variáveis, funções): `notifyJuridico`, `checkMinutaEnvio`, `calcularValorBruto`, `SOLUCOES_DISPONIVEIS`, `demanda`, `minuta`, `signatario`, `prazo_juridico`, etc. — mantidos exatamente como definidos, sem tradução.
- **Padrão de deduplicação de e-mail**: sempre `actionKey` único combinando tipo de ação + identificador (ex.: `cadastro:demand-1`, `encaminhar:demand-1:<timestamp>`, `minuta-confirmacao-interna:demand-2`), com constraint `UNIQUE(demand_id, action_key)`.
- **Padrão de resultado de notificação**: união discriminada `NotifyResult` —
  ```ts
  type NotifyResult =
    | { skipped: true; reason: "ja_enviado" | "sem_destinatarios" }
    | { skipped: false; enviado: true }
    | { skipped: false; enviado: false; erro: string };
  ```
- **Admin sempre bypassa checagens de role** — padrão aplicado consistentemente em RLS (`is_admin() OR ...`) e em código (`requireRole`, `canEditDemandAtStatus`); qualquer nova funcionalidade deve seguir esse padrão, nunca excluir explicitamente o admin.
- **Migrations append-only, nunca editadas retroativamente** — sempre novo arquivo numerado sequencialmente.
- **Documentos nunca anexados a e-mails** — sempre um link protegido para o sistema, respeitando confidencialidade e permissões de acesso (mencionado explicitamente no template de e-mail do Jurídico).
- **Mocks de teste em memória**, sem infraestrutura externa — builder encadeável reproduzindo a API do Supabase-js o suficiente para os testes de `lib/email/notify.ts`.
- **Validação em múltiplas camadas**: regras de negócio importantes (ex.: proposta obrigatória antes de encaminhar, trava da minuta) são reforçadas tanto no backend (rota de API) quanto na UI (desabilitar botão), nunca só uma camada.
- **Uploads sempre diretos ao Storage via signed URL**, nunca proxied por rota de API do Next para arquivos potencialmente grandes.
- Antes de considerar qualquer mudança "concluída": rodar `tsc --noEmit`, `eslint .`, `vitest run`, e `next build`, nessa ordem, antes de commit/push.

---

## 11. Prompts importantes utilizados durante o desenvolvimento

(Mensagens do usuário, verbatim, em ordem cronológica — preservadas por serem a fonte de verdade dos requisitos.)

1. Especificação original completa e detalhada (build do app inteiro — conteúdo capturado na Seção 1).
2. *"coloque no ar e me envie o link para acesso"*
3. *"Pode seguir sem SMTP por enquanto. Token pessoal do Supabase: [...] Token da Vercel: [...] Crie o projeto Supabase na única organização disponível na minha conta. Faça todas as configurações necessárias, aplique o banco de dados e publique o sistema na Vercel. Quando concluir, me entregue: 1. o link do sistema publicado; 2. os logins de demonstração; 3. a confirmação de que o banco foi configurado; 4. a lista das variáveis de ambiente utilizadas; 5. a orientação para revogar os tokens."*
4. *"você adicionou uma serie de demandas fictícias, porém não me da opção de excluir, preciso ter esses tipos de acessos"*
5. *"[equipe_ativa.xlsx] na parte dos consultores, onde tenho que colocar o nome do consultor responsavel pela demanda e o e-mail, quero que já predefina esses nomes, categoria e email"*
6. *"[screenshot] o que significa isso?"* / *"quero saber para que serve essa data? vou preencher ela com qual finalidade?"* (sobre "Prazo de execução")
7. *"[todos_clientes.xlsx] quero que pré defina essas clientes também, somente para os existentes"*
8. *"me mande o novo link"*
9. *"[screenshot Condições Comerciais] preciso que você faça uma conta sempre o valor que eu colocar será liquido então o markup que eu inserir tem que ser feito uma conta: liquido (200.000)/(1-valor do markup). outro exemplo (200.000)/(1-45)=363.636,36. sempre precisa ser feito essa conta e o valor resultante"*
10. *"está sendo disparado um e-mail para o responsável pela assinatura?"*
11. **Mensagem mais densa/consequente da conversa** (com `Solução.xlsx` em anexo): *"[...] na primeira imagem na área do jurídico carrega eternamente e o arquivo não sobe [...] na parte onde filtra os clientes, quando pesquiso alguma prefeitura, não aparece todas [...] por exemplo: prefeitura municipal de nova serrana eu não consegui achar [...] quero que filtre pelo nome que eu coloquei e ache o nome correto [...] quero que as coisas sejam diferentes em cada login [...] a partir do momento que uma demanda for cadastrada o jurídico tem exatamente 4 dias para enviar ao cliente, isso precisa ficar bem claro! na pagina do comercial mude a nomenclatura de escopo para 'solução' e predefina as soluções que deixei no excel [...] quero que o anexo que eu inserir na parte 'Proposta recebida do consultor' [...] fique visível para quem está recebendo na parte do jurídico [...]"* — continha **7 requisitos distintos**, todos implementados.
12. *"outra regra, o comercial não pode criar uma demanda sem antes anexar a proposta"*
13. *"queria que fosse disparado um e-mail para a pessoa responsável da assinatura internamente"*
14. **Reversão**: *"preciso de um campo onde vou colocar o texto o mudar o texto pre definido de que interno do aquila irá receber para o cliente tera que ser enviado manualmente mesmo"*
15. **Mensagem de 3 partes (mais recente antes deste autocompact)**, com screenshot do sininho mostrando falhas repetidas de SMTP: *"está dando falha ao enviar o e-mail. preciso que o login do comercial também tenha permissões de adm. preciso de as informações fiquem mais intuitivas de quem vai enviar, quem vai receber e etc"*
16. Pedido atual: gerar este `CLAUDE.md` de autocompact completo e de alta fidelidade.

---

## 12. TODOs e próximos passos priorizados

1. **[Alta prioridade — bloqueado por credencial]** Obter novo token de acesso pessoal da Vercel do usuário e rodar `vercel deploy --prod` (ou o usuário publica manualmente via dashboard, projeto `workflow-aquila`) para que o commit `5cb0cf7` (e todo o histórico da branch `claude/internal-workflow-management-app-v1j2px`) chegue à produção.
2. **[Alta prioridade — bloqueado por credencial]** Obter credenciais SMTP reais do usuário (host, porta, usuário, senha) e configurar variáveis de ambiente de e-mail na Vercel, para que `notifyJuridico` e `notifyMinutaConfirmacaoInterna` efetivamente entreguem e-mails em vez de cair em falha/notificação interna.
3. **[Ação do próprio usuário, já disponível]** Promover o login Comercial desejado (`comercial@aquila.com.br` ou `comercial2@aquila.com.br`) a Admin via **Administração → Usuários**, trocando o campo "Perfil". Nenhuma mudança de código necessária.
4. Após redeploy: validar em produção real (não só localmente) o fluxo completo de notificações, especialmente o log "De/Para" no painel admin e as mensagens do sininho enriquecidas.
5. Nenhuma outra pendência de escopo aberta — todas as demais solicitações do histórico foram implementadas, testadas e commitadas.

---

## 13. Informações críticas que NÃO podem ser esquecidas

- **Branch de trabalho obrigatória:** `claude/internal-workflow-management-app-v1j2px`. Nunca desenvolver ou publicar em outra branch sem autorização explícita.
- **Commits recentes na branch** (mais novo primeiro):
  - `5cb0cf7` — Corrige edição de admin nas informações comerciais e deixa notificações mais claras
  - `0c944d1` — Substitui o envio automático ao cliente por confirmação interna editável
  - `73f6cf5` — Envia automaticamente a minuta por e-mail ao responsável pela assinatura (**depois revertido/substituído pelo commit seguinte** — não reativar essa lógica sem novo pedido explícito do usuário)
  - `32b1413` — Exige a proposta anexada antes de cadastrar/encaminhar a demanda
  - `bb32019` — Corrige upload travado, ajusta login, telas por perfil e busca de clientes
  - `165f415` — Calcula automaticamente o valor bruto a partir do líquido e do markup
- **Regra de e-mail ao cliente é MANUAL, definitivamente** — não reintroduzir envio automático ao signatário/cliente externo sem pedido explícito e inequívoco do usuário. Essa foi uma reversão intencional feita com base em feedback direto.
- **Senha de todos os usuários demo:** `Senha123!` — nunca reexpor tokens de acesso (Supabase/Vercel) que o usuário colou anteriormente no chat; eles já podem ter sido revogados e não devem ser reutilizados ou logados novamente sem que o usuário os forneça de novo nesta nova sessão.
- **Bug crítico do `email_change`**: se algum dia recriar usuários manualmente em `auth.users` (fora do fluxo normal do Supabase Auth), **sempre** incluir `email_change = ''` explicitamente — deixar `NULL` quebra login com erro 500 ("Database error querying schema"). Já corrigido permanentemente em `supabase/seed.sql`, mas é um risco recorrente para qualquer inserção manual futura.
- **Uploads de arquivo**: nunca reintroduzir proxy de arquivo via rota de API do Next para arquivos grandes — sempre usar o padrão sign→upload direto→confirm (`lib/api/uploadDocument.ts`), pela limitação de payload da Vercel (~4,5 MB).
- **Deploy Vercel não é automático via Git** — a integração Git↔Vercel não está ativa (tentativa anterior falhou com erro 400). Todo `git push` para a branch **não** dispara deploy sozinho; é preciso rodar deploy manualmente (CLI com token ou dashboard).
- **Ambiente de sessão é efêmero** — tokens de API (Supabase Management API, Vercel) fornecidos em sessões anteriores **não persistem**; qualquer necessidade de acesso a produção (SQL direto, deploy) exige que o usuário forneça credenciais novamente nesta sessão.
- **Modelo de permissão é de perfil único por usuário** — não existe (nem deve ser implementado sem pedido explícito) um sistema de múltiplos perfis simultâneos por login. "Dar permissão de admin"sempre significa trocar o `role` do usuário para `admin`, o que já concede acesso total a tudo.
- **Idioma de comunicação:** sempre em português, tom direto e técnico, conforme todo o histórico da conversa.
- **Validação obrigatória antes de qualquer entrega**: `tsc --noEmit`, `eslint .`, `vitest run`, `next build` — todos devem passar limpos antes de comunicar uma tarefa como concluída.
