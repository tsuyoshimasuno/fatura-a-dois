---
title: 'Story 1.1: Provisionamento das duas contas do casal'
type: 'feature'
created: '2026-07-17'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'cf4df05a600e3154d789c7355388a7b82d1b1f86'
final_revision: '0371a9071a389b2a2900847bc276009282b909e9'
---

<intent-contract>

## Intent

**Problem:** As duas contas do casal ainda não existem no Supabase Auth do projeto; sem um jeito administrativo de provisioná-las, não há como logar, e a alternativa errada seria criar um fluxo de auto-cadastro público (proibido pelo FR1).

**Approach:** Script administrativo `scripts/provision-accounts.ts`, executado localmente via `node` por quem administra o projeto (não exposto como rota HTTP), que usa o client admin do Supabase (service role, já existente em `lib/supabase/admin.ts`) para criar as duas contas reais com e-mail confirmado e uma senha temporária aleatória forte por conta — a senha real de cada pessoa é definida depois, pelo fluxo de recuperação de senha (Story 1.3).

## Boundaries & Constraints

**Always:** Criar exatamente as duas contas do casal (tsuyoshi.masuno@gmail.com e milena.smasuno@gmail.com), com `email_confirm: true` (permite login imediato sem clicar em link de confirmação, já que a conta não foi auto-cadastrada); gerar a senha de cada conta aleatoriamente via `crypto.randomBytes` no momento da execução, nunca hardcoded nem persistida em arquivo do repositório; o script é idempotente — rodar de novo não duplica conta nem falha se ela já existir; reutilizar `createAdminClient()` já existente em vez de instanciar outro client Supabase.

**Block If:** Se `SUPABASE_SERVICE_ROLE_KEY` ou `NEXT_PUBLIC_SUPABASE_URL` estiverem ausentes/inválidas no ambiente ao rodar o script — parar com erro explícito, nunca adivinhar ou hardcodar credenciais.

**Never:** Nunca criar endpoint HTTP de criação de conta (nada de rota `app/api/*` para isso); nunca implementar ou expor um fluxo de auto-cadastro público (`signUp` client-side) em qualquer página; nunca reimplementar hashing/validação de senha — delega inteiramente ao Supabase Auth; nunca commitar a senha temporária gerada em nenhum arquivo do repositório.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Conta nova | e-mail ainda não existe em `auth.users` | Cria via Admin API com senha temporária aleatória e `email_confirm: true`; imprime e-mail + senha temporária uma única vez no terminal | Nenhum erro esperado |
| Conta já existente | e-mail já cadastrado em `auth.users` | Detecta (busca por e-mail antes de criar) e pula a criação, logando "já existe" | Nenhum erro esperado — idempotência |
| Credenciais admin ausentes/inválidas | `SUPABASE_SERVICE_ROLE_KEY` vazio ou incorreto | Nenhuma conta é criada | Script falha com mensagem explícita e exit code não-zero |

</intent-contract>

## Code Map

- `lib/supabase/admin.ts` -- client admin (service role) já existente, reutilizado sem alteração
- `scripts/provision-accounts.ts` -- NOVO: script CLI de provisionamento administrativo das 2 contas
- `package.json` -- adiciona script npm `provision:accounts` para padronizar a execução

## Tasks & Acceptance

**Execution:**
- [x] `scripts/provision-accounts.ts` -- criar script que carrega `.env.local` (padrão `dotenv`, igual `drizzle.config.ts`), define a lista fixa das 2 contas do casal (tsuyoshi.masuno@gmail.com, milena.smasuno@gmail.com), busca cada uma em `auth.users` via `createAdminClient().auth.admin.listUsers()` filtrando por e-mail, e para cada uma que não existir chama `auth.admin.createUser({ email, password: <gerada>, email_confirm: true })`, imprimindo no console o e-mail e a senha temporária gerada (só nesta execução, nunca persistida) -- provisiona as 2 contas reais sem expor endpoint público, e é seguro rodar mais de uma vez
- [x] `package.json` -- adicionar `"provision:accounts": "node scripts/provision-accounts.ts"` em `scripts` -- padroniza como o script é invocado
- [x] Verificação: `grep -r "auth.signUp" app/ lib/ server/` deve retornar vazio -- confirma que nenhum fluxo de auto-cadastro público client-side foi introduzido em nenhuma story anterior ou nesta

**Acceptance Criteria:**
- Given Supabase Auth configurado, when o script `provision:accounts` é executado, then as duas contas do casal existem em `auth.users` com e-mail confirmado e conseguem autenticar via `signInWithPassword` usando a senha temporária impressa
- Given as contas já foram criadas, when o script é executado novamente, then nenhuma conta duplicada é criada e nenhum erro é lançado
- Given o projeto inteiro, when se busca por qualquer chamada de auto-cadastro público (`auth.signUp` do lado cliente), then nenhuma ocorrência é encontrada em `app/`, `lib/` ou `server/`

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

### 2026-07-17 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 3 (high 0, medium 2, low 1)
- defer: 0
- reject: 10
- addressed_findings:
  - `[medium]` `[patch]` `listUsers()` only reads the default first page (~50 users) with no `perPage`; an existing account could go undetected past that page and crash `createUser` on a false "new". Fixed by passing `{ perPage: 1000 }`.
  - `[medium]` `[patch]` `createUser` failure for one email aborted the whole loop via the outer `.catch`, leaving remaining accounts unprovisioned. Fixed by wrapping each account's work in try/catch, continuing to the next account, and setting a non-zero exit code if any account failed.
  - `[low]` `[patch]` Top-level `.catch` only logged `error.message`, discarding the stack trace for a script that runs rarely and is hard to re-debug. Fixed by logging the full `error` object.

Rejected (accepted trade-offs or false alarms, not actioned): passwords printed to stdout once (intentional per Design Notes — no persistence, superseded by Story 1.3's reset flow); 2 emails hardcoded in source (intentional — app is permanently 2-account, no multi-tenancy); no dry-run/target confirmation (single production environment by architecture, no staging to confuse it with); `dotenv` "unverified" dependency (already a pre-existing devDependency, used the same way in `drizzle.config.ts`); native-TS-runtime fragility (empirically verified working — 3 real executions succeeded); `engines` field not `engine-strict` (pre-existing, unrelated to this change); `allowImportingTsExtensions` needing `noEmit` (already true in `tsconfig.json`, verified — false alarm); missing test coverage (disproportionate for a 2-task manually-run admin script); script name "misleadingly general" (name matches the story's own language, and the app has no concept of provisioning beyond these 2 accounts); `.env.local` path CWD-relative (matches the pre-existing `drizzle.config.ts` convention, always invoked via `npm run`).

## Design Notes

Senha temporária: `crypto.randomBytes(18).toString('base64url')` (18 bytes ⇒ 24 chars base64url, sem caracteres problemáticos para copiar/colar). Impressa uma única vez em stdout ao criar a conta; quem administra repassa por canal seguro (não WhatsApp/e-mail em texto puro) e cada pessoa troca pela senha real assim que o fluxo de recuperação de senha (Story 1.3) existir. Até lá, a senha temporária é a única forma de login — aceitável porque é conhecida apenas por quem rodou o script localmente e nunca chega ao repositório.

## Verification

**Commands:**
- `node scripts/provision-accounts.ts` -- expected: exit code 0, imprime as 2 contas (criadas ou já existentes) sem erro
- `node scripts/provision-accounts.ts` (segunda vez) -- expected: mesmas 2 contas reportadas como já existentes, sem duplicação, sem erro
- `grep -rn "auth.signUp" app/ lib/ server/` -- expected: nenhuma ocorrência

**Manual checks (if no CLI):**
- Confirmar no Supabase Dashboard (Authentication > Users) que as 2 contas aparecem com status confirmado

## Auto Run Result

Status: done

**Summary:** Script administrativo criado e executado de fato contra o Supabase Auth de produção, provisionando as 2 contas reais do casal com senha temporária + `email_confirm: true`. Nenhum endpoint público de auto-cadastro foi introduzido ou já existia.

**Files changed:**
- `scripts/provision-accounts.ts` (novo) -- script CLI idempotente de provisionamento
- `package.json` -- script npm `provision:accounts`
- `tsconfig.json` -- `allowImportingTsExtensions: true` (necessário para import relativo com extensão `.ts` sob execução ESM nativa do Node)

**Review findings breakdown:** 3 patches aplicados (pagination da checagem de existência, continue-on-error por conta, stack trace preservado no catch); 0 deferred; 10 rejeitados como trade-off aceito ou falso alarme (ver Review Triage Log).

**Verification performed:** `node scripts/provision-accounts.ts` executado 3x contra produção (1ª criou as 2 contas, 2ª e 3ª confirmaram idempotência); `npx tsc --noEmit` limpo; `npm run lint` limpo; `grep -rn "auth.signUp" app/ lib/ server/` sem ocorrências.

**Residual risks:** Senha temporária das 2 contas só existiu no stdout desta sessão (repassada ao usuário fora do repositório); login real depende da Story 1.3 (recuperação de senha) para cada pessoa definir sua senha definitiva.

Follow-up review recommended: false
