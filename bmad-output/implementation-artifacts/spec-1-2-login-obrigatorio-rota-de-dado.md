---
title: 'Story 1.2: Login obrigatório em toda rota de dado'
type: 'feature'
created: '2026-07-17'
status: 'done'
review_loop_iteration: 1
followup_review_recommended: true
context: []
warnings: []
baseline_revision: '2cdbb217e45e94c2403fcf8c0b5add5ab590ef7c'
final_revision: '9dd6c8eb5fdd9d9e1cafe7fce6cab025ba4d9bfb'
---

<intent-contract>

## Intent

**Problem:** O middleware do Supabase (`lib/supabase/middleware.ts`) hoje só atualiza/mantém viva a sessão, mas nunca bloqueia acesso — qualquer pessoa sem sessão válida pode acessar rotas de dado, e não existe nenhuma tela de login real para redirecionar.

**Approach:** Estender `updateSession` para redirecionar qualquer requisição sem sessão válida para `/login` (allowlist de rotas públicas, começando só com `/login`), e criar uma página `app/(auth)/login` real com formulário e-mail/senha via Supabase Auth. A área de dado protegida vira o route group `app/(app)` (a arquitetura já reserva esse grupo para FR2-FR13); a home page placeholder da Story 1.0 migra para dentro dele como primeira "rota de dado" real e testável.

## Boundaries & Constraints

**Always:** Qualquer rota fora da allowlist pública exige sessão válida verificada em middleware (AD-6), antes de qualquer route handler — nunca checagem duplicada ad-hoc dentro de uma rota individual; o redirecionamento para requisições não autenticadas (páginas, não rotas de sistema) é sempre para `/login`; a página de login usa exclusivamente `supabase.auth.signInWithPassword` (client-side, via `lib/supabase/client.ts` já existente) — nunca um endpoint de auth próprio; usuário já autenticado que acessa `/login` é redirecionado para `/` (evita reenvio de formulário sobre sessão já válida). Rotas de sistema que já implementam sua própria autenticação independente de sessão de usuário (hoje: `/api/cron/backup`, protegida por `CRON_SECRET` desde a Story 1.0) ficam fora do redirecionamento por sessão — o enforcement de AD-6 é sobre rotas de dado acessadas pelo casal, não sobre chamadas de sistema (Vercel Cron) que não têm e nunca terão cookie de sessão.

**Block If:** nenhuma decisão aqui depende de informação exclusiva do usuário — não há bloqueio esperado.

**Never:** Nunca criar um endpoint de auto-cadastro (`signUp`) em nenhuma página; nunca reimplementar validação/hash de senha; nunca adicionar rotas de dado reais de Epic 2-5 nesta story (isso pertence a cada epic específico) — apenas o mecanismo de proteção e um placeholder mínimo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sem sessão acessando rota de dado | GET `/` sem cookie de sessão válido | Redirect 307 para `/login` | Nenhum dado da rota é retornado |
| Com sessão válida acessando rota de dado | GET `/` com sessão válida | Conteúdo da rota é exibido normalmente (200) | Nenhum erro |
| Sessão válida acessando `/login` | GET `/login` com sessão válida | Redirect para `/` (evita formulário desnecessário) | Nenhum erro |
| Login com credenciais corretas | e-mail + senha corretos (contas da Story 1.1) | Autentica, cookie de sessão setado, navega para `/` | Nenhum erro |
| Login com credenciais incorretas | e-mail ou senha errados | Permanece em `/login`, mensagem de erro exibida | Erro do Supabase (`Invalid login credentials`) mostrado ao usuário, sem detalhe técnico exposto |
| Vercel Cron chama rota de sistema | `GET /api/cron/backup` com header `Authorization: Bearer <CRON_SECRET>`, sem cookie de sessão | Middleware não redireciona; requisição chega normalmente ao route handler, que valida o `CRON_SECRET` por conta própria (comportamento já existente desde a Story 1.0, não pode regredir) | 401 apenas se o secret estiver errado (lógica já existente na própria rota) |

</intent-contract>

## Code Map

- `lib/supabase/middleware.ts` -- já existente, roda `auth.getUser()`; adicionar a lógica de redirecionamento (rota pública vs. protegida vs. rota de sistema isenta), fail-closed em caso de erro na checagem de sessão, e preservar destino original via `?next=`
- `proxy.ts` -- já existente, chama `updateSession` em todo request (matcher inalterado, já cobre tudo exceto assets estáticos)
- `lib/supabase/client.ts` -- já existente, `createClient()` do browser; reutilizado pelo formulário de login
- `app/(auth)/login/page.tsx` -- NOVO: página de login (client component, formulário e-mail/senha)
- `app/(app)/page.tsx` -- NOVO: home placeholder migrada de `app/page.tsx` (Story 1.0), agora dentro da área protegida, com copy atualizada (autenticação deixou de ser "próxima parada")
- `app/page.tsx` -- REMOVIDO (conteúdo migrado para `app/(app)/page.tsx`)

## Tasks & Acceptance

**Execution:**
- [x] `lib/supabase/middleware.ts` -- em `updateSession`, após tentar `auth.getUser()` dentro de um `try/catch`: se a chamada lançar (falha transitória do Supabase), tratar como não-autenticado (fail-closed, nunca deixar a exceção derrubar a rota com 500); normalizar `request.nextUrl.pathname` removendo barra final antes de comparar; se o pathname começa com `/api/cron/` (rota de sistema com auth própria, ex. `/api/cron/backup`), pular o redirecionamento inteiramente e retornar a `response` normalmente; senão, se não há usuário e o pathname não está na allowlist pública (`['/login']`), redirecionar para `/login?next=<pathname original>`; se há usuário e o pathname é `/login`, redirecionar para o valor de `?next=` na própria URL de `/login` (ou `/` se ausente); extrair o forward de cookies para o response de redirect (hoje duplicado) num helper local `redirectWithCookies(url, request, response)` -- implementa AD-6 sem regredir a rota de cron já existente (Story 1.0, NFR4) e sem duplicar lógica
- [x] `app/(auth)/login/page.tsx` -- criar página client-side com formulário (input e-mail, input senha, botão submit); no submit, um guard `if (loading) return;` no topo evita disparo duplo; chama `createClient().auth.signInWithPassword({ email, password })` dentro de `try/catch` (cobre tanto o retorno `{ error }` quanto uma rejeição de rede); em sucesso, lê `?next=` da URL atual e força reload completo para esse destino (ou `/` se ausente) via `window.location.href`; em erro (retornado ou capturado), exibe uma mensagem genérica fixa ("E-mail ou senha inválidos") em vez do texto bruto do provedor, e sempre restaura `loading` para `false` -- é a única forma real de autenticar nesta fase (sem auto-cadastro, FR1)
- [x] `app/(app)/page.tsx` -- criar migrando o conteúdo atual de `app/page.tsx`, atualizando a segunda linha (deixa de dizer "Próxima parada: autenticação", já que autenticação é o que acabou de proteger esta própria página) -- prova end-to-end que o mecanismo de proteção funciona
- [x] `app/page.tsx` -- remover (conteúdo já migrado) -- evita colisão de rota com `app/(app)/page.tsx`, que passa a responder por `/`

**Acceptance Criteria:**
- Given uma pessoa não autenticada, when ela acessa `/` (rota de dado), then é redirecionada para `/login` e nenhum conteúdo da rota é retornado
- Given uma sessão válida (login feito com uma das 2 contas da Story 1.1), when a pessoa acessa `/`, then o conteúdo é exibido normalmente
- Given uma sessão válida, when a pessoa acessa `/login` diretamente, then é redirecionada para `/` em vez de ver o formulário
- Given a rota de sistema `/api/cron/backup` (autenticada pelo próprio `CRON_SECRET`, sem sessão de usuário), when o Vercel Cron a chama, then o middleware não a redireciona para `/login` -- o comportamento da Story 1.0 continua funcionando sem regressão

## Design Notes

O middleware já roda em toda rota exceto assets estáticos (matcher existente em `proxy.ts`, inalterado). A allowlist pública fica só com `/login` por ora — a Story 1.3 (recuperação de senha) vai precisar adicionar suas próprias rotas públicas (ex: `/esqueci-senha`, `/redefinir-senha`, callback de auth) a essa mesma allowlist dentro de `lib/supabase/middleware.ts`; não duplicar a lógica de redirecionamento em outro lugar.

Reload completo (`window.location.href`) em vez de `router.push` do Next após login: garante que o Server Component da home e o próprio middleware leiam o cookie de sessão recém-setado sem depender de cache de RSC — mais simples e robusto que gerenciar invalidação de cache para um app de 2 usuários.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

### 2026-07-17 — bad_spec repair (pass 1)

- **Trigger:** revisão adversarial identificou que o redirecionamento incondicional para `/login` (fora da allowlist) atingiria `/api/cron/backup` -- rota de sistema chamada pelo Vercel Cron, sem cookie de sessão, autenticada pelo próprio `CRON_SECRET` desde a Story 1.0 (NFR4). O texto original de "Always" não previa exceção para rotas de sistema com auth própria.
- **Amended:** "Always" (Boundaries & Constraints) passou a distinguir rotas de dado do casal (exigem sessão) de rotas de sistema com auth independente (isentas); I/O matrix ganhou o cenário do cron; Code Map e Tasks passaram a exigir a exceção explícita para `/api/cron/`, além de dobrar junto 3 melhorias triviais de robustez já identificadas na mesma revisão (fail-closed em erro de `getUser()`, preservação de destino via `?next=`, dedupe do forward de cookies em um helper) para evitar uma segunda rodada de patch imediatamente depois desta re-derivação.
- **Known-bad state avoided:** sem essa exceção, o deploy desta story quebraria silenciosamente o backup diário já em produção (regressão de uma funcionalidade existente e cumprindo NFR4), só percebida quando o backup parasse de rodar.
- **KEEP:** a abordagem geral (allowlist de rotas públicas + redirecionamento em middleware + página de login client-side chamando `signInWithPassword`) segue válida e não muda; só a condição de quando redirecionar foi refinada.

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

### 2026-07-17 — Review pass 1

- intent_gap: 0
- bad_spec: 1 (high 1, medium 0, low 0)
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - `[high]` `[bad_spec]` Redirecionamento incondicional quebraria `/api/cron/backup` (rota de sistema pré-existente, autenticada por secret próprio) -- ver Spec Change Log acima. Código revertido; spec corrigida; re-implementação segue no pass 2.

Achados desta mesma revisão que não são bad_spec, coletados para tratamento (patch) na próxima passada assim que o código for re-derivado com a correção acima: falta de `try/catch` em `signInWithPassword` e em `getUser()`; erro bruto do Supabase exposto ao usuário; sem preservação de destino (`next`) no redirecionamento; guard de double-submit ausente no form; duplicação do forward de cookies entre os dois branches de redirect; copy desatualizada na home. Todos já incorporados diretamente na spec re-derivada acima (Code Map/Tasks) para evitar retrabalho.

Achados rejeitados/deferidos nesta passada (não bloqueiam, não pertencem a esta story): falta de rate limiting no login (Supabase Auth/GoTrue já aplica rate limit no próprio provedor; reimplementar na app é desproporcional para 2 contas fixas) -- reject; ausência de affordance de logout na área `(app)` -- defer (`deferred-work.md`), pertence a uma story de polimento futura, não bloqueia o AC desta story; distinção 401 vs. redirect para chamadas não-navegacionais (fetch/Server Action) em rotas de dado -- defer (`deferred-work.md`), só passa a valer quando Epic 2+ adicionar rotas de API sob `app/(app)`; ausência de cobertura de teste automatizado para o enforcement de AD-6 -- defer (`deferred-work.md`), gap de todo o projeto (nenhuma story anterior configurou test runner), não introduzido por esta story especificamente.

### 2026-07-17 — Review pass 2

- intent_gap: 0
- bad_spec: 0
- patch: 6 (high 1, medium 3, low 2)
- defer: 1 (medium 1)
- reject: 9
- addressed_findings:
  - `[high]` `[patch]` `createServerClient(...)` ficava fora do `try/catch` que só cobria `getUser()` -- uma env var ausente/inválida no momento da criação do client derrubaria o middleware inteiro (500 em toda rota, inclusive `/login`). Ampliado o `try/catch` para cobrir a criação do client também.
  - `[medium]` `[patch]` A checagem de isenção de `/api/cron/` rodava depois de `getUser()`, acoplando a rota de cron (que tem auth própria) à latência/disponibilidade do Supabase Auth. Movida para o topo da função, antes de qualquer chamada ao Supabase.
  - `[medium]` `[patch]` A isenção era por prefixo (`startsWith('/api/cron/')`), abrindo brecha silenciosa para qualquer rota futura sob esse prefixo escapar do enforcement de AD-6 sem querer. Trocado para allowlist exata (`SYSTEM_PATHS = ['/api/cron/backup']`).
  - `[medium]` `[patch]` Validação de `next` contra open redirect duplicada em `middleware.ts` e `login/page.tsx`, e incompleta (não barrava `\` invertida, que navegadores normalizam para protocolo-relativo). Extraída para `lib/supabase/safe-redirect.ts` (`isSafeRedirectPath`), usada nos dois lugares, agora também rejeitando barra invertida.
  - `[low]` `[patch]` Erro de `getUser()` era engolido sem registro nenhum, tornando uma indisponibilidade do Auth indistinguível de um logout real ao investigar depois. Adicionado `console.error` no `catch`.
  - `[low]` `[patch]` Inputs do formulário de login sem `name`/`autoComplete`, prejudicando gerenciadores de senha (única forma real de guardar a senha temporária/real neste app); mensagem de erro sem `role="alert"` para leitores de tela. Adicionados `name`, `autoComplete="email"`/`"current-password"`, e `role="alert"`.
- deferred:
  - `[medium]` Sem timeout/`AbortController` em torno de `supabase.auth.getUser()` -- se o Auth travar em vez de falhar rápido, toda rota (exceto a de cron, já isenta antes dessa chamada) fica pendurada. Real, mas não trivial de implementar corretamente sem risco de novo bug (a lib `@supabase/ssr` não expõe um jeito direto de abortar essa chamada) -- registrado em `deferred-work.md` para uma spike futura, desproporcional para resolver agora num app de 2 usuários na mesma infra (Vercel + Supabase).

Rejeitados nesta passada (2ª rodada; ver rationale completo no pass 1 para os que se repetem): mensagem de erro genérica demais para diferenciar rede/outage de senha errada -- reject, trade-off de segurança já deliberado (evitar leak de estado de rate-limit/conta) supera o ganho de diagnóstico para 2 usuários; sem fallback não-JS no formulário de login -- reject, não é requisito do projeto (NFR6 cobre responsividade, não JS desabilitado); `/robots.txt`/`/sitemap.xml` não excluídos do matcher -- reject, essas rotas não existem no projeto hoje, nada a quebrar; `app/page.tsx` removido+adicionado em vez de `git mv` -- reject, cosmético/limite de tooling, não funcional; estilo inline em vez de `globals.css`/dark mode -- reject, consistente com a convenção já usada desde a Story 1.0; sem throttling client-side de tentativas de login -- reject, já coberto pelo rate limit nativo do Supabase Auth/GoTrue (mesma decisão do pass 1); redirect extra ao acessar `/login?next=/login` já autenticado -- reject, um hop a mais é inofensivo, não é um loop; falta de affordance de logout -- já deferido no pass 1, não duplicado; distinção 401 vs. redirect para chamadas não-navegacionais -- já deferido no pass 1, não duplicado; falta de cobertura de teste -- já deferido no pass 1, não duplicado.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção sucede (confirma que as rotas `(auth)`/`(app)` não colidem e compilam)

**Manual checks (if no CLI):**
- Rodar `npm run dev`, acessar `/` sem estar logado -- deve redirecionar para `/login`
- Logar com uma das 2 contas reais (Story 1.1) usando a senha temporária -- deve navegar para `/` e mostrar o conteúdo
- Acessar `/login` já logado -- deve redirecionar para `/`

## Auto Run Result

Status: done

**Summary:** Middleware do Supabase agora enforce AD-6 (toda rota de dado exige sessão válida, redireciona para `/login?next=...`), com uma allowlist exata para a rota de sistema `/api/cron/backup` (auth própria, não pode regredir). Página `/login` real criada; home migrada para `app/(app)/page.tsx` como primeira rota protegida testável.

**Files changed:**
- `lib/supabase/middleware.ts` -- enforcement de sessão + isenção de rota de sistema + fail-closed com log
- `lib/supabase/safe-redirect.ts` (novo) -- validação compartilhada de `next` contra open redirect
- `app/(auth)/login/page.tsx` (novo) -- formulário de login
- `app/(app)/page.tsx` (novo, migrado de `app/page.tsx`)
- `app/page.tsx` (removido)

**Review findings breakdown:**
- Pass 1: 1 bad_spec de severidade alta (redirecionamento quebraria `/api/cron/backup`, regressão do backup diário/NFR4) -- código revertido, spec corrigida, re-implementado.
- Pass 2 (sobre o código re-derivado): 6 patches aplicados (1 alto: `try/catch` não cobria a criação do client Supabase, podendo derrubar o app inteiro com env misconfigurada; 3 médios: ordem/exatidão da isenção de cron, open redirect via `next`; 2 baixos: log de erro engolido, acessibilidade/autofill do form), 1 deferido (timeout no `getUser()`, non-trivial), 9 rejeitados como trade-off aceito ou fora de escopo.

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- todos limpos. Testes reais via `curl` contra `npm run dev`: `GET /` sem sessão → `307` para `/login?next=%2F`; `GET /login` → `200`; `GET /api/cron/backup` sem header de auth → `401` do próprio route handler (confirma que o middleware não intercepta a rota de sistema).

**Residual risks:** Login real com as contas da Story 1.1 (usando a senha temporária) não foi testado interativamente num navegador — só a mecânica de redirecionamento via `curl`. Follow-up review recomendado dado o volume/consequência dos achados de segurança nesta story (fail-closed, open redirect, isolamento da rota de cron).

Follow-up review recommended: true
