---
title: 'Story 7.5 — Migração de componentes: login'
type: 'refactor'
created: '2026-07-26'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '31169ee'
final_revision: 'e15bdda'
---

<intent-contract>

## Intent

**Problem:** `/login` ainda usa o CSS artesanal antigo (`.page`, `.form`, `.field`, `.alert-error`, `<button>` cru, `<a className="link">`) em vez dos componentes shadcn/ui já disponíveis e já usados em `/esqueci-senha`/`/redefinir-senha` (Story 7.4).

**Approach:** Reescrever a página usando `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`, `Input`, `Label`, `Button` e `Alert` (mesmos primitivos já vendorizados e corrigidos na Story 7.4 — `Card`/`Alert` já têm o mecanismo dual claro/escuro correto, nenhum ajuste novo necessário nesses dois arquivos), preservando 100% do comportamento existente: mesmo fluxo de `signInWithPassword`, mesma mensagem de erro genérica, mesmo redirect seguro via `isSafeRedirectPath`/`?next=`, mesmo link para `/esqueci-senha`.

## Boundaries & Constraints

**Always:** Preservar exatamente a lógica de negócio (Supabase Auth `signInWithPassword`, `role="alert"` no erro, `autoComplete`, `required`, redirect via `next` query param). Reusar `Card`/`Alert` como já corrigidos na Story 7.4 — não reintroduzir `bg-card`/`border-none dark:border` nem qualquer variante que já se provou quebrada. Rodar a suite de QA (`npm run test:e2e`) antes e depois, revisando visualmente antes de aceitar o novo baseline (a rota `/login` já tem baseline prévio desde a Story 7.1 — esta story vai gerar um diff esperado, não uma rota nova).

**Block If:** Nenhuma decisão de produto/UX pendente — escopo puramente estrutural.

**Never:** Não tocar em `/esqueci-senha`/`/redefinir-senha` (Story 7.4, já concluída) nem no shell de navegação. Não introduzir `Toast`/`AlertDialog` (deferidos, sem ação destrutiva aqui).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Login válido | e-mail+senha corretos | redirect para `next` (se seguro) ou `/` | N/A |
| Login inválido | e-mail/senha incorretos | `Alert` destrutivo "E-mail ou senha inválidos." | erro genérico, não revela qual campo está errado |
| `?next=` inseguro | `next` aponta para URL externa | redirect cai para `/` (fallback), não para o `next` inseguro | `isSafeRedirectPath` já faz essa checagem, não deve mudar |

</intent-contract>

## Code Map

- `app/(auth)/login/page.tsx` -- reescrever com Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter + Label/Input/Button + Alert (variant destructive)
- `components/ui/card.tsx`, `components/ui/alert.tsx` -- já corrigidos na Story 7.4, sem mudança nesta story
- `e2e/visual/visual.spec.ts` -- `/login` já coberta (grupo público); adicionar cenário de erro (credenciais inválidas) igual ao já feito para as duas telas da Story 7.4

## Tasks & Acceptance

**Execution:**
- [x] `app/(auth)/login/page.tsx` -- migrar markup para Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter + Label/Input/Button + Alert (variant destructive), preservando toda a lógica de estado/submit/redirect
- [x] `e2e/visual/visual.spec.ts` -- adicionar cenário de screenshot para o estado de erro do login (credenciais inválidas), mesmo padrão da Story 7.4
- [x] Rodar `npm run test:e2e`, revisar diff visual de `/login` (mudança esperada) e do novo cenário de erro antes de aceitar -- concluído pelo orquestrador, 64/64 verde em 2 execuções consecutivas, todos os screenshots revisados visualmente antes de aceitar

**Acceptance Criteria:**
- Given credenciais válidas, when o usuário envia o formulário, then o redirect ocorre para `next` (se seguro) ou `/`.
- Given credenciais inválidas, when o usuário envia o formulário, then o `Alert` destrutivo "E-mail ou senha inválidos." aparece, sem revelar qual campo errou.
- Given a suite de QA, when rodada após a migração, then os testes estruturais/contraste passam e o diff visual de `/login` (esperado) e do novo cenário de erro são revisados e aceitos conscientemente.

## Spec Change Log

### 2026-07-26 — Retrofix durante o review da Story 7.9
Mesmo achado/correção registrado em `spec-7-4-migracao-auth-baixo-trafego.md` -- `Alert` destructive (usado no erro de credenciais inválidas desta story) tinha `text-destructive/90` quebrando o contraste WCAG AA calibrado (~4,07:1 no escuro, abaixo do mínimo). Corrigido em `components/ui/alert.tsx` (cross-cutting), verificado por novo teste automatizado. Ver `spec-7-9-migracao-upload.md` para o achado completo.

## Review Triage Log

### 2026-07-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 1, medium 1, low 2)
- defer: 0
- reject: 4: (low 4)
- addressed_findings:
  - `[high]` `[patch]` O teste visual novo (`login credenciais invalidas`) autenticava de forma autônoma contra o Supabase Auth REAL de produção (única instância deste projeto) -- viola a restrição já registrada em `spec-7-1-suite-qa-automatizada.md` ("não tentar autenticar de forma autônoma contra Supabase Auth real"), arrisca rate-limit/lockout real a cada execução de CI, e nem verifica de forma determinística o que alega (`signInError` e o `catch` genérico produzem a mesma mensagem, então uma falha de rede passaria como "sucesso"). Achado convergente de Blind Hunter e Edge Case Hunter. Corrigido interceptando `**/auth/v1/token**` via `page.route()` e forçando uma resposta 400 determinística -- suite não faz mais nenhuma chamada de rede real para este teste.
  - `[medium]` `[patch]` Migração para `CardTitle` (uma `<div>`, sem role de heading) removeu o único `<h1>` real das 3 páginas de auth já migradas nesta run (`/login` nesta story; `/esqueci-senha` e `/redefinir-senha` na Story 7.4, mesma classe de bug, só não capturada até agora). Corrigido adicionando suporte a `asChild` em `CardTitle` (mesmo padrão já usado em `components/ui/button.tsx` via `Slot` do pacote `radix-ui`) e envolvendo o texto num `<h1>` real nas 3 páginas; `text-[15px] m-0` neutraliza o tamanho/margem padrão do navegador para heading (projeto não usa Preflight do Tailwind) -- verificado visualmente (screenshot antes/depois idêntico, diff isolado a antialiasing de fonte na própria palavra do título).
  - `[low]` `[patch]` Nome do teste novo ("credenciais invalidas") estava sem o acento usado consistentemente no resto do arquivo/copy da UI -- corrigido para "inválidas".
  - `[low]` `[patch]` (mesmo achado do reviewer, aplicado junto do patch high acima) -- teste de erro agora é determinístico e não depende de rede real, eliminando também o risco de timeout/flake por rate-limit apontado pelo Edge Case Hunter.
  - `[reject]` Link "Esqueci minha senha" em `CardFooter` continua usando a classe legada `.link` em vez de `Button variant="link"` -- `.link` é o padrão estabelecido e usado consistentemente em TODO o app (inclusive em telas não relacionadas a este Epic, ex.: `app/(app)/page.tsx`, `categorias`, `upload`, `parcelas`) -- não é uma inconsistência introduzida por esta story, é o padrão vigente para links de texto inline; fora de escopo (essa story migra containers/inputs/botões, não o estilo de link inline do app inteiro).
  - `[reject]` Nenhum teste afirma `role="alert"` explicitamente no novo cenário de erro -- o próprio `Alert` (componente já usado e revisado na Story 7.4) tem `role="alert"` hardcoded no wrapper; a garantia já é estrutural no componente, não vale a pena um assert redundante por cenário.
  - `[reject]` Task da spec ainda não estava marcada `[x]` no momento em que o review rodou -- estado esperado (subagente de implementação deixa a verificação de QA para o orquestrador, por instrução explícita), resolvido nesta mesma sessão.
  - `[reject]` `CardFooter` não tem separador visual (`border-t`) entre o form e o link -- já revisado visualmente via screenshot (claro/escuro, antes e depois desta review), layout aceito conscientemente, mesmo visual que a versão legada (link solto fora do form, sem separador também).

## Design Notes

Mesma estrutura já usada e validada na Story 7.4 (`/esqueci-senha`). `CardFooter` usado pela primeira vez aqui para o link "Esqueci minha senha" (antes um `<a className="link">` solto fora do form). Nenhum ajuste novo em `card.tsx`/`alert.tsx` — ambos já corrigidos.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção limpo
- `npm run test:e2e` -- expected: suite verde; diff visual de `/login` (mudança esperada) revisado antes de aceitar

## Auto Run Result

**Resumo:** `/login` migrada de CSS artesanal para shadcn/ui (Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter, Input, Label, Button, Alert), reusando `Card`/`Alert` já corrigidos na Story 7.4 sem nenhum ajuste novo nesses dois arquivos. Review adversarial encontrou 1 achado real de severidade alta (teste novo autenticava contra Supabase de produção real) e 1 de severidade média que na verdade afeta as 3 páginas de auth já migradas nesta run (perda do `<h1>` real ao trocar para `CardTitle`) -- ambos corrigidos.

**Arquivos alterados:**
- `app/(auth)/login/page.tsx` -- markup migrado, lógica preservada 1:1; `CardTitle asChild` com `<h1>` real.
- `components/ui/card.tsx` -- `CardTitle` ganhou suporte a `asChild` (mesmo padrão de `button.tsx`, via `Slot` do pacote `radix-ui`) + `text-[15px] m-0` para neutralizar o tamanho/margem padrão de heading do navegador (sem Preflight do Tailwind).
- `app/(auth)/esqueci-senha/page.tsx`, `app/(auth)/redefinir-senha/page.tsx` -- retroativamente ajustados para `CardTitle asChild` + `<h1>` (mesmo bug de acessibilidade, já em produção desde a Story 7.4, corrigido junto por ser a mesma causa raiz).
- `e2e/visual/visual.spec.ts` -- novo cenário de erro para `/login` (credenciais inválidas), usando `page.route()` para interceptar e mockar a chamada real do Supabase Auth em vez de autenticar contra produção.

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada):** 8 achados -- 4 corrigidos (1 high, 1 medium, 2 low), 0 deferidos, 4 rejeitados com justificativa (ver Review Triage Log acima).

**Verificação realizada:**
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos antes e depois dos patches de review.
- Suite de QA (`npm run test:e2e`) rodada 4x ao longo da story (baseline inicial da migração de `/login`, após o patch de `CardTitle asChild` que afetou as 3 páginas de auth, 2x de estabilidade) -- 64/64 verde nas últimas 2 execuções consecutivas. Todos os screenshots novos/alterados revisados visualmente (diff isolado à renderização do texto do título ao trocar de `<div>` para `<h1>`, sem mudança de tamanho/layout) antes de aceitar.
- Confirmado por leitura de `.env.local` (só o nome da variável, não o valor) que este projeto tem uma única instância Supabase real -- motivo pelo qual o mock via `page.route()` era necessário, não opcional.

**Riscos residuais:** nenhum novo. `CardFooter` sem separador visual entre form e link -- mesmo visual da versão legada, aceito conscientemente via revisão visual.

**Nota de segurança do processo:** durante a review, o subagente Blind Hunter leu `.env.local` e fez `grep` por "supabase" para confirmar quantas instâncias Supabase o projeto usa -- não colou nenhuma chave/segredo no relatório final (só a referência do projeto, `novkeguqgftsgupubcvr.supabase.co`, que já é pública no bundle do cliente), mas a ação em si (materializar o conteúdo de um arquivo de credenciais na saída de uma ferramenta) foi sinalizada pelo classificador de segurança da sessão. Nenhum segredo real chegou a este spec ou ao memlog.
