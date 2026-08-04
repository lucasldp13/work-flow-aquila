# Workflow Aquila

Aplicação web para gestão do fluxo interno entre **Comercial**, **Jurídico**,
**Projetos** e **Financeiro** — do recebimento da proposta de um consultor
até a conclusão financeira do projeto.

Construída com **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**
e **Supabase** (autenticação, banco de dados Postgres, storage privado de
documentos e Row Level Security).

## Sumário

- [Visão geral do workflow](#visão-geral-do-workflow)
- [Perfis e permissões](#perfis-e-permissões)
- [Stack técnica](#stack-técnica)
- [Configuração do Supabase](#1-configuração-do-supabase)
- [Configuração do serviço de e-mail](#2-configuração-do-serviço-de-e-mail)
- [Instalação e execução local](#3-instalação-e-execução-local)
- [Usuários de demonstração](#usuários-de-demonstração)
- [Testes](#testes)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Decisões de segurança e arquitetura](#decisões-de-segurança-e-arquitetura)

## Visão geral do workflow

```
Comercial → Jurídico → Assinatura → Projetos → Financeiro → Concluída
```

1. **Comercial** recebe a proposta do consultor, cadastra cliente/CNPJ/valor
   /escopo/prazo/contatos, ajusta informações comerciais (markup), registra
   dúvidas/pendências e encaminha ao Jurídico.
2. A cada cadastro, anexo ou atualização relevante do Comercial, o sistema
   **envia automaticamente um e-mail** aos destinatários do Jurídico
   (configuráveis no painel admin), com deduplicação e novas tentativas em
   caso de falha.
3. **Jurídico** valida os dados, aprova (elabora a minuta) ou devolve ao
   Comercial com justificativa obrigatória. O botão **"Registrar envio da
   minuta"** só é habilitado quando: a minuta está anexada, o e-mail do
   signatário está preenchido e válido, e o campo de confirmação é idêntico.
4. Após o envio da minuta, a demanda aguarda assinaturas. O Jurídico anexa o
   **contrato assinado** — sem isso a demanda não avança.
5. **Projetos** só recebe a demanda após o contrato assinado. Monta a
   equipe (nome, função, período, responsabilidades, valores, observações) e
   encaminha ao Financeiro.
6. **Financeiro** só recebe a demanda após a equipe definida. Cadastra
   pagamentos (beneficiário, valor, vencimento, comprovante) com status
   pendente/programado/pago/atrasado/cancelado, e conclui a demanda quando
   tudo estiver quitado.

Todas as transições de status são validadas tanto na interface quanto no
backend (`lib/workflow`), e a máquina de estados (`ALLOWED_TRANSITIONS`)
impede que qualquer etapa seja pulada.

## Perfis e permissões

| Perfil | Pode alterar | Visualiza |
|---|---|---|
| **Administrador** | Tudo | Tudo, inclusive painel admin |
| **Comercial** | Etapas do Comercial | Andamento geral de todas as demandas |
| **Jurídico** | Validação, minuta, assinatura | Andamento geral |
| **Projetos** | Montagem de equipe (após contrato assinado) | Andamento geral |
| **Financeiro** | Pagamentos (após equipe definida) | Andamento geral; dados financeiros restritos a Financeiro/Admin |

Todos os perfis enxergam o andamento geral (status, linha do tempo), mas só
o setor "dono" da etapa atual pode alterá-la — regra aplicada em três
camadas: middleware de rotas, validação de formulário/API e **Row Level
Security no Postgres** (`supabase/migrations/0003_rls_policies.sql`).

## Stack técnica

- **Next.js 14** (App Router, Route Handlers, Server Components)
- **TypeScript** em todo o projeto
- **Tailwind CSS** para a interface
- **Supabase**: Postgres + Auth + Storage privado + RLS
- **Nodemailer** para envio de e-mail via SMTP (qualquer provedor)
- **Zod** para validação de payloads das rotas de API
- **Vitest** para os testes das regras de negócio

---

## 1. Configuração do Supabase

### 1.1. Criar o projeto

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie a `URL`, a `anon public key` e a
   `service_role key`.

### 1.2. Aplicar o schema do banco

O schema completo está em `supabase/migrations/`, na ordem:

| Arquivo | Conteúdo |
|---|---|
| `0001_enums_and_tables.sql` | Enums e todas as tabelas do workflow |
| `0002_functions_and_triggers.sql` | Funções auxiliares, triggers e a RPC `transition_demand` |
| `0003_rls_policies.sql` | Row Level Security por perfil |
| `0004_storage.sql` | Bucket privado `documentos` |
| `0005_views.sql` | View de resumo financeiro agregado |

**Opção A — Supabase CLI (recomendado):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push          # aplica as migrations
psql "$(supabase db remote-uri)" -f supabase/seed.sql   # dados demonstrativos (opcional)
```

**Opção B — SQL Editor do painel Supabase:**

Cole e execute, nesta ordem, o conteúdo de cada arquivo de
`supabase/migrations/` e, por fim, de `supabase/seed.sql` (opcional, cria
usuários e demandas de demonstração).

### 1.3. Storage

A migration `0004_storage.sql` já cria o bucket privado `documentos`. Nenhum
outro passo manual é necessário — o bucket não tem policies públicas; todo
upload/download passa pelas rotas de API do backend usando a
`service_role key`, que gera URLs assinadas de curta duração (60s).

### 1.4. Autenticação

Em **Authentication → Providers**, mantenha apenas **Email** habilitado.
Não há autocadastro: usuários são criados exclusivamente pelo painel
administrativo do sistema (**Administração → Usuários**), que usa a Admin
API do Supabase para criar a conta e, via trigger `on_auth_user_created`,
criar automaticamente o `profile` correspondente com o papel definido.

---

## 2. Configuração do serviço de e-mail

O envio usa SMTP puro (via Nodemailer), compatível com qualquer provedor:
Amazon SES, SendGrid, Mailgun, Google Workspace, Outlook 365 etc. Configure
as credenciais em variáveis de ambiente (nunca no código-fonte):

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM="Workflow Aquila <nao-responda@aquila.com.br>"
```

Depois de subir a aplicação, defina os **destinatários do Jurídico** em
**Administração → Configurações e e-mails** — é para esses e-mails que o
sistema notifica automaticamente a cada cadastro/anexo/atualização/
encaminhamento feito pelo Comercial.

### Como funciona o envio automático

- Implementado em `lib/email/notify.ts`, chamado a partir das rotas de API
  logo após a ação do Comercial ser concluída no banco (nunca antes).
- **Deduplicação:** cada notificação tem uma `action_key` determinística
  (ex.: `documento:<id-do-documento>`, `cadastro:<id-da-demanda>`) com
  constraint `UNIQUE (demand_id, action_key)` no banco — a mesma ação nunca
  gera dois e-mails.
- **Novas tentativas:** até 3 tentativas com backoff, registrando erro e
  contagem de tentativas em `email_notifications`. Falhas também podem ser
  reprocessadas manualmente em **Administração → Reprocessar falhas**.
- **Falha visível ao Comercial:** quando todas as tentativas falham, uma
  notificação interna é criada para o responsável comercial pela demanda.
- **Sem anexos:** o e-mail nunca inclui documentos — apenas um link
  protegido para a demanda dentro do sistema (autenticação obrigatória).

---

## 3. Instalação e execução local

```bash
npm install
cp .env.example .env.local     # preencha com os valores do seu projeto Supabase/SMTP
npm run dev                    # http://localhost:3000
```

Outros scripts:

```bash
npm run build      # build de produção
npm run start       # inicia o build de produção
npm run lint        # ESLint
npm run test        # Vitest (regras de negócio e travas)
```

## Usuários de demonstração

Se você executou `supabase/seed.sql`, os usuários abaixo já existem
(senha para todos: `Senha123!`):

| E-mail | Perfil |
|---|---|
| admin@aquila.com.br | Administrador |
| comercial@aquila.com.br | Comercial |
| comercial2@aquila.com.br | Comercial |
| juridico@aquila.com.br | Jurídico |
| projetos@aquila.com.br | Projetos |
| financeiro@aquila.com.br | Financeiro |

O seed também cria 5 clientes e 6 demandas cobrindo as principais etapas do
workflow (em análise comercial, em validação jurídica, aguardando
assinaturas, equipe em montagem, em processamento financeiro e devolvida ao
Comercial), para você navegar pelo sistema imediatamente.

## Testes

```bash
npm run test
```

Cobrem as regras e travas mais críticas do workflow (`tests/`):

- **`statuses.test.ts`** — a máquina de estados nunca permite pular etapas,
  o caminho feliz completo é sempre permitido e `concluida` é terminal.
- **`validations.test.ts`** — a trava do botão "Registrar envio da minuta"
  (as 4 condições obrigatórias), validação de e-mail/CNPJ e cálculo do
  prazo jurídico em dias úteis vs. corridos.
- **`permissions.test.ts`** — cada perfil só edita a etapa que lhe pertence,
  e dados financeiros/documentos confidenciais respeitam o perfil.
- **`email-notify.test.ts`** — deduplicação de e-mails para a mesma ação,
  novas tentativas em caso de falha e registro de falha quando não há
  destinatários configurados.

## Estrutura do projeto

```
app/
  (auth)/login/            página de login
  (app)/                   área autenticada (sidebar + topbar)
    dashboard/              indicadores por setor
    demandas/               lista, kanban, nova demanda, detalhe
    admin/                  usuários, configurações, log de e-mails
  api/                      rotas de backend (validação + regras de negócio)
components/
  ui/                       primitivos de interface
  layout/                   sidebar, topbar, notificações
  demanda/                  telas e abas da demanda (geral, docs, equipe...)
  admin/                    painel administrativo
lib/
  workflow/                 máquina de estados, validações, permissões
  email/                    templates, transporte SMTP, notificação + retry
  supabase/                 clientes browser/server/admin + middleware
supabase/
  migrations/                schema, RLS, storage, views
  seed.sql                   dados demonstrativos
tests/                       regras de negócio (Vitest)
```

## Decisões de segurança e arquitetura

- **Defesa em profundidade:** toda regra de negócio (transições de status,
  trava da minuta, permissões) é validada tanto na interface quanto nas
  rotas de API **e** reforçada por Row Level Security no Postgres — mesmo
  que a interface falhe ou a API seja chamada diretamente, o banco recusa
  operações fora de perfil/etapa.
- **Documentos privados:** o bucket do Storage não tem acesso público; toda
  leitura passa por uma rota de servidor que confere o perfil do usuário
  contra o tipo de documento (`lib/workflow/permissions.ts`) antes de gerar
  uma URL assinada válida por 60 segundos.
- **Credenciais nunca no código:** Supabase (`service_role`) e SMTP são lidos
  exclusivamente de variáveis de ambiente, com `.env.example` como
  referência e `.env*` no `.gitignore`.
- **Transições atômicas:** a função `transition_demand` no Postgres
  atualiza o status e grava a linha do tempo (`demand_status_history`) na
  mesma transação.
