# Epic 1 Context: Autenticação e Contas do Casal

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

O casal precisa logar com suas próprias contas e nenhum dado de fatura (upload, lançamentos, categorias, parcelas) pode ficar acessível sem sessão válida. Não existe auto-cadastro público: exatamente duas contas são provisionadas de forma administrativa para o casal. Isso estabelece a base de segurança sobre a qual todos os demais épicos operam — sem isso, nenhuma outra funcionalidade pode ser exposta com segurança, já que os dados são financeiros e sensíveis.

## Stories

- Story 1.0: Setup inicial do projeto (Next.js + Supabase + Drizzle + deploy Vercel) — já implementada
- Story 1.1: Provisionamento das duas contas do casal
- Story 1.2: Login obrigatório em toda rota de dado
- Story 1.3: Recuperação de senha

## Requirements & Constraints

- Login é obrigatório para qualquer rota que toque dado de fatura (upload, lançamentos, categorias, parcelas); nenhuma dessas rotas pode responder sem sessão válida.
- Existem exatamente 2 contas de usuário para o casal; nenhum endpoint ou fluxo de auto-cadastro público pode existir na aplicação.
- Tráfego sempre em HTTPS; senha nunca armazenada em texto plano (delegado inteiramente ao hashing nativo do Supabase Auth — nunca reimplementar).
- Dados sensíveis de gasto (valores, descrições, categorias) precisam estar protegidos em repouso.
- Precisa existir um caminho de recuperação de senha para as duas contas que não dependa de nenhum passo de recadastro (coerente com a ausência de auto-cadastro público).
- Usuário não autenticado tentando acessar uma rota de dado deve ser redirecionado para a tela de login, não receber um erro genérico ou dado parcial.

## Technical Decisions

- Autenticação é feita via Supabase Auth; a validação de sessão acontece em middleware do Next.js, antes de qualquer route handler de dado — nenhuma rota individual deve reimplementar a checagem de sessão por conta própria.
- HTTPS e criptografia em repouso são cobertos pela hospedagem gerenciada (Supabase + Vercel terminam TLS e cifram disco por padrão) — não exigem configuração adicional do app.
- Recuperação de senha usa o fluxo nativo do Supabase Auth (link de reset por e-mail) — nunca um fluxo próprio ou que passe por recadastro.
- Provisionamento das duas contas é administrativo (via setup/console, não autoatendido) — não deve existir tela ou endpoint de signup público.
- Já implementado (Story 1.0): projeto Next.js 16.2 App Router + TypeScript, Drizzle ORM configurado, e helpers de Supabase Auth em `lib/supabase/{admin,client,server,middleware}.ts`; um `proxy.ts` já invoca `updateSession` do Supabase em todo request, com matcher excluindo apenas assets estáticos. As stories 1.1–1.3 constroem sobre essa base já existente, não a partir do zero — o mecanismo de validação de sessão em middleware (relevante para Story 1.2) já está presente e deve ser estendido/verificado, não recriado.
- Rota administrativa de criação de conta (Story 1.1) deve usar o client admin do Supabase (service role), não o fluxo de signup público do client-side.
- Convenção do projeto: mutação de dados sempre via camada de serviço (`server/*`), nunca query direta numa rota; isso também se aplica a qualquer lógica de auth que toque o banco além do próprio Supabase Auth.

## Cross-Story Dependencies

- Story 1.1 (provisionamento das contas) precisa existir antes de qualquer teste real de Story 1.2 (login obrigatório) e Story 1.3 (recuperação de senha), já que ambas dependem de contas já existentes no Supabase Auth.
- Story 1.2 (middleware de sessão) é pré-requisito de segurança para todos os épicos seguintes (Epic 2–5): nenhuma rota de upload, categorização, visualização ou parcelas pode ser implementada assumindo acesso sem sessão validada.
