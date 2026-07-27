---
title: 'Story 7.10 — Migração de componentes: Lançamentos (última, maior risco)'
type: 'refactor'
created: '2026-07-26'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '2b2cafb'
---

<intent-contract>

## Intent

**Problem:** `/lancamentos` (`lancamentos-view.tsx` + `lancamento-item.tsx`, ~860 linhas) é a tela mais complexa do app -- ainda 100% CSS artesanal, e a última do Epic 7. Também carrega 2 achados de acessibilidade já deferidos explicitamente para esta story (`deferred-work.md`, Story 7.1): `aria-prohibited-attr` em `.category-icon` e `scrollable-region-focusable` em `.lancamentos-painel`; mais um 3º achado registrado na Story 7.7 (`name="nome"` sem label no form inline "+ Nova categoria" de `lancamento-item.tsx`).

**Approach:** Migrar `<section className="card">`/`<h2 className="section-title">` (múltiplas variantes: total filtrado, pessoa, casal combinado, por-pessoa, pendentes) para `Card`/`CardHeader`/`CardTitle asChild`(`<h2>`, `text-[22.5px] font-bold`, padrão já estabelecido)/`CardContent`. `.card-highlight` (visão combinada sem filtro) vira `className="bg-[var(--highlight)]"` no `Card` (override de utility, não a classe legada -- ver Design Notes). Todos os `<select>` (Mês/Ano/Pessoa/Categoria no filtro, categoria na correção inline) ganham `selectClassName` (padrão já estabelecido, Stories 7.7/7.9) + `Label`. Botões de texto (Filtrar, Corrigir, "+ Nova categoria", Cancelar) viram `Button`. Input de nome da nova categoria ganha `Label`+`Input` real (fecha o gap deferido da Story 7.7). Mensagens seguem o padrão já fixado (sucesso = `hint`, erro = `Alert` destructive). `.category-icon` ganha `role="img"` (fecha o gap deferido `aria-prohibited-attr`). `.lancamentos-painel` ganha `tabIndex={0}`+`role="region"`+`aria-label` (fecha o gap deferido `scrollable-region-focusable`).

## Boundaries & Constraints

**Always:** Preservar TODA a lógica existente (filtros client-side de Pessoa/Categoria, reconciliação de categoria removida durante o render, toggle de repasse com atraso de 2500ms + cleanup no unmount, criação de categoria inline com merge local via `categoriaExtra`, guard de disparo duplo via `useRef` síncrono em cada form, o `visão` toggle condicional). Rodar suite de QA e revisar visualmente antes de aceitar. Remover os 3 filtros de gap conhecido agora resolvidos (`e2e/structural/app.spec.ts`) e verificar que os testes passam SEM eles (prova real, não suposição -- mesmo método usado na Story 7.7).

**Block If:** Nenhuma decisão de produto/UX pendente.

**Never:** Não tocar em `.category-icon`/`.titular-badge`/`.badge-repasse` (componentes customizados, já revisados extensivamente em rodadas anteriores, sem equivalente shadcn) além do `role="img"` pontual já especificado. Não tocar nos 2 `.icon-button` (toggle de correção `aria-expanded`, toggle de repasse) -- widgets icon-only sem padrão shadcn ainda estabelecido neste projeto (nenhuma story anterior usou `Button` icon-only), risco desnecessário na story de maior risco; ficam exatamente como estão. Não tocar no toggle Individual/Combinada (radio nativo sem estilo customizado, mesmo raciocínio de não introduzir um padrão de radio-group novo sem necessidade). `<select>` nunca vira Radix Select.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Filtro Categoria ativo | `categoriaSelecionada` numérico | Card "Total" (sem CardTitle de pessoa/casal) | N/A |
| Visão combinada sem filtro | `pessoaSelecionada === null`, `categoriaSelecionada === 'todas'`, `visao === 'combinada'` | Card com `bg-[var(--highlight)]` (equivalente a `card-highlight`) | N/A |
| Categoria criada inline com sucesso | form "+ Nova categoria" válido | `Input`/`Label` reais, categoria mesclada localmente, form fecha | N/A |
| Correção de categoria falha | Server Action retorna `ok:false` | `Alert` destructive, painel de edição permanece aberto | N/A |
| Painel rolável focado via teclado | Tab até `.lancamentos-painel` | `tabIndex=0` + `role="region"` permitem foco e leitura por AT | N/A |

</intent-contract>

## Code Map

- `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- selects do filtro estilizados+Label, Button (Filtrar), todos os `<section className="card">` para `Card`/`CardHeader`/`CardTitle asChild`/`CardContent`, `.card-highlight` → `bg-[var(--highlight)]`, `.lancamentos-painel` ganha `tabIndex`/`role`/`aria-label`
- `app/(app)/lancamentos/_components/lancamento-item.tsx` -- `<li className="card">` → `<li><Card>`, select de correção estilizado+Label, Button (Corrigir/+Nova categoria/Cancelar), Input+Label (nome da nova categoria), mensagens hint/Alert, `.category-icon` ganha `role="img"`
- `e2e/structural/app.spec.ts` -- remover os 3 filtros de gap conhecido agora resolvidos, verificar que passam sem eles
- `bmad-output/implementation-artifacts/deferred-work.md` -- sem novas entradas (os 3 gaps existentes são resolvidos, não substituídos)

## Tasks & Acceptance

**Execution:**
- [x] `lancamentos-view.tsx` -- migrar filtro (selects+Label+Button) e todos os Cards de resumo, preservando toda a lógica client-side
- [x] `lancamentos-view.tsx` -- `.lancamentos-painel` ganha `tabIndex={0}` `role="region"` `aria-label="Resumo e pendentes"` (fecha gap `scrollable-region-focusable`)
- [x] `lancamento-item.tsx` -- migrar `<li className="card">`, select de correção, botões de texto, Input/Label de nova categoria, mensagens
- [x] `lancamento-item.tsx` -- `.category-icon` ganha `role="img"` (fecha gap `aria-prohibited-attr`)
- [x] `e2e/structural/app.spec.ts` -- remover os 3 filtros de gap conhecido, confirmar que os testes passam sem eles
- [x] Rodar `npm run test:e2e`, revisar diff visual de `/lancamentos` antes de aceitar -- concluído pelo orquestrador, 72/72 verde em 2 execuções consecutivas, diff visual revisado (mascarado por dado real, chrome/layout íntegro, altura variou 2px de forma benigna)

**Acceptance Criteria:**
- Given qualquer um dos 5 estados do painel de resumo (total filtrado/pessoa/casal combinado/por-pessoa/pendentes), when `/lancamentos` renderiza, then o Card correspondente aparece com os mesmos dados de antes.
- Given o painel `.lancamentos-painel`, when navegado via teclado (Tab), then ele recebe foco e é anunciado como região por tecnologia assistiva.
- Given o ícone de categoria (`.category-icon`), when lido por leitor de tela, then o `aria-label` é anunciado (role="img" válido).
- Given o form inline "+ Nova categoria", when um leitor de tela o anuncia, then o input de nome tem um label acessível real.
- Given a suite de QA, when rodada após a migração, then os testes estruturais/contraste passam SEM os 3 filtros de gap conhecido removidos, e o diff visual de `/lancamentos` é revisado antes de aceitar.

## Spec Change Log

## Review Triage Log

### 2026-07-27 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 1, medium 2, low 1)
- defer: 1: (low 1, consolidando 4 sub-achados de logica pre-existente)
- reject: 3: (low 3)
- addressed_findings:
  - `[high]` `[patch]` Card "Casal" (visão combinada) usava `className="bg-[var(--highlight)]"` sem variante `dark:` -- o próprio `dark:bg-[var(--surface)]` do `Card` (também `@layer utilities`, batelado no mesmo bloco `@media` que qualquer `dark:` do app) vencia silenciosamente em modo escuro. Confirmado empiricamente via `getComputedStyle` real (fundo caía pra `--surface`, `rgb(70,70,70)`, em vez de `--highlight`, `rgb(63,59,84)`). Corrigido com `bg-[var(--highlight)]! dark:bg-[var(--highlight)]!` (mesma técnica `!important` já usada na Story 7.6 para uma ambiguidade de ordem análoga entre 2 classes `dark:`), reverificado empiricamente em claro e escuro.
  - `[medium]` `[patch]` `tabIndex`/`role="region"` em `.lancamentos-painel` tornavam o painel incondicionalmente focável, mas ele só é de fato rolável (`overflow-y:auto`+`max-height`) dentro de `@media (min-width: 768px)` -- no mobile vira uma parada de Tab sem propósito operável. Tentativa de tornar isso condicional via `matchMedia`+`useEffect` foi implementada, mas **revertida** após confirmar empiricamente que o axe-core avalia o DOM antes do efeito React comitar (a violação real `scrollable-region-focusable` reapareceu no teste estrutural com o toggle condicional). Mantido incondicional, com comentário explícito documentando o trade-off testado e aceito conscientemente (não uma omissão).
  - `[medium]` `[patch]` Os 2 novos `Label` `sr-only` ("Selecionar categoria"/"Nome da nova categoria") eram idênticos em toda a lista de 100+ itens -- um usuário de leitor de tela não conseguia diferenciar os campos pelo nome acessível sozinho. Corrigido incluindo `{item.estabelecimento}` no texto de cada label (mesmo princípio já usado na Story 7.7 com `item.nome`).
  - `[low]` `[patch]` Card "Total" (filtro de categoria ativo) renderizava `CardContent` mesmo quando seu único filho condicional (`totalFiltradoIncluiTitularPendente && <p>`) era falso -- `gap-6` do `Card` (flex-col entre `CardHeader`/`CardContent` como siblings) ainda reservava 24px de espaço em branco abaixo do título, que o `<section className="card">` original nunca tinha. Corrigido movendo a condicional para envolver o `CardContent` inteiro, omitindo-o por completo quando não há nada pra mostrar.
  - `[defer]` Edge Case Hunter encontrou 4 pontos frágeis de lógica de runtime PRÉ-EXISTENTES (guard de repasse via estado em vez de `useRef` síncrono como as outras 2 ações; `pessoaSelecionada` sem reconciliação se a conta for removida; ordem dos ternários faz visão combinada com `resumoPessoas` vazio mostrar "R$0,00" em vez de erro; `categoriaExtra` é valor único, não array, perdendo uma 2ª categoria criada antes do refresh da 1ª) -- confirmados por diff contra o commit anterior a esta story como 100% idênticos (nenhum introduzido pela migração). Registrado consolidado em `deferred-work.md`, fora de escopo por design (Boundaries do spec-7-1: não alterar lógica de negócio numa migração estrutural).
  - `[reject]` Outros 5 achados do Edge Case Hunter (stale `repasseResultado` após prop externa mudar; `categoriaId` não reconcilia se mudar externamente; interação `editando`+`resultadoCriacao` ao fechar o painel; `criarCategoria` ok:true sem payload; `Array.from` vs `Intl.Segmenter` para grapheme clusters) -- todos também pré-existentes e idênticos ao commit anterior; o último (`Array.from`) já tinha sido revisado e decidido deliberadamente numa rodada anterior (comentário no próprio código: "achado de review real, categorias são texto livre"); os demais são variações de baixa probabilidade da mesma classe de gap já consolidada no defer acima, não repetidos individualmente para não inflar `deferred-work.md` com entradas quase-duplicadas.
  - `[reject]` Remover o filtro `htmlIncludes`/`label` de `GAPS_CONHECIDOS` deixa esse branch do type `GapConhecido` sem nenhuma entrada exercitando-o -- observação válida sobre cobertura de teste da própria infraestrutura de teste, não um bug; o type permanece disponível para uma futura entrada real.
  - `[reject]` `selectClassName` duplicado pela 4ª vez (agora em 2 arquivos desta story, além de `remover-categoria-form.tsx`/`upload/page.tsx`) -- mesma decisão já reconciliada na Story 7.7 de não abstrair sem um padrão de reuso mais amplo forçando a mão; Epic 7 termina nesta story, sem mais oportunidade de reavaliar o limiar.

## Design Notes

`.card-highlight` original só sobrescreve `background` (aditivo sobre `.card`, nunca sozinho). Migrar para `className="bg-[var(--highlight)]! dark:bg-[var(--highlight)]!"` no `Card` shadcn em vez de reusar a classe `.card-highlight` diretamente: `.card-highlight` vive em `@layer base`, enquanto o `bg-background`/`dark:bg-[var(--surface)]` do `Card` são `@layer utilities` -- utilities sempre vence independente de especificidade (mesmo achado de causa raiz do bug de `font-weight` da Story 7.8). Um utility arbitrário (`bg-[var(--highlight)]`) já nasce na mesma camada `utilities` que o `Card`, mas achado real do review (ver Review Triage Log): o `dark:` do `Card` ainda venceria sozinho por estar batelado no mesmo bloco `@media` que qualquer outra classe `dark:` do app -- os modificadores `!` (important) nos dois lados resolvem isso, verificado empiricamente via `getComputedStyle`.

Botões icon-only (`.icon-button`, toggle de correção e de repasse) **permanecem exatamente como estão** -- única categoria de elemento desta tela deliberadamente fora do escopo de migração, junto com `.category-icon`/`.titular-badge`/`.badge-repasse` (além do `role="img"` pontual) e o toggle Individual/Combinada.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção limpo
- `npm run test:e2e` -- expected: suite verde SEM os 3 filtros de gap conhecido removidos; diff visual de `/lancamentos` revisado antes de aceitar

## Auto Run Result

**Resumo:** `/lancamentos` (860 linhas, 2 arquivos) -- tela mais complexa do app e última story do Epic 7 -- migrada para shadcn/ui. Fechados os 3 gaps de acessibilidade deferidos desde a Story 7.1/7.7 (`aria-prohibited-attr` em `.category-icon`, `scrollable-region-focusable` em `.lancamentos-painel`, `label` no form inline de nova categoria), confirmados via remoção dos filtros correspondentes em `e2e/structural/app.spec.ts` e reexecução real do teste (não suposição). Review adversarial (Blind Hunter + Edge Case Hunter) encontrou e corrigiu 1 bug real de severidade alta (highlight "Casal" invisível em dark mode) e 2 de severidade média (tabIndex incondicional vs painel só rolável no desktop -- trade-off documentado após tentativa de fix condicional falhar empiricamente; labels sr-only genéricos numa lista de 100+ itens).

**Arquivos alterados:**
- `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- filtro (4 selects estilizados + Label + Button), 5 Cards de resumo migrados, `.card-highlight` → `bg-[var(--highlight)]! dark:bg-[var(--highlight)]!`, `.lancamentos-painel` com `tabIndex`/`role`/`aria-label`, Card "Total" com `CardContent` condicional.
- `app/(app)/lancamentos/_components/lancamento-item.tsx` -- `<li><Card>`, select de correção estilizado, botões migrados, `Input`/`Label` de nova categoria (labels disambiguados com `item.estabelecimento`), mensagens hint/Alert, `.category-icon` com `role="img"`.
- `e2e/structural/app.spec.ts` -- 3 filtros de gap conhecido removidos (resolvidos, não mascarados).
- `bmad-output/implementation-artifacts/deferred-work.md` -- 1 entrada consolidada nova (4 pontos de lógica de runtime pré-existentes, confirmados idênticos ao commit anterior, fora de escopo desta migração estrutural).

**Achados do review (Blind Hunter 1ª rodada, ~170k tokens/64 tool calls dada a complexidade + Edge Case Hunter 2ª rodada focada em lógica de runtime):** Blind Hunter -- 8 achados, 4 corrigidos (1 high, 2 medium, 1 low), 4 rejeitados. Edge Case Hunter -- 9 achados, todos pré-existentes (confirmados por diff contra o commit anterior), 1 defer consolidado + 8 rejeitados/absorvidos no mesmo defer.

**Verificação realizada:**
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos antes e depois de todos os patches.
- Bug do highlight em dark mode confirmado E corrigido via `getComputedStyle` real (script Playwright descartável, removido) -- antes (`rgb(70,70,70)` = `--surface`, errado) e depois (`rgb(63,59,84)` = `--highlight`, correto) em ambos os modos.
- Tentativa de tornar `tabIndex` condicional (matchMedia+useEffect) foi implementada E revertida após confirmar empiricamente (rodando o teste estrutural real) que reabria a violação axe-core -- decisão de manter incondicional é baseada em teste real, não suposição.
- Os 3 gaps de acessibilidade fechados foram confirmados removendo os filtros e rodando `npx playwright test e2e/structural/app.spec.ts -g "lancamentos"` -- passou (2/2, claro e escuro) sem os filtros, prova real.
- Suite de QA completa (`npm run test:e2e`) rodada 4x ao longo da story -- 72/72 verde nas últimas 2 execuções consecutivas. Diff visual de `/lancamentos` revisado (altura mudou 2px de forma benigna, chrome/layout íntegro).

**Riscos residuais:** `.lancamentos-painel` continua com `tabIndex` incondicional (parada de Tab sem propósito operável no mobile) -- trade-off testado e aceito conscientemente, não uma omissão. 4 pontos de lógica de runtime pré-existente (nenhum introduzido por esta story) registrados em `deferred-work.md`, sem story futura no Epic 7 para revisitá-los.

---

**Epic 7 concluído.** Todas as 10 stories (7.1-7.10) da migração para shadcn/ui foram implementadas, revisadas adversarialmente e implantadas em produção nesta run do goal-engine.
