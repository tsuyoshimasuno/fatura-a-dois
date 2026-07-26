---
title: 'Unificar radius de input/button para var(--radius) (migração de proveniência SnowUI -> shadcn/ui)'
type: 'chore'
created: '2026-07-26'
status: 'in-review'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'ba3e2d359b80f85d712cf5906ffcd160c87a05b1'
---

<intent-contract>

## Intent

**Problem:** `app/globals.css` tem `border-radius: 8px` hardcoded em `input, select, textarea` (~linha 970) e em `button, .btn` (~linha 993), divergindo do token real `var(--radius)` (10px) já usado em `.card`, `.sidebar-nav-link`, `.icone-picker-option`, `.empty-state` e outros — inconsistência pré-existente que viola a própria regra de uniformidade de radius já documentada em `DESIGN.md` → Do's and Don'ts. Achado real do Winston (tech-lead) durante a avaliação PM+tech-lead+UX da migração de proveniência de tokens SnowUI → shadcn/ui (rodada 12, sem relação direta com o shadcn em si).

**Approach:** Trocar os dois `border-radius: 8px` hardcoded por `border-radius: var(--radius);`, unificando o radius de todo componente do mesmo papel visual (borda arredondada de elemento interativo) para o único token já existente no sistema.

## Boundaries & Constraints

**Always:** Usar exatamente `var(--radius)` (não um valor literal novo) nas duas regras. Preservar todas as outras propriedades de `input, select, textarea` e `button, .btn` inalteradas (só a linha de `border-radius` muda).

**Block If:** Se houver qualquer cálculo em outro lugar do CSS/código que assuma 8px exatos para esses elementos (ex.: padding compensatório, cálculo de altura), HALT com blocking condition `cálculo dependente de 8px encontrado` em vez de aplicar o fix cegamente.

**Never:** Não introduzir Tailwind, Radix UI, nem nenhuma dependência nova. Não mudar cor, sombra, tipografia ou qualquer outro token nesta spec — escopo é só a unificação de radius. Não criar uma escala de radius nova (`--radius-sm/md/lg`) — fora do escopo desta rodada (ver `DESIGN.md` → Shapes).

</intent-contract>

## Code Map

- `app/globals.css` -- linha ~970 (`input, select, textarea`) e ~993 (`button, .btn`): trocar `border-radius: 8px` por `border-radius: var(--radius)`.

## Tasks & Acceptance

**Execution:**
- [x] Grep por `8px` em `app/globals.css` e em qualquer `.tsx` sob `app/`/`components/` para confirmar que nenhum outro lugar assume 8px exatos de radius desses elementos como medida de layout (não deveria haver — `var(--radius)` já é 10px hoje, diferença de 2px).
- [x] `app/globals.css` -- trocar as 2 ocorrências de `border-radius: 8px;` (regras `input, select, textarea` e `button, .btn`) para `border-radius: var(--radius);` -- unifica com o token já usado no resto do sistema.

**Acceptance Criteria:**
- Given qualquer tela do app renderizada, when um `<input>`/`<select>`/`<textarea>`/`<button>`/`.btn` é exibido, then seu `border-radius` computado é `10px` (o valor atual de `--radius`), igual ao de `.card`/`.sidebar-nav-link`/`.icone-picker-option`/`.empty-state`.
- Given a troca de 8px para var(--radius), when comparado visualmente ao estado anterior, then a diferença é sutil (2px) e não introduz nenhuma quebra de alinhamento/overflow.

## Review Triage Log

### 2026-07-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 13 (high 0, medium 0, low 13)
- addressed_findings:
  - none

Blind Hunter (11 findings, todos `reject`): a maioria é comentário de processo/escopo, não bug concreto -- "mudança visual em toda a superfície do app" é o próprio objetivo declarado da spec (unificar radius), decidido na avaliação PM+tech-lead+UX reconciliada antes desta rodada, não uma surpresa a ser questionada pelo review de código; "8px pode ter sido deliberado" é achado real do Winston (tech-lead) já investigado e decidido no nível de design, não do implementador; "foreclosea flexibilidade futura de --radius-sm" é especulativo, nenhuma escala assim jamais existiu no arquivo; "sem teste de regressão visual" é gap pré-existente e transversal ao projeto inteiro, já coberto por entrada existente em `deferred-work.md` (Story 1.2, "nenhum test runner configurado"); "outline não segue border-radius" é comportamento pré-existente inalterado por este diff (outline já era retangular a 8px, continua a 10px -- não introduzido nem agravado de forma material); `input[type='file']` tem `border: none`, radius não é visualmente relevante ali. Edge Case Hunter (2 findings, `reject`): ambos pedem fallback `var(--radius, 8px)` para o caso de `--radius` "unset ou inválido" -- verificado por grep que `--radius` é definido exatamente uma vez, incondicionalmente, em `:root` (linha 25), sem override em nenhum outro lugar do arquivo, e já é usado sem fallback em 5 outros lugares (`.card`, `.icon-button`, `.sidebar-toggle-button`, `.empty-state`, `.icone-picker-option`) antes mesmo deste diff -- cenário hipotético sem correspondência real no código, mesmo padrão de "risco verificado falso por leitura do source" já usado em rodadas anteriores desta run.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros novos
- `npm run lint` -- expected: sem erros novos
- `npm run build` -- expected: build limpo

**Manual checks (if no CLI):**
- Grep confirmando que não sobra nenhum `border-radius: 8px` hardcoded relacionado a input/button em `app/globals.css`.

## Auto Run Result

**Summary:** Unificado `border-radius` de `input/select/textarea` e `button/.btn` (antes 8px hardcoded) para `var(--radius)` (10px), igualando ao token já usado em `.card`/`.sidebar-nav-link`/`.icone-picker-option`/`.empty-state`. Achado real do Winston (tech-lead) durante a avaliação PM+tech-lead+UX da migração de proveniência de tokens SnowUI → shadcn/ui (rodada 12) — único item de código real dessa migração; o restante da rodada foi reclassificação de documentação (DESIGN.md/EXPERIENCE.md/epics.md).

**Files changed:**
- `app/globals.css` -- 2 linhas trocadas (`border-radius: 8px;` → `border-radius: var(--radius);`), regras `input, select, textarea` e `button, .btn`.

**Review findings breakdown:** 13 achados no total (11 Blind Hunter + 2 Edge Case Hunter), todos `reject` com justificativa registrada acima -- nenhum patch, nenhum bad_spec, nenhum defer novo (0 items adicionados a `deferred-work.md`, os apontamentos relevantes já estavam cobertos por entradas existentes).

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- todos limpos, sem erros novos. Grep confirmando remoção completa do valor hardcoded. Sem superfície de teste ponta a ponta contra o Supabase (mudança de CSS puro, sem Server Action/schema tocado, mesmo padrão das trocas de paleta de cor anteriores desta run).

**Residual risks:** Nenhum risco funcional -- mudança de 2px em radius, sem dependência de layout identificada (grep confirmou nenhum cálculo assumindo 8px exatos). Confirmação visual real em navegador não foi feita nesta sessão (sem ferramenta de automação de navegador autenticada disponível, mesma limitação já registrada em várias rodadas anteriores desta run) -- diferença é pequena o suficiente (8px→10px) que o risco de regressão visual perceptível é baixo.
