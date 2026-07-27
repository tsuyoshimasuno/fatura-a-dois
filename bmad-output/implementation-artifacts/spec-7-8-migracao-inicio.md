---
title: 'Story 7.8 — Migração de componentes: Início (Dashboard)'
type: 'refactor'
created: '2026-07-26'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '69b55de'
final_revision: '08cf5c2'
---

<intent-contract>

## Intent

**Problem:** `/` (Início/Dashboard) ainda usa `<section className="card">`/`<h2 className="section-title">` (CSS artesanal) em vez de `Card`/`CardTitle`.

**Approach:** Migrar as 2 seções condicionais (estado de fatura/cartões pendentes/gastos -- mutuamente exclusivas -- e o card opcional de comprometimento do próximo mês) para `Card`/`CardHeader`/`CardTitle asChild`(`<h2>`, mesmo `text-[22.5px]` já usado em `/parcelas` na Story 7.6 para preservar o tamanho de fonte padrão do navegador)/`CardContent`. O cabeçalho de topo (`page-header`/`page-title`/`page-subtitle`) e os links `.link` **não mudam** (mesmo escopo já estabelecido nas Stories 7.6/7.7 -- página de estado de erro (`!dadosDashboard`) também fora de escopo, é só um `<p className="hint">` solto, sem `.card`).

## Boundaries & Constraints

**Always:** Preservar toda a lógica existente (fetch paralelo com `Promise.all`, fallback de erro try/catch, cálculo de `faturaNaoEnviada`/`totalCombinado`/`proximaCompetencia`, os 3 estados mutuamente exclusivos do card principal). Rodar suite de QA e revisar visualmente antes de aceitar.

**Block If:** Nenhuma decisão de produto/UX pendente.

**Never:** Não tocar no cabeçalho de topo nem no estado de erro (`!dadosDashboard`). Não tocar em `/lancamentos` ou `/upload` (stories futuras).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fatura do mês não enviada | `totalLancamentos === 0` | Card "Fatura ainda não enviada" + link Enviar | N/A |
| Cartões pendentes | `pendentesCartoes.length > 0` (e fatura já enviada) | Card "N cartão(ões) pendente(s)" + link Mapear | N/A |
| Gastos normais | nem os dois acima | Card com total combinado + link Ver gastos | N/A |
| Comprometimento do próximo mês | parcelas projetadas para o mês seguinte | 2º Card opcional, mesma estrutura | N/A |
| Falha ao carregar dados | erro no `Promise.all`/`obterComprometimentoLimiteMensal` | mensagem de erro simples (`.hint`, fora de escopo) | já tratado, sem crash |

</intent-contract>

## Code Map

- `app/(app)/page.tsx` -- migrar as 3 seções condicionais (fatura/cartões/gastos) e o card de comprometimento do próximo mês para `Card`/`CardHeader`/`CardTitle asChild`(`<h2>`, `text-[22.5px]`)/`CardContent`

## Tasks & Acceptance

**Execution:**
- [x] `app/(app)/page.tsx` -- migrar os `<section className="card">` para `Card`, preservando toda a lógica de fetch/cálculo (nenhuma mudança de dado, só markup)
- [x] Rodar `npm run test:e2e`, revisar diff visual de `/` antes de aceitar (rota já coberta desde a Story 7.1 -- diff esperado, não rota nova) -- concluído pelo orquestrador, 68/68 verde em 2 execuções consecutivas, diff revisado visualmente (mascarado por dado real, chrome/layout confirmado íntegro)

**Acceptance Criteria:**
- Given a fatura do mês atual não enviada, when `/` renderiza, then o Card "Fatura ainda não enviada" aparece com o link para `/upload`.
- Given cartões pendentes de mapeamento, when `/` renderiza (e a fatura já foi enviada), then o Card de cartões pendentes aparece com o link para `/cartoes`.
- Given parcelas comprometidas no próximo mês, when `/` renderiza, then o 2º Card de comprometimento aparece com o mesmo estilo do Card principal.
- Given a suite de QA, when rodada após a migração, then os testes estruturais/contraste passam e o diff visual de `/` é revisado antes de aceitar.

## Spec Change Log

## Review Triage Log

### 2026-07-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 1)
- defer: 0
- reject: 6: (low 6)
- addressed_findings:
  - `[high]` `[patch]` `CardTitle asChild` aplicado a um `<h2>` não neutraliza `font-weight` -- a regra global `h1, h2, h3 { font-weight: 700 }` (`app/globals.css`) fica em `@layer base`, enquanto `font-semibold` (600) do `CardTitle` é `@layer utilities`; utilities sempre vence sobre base independente de especificidade (`@layer theme, base, components, utilities;`). Confirmado empiricamente via `getComputedStyle` (migrado: `fontWeight: "600"`; referência sintética `.section-title`: `fontWeight: "700"`) -- mesmo bug já existia silenciosamente em `/parcelas` desde a Story 7.6 (não capturado até agora porque o Card inteiro fica mascarado no teste visual, escondendo o texto do título). Corrigido adicionando `font-bold` ao `className` de TODAS as 4 instâncias (`/parcelas` + as 3 de `/`), reverificado via `getComputedStyle`: `fontWeight: "700"` bate exatamente com a referência. Comentário de `components/ui/card.tsx` (`CardTitle`) atualizado para documentar esse cuidado explicitamente, prevenindo a mesma classe de bug nas Stories 7.9/7.10.
  - `[reject]` `line-height`/`leading-none` perdido junto com o `font-size` -- alegação FALSIFICADA empiricamente: `getComputedStyle` mostra `lineHeight: "33.75px"` tanto no migrado quanto na referência sintética `.section-title`, valores idênticos. `tailwind-merge` descarta `leading-none` automaticamente ao combinar com um `text-[Npx]` arbitrário (mesmo mecanismo já observado na Story 7.4 para outro componente), fazendo o line-height cair de volta no herdado do navegador -- que já era o valor original, paridade exata por acidente, não uma perda real.
  - `[reject]` Padding do `Card` (20px→24px) e gap título↔conteúdo (`gap-6`, 24px, substituindo `margin-bottom: 0.75rem` de 12px) -- categoria DIFERENTE do bug de font-weight: são consequências deliberadas e já aceitas da estrutura interna do próprio `Card`/`CardHeader`/`CardContent` (mesmo padrão em TODAS as Stories 7.4-7.7, nunca contestado antes), não um acidente de cascata CSS que ninguém decidiu. Aceito como característica já estabelecida da adoção do Card, não uma regressão nova desta story.
  - `[reject]` `<section>` → `<div>` (raiz do `Card`) perde semântica de sectioning -- mesma característica já estabelecida do próprio componente `Card` em TODAS as migrações anteriores (7.4-7.7), não introduzida aqui.
  - `[reject]` `app/(app)/cartoes/page.tsx` ainda tem um `<h2 className="section-title">` fora de qualquer `Card` (seção "Cartões marcados como não sendo do casal") -- verificado que esse heading nunca esteve dentro de escopo de nenhuma story de migração de componentes (não é filho de nenhum `.card`/`Card`, é um sub-título de página como o próprio `<h1 className="page-title">`, que também fica fora de escopo em toda story desta run); não é uma lacuna nova desta story.
  - `[reject]` 4 blocos de `Card` quase idênticos não fatorados num componente compartilhado -- abstração prematura dado o volume atual (o fix de font-weight já foi aplicado consistentemente nas 4 instâncias via edição direta, sem necessidade de um componente novo); reavaliar só se um padrão de reuso mais amplo emergir nas 2 stories restantes.
  - `[reject]` Nenhum teste de `forced-colors`/mobile wrap acompanha a mudança -- mesma profundidade de verificação já estabelecida nas Stories 7.4-7.7 (verificação manual pontual quando um achado real justifica, não um gate automatizado geral); não é uma lacuna nova.

## Design Notes

Mesmo padrão de `text-[22.5px] font-bold` em `CardTitle asChild` já usado (e, nesta story, corrigido -- ver Review Triage Log) na Story 7.6 (`/parcelas`) -- `.section-title` original deixava o `<h2>` deliberadamente no tamanho/peso padrão do navegador+regra global (`~22.5px`, `font-weight: 700`), preservado aqui para os 3 usos de `<h2>` desta página.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção limpo
- `npm run test:e2e` -- expected: suite verde; diff visual de `/` revisado antes de aceitar

## Auto Run Result

**Resumo:** `/` (Início/Dashboard) migrada para shadcn/ui (4 `Card`s: 3 mutuamente exclusivos com título + 1 opcional sem título). Review adversarial (Blind Hunter + Edge Case Hunter, ambos dispatchados) encontrou 1 bug real de severidade alta: `CardTitle asChild` não neutraliza `font-weight` do navegador/regra global ao substituir um `<h2 className="section-title">` -- o mesmo bug já existia silenciosamente em `/parcelas` desde a Story 7.6, nunca detectado porque o teste visual mascara o Card inteiro (incluindo o texto do título). Corrigido nas 4 instâncias (as 3 desta story + a de `/parcelas`), verificado empiricamente via `getComputedStyle` contra uma referência sintética do `.section-title` original -- fontSize/fontWeight/letterSpacing/lineHeight batem exatamente agora.

**Arquivos alterados:**
- `app/(app)/page.tsx` -- 4 `<section className="card">` migrados para `Card`/`CardHeader`/`CardTitle asChild`(`<h2>`, `text-[22.5px] font-bold`)/`CardContent` (3) e `Card`/`CardContent` sem header (1, sem título original).
- `app/(app)/parcelas/page.tsx` -- retrofix: `font-bold` adicionado ao `CardTitle` (bug da Story 7.6 corrigido nesta review, mesma causa raiz).
- `components/ui/card.tsx` -- comentário de `CardTitle` expandido documentando o cuidado com `font-weight` ao reusar `asChild` para `<h2>`/`<h3>`, prevenindo a mesma classe de bug nas Stories 7.9/7.10.

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada cada):** 7 achados distintos -- 1 corrigido (high, font-weight, convergente entre os dois revisores), 0 deferidos, 6 rejeitados com justificativa (ver Review Triage Log acima, incluindo 1 alegação de line-height falsificada empiricamente).

**Verificação realizada:**
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos antes e depois do patch de review.
- Bug de font-weight confirmado e corrigido via `getComputedStyle` real (script Playwright descartável, removido), comparando o `<h2>` migrado contra um `<h2 className="section-title">` sintético injetado na mesma página como referência -- não uma suposição.
- Suite de QA (`npm run test:e2e`) rodada 4x ao longo da story -- 68/68 verde nas últimas 2 execuções consecutivas (o fix de font-weight não afeta nenhum baseline visual, já que o texto do título fica dentro do `Card` mascarado por conter dado financeiro real).

**Riscos residuais:** nenhum novo. O padrão `CardTitle asChild` para headings `<h2>`/`<h3>` agora está documentado no próprio componente (`card.tsx`) para as 2 stories restantes do Epic 7 que ainda vão usá-lo.
