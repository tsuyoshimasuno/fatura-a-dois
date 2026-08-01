---
title: 'Correção de 3 bugs visuais pós-Epic 8: contraste de select, affordance de upload, bullet de sidebar'
type: 'bugfix'
created: '2026-08-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: ['multiple-goals']
baseline_revision: '189257915ddc1caa8c7d8b56baf87f0bb2862fdb'
---

<intent-contract>

## Intent

**Problem:** Usuário reportou (com prints) 3 bugs visuais em produção, todos residuais do redesign do Epic 8: (1) as opções dos `<select>` nativos (Mês/Ano em /upload, substituta em /categorias) ficam com texto quase ilegível contra o fundo do popup, legível só em hover; (2) o botão nativo "Escolher arquivo" do `<input type="file">` em /upload não parece clicável, sem borda/fundo/sombra; (3) a lista de navegação da sidebar desktop (`SidebarMenu`, vendorizado shadcn) exibe um bullet indevido ao lado de cada ícone.

**Approach:** Causas-raiz confirmadas por leitura direta de código: (1) `<option>` não tem `background-color`/`color` explícitos, herdando popup/texto que colidem entre si; (2) `file:*` do Input remove border/bg de propósito (`file:border-0 file:bg-transparent`), texto vira indistinguível de rótulo comum; (3) `app/globals.css` importa só `theme.css`+`utilities.css` do Tailwind (sem `preflight`), então o reset manual `* { box-sizing; padding; margin }` nunca zerou `list-style` -- só `.sidebar-nav-list` (mobile) ganhou o reset manualmente, o `<ul>` do `SidebarMenu` (desktop) nunca ganhou. 3 correções cirúrgicas de CSS/tokens, sem novo componente.

## Boundaries & Constraints

**Always:** Reusar tokens/variáveis já existentes (`var(--background)`, `var(--foreground)`, tokens do `Button`) -- não introduzir cores novas hardcoded. Corrigir na fonte compartilhada (globals.css / `components/ui/input.tsx`) para propagar automaticamente às 4 telas com `<select>` nativo (`app/(app)/upload/page.tsx`, `app/(app)/categorias/_components/remover-categoria-form.tsx`, `app/(app)/lancamentos/_components/lancamentos-view.tsx`, `app/(app)/lancamentos/_components/lancamento-item.tsx`) sem editar cada arquivo. Preservar `<select>` nativo (decisão já reconciliada na rodada 13, ver comentário em `remover-categoria-form.tsx`) -- não migrar para Radix Select.

**Block If:** Nenhuma decisão de produto está em aberto aqui -- os 3 itens são bugs visuais confirmados pelos prints do usuário, sem ambiguidade de intenção.

**Never:** Não importar `tailwindcss/preflight.css` globalmente para resolver o bug (3) -- mudança de blast radius grande (reset completo de margin/padding/list-style em toda a árvore), fora de escopo de um bugfix cirúrgico; usar reset pontual em vez disso. Não adicionar `list-style: none` só em `SidebarMenu`/`SidebarMenuItem` (componente vendorizado shadcn, editá-lo divergiria do upstream sem necessidade) -- resolver via reset global, mesmo padrão já usado pelo `* {}` existente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Select aberto, tema claro | Usuário abre dropdown Mês/Ano em /upload com OS em light mode | Todas as opções legíveis (texto escuro sobre fundo claro), sem depender de hover | N/A |
| Select aberto, tema escuro | Usuário abre dropdown Mês/Ano em /upload com OS em dark mode | Todas as opções legíveis (texto claro sobre fundo escuro), sem depender de hover | N/A |
| Input file em foco/hover | Usuário passa o mouse ou navega por teclado até "Escolher arquivo" | Pseudo-botão exibe borda, fundo e sombra reconhecíveis como botão, consistente com `Button` variant outline | N/A |
| Sidebar desktop (>=768px) | Usuário visualiza a sidebar em viewport >=768px | Nenhum bullet/marcador aparece ao lado dos ícones de navegação | N/A |
| Sidebar mobile (<768px) | Usuário abre o painel off-canvas mobile | Continua sem bullet (já correto via `.sidebar-nav-list`), sem regressão | N/A |

</intent-contract>

## Code Map

- `app/globals.css` -- adicionar `list-style: none` ao reset universal `* {}` (bug 3); adicionar regra `select option { background-color; color }` (bug 1).
- `components/ui/input.tsx` -- dar affordance real de botão ao pseudo-elemento `::file-selector-button` via classes `file:*` (bug 2), componente único usado por `/upload` (`type="file"`).

## Tasks & Acceptance

**Execution:**
- [x] `app/globals.css` -- estender o reset universal (`* { box-sizing: border-box; padding: 0; margin: 0; }`, ~linha 251) com `list-style: none;` -- remove o bullet nativo de qualquer `<ul>`/`<li>` do app, incluindo o `SidebarMenu` vendorizado do shadcn (desktop), sem tocar no componente.
- [x] `app/globals.css` -- adicionar regra `select option { background-color: var(--background); color: var(--foreground); }` (perto do bloco de reset base) -- força cor de fundo/texto explícitas no popup nativo em vez de herdar renderização ambígua do SO, corrigindo os 4 `<select>` do app (upload, categorias, lançamentos x2) de uma vez.
- [x] `components/ui/input.tsx` -- trocar `file:border-0 file:bg-transparent` por classes com `file:border file:border-input file:rounded-md file:bg-background file:px-3 file:shadow-xs file:mr-3 file:cursor-pointer`, mantendo `file:h-7 file:text-sm file:font-medium file:text-foreground` -- dá ao "Escolher arquivo" a mesma affordance visual (borda/fundo/raio/sombra) do `Button` variant outline, sem criar variante nova.

**Acceptance Criteria:**
- Given a tela /upload aberta, when o usuário clica no select Mês (ou Ano) sem passar o mouse sobre nenhuma opção, then todas as opções da lista são legíveis (contraste adequado) no primeiro render do popup.
- Given a tela /upload aberta, when o usuário observa o campo "Arquivo" sem interagir, then o texto "Escolher arquivo" aparece visualmente como um botão (borda/fundo/sombra distintos do restante do campo).
- Given a sidebar desktop (>=768px) renderizada, when o usuário inspeciona os itens de navegação, then nenhum marcador de lista (bullet) aparece ao lado dos ícones.
- Given a sidebar mobile (<768px) renderizada, when o usuário abre o painel off-canvas, then o comportamento permanece idêntico ao anterior (sem bullet, sem regressão de espaçamento).

## Spec Change Log

## Review Triage Log

### 2026-08-01 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4 (medium 1, low 3)
- defer: 2
- reject: 6
- addressed_findings:
  - `[medium]` `[patch]` Reset universal `* { list-style: none }` era mais amplo que o necessário (afetaria qualquer `<ul>`/`<ol>` atual ou futuro, com risco de regressão de semântica de lista para leitores de tela em Safari/VoiceOver) e deixava `.card-list`/`.sidebar-nav-list` redundantes -- trocado por seletor escopado `[data-sidebar="menu"], [data-sidebar="menu-sub"]`, resolvendo só os `<ul>` vendorizados do shadcn que de fato tinham o bug (Blind Hunter + Edge Case Hunter, achado convergente).
  - `[low]` `[patch]` Pseudo-botão `::file-selector-button` ganhou borda/fundo/sombra mas nenhum feedback de hover, inconsistente com `Button` variant outline (`hover:bg-accent hover:text-accent-foreground`) -- adicionado `hover:file:bg-accent hover:file:text-accent-foreground` em `components/ui/input.tsx` (Blind Hunter).
  - `[low]` `[patch]` `<option disabled>` (placeholder "Selecione o mês"/"Selecione o ano") perdia o esmaecimento automático do navegador ao herdar `color: var(--foreground)` em opacidade total, ficando visualmente indistinguível de uma opção real selecionável -- adicionada regra `select option:disabled { color: color-mix(...) 50% }` (Edge Case Hunter).
  - `[low]` `[patch]` Regra nova `select option {...}` não tinha comentário de rationale, quebrando a convenção já estabelecida neste arquivo (toda decisão de cor/contraste em `globals.css` é comentada) -- comentário adicionado (Blind Hunter).
  - `[medium]` `[defer]` Suporte cross-browser de `::file-selector-button` (particularmente Safari) não foi verificado -- registrado em `deferred-work.md`; risco pré-existente herdado do padrão upstream do shadcn `Input` (já usava `file:*` antes deste diff), não introduzido por esta mudança (Edge Case Hunter).
  - `[low]` `[defer]` 4 cópias independentes da mesma string de classes Tailwind para `<select>`/`<input>` continuam divergindo entre si (`components/ui/input.tsx` e 3 arquivos que duplicam `selectClassName`) -- débito arquitetural pré-existente, já reconhecido em comentários no próprio código-fonte, não causado por este diff (Blind Hunter).
  - `[low]` `[reject]` Falta de `@media (forced-colors: active)` para `select option` -- forced-colors sobrescreve cor autoral automaticamente por design; nenhum fallback é necessário.
  - `[low]` `[reject]` Divergência de token entre popup do select (`--background`) e `.card` (`--surface`) em modo escuro -- popup nativo é overlay de SO, não "dentro" do card visualmente; não é defeito real.
  - `[low]` `[reject]` Possível "double shadow" de `file:shadow-xs` empilhado sobre o `shadow-xs` do input -- verificado visualmente via screenshot real (`upload-dark`), sem artefato visível.
  - `[low]` `[reject]` `file:mr-3` não testado contra nome de arquivo longo -- cosmético, comportamento de truncamento nativo do browser não é afetado pela margem nova.
  - `[low]` `[reject]` Falta `disabled:file:cursor-not-allowed` no pseudo-botão -- `disabled:pointer-events-none` (já existente no `Input`, padrão upstream shadcn) já suprime toda interação/cursor do controle inteiro quando desabilitado; classe adicional seria inerte.
  - `[low]` `[reject]` Falta de evidência de verificação visual -- endereçado com verificação real (screenshots antes/depois via Playwright + `getComputedStyle`, suíte e2e completa 78/78 verde), não uma mudança de código.

## Design Notes

O bug (1) foi confirmado por leitura direta do código-fonte, não suposição: `app/(app)/upload/page.tsx` define `<option>` sem `color`/`background-color` explícitos; o popup nativo do `<select>` renderiza com fundo claro por padrão do SO/browser em muitos ambientes independente do `color-scheme` do documento, enquanto o texto herda `color: var(--foreground)` (quase branco em dark mode) -- a combinação produz texto quase invisível, e o hover funciona porque o browser aplica seu próprio highlight de seleção por cima. Forçar `background-color`/`color` explícitos no `option` é a correção padrão cross-browser (Chrome/Edge/Firefox suportam essas duas propriedades em `<option>`, ao contrário da maioria das outras propriedades CSS).

O bug (3) tem causa-raiz estrutural: `app/globals.css` linha 1-3 importa só `tailwindcss/theme.css` e `tailwindcss/utilities.css`, nunca o `preflight.css` que normalmente zera `list-style` em `ul`/`ol`. O projeto compensou isso com um reset manual (`* { box-sizing; padding; margin }`) que nunca incluiu `list-style` -- e cada lista teve que resetar isso individualmente (`.sidebar-nav-list`, mobile, já faz isso). O `SidebarMenu` desktop (vendorizado de `components/ui/sidebar.tsx`, não deve ser editado para não divergir do upstream) nunca recebeu esse tratamento. Implementação final (após review, ver Review Triage Log) usa seletor escopado `[data-sidebar="menu"], [data-sidebar="menu-sub"]` em vez de estender o reset universal `* {}` -- resolve exatamente os `<ul>` vendorizados que tinham o bug, sem alterar semântica de lista (AT/`role=list` implícito) de nenhum outro `<ul>` atual ou futuro do app.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros novos
- `npm run lint` -- expected: sem erros novos
- `npm run build` -- expected: build limpo

**Manual checks (if no CLI):**
- Abrir /upload localmente (ou via deploy), abrir os dois selects (Mês/Ano) sem hover em nenhuma opção, confirmar contraste legível via inspeção visual e `getComputedStyle` das opções (`background-color`/`color` resolvidos).
- Inspecionar visualmente o campo de upload de arquivo, confirmar affordance de botão comparável ao `Button` variant outline.
- Inspecionar a sidebar desktop (viewport >=768px) e mobile (<768px), confirmar ausência de bullet em ambas, sem regressão de espaçamento/alinhamento.

## Auto Run Result

**Resumo:** 3 bugs visuais pós-Epic 8 corrigidos: (1) contraste ilegível das opções de `<select>` nativo (Mês/Ano em /upload e demais telas), (2) falta de affordance de botão no "Escolher arquivo" do input de upload, (3) bullet indevido na sidebar desktop.

**Arquivos alterados:**
- `app/globals.css` -- removido `list-style: none` do reset universal `* {}` (nunca deveria ter sido global, ver Review Triage Log); adicionado seletor escopado `[data-sidebar="menu"], [data-sidebar="menu-sub"]` para o mesmo fim; adicionadas regras `select option` / `select option:disabled` forçando cores explícitas legíveis.
- `components/ui/input.tsx` -- pseudo-elemento `::file-selector-button` (`file:*`) ganhou borda, fundo, raio, sombra, cursor e hover, com a mesma linguagem visual do `Button` variant outline.

**Review findings:** 4 patches aplicados (1 medium: escopo do reset de list-style; 3 low: hover do file-button, esmaecimento de option desabilitada, comentário de rationale), 2 deferidos (`deferred-work.md`: suporte cross-browser do `::file-selector-button` em Safari; drift entre as 4 cópias duplicadas de classes de select/input), 6 rejeitados (forced-colors automático, popup vs. card, double-shadow, filename longo, cursor de disabled já coberto por `pointer-events-none`, falta de evidência visual -- resolvida pela própria verificação abaixo).

**Verificação:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos. Verificação visual real: screenshot antes/depois de `/upload` (dark) confirmando bullets removidos da sidebar e "Choose File" com affordance de botão; script temporário (removido após uso) abriu o `<select>` Mês de verdade via Playwright + perfil autenticado persistente e confirmou via `getComputedStyle` que as opções resolvem para `rgb(255,255,255)`/`rgb(26,31,43)` no claro e `rgb(51,51,51)`/`rgb(237,240,245)` no escuro (exatamente os tokens `--background`/`--foreground` esperados), com screenshot do popup aberto mostrando todas as opções legíveis em ambos os temas, incluindo o placeholder desabilitado visivelmente esmaecido. Suíte e2e completa (`npx playwright test`, 78 testes: contraste WCAG AA, estrutural+axe-core, visual) rodada integralmente 2x -- 78/78 verde na execução final; 12 snapshots visuais (upload/cartões/categorias/lançamentos/parcelas/início, claro+escuro) atualizados deliberadamente para o novo baseline após confirmação visual manual, os demais 12 permaneceram idênticos (sem regressão fora do escopo). Uma falha isolada e não-relacionada (`login (dark)`, `ERR_NETWORK_IO_SUSPENDED`) na primeira rodada completa foi causada por eu ter derrubado o servidor dev no meio da execução -- confirmada como falso alarme ao reexecutar isoladamente (passou limpo).

**Riscos residuais:** os 2 itens deferidos acima (Safari/`::file-selector-button`, drift entre cópias duplicadas de classes). Nenhum impacto em dado/segurança/API -- mudança puramente de apresentação (CSS/classes).
