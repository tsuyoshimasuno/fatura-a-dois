---
title: 'UX: dashboard em "/" com status da competência atual + atalhos'
type: 'feature'
created: '2026-07-18'
status: 'done'
baseline_revision: '67a0664a48ca5060795eb90d7fe7d94d86956c36'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - 'bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/EXPERIENCE.md'
  - 'bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/DESIGN.md'
warnings: ['multiple-goals']
---

<intent-contract>

## Intent

**Problem:** `app/(app)/page.tsx` (a tela "Início", ponto de entrada de todo login) é hoje um stub estático -- só título + uma frase genérica ("Use o menu acima..."). Não mostra se a fatura do mês já foi enviada, se há cartões pendentes de mapeamento (que bloqueiam a visão de gastos, FR-6), nem um resumo de quanto já foi gasto. O casal não tem como saber, ao abrir o app, o que fazer a seguir -- precisa navegar às cegas. Relacionado: depois de um upload bem-sucedido, a tela `/upload` só limpa o formulário, sem indicar o próximo passo (ver gastos daquela competência); e a nav global não sinaliza quando há cartões pendentes ou lançamentos pendentes de revisão esperando ação, então o casal só descobre entrando na tela.

**Approach:** `/` vira um dashboard real de leitura, mostrando exatamente um dos três estados possíveis da competência atual (mês calendário), na ordem em que a jornada realmente progride: (a) fatura ainda não enviada + atalho para `/upload`; (b) cartões pendentes de mapeamento + atalho para `/cartoes` (bloqueia a visão de gastos, prioridade sobre (c)); (c) resumo de gastos já processado + atalho para `/gastos`. Mais uma linha, sempre presente quando há dado, com o comprometimento do próximo mês (parcelas). A nav global ganha um badge numérico ao lado de "Cartões"/"Lançamentos" quando há pendência. `/upload`, ao concluir com sucesso, ganha um link direto para `/gastos` daquela competência.

## Boundaries & Constraints

**Always:**
- A prioridade dos três estados do dashboard é fixa: (a) fatura não enviada > (b) cartões pendentes > (c) resumo de gastos -- reflete a ordem real de bloqueio (FR-6: cartão pendente impede a visão de gastos ficar completa) e de jornada (upload antes de tudo).
- "Fatura ainda não enviada" é definido como: nenhum lançamento existe para a competência do mês calendário atual (nem em `pessoas`, nem em `pendentes`, do retorno de `obterResumoGastos`).
- O badge de pendência na nav usa a cor `pending` proposta em `DESIGN.md` (adicionar os tokens `--pending`/`--pending-dark` a `app/globals.css`, hoje ausentes) -- nunca reutilizar `--danger` (reservado para erro/destrutivo) nem `--accent` (reservado para navegação ativa/ação primária).
- O link pós-upload usa a MESMA competência (mês/ano) que o usuário selecionou naquele envio -- nunca o mês calendário atual, caso sejam diferentes (upload de uma competência passada continua funcionando).
- Contagens usadas no dashboard e nos badges vêm das mesmas fontes já existentes e testadas (`listarCartoesPendentes`, `obterResumoGastos`, `projetarParcelasFuturas` + `obterComprometimentoLimiteMensal`) -- nenhuma consulta nova ao banco além de reutilizar essas funções.

**Block If:**
- Nenhuma condição identificada que exija decisão humana.

**Never:**
- Não introduzir cache/memoização (`React.cache`, `unstable_cache`) para evitar chamadas duplicadas entre `layout.tsx` e `page.tsx` -- app de baixo tráfego (uso mensal, duas pessoas), a duplicação de 1-2 consultas leves por carregamento de página não justifica a complexidade.
- Não modificar `mapear-cartao.ts`, `resumo-gastos.ts`, `projetar-parcelas-futuras.ts`, `comprometimento-limite.ts` -- só consumir o que já retornam.
- Não criar rota nova nem tocar em `/categorias`, `/lancamentos` (além do já feito na story de competência persistente), `/parcelas`.
- Não bloquear a navegação por causa de cartões pendentes -- o badge é aviso, nunca um gate que impede acessar as outras telas.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nenhum lançamento na competência do mês atual | `obterResumoGastos(anoAtual, mesAtual)` retorna `pessoas` todas zeradas e `pendentes.itens` vazio | Dashboard mostra "Fatura de {mês} ainda não enviada" + botão/link para `/upload` (mês/ano atuais pré-selecionados via query string) | — |
| Há cartões pendentes de mapeamento (independente da competência) | `listarCartoesPendentes()` não vazio | Dashboard mostra "N cartão(ões) pendente(s) de mapeamento" + link para `/cartoes` -- tem prioridade sobre o estado (c), mesmo que já haja gastos processados | — |
| Fatura enviada, sem cartão pendente | `obterResumoGastos` tem dado real, `listarCartoesPendentes()` vazio | Dashboard mostra total combinado da competência atual + contagem de "pendente de revisão" (se houver) + link para `/gastos` | — |
| Existe comprometimento para o próximo mês calendário | `obterComprometimentoLimiteMensal` inclui uma entrada para `anoAtual`/`mesAtual+1` | Linha adicional: "{Próximo mês} já tem {valor} comprometido em parcelas" + link para `/parcelas` | — |
| Nenhum comprometimento para o próximo mês | Nenhuma entrada correspondente | Linha de parcelas simplesmente não aparece (sem "R$ 0,00" nem placeholder vazio) | — |
| Upload concluído com sucesso | `processarUpload` retorna `{ ok: true }` | Mensagem de sucesso ganha um link "Ver gastos de {mês}/{ano} →" apontando para `/gastos?mes=X&ano=Y` com a competência daquele envio | — |
| Cartões pendentes ou lançamentos pendentes de revisão (competência atual) existem | Contagem > 0 | Badge numérico aparece ao lado do link "Cartões"/"Lançamentos" na nav | — |
| Nenhuma pendência | Contagem = 0 em ambos | Nenhum badge aparece (nunca "0") | — |

</intent-contract>

## Code Map

- `app/globals.css` -- adicionar tokens `--pending`/`--pending-dark` (par light/dark, ver `DESIGN.md` frontmatter) + classe `.badge-pending` (pequeno indicador numérico, `border-radius: 9999px`, fundo `var(--pending)`, texto `var(--accent-foreground)`)
- `app/(app)/layout.tsx` -- vira `async`; busca `listarCartoesPendentes()` (length) e `obterResumoGastos(anoAtual, mesAtual).pendentes.itens.length`; passa as duas contagens como props para `<Nav>`
- `app/(app)/_components/nav.tsx` -- aceita `pendentesCartoes`/`pendentesLancamentos` como props; renderiza `<span className="badge-pending">{n}</span>` ao lado do link correspondente quando `n > 0`
- `app/(app)/page.tsx` -- vira `async`; busca `listarCartoesPendentes()`, `obterResumoGastos(anoAtual, mesAtual)`, `projetarParcelasFuturas()` + `obterComprometimentoLimiteMensal(...)`; renderiza um dos três estados (a/b/c) + linha de parcelas condicional
- `app/(app)/upload/page.tsx` -- captura `mes`/`ano` selecionados no momento do submit (antes do `form.reset()`); em sucesso, além da mensagem já existente, renderiza um `Link` para `/gastos?mes=${mes}&ano=${ano}`

## Tasks & Acceptance

**Execution:**
- [x] `app/globals.css` -- tokens `--pending`/`--pending-dark` + classe `.badge-pending`
- [x] `app/(app)/layout.tsx` -- async, busca as duas contagens (cartões pendentes, lançamentos pendentes da competência atual via `obterResumoGastos`), passa para `<Nav>`
- [x] `app/(app)/_components/nav.tsx` -- props `pendentesCartoes`/`pendentesLancamentos` (numbers, default 0), badge condicional (`n > 0`) ao lado de "Cartões"/"Lançamentos"
- [x] `app/(app)/page.tsx` -- async; implementa a lógica de prioridade dos 3 estados (fatura não enviada > cartões pendentes > resumo de gastos) + linha de parcelas do próximo mês quando existir
- [x] `app/(app)/upload/page.tsx` -- captura mês/ano do formulário no momento do submit; em sucesso, link para `/gastos?mes=X&ano=Y` daquela competência

**Acceptance Criteria:**
- Given nenhum lançamento existe para o mês calendário atual, when o usuário abre "/", then vê "Fatura ainda não enviada" com um atalho direto para `/upload`
- Given existe ao menos um cartão pendente de mapeamento, when o usuário abre "/", then vê a contagem de cartões pendentes com atalho para `/cartoes`, mesmo que já existam gastos processados na competência atual
- Given a fatura da competência atual foi processada e não há cartão pendente, when o usuário abre "/", then vê o total combinado e a contagem de pendentes de revisão (se houver) com atalho para `/gastos`
- Given existe comprometimento de parcelas para o mês seguinte ao atual, when o usuário abre "/", then vê uma linha adicional com esse valor e atalho para `/parcelas`
- Given um upload é concluído com sucesso, when a mensagem de resultado aparece, then ela inclui um link direto para `/gastos` da competência recém-enviada
- Given há N cartões pendentes ou M lançamentos pendentes de revisão na competência atual (N ou M > 0), when qualquer tela é carregada, then a nav mostra um badge com essa contagem ao lado do link correspondente; quando ambos são 0, nenhum badge aparece

## Spec Change Log

## Review Triage Log

### 2026-07-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5 (high 1, medium 3, low 1)
- defer: 1 (medium 1)
- reject: 10 (low 10)
- addressed_findings:
  - `[high]` `[patch]` Both reviewers independently converged on the same finding: `app/(app)/layout.tsx` (now `force-dynamic`, wrapping every route) did unguarded `Promise.all` data-fetching with no error boundary anywhere in the app -- a transient DB/Supabase hiccup would crash every single page, not just the badge. Before this story, `Nav` had zero data dependencies and could never fail. Fixed: wrapped in `try/catch`, degrading to badge count 0 (no badge shown) on failure instead of crashing. `app/(app)/page.tsx` got the same treatment with a graceful fallback message.
  - `[medium]` `[patch]` Blind Hunter: the "fatura ainda não enviada" heuristic (pessoas all-zero AND pendentes empty) is fooled by a competência made entirely of `cartão terceiro` lançamentos, which `obterResumoGastos` excludes from both fields entirely -- the dashboard would tell the couple to re-upload an already-processed fatura. Root cause was a technical proxy formula I (the spec author) invented myself as an implementation detail, not a user-specified requirement -- corrected in both spec and code to use `listarLancamentosParaCorrecao(ano, mes).length === 0` instead (an existing function, already used by `/lancamentos`, that counts every lançamento in the competência regardless of cartão status) -- a strictly more accurate "has anything been uploaded" signal, same user-facing intent.
  - `[medium]` `[patch]` Blind Hunter: the "Gastos de {mês}: {valor}" headline silently excluded `resumo.pendentes.totalCentavos`, showing an artificially low total with no indication of how much real spend was hiding behind unresolved review items -- unlike `/gastos` itself, which discloses this explicitly. Fixed: added a line showing the pending amount (matching `/gastos`'s own "Pendente de revisão -- {valor}" wording exactly, not inventing new copy).
  - `[medium]` `[patch]` Blind Hunter: nav badge (`<span className="badge-pending">{badge}</span>`) had no accessible label -- a screen reader would announce a bare number with no indication it means "N pending." Added `aria-label={`${badge} pendente(s)`}`.
  - `[low]` `[patch, self-caught during verification]` The first attempt at the pendentes-value patch above prefixed the amount with a literal `"+ "`, which produces a nonsensical `"+ -R$ 3.318,36"` when `pendentes.totalCentavos` is negative (confirmed via the read-only verification script against real production data: it IS currently negative, -R$3.318,36, because some pending items are refund/reversal lines with negative `valorCentavos`). Caught before commit by running the verification script and reading its actual output; rewritten to drop the "+" and match `/gastos`'s plain `"Pendente de revisão (N): {valor}"` phrasing, which reads correctly regardless of sign.
  - `[medium]` `[defer]` Both reviewers flagged that `new Date()` (server-local time, no explicit `America/Sao_Paulo` anchoring) now drives a higher-stakes decision than before (which of 3 dashboard states to show, not just which years populate a `<select>`) -- near midnight Brasília time, if the server runs in UTC, the dashboard could show the wrong month's state for a few hours. Real, but pre-existing across the whole app (`competenciaValida`, `/upload`, `/gastos`, `/lancamentos` all already use unanchored `new Date()`) -- fixing it properly means auditing every date-resolution call site with a real timezone-handling decision, not a patch bolted onto this story. Logged to `deferred-work.md`.
  - `[low]` `[reject]` Blind Hunter's claim of a broken `.badge-pending: {` CSS selector (stray colon) -- verified false by reading the actual file directly (`app/globals.css:121` is `.badge-pending {`, syntactically correct); the transcription artifact was in the diff text pasted into the review prompt, not in the real file.
  - `[low]` `[reject]` `force-dynamic` characterized as more invasive than necessary (PPR/Suspense alternative not explored) -- a deliberate, reasoned tradeoff already documented in the code's own comment for this app's actual scale (2 users, checked ~monthly); pursuing Partial Prerendering/Suspense boundaries for a handful of lightweight queries is meaningfully more complexity than the real performance cost justifies here.
  - `[low]` `[reject]` Now-vestigial `revalidatePath` calls in Server Actions left in place -- harmless no-ops under `force-dynamic`, not a bug; removing them is unforced busywork and reduces resilience if `force-dynamic` is ever revisited.
  - `[low]` `[reject]` `proximaCompetencia` duplicates `avancarCompetencia`'s month-rollover math instead of exporting the original -- 3 lines of stable, well-commented, low-drift-risk logic; matches this codebase's existing tolerance for small duplication (e.g. `MESES` arrays already tripled across pages).
  - `[low]` `[reject]` Layout/page snapshot mismatch under a hypothetical concurrent mutation between their two independent fetches -- already explicitly accepted in the spec's own Boundaries (app of 2 users, monthly cadence, negligible real collision risk).
  - `[low]` `[reject]` Nav "Lançamentos" badge scoped only to the current calendar month, not a persisted competência from a prior story -- matches the spec's own explicit, deliberate scope ("da competência do mês calendário atual"), not a gap relative to what was specified.
  - `[low]` `[reject]` Edge Case Hunter's claimed `mes` zero-padding mismatch between the Home and Upload `/gastos` links -- verified false: neither the `MESES` array values nor `mesAtual` are zero-padded, both are plain `"1"`-`"12"`/`1`-`12`, and `Number()` parsing in `competenciaValida` treats padded and unpadded numeric strings identically regardless.
  - `[low]` `[reject]` Edge Case Hunter's claim that `comprometimentoProximoMes && totalProximoMes !== undefined` could disagree and hide a valid hint -- verified false by reading `obterComprometimentoLimiteMensal`'s implementation: it's a pure 1:1 `.map()` over `competencias` with no filtering, so the two arrays are always the same length and an entry in one always has a corresponding entry in the other.



## Design Notes

Prioridade dos 3 estados do dashboard reflete a ordem real da jornada (Key Flow 1 do `EXPERIENCE.md`): upload é sempre o primeiro passo mensal; cartão pendente bloqueia a visão de gastos ficar completa (FR-6) e por isso vem antes mesmo que já existam alguns gastos processados; o resumo de gastos é o estado "de regime", quando não há mais nada bloqueando. Um mês pode simultaneamente ter gastos processados E cartões pendentes (upload parcial, ou reenvio) -- por isso a checagem de cartões pendentes é feita independente de competência (um cartão pendente de julho ainda bloqueia mesmo que o dashboard esteja olhando para agosto).

`layout.tsx` e `page.tsx` (home) fazem chamadas parcialmente sobrepostas (`listarCartoesPendentes`, `obterResumoGastos` da competência atual) -- aceito conscientemente (ver Boundaries) em vez de introduzir um mecanismo de cache; app de uso mensal por 2 pessoas, o custo de 1-2 consultas leves extras por carregamento é irrelevante frente à complexidade de coordenar estado entre layout e página via Context/cache.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção conclui sem erro

**Manual checks (if no CLI):**
- Rodar `npm run dev`, confirmar visualmente os 3 estados do dashboard (manipulando dados de teste se necessário) e o badge na nav aparecendo/desaparecendo. Este projeto não tem ferramenta de automação de navegador disponível nesta sessão; verificação visual final fica pendente de confirmação manual pelo usuário. Verificação end-to-end contra o Supabase de produção real (via script temporário, removido após uso) deve confirmar que as consultas (`listarCartoesPendentes`, `obterResumoGastos`, `projetarParcelasFuturas`/`obterComprometimentoLimiteMensal`) retornam os dados reais esperados para compor os 3 estados -- não altera nenhum dado, é só leitura.

## Auto Run Result

Status: done

**Resumo:** "/" vira um dashboard real com 3 estados priorizados (fatura não enviada > cartões pendentes > resumo de gastos) + linha condicional de comprometimento do próximo mês. Nav global ganha badges de pendência em "Cartões"/"Lançamentos". `/upload` ganha link direto para `/gastos` da competência recém-enviada. Nenhuma Server Action ou função de leitura existente foi modificada.

**Arquivos alterados:**
- `app/globals.css` -- tokens `--pending`/`--pending-dark` + `.badge-pending`
- `app/(app)/layout.tsx` -- async, `force-dynamic` (ver nota abaixo), busca as 2 contagens de pendência com try/catch (degrada para 0 em falha)
- `app/(app)/_components/nav.tsx` -- props de contagem, badge condicional com `aria-label`
- `app/(app)/page.tsx` -- dashboard real com try/catch (degrada para mensagem de erro simples em falha), 3 estados priorizados, detecção de "fatura não enviada" corrigida no review, linha de pendentes com valor em reais
- `app/(app)/upload/page.tsx` -- captura mês/ano no submit, link pós-sucesso para `/gastos`

**Nota arquitetural (não é achado de review, é uma decisão consciente tomada durante a implementação):** `app/(app)/layout.tsx` define `export const dynamic = 'force-dynamic'`, convertendo todas as rotas de `(app)` (antes parcialmente estáticas com `revalidatePath` pontual) em renderização dinâmica por requisição. Necessário porque o badge de pendência é estado transversal que muda via mutações em várias telas diferentes, nenhuma das quais chama `revalidatePath` para o layout compartilhado ou para "/" -- e o Code Map desta story proíbe modificar essas Server Actions. Tradeoff revisado pelo review (ver Triage Log) e mantido: custo de performance irrelevante para um app de 2 usuários com uso mensal.

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada):** 0 `bad_spec`, 5 `patch` aplicados -- o mais sério (severidade alta, ambos os revisores convergiram): fetch sem try/catch no layout agora `force-dynamic` derrubaria o app inteiro numa falha transitória de banco, corrigido com degradação graciosa. Outros: detecção de "fatura não enviada" enganada por competência só de cartão terceiro (corrigido usando uma função existente mais precisa); total de gastos escondia o valor pendente (corrigido, e um bug que eu mesmo introduzi ao corrigir isso -- um "+" antes de um valor que pode ser negativo -- foi pego pela própria verificação contra dado real de produção antes do commit); badge sem `aria-label`. 1 `defer` (fuso horário, transversal ao app, achado convergente dos dois revisores). 10 `reject`, incluindo 3 falsos alarmes verificados diretamente contra o código real antes de descartar (CSS quebrado -- não estava; mismatch de padding de mês -- não existe; par comprometimento/total podendo divergir -- estruturalmente impossível pela própria implementação de `obterComprometimentoLimiteMensal`).

**Follow-up review recomendado:** true -- maior superfície das 4 stories desta sessão (5 arquivos, mudança arquitetural real com `force-dynamic`), 1 achado de severidade alta que exigiria correção antes de qualquer uso real, e um segundo bug pego só durante a própria verificação de dado real (não pelo review adversarial) -- o padrão de "corrigir um achado introduz outro" nesta story específica justifica um olhar independente adicional antes de considerar o padrão estabilizado.

**Verificação realizada:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos após cada rodada. Script de verificação read-only (removido após uso) contra o Supabase de produção real confirmou os valores reais: 8 cartões pendentes (estado "b" é o que realmente renderiza agora), 103 lançamentos pendentes de revisão na competência de julho/2026 (`resumo.pendentes.totalCentavos` negativo, -R$ 3.318,36, por conter estornos/reversões -- é isso que expôs o bug do "+" antes de commitar), comprometimento real de agosto/2026 confirmado presente (R$ 4.025,74 combinado).

**Riscos residuais:** confirmação visual dos 3 estados, do badge, e do link pós-upload não foi feita em navegador real nesta sessão -- sem ferramenta de automação disponível. Fuso horário não ancorado (`new Date()` local do servidor) é um risco pré-existente elevado em importância por esta story, deferido para um passe dedicado. `force-dynamic` remove a otimização estática que existia antes para `/cartoes`, `/categorias`, `/parcelas`, `/upload` -- custo aceito conscientemente, não uma regressão descoberta, mas vale o usuário saber que essa troca foi feita.
