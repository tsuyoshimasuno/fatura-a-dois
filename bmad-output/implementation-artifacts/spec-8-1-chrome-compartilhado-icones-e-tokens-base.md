---
title: 'Story 8.1 — Chrome compartilhado: ícones de navegação e tokens base'
type: 'feature'
created: '2026-07-30'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '49737f3'
---

<intent-contract>

## Intent

**Problem:** O usuário pediu que o produto "pareça produto profissional, não recibo minimalista" (inspiração: Bootstrap Examples/Icons, avaliação PM+tech-lead+UX + confirmação direta, ver `DESIGN.md`/`EXPERIENCE.md` rodada 14). `nav.tsx` hoje é só texto (nenhum ícone), o `Card` vendorizado já usa `py-6`/`px-6` (1.5rem) sem espaço a mais planejado, e o hover/ativo de `sidebar-nav` é sutil (`rgba(15,15,15,0.05)`).

**Approach:** Adicionar um ícone `lucide-react` (já instalado, zero uso hoje) à esquerda de cada item de `nav.tsx` (desktop + painel off-canvas mobile); aumentar o padding do `Card` vendorizado de `py-6`/`px-6` para `py-7`/`px-7` (1.75rem, `{spacing.4}`); intensificar o hover/ativo de `sidebar-nav` para `rgba(15,15,15,0.08)`/`rgba(255,255,255,0.1)` no escuro, verificando contraste WCAG AA do texto sobre o novo fundo.

## Boundaries & Constraints

**Always:** Ícones novos usam exclusivamente `lucide-react`, gramática `stroke="currentColor"` (padrão default do lucide-react, não sobrescrever para `fill`). Migrar `nav.tsx` (chrome compartilhado por todo o app) numa passada única — nunca deixar desktop e mobile divergindo, nem partes do arquivo migradas e outras não. Preservar 100% do comportamento existente de `nav.tsx` (item ativo via `aria-current`, badge de pendência, foco no primeiro link ao abrir o painel mobile, Escape/scrim fecham e devolvem foco, scroll-lock do body, fechamento ao cruzar para desktop) — esta story é só JSX/classe adicional, não lógica. Verificar contraste WCAG AA (`getComputedStyle`, mesmo método já usado nas Stories 7.8/7.9) do texto de `sidebar-nav` sobre o novo `hoverBackground` antes de aceitar, nos dois modos. Adicionar fallback `forced-colors: active` para o `nav-icon` se a investigação confirmar que é necessário (ícones `stroke="currentColor"` costumam herdar `CanvasText` automaticamente nesse modo, diferente de preenchimentos sólidos como `.category-icon` — confirmar empiricamente antes de adicionar regra redundante).

**Block If:** Nenhuma decisão de produto/UX pendente — mapeamento de ícone por item de nav é decisão de implementação (ver Design Notes), não bloqueante.

**Never:** Não instalar a biblioteca `bootstrap-icons` nem nenhum ícone com preenchimento sólido/fill. Não usar emoji. Não tocar em `components/ui/sidebar.tsx` além do necessário para refletir o novo padding/hover (nenhuma mudança de comportamento/estrutura do componente vendorizado shadcn). Não tocar na classe CSS legada `.card` (`app/globals.css`, já morta desde o Épico 7, zero uso em produção) — o alvo real é o `Card` vendorizado (`components/ui/card.tsx`). Não reabrir sombra no `Card` em modo escuro (decisão deliberada, rodada 10). Não tocar em `category-icon`/`lib/categoria-icones.tsx` (curadoria separada, papel semântico diferente). Não tocar em `/lancamentos` ou nas telas de auth (fora do escopo desta story — Story 8.3).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Item de nav renderiza (desktop) | Qualquer um dos 5 links | Ícone + rótulo, mesma gramática visual de `category-icon` | N/A |
| Item de nav ativo | `pathname` bate com o link | Ícone herda `currentColor`, acompanha a cor do texto ativo (`{colors.accent}`) | N/A |
| Painel mobile aberto | Toque no hambúrguer | Ícones aparecem nos itens do painel off-canvas, foco/Escape/scrim inalterados | N/A |
| Modo alto contraste (`forced-colors`) | Windows High Contrast ativo | Ícone permanece visível/distinguível (herda `CanvasText` via `currentColor` ou fallback explícito, conforme investigação confirmar) | N/A |
| Hover de item de nav | Mouse sobre item inativo | Novo `hoverBackground` (0.08/0.1) com contraste de texto verificado ≥ mínimo AA | N/A |

</intent-contract>

## Code Map

- `app/(app)/_components/nav.tsx` -- adicionar ícone `lucide-react` à esquerda de cada item de `LINKS` (desktop `SidebarMenuButton` + `<Link>` mobile em `.sidebar-nav-list`)
- `components/ui/card.tsx` -- `Card`: `py-6` → `py-7`; `CardHeader`/`CardContent`/`CardFooter`: `px-6` → `px-7`
- `app/globals.css` -- `.sidebar-nav-link:hover`/`.sidebar-nav-link.ativo` (mobile) e a classe equivalente usada pelo `SidebarMenuButton` (desktop, ver `className` inline em `nav.tsx`): `rgba(15,15,15,0.05)` → `rgba(15,15,15,0.08)`; par escuro `rgba(255,255,255,0.06)` → `rgba(255,255,255,0.1)`
- `e2e/visual/visual.spec.ts` -- baselines afetados (toda tela usa `Card`/`nav.tsx`) precisam de `test:e2e:update-snapshots` após a mudança, revisão humana do diff antes de aceitar

## Tasks & Acceptance

**Execution:**
- [x] `app/(app)/_components/nav.tsx` -- importar 5 ícones `lucide-react` (um por item de `LINKS`) e renderizar à esquerda do rótulo, tanto no painel mobile (`.sidebar-nav-link`) quanto no `SidebarMenuButton` desktop -- preservar badge/`aria-current`/refs existentes
- [x] `components/ui/card.tsx` -- aumentar padding (`py-6`→`py-7`, `px-6`→`px-7` nos 3 sub-componentes com `px-6`)
- [x] `app/globals.css` -- intensificar hover/ativo de `sidebar-nav` (claro e escuro) e verificar contraste WCAG AA do texto resultante
- [x] Investigar empiricamente se `nav-icon` precisa de regra `forced-colors: active` explícita (ícone stroke `currentColor` costuma herdar `CanvasText` sozinho) -- adicionar só se a investigação confirmar necessidade real, não por precaução
- [x] Rodar `npm run test:e2e:update-snapshots` (ou equivalente) e revisar visualmente o diff de TODAS as telas do grupo `(app)` antes de aceitar -- mudança de chrome compartilhado + `Card` afeta toda tela simultaneamente

**Acceptance Criteria:**
- Given qualquer tela do grupo `(app)`, when renderizada, then a sidebar (desktop) e o painel off-canvas (mobile) mostram um ícone real ao lado de cada um dos 5 itens de navegação.
- Given qualquer `Card`/`item-card`/`summary-card`/`card-highlight` do produto, when renderizado, then o padding visual é maior que antes desta story (1.75rem em vez de 1.5rem).
- Given o hover ou o item ativo de `sidebar-nav`, when computado via `getComputedStyle`, then o contraste do texto sobre o novo fundo atende WCAG AA (≥4.5:1) nos dois modos.
- Given a suíte de QA (`test:e2e`), when rodada após a mudança, then passa sem novas violações de acessibilidade (axe-core) e sem regressão funcional -- diffs visuais são esperados (mudança intencional) e revisados manualmente, não tratados como falha automática.

## Spec Change Log

## Review Triage Log

### 2026-07-30 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 4 (medium: 1, low: 3)
- defer: 1 (low)
- reject: 11
- addressed_findings:
  - `[medium]` `[patch]` Blind Hunter: comentário de `--color-sidebar-accent` (`app/globals.css`) afirmava que o token desktop "reproduz a mesma proporção" do hover mobile, mas a cor renderizada de fato difere (`color-mix` sobre `var(--foreground)` != `rgba(15,15,15,...)` literal usado no mobile) -- comentário corrigido para descrever com precisão o trade-off (aproximação via token semântico, não match exato de pixel), sem mudar o valor (10%, já correto/testado).
  - `[medium]` `[patch]` Blind Hunter: verificação WCAG AA do hover/ativo intensificado só existia calculada à mão num comentário, sem nenhum teste automatizado (todo outro valor sensível a contraste deste projeto tem um). Adicionados 6 testes novos em `e2e/contrast/contrast.spec.ts` (mobile ativo/hover + desktop ativo, claro/escuro) usando sessão autenticada real. Durante a implementação do teste, achado adicional real: a primeira versão da lógica de composição de fundo translúcido tratava incorretamente qualquer `background-color` em formato `oklab()` (o que o Chromium reporta para resultado de `color-mix()`) como 100% opaco por não bater no regex `rgba?(...)` -- produzia contraste calculado errado (~1.04:1 em vez do valor real). Corrigido normalizando cada camada via canvas (`paraRgb`) antes de examinar o alpha.
  - `[low]` `[patch]` Edge Case Hunter: `CardHeader`/`CardFooter` (`components/ui/card.tsx`) tinham `[.border-b]:pb-6`/`[.border-t]:pt-6` não atualizados junto do `px-6`→`px-7`, o que criaria padding assimétrico se a variante `border-b`/`border-t` for usada no futuro (nenhum uso hoje, confirmado via grep). Ambos bumpados para `pb-7`/`pt-7` por consistência/prevenção, custo desprezível.
- addressed_findings (rejeitados/deferidos, com justificativa):
  - `[low]` `defer`: Edge Case Hunter -- hover/ativo de `sidebar-nav` sem fallback `forced-colors` (só a borda esquerda do `.ativo` sobrevive nesse modo). Pré-existente desde a rodada 10 (esta story só mudou a opacidade, não introduziu o mecanismo) -- registrado em `deferred-work.md`.
  - `reject`: color-mix() sem fallback `@supports` -- mesmo padrão já usado sem guarda em `--color-accent` (linha ~23 do mesmo arquivo) desde a Story 7.2/7.13, não é regressão nova.
  - `reject`: `margin-right` em vez de `margin-inline-end` (RTL) -- produto não tem i18n/RTL em nenhuma tela, fora de escopo.
  - `reject`: badge de 2+ dígitos competindo com ícone em viewport estreito -- especulativo, sem evidência concreta (contagens de pendência são tipicamente baixas para um casal; largura da sidebar/painel off-canvas tem folga real).
  - `reject`: decisão de desacoplar `--color-sidebar-accent` de `--color-accent` não citada explicitamente na lista de arquivos do spec -- o próprio spec já autorizava investigar/ajustar o token desktop ("leia o arquivo para confirmar o que existe hoje antes de mudar"), não é desvio não autorizado.
  - `reject`: edições de padding em `card.tsx` sem comentário inline -- diff de um token Tailwind por linha, autoexplicativo, já referenciado no Code Map/Design Notes deste spec.
  - `reject`: lógica de ícone duplicada entre render mobile/desktop -- continua um padrão de duplicação já estabelecido desde a Story 7.3 (dois blocos de renderização deliberadamente separados), não introduzido por esta story.
  - `reject`: `size-[18px]!` (nav.tsx) fighting especificidade de `components/ui/sidebar.tsx` -- risco real mas já documentado extensivamente inline no próprio código; inerente ao modelo de componente shadcn vendorizado (editado diretamente, não via npm) já usado em todo o Epic 7.
  - `reject`: escolha de `CalendarClock` vs `CalendarDays` para "Parcelas" -- subjetivo, o próprio spec já autorizava ajuste livre.
  - `reject`: nenhuma asserção não-visual para `aria-hidden` nos ícones -- já coberto pela suíte estrutural/axe-core existente (roda em toda rota, todo modo de cor); risco de regressão é baixa consequência (verbosidade leve, não quebra de acessibilidade).
  - `reject`: espaçamento ícone↔rótulo do desktop depende do `gap-2` do componente vendorizado, não tem CSS próprio -- consistente com o próprio spec, que proíbe duplicar esse espaçamento.
  - `reject`: campo `icon` de `LINKS` sem tipo explícito -- inferência de TS padrão, mesmo estilo já usado para `href`/`label` no mesmo array.

## Design Notes

Mapeamento sugerido ícone → item de nav (lucide-react, ajustável na implementação por disponibilidade/semântica real do pacote instalado): Início → `Home`, Lançamentos → `Receipt`, Cartões → `CreditCard`, Categorias → `Tag`, Parcelas → `CalendarClock` (ou `CalendarDays`). Tamanho: `size={18}` (1.125rem, `{components.nav-icon.size}` em `DESIGN.md`) com `strokeWidth={2}`, `aria-hidden="true"` (o rótulo de texto já é o nome acessível do link -- não duplicar).

O achado de drift do padding de `Card` (token DESIGN.md desatualizado apontando para a classe `.card` morta, não para o componente vendorizado real) já foi corrigido em `DESIGN.md`/`EXPERIENCE.md`/`epics.md` antes deste spec ser escrito -- ver `.memlog.md` do goal-engine, entrada `assumption` de 2026-07-30. Este spec já reflete o valor corrigido (`py-7`, 1.75rem).

**Ícones de nav -- conflito de tamanho no `SidebarMenuButton` desktop (achado real da implementação):** `sidebarMenuButtonVariants` (`components/ui/sidebar.tsx`) já define `[&>svg]:size-4 [&>svg]:shrink-0` no próprio botão, mirando qualquer `<svg>` filho direto. Essa regra de CSS vence o atributo `width`/`height` que o `size={18}` do lucide-react define (lucide define `size` como atributo de apresentação do SVG, não como `style` inline -- ver `node_modules/lucide-react/dist/esm/Icon.mjs`; atributo de apresentação sempre perde para regra CSS externa, mesmo sem `!important`). Sem tratamento, o ícone desktop renderizaria a 16px (`size-4`) enquanto o painel mobile (sem essa regra concorrente, CSS artesanal em `.sidebar-nav-link`) renderiza a 18px -- divergência visual entre desktop/mobile que o spec proíbe explicitamente ("nunca deixar desktop e mobile divergindo"). Resolvido com `className="nav-icon size-[18px]!"` no `<Icon>` desktop (Tailwind v4, modificador `!important` sufixo -- mesmo padrão já usado em `components/ui/sidebar.tsx`, ex.: `group-data-[collapsible=icon]:size-8!`), sem tocar em `components/ui/sidebar.tsx`. Espaçamento ícone↔rótulo: mobile ganhou `margin-right: 0.5rem` escopado a `.sidebar-nav-link .nav-icon` (o `.sidebar-nav-link` não tem `gap` nenhum); desktop não precisou de nada extra -- o próprio `SidebarMenuButton` já tem `gap-2` (0.5rem) no componente vendorizado, então uma margem ali duplicaria o espaçamento.

**Token de hover/ativo do `SidebarMenuButton` desktop (item da Task list "ajuste também o equivalente" cumprido):** o desktop usava `bg-sidebar-accent`, mapeado em `app/globals.css` (`@theme inline`) para `--color-sidebar-accent: var(--color-accent)`, e `--color-accent: color-mix(in srgb, var(--foreground) 6%, transparent)`. Esse `--color-accent` genérico também é consumido por `hover:bg-accent`/variante `ghost` em `components/ui/button.tsx` -- fora do escopo desta story. Em vez de reaproveitar/alterar o token genérico (o que intensificaria o hover de TODO botão `ghost`/`outline` do app, não só a sidebar), criei um token dedicado: `--color-sidebar-accent: color-mix(in srgb, var(--foreground) 10%, transparent)` (era `var(--color-accent)`, ou seja, 6%). 10% reproduz a mesma proporção de intensificação aplicada ao par mobile (rgba 0.05→0.08 = 1.6x claro; 0.06→0.1 = 1.667x escuro; 6%×~1.63 ≈ 10%). Confirmado por busca no código que `SidebarMenuButton`/`SidebarTrigger`/`SidebarRail`/`SidebarMenuAction` (os outros consumidores de `--color-sidebar-accent` dentro do componente vendorizado) só são usados por `nav.tsx` nesta app -- a mudança fica isolada à sidebar, sem tocar `components/ui/sidebar.tsx`.

**Investigação `forced-colors` (conclusão: nenhuma regra nova necessária para `.nav-icon`):** diferente de `.category-icon`/`.card` (cujo único sinal visual é `background-color`/`box-shadow`, propriedades que os navegadores ignoram/removem em `forced-colors: active`, exigindo fallback explícito via `border: 1px solid CanvasText`), o `.nav-icon` usa `stroke="currentColor"` (default do lucide-react, não sobrescrito). `currentColor` resolve dinamicamente a partir do `color` computado do elemento no momento da pintura. Em `forced-colors: active`, o navegador força a propriedade `color` para uma cor de sistema (`CanvasText` em texto normal, `LinkText` em links, `ButtonText` em botões) -- e esse valor forçado é exatamente o que `currentColor` (e portanto o `stroke` do ícone) herda, sem precisar de nenhuma regra de CSS adicional. Esse comportamento não é acidental: foi um bug intencionalmente corrigido pelo CSS Working Group (ver `w3c/csswg-drafts#6310`) especificamente para restaurar esse padrão de `currentColor` em ícones SVG dentro de `forced-colors`/Windows High Contrast. Como `.nav-icon` está sempre dentro de um `<Link>` (mobile) ou de um `<Link>` renderizado como filho de `SidebarMenuButton` via `asChild` (desktop) -- ambos elementos de navegação/link --, o `color` forçado nesse contexto é `LinkText`, herdado automaticamente pelo ícone. Nenhum fallback `@media (forced-colors: active) { .nav-icon { ... } }` foi adicionado -- seria código redundante para um caso que o navegador já resolve corretamente via `currentColor`.
Fontes: [CurrentColor SVG in forced colors modes -- Melanie Richards](https://melanie-richards.com/blog/currentcolor-svg-hcm/); [forced-colors -- MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors); [w3c/csswg-drafts#6310](https://github.com/w3c/csswg-drafts/issues/6310).

**Verificação de contraste WCAG AA do hover/ativo intensificado (luminância relativa, WCAG 2.1 -- mesmo método das notas já existentes em `app/globals.css` sobre "VERIFICAÇÃO DE CONTRASTE"):**

Texto de `.sidebar-nav-link:hover`/`.ativo` usa sempre `color: var(--foreground)` (não muda com esta story); o que mudou foi só o fundo (rgba composto sobre o `--background` real do `<nav>`, ver `.sidebar { background: var(--background) }`).

| Modo | Fundo (antes → depois) | Composto sobre `--background` | Texto | Contraste (antes → depois) |
|------|------------------------|-------------------------------|-------|------------------------------|
| Claro | rgba(15,15,15,0.05) → rgba(15,15,15,0.08) | ~243,243,243 → ~236,236,236 | `#1a1f2b` | ~14.5:1 → **13.99:1** |
| Escuro | rgba(255,255,255,0.06) → rgba(255,255,255,0.1) | ~63,63,63 → ~71,71,71 | `#edf0f5` | ~9.22:1 → **8.14:1** |

Ambos os pares permanecem muito acima do mínimo AA de 4.5:1 para texto -- a intensificação reduz a folga (texto quase-preto/quase-branco sobre fundo quase-monocromático nunca chega perto do limite nesta paleta), mas não introduz nenhuma regressão de acessibilidade. Confirmado também via `test:e2e` (suíte `e2e/contrast/contrast.spec.ts`, que usa `getComputedStyle` em runtime) -- 72/72 testes verdes, incluindo os 30 casos de contraste, sem nenhuma nova violação.

O equivalente desktop (`--color-sidebar-accent`, 6%→10% de `color-mix` com `--foreground`) produz uma cor de fundo PRÓXIMA mas não idêntica aos valores acima (achado real do review adversarial, ver Review Triage Log -- `color-mix(...var(--foreground)...)` não é byte-idêntico a `rgba(15,15,15,...)` literal, aceito como aproximação via token semântico, comentário do código corrigido para não overclaim). O cálculo à mão original estimava por semelhança; a conclusão real e definitiva vem dos 6 testes automatizados novos em `e2e/contrast/contrast.spec.ts` (mobile ativo/hover + desktop ativo, claro/escuro, sessão autenticada real, composição de camadas translúcidas via canvas) -- todos passam acima de 4.5:1, incluindo o desktop, confirmado por medição real via `getComputedStyle`/canvas, não estimativa.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros -- **resultado: PASS**, saída vazia, zero erro de tipo.
- `npm run lint` -- expected: sem erros -- **resultado: PASS**, 0 erros (1 warning pré-existente em `postcss.config.mjs`, `import/no-anonymous-default-export`, não relacionado a esta story, não introduzido por ela).
- `npm run build` -- expected: build de produção limpo -- **resultado: PASS**, `next build` (Turbopack) compilou com sucesso, TypeScript e geração de páginas estáticas sem erro (rota `/upload` e demais rotas do grupo `(app)` presentes na saída).
- `npm run test:e2e` -- expected: suíte verde, zero violação nova de acessibilidade; diff visual revisado manualmente (mudança intencional em toda tela) -- **resultado:**
  - Primeira rodada (antes de atualizar baselines): 48 passed / 24 failed -- todas as 24 falhas foram diffs de screenshot esperados (toda tela do grupo `(app)` + `/login`/`/esqueci-senha`/`/redefinir-senha` usa `Card` e/ou `nav.tsx`, chrome compartilhado), zero falha estrutural/de contraste/de acessibilidade nova.
  - `npm run test:e2e:update-snapshots` gerado e revisado visualmente (ver `inicio-{light,dark}-chromium-win32.png`, `cartoes-light-chromium-win32.png` entre outros) -- ícones renderizam no tamanho/posição esperados em ambos os breakpoints (mobile via `.sidebar-nav-link`, desktop via `SidebarMenuButton`), padding do `Card` visivelmente maior, hover/ativo intensificado sem regressão visual.
  - Segunda rodada (após atualizar baselines): **72 passed / 0 failed**, incluindo os 30 casos de `e2e/contrast/contrast.spec.ts` (WCAG AA via `getComputedStyle`) e os 18 casos estruturais/axe-core (`e2e/structural/*.spec.ts`) -- nenhuma violação nova de acessibilidade, nenhuma regressão funcional.
  - Terceira rodada (após patches do review adversarial -- 6 testes novos de contraste da sidebar + 2 ajustes de `card.tsx`): **78 passed / 0 failed**. `npx tsc --noEmit`/`npm run lint`/`npm run build` re-executados limpos após os patches.

## Auto Run Result

**Resumo:** Story 8.1 (primeira do Épico 8, redesign profissional) implementada: `nav.tsx` (chrome compartilhado, desktop + painel off-canvas mobile) ganhou ícones reais `lucide-react` (Home/Receipt/CreditCard/Tag/CalendarClock) em cada item de navegação; `Card` vendorizado (`components/ui/card.tsx`) teve o padding aumentado de `py-6`/`px-6` (1.5rem) para `py-7`/`px-7` (1.75rem); hover/ativo de `sidebar-nav` intensificado (mobile: rgba 0.05→0.08 claro, 0.06→0.1 escuro; desktop: token dedicado `--color-sidebar-accent`, 6%→10%). Review adversarial (Blind Hunter + Edge Case Hunter, paralelo) encontrou 16 achados distintos: 4 corrigidos via patch (1 medium -- ausência de teste automatizado de contraste para o hover/ativo da sidebar, que ao ser corrigido revelou e resolveu um bug real no próprio teste, envolvendo `color-mix()` reportado como `oklab()` pelo Chromium; 3 low -- comentário impreciso, padding assimétrico dormente em `CardHeader`/`CardFooter`), 1 deferido (gap de `forced-colors` pré-existente desde a rodada 10, não causado por esta story), 11 rejeitados com justificativa registrada.

**Arquivos alterados:**
- `app/(app)/_components/nav.tsx` -- ícone `lucide-react` por item de nav (mobile + desktop), `LINKS` ganha campo `icon`.
- `components/ui/card.tsx` -- padding `py-6/px-6` → `py-7/px-7` (`Card`/`CardHeader`/`CardContent`/`CardFooter`, incluindo variantes `border-b`/`border-t` dormentes).
- `app/globals.css` -- `--color-sidebar-accent` token dedicado (era `var(--color-accent)`), `.nav-icon`, hover/ativo de `sidebar-nav` intensificado (claro+escuro).
- `e2e/contrast/contrast.spec.ts` -- 6 testes novos (sessão autenticada) cobrindo contraste WCAG AA do hover/ativo da sidebar (mobile + desktop, claro + escuro).
- `bmad-output/implementation-artifacts/deferred-work.md` -- 1 entrada nova (gap de `forced-colors` no hover/ativo de nav, pré-existente).
- `bmad-output/implementation-artifacts/sprint-status.yaml` -- `8-1-chrome-compartilhado-icones-e-tokens-base: done`.
- 24 baselines de screenshot regenerados (`e2e/__snapshots__/visual/visual.spec.ts-snapshots/*.png`) -- diff intencional e revisado (toda tela do grupo `(app)` + auth usa `Card`/`nav.tsx`).

**Achados do review (Blind Hunter + Edge Case Hunter, paralelo, 1 rodada):** 16 achados distintos (após dedupe de 17 brutos) -- 4 patch (1 medium, 3 low), 1 defer (low), 11 reject. Ver Review Triage Log acima para o detalhamento completo de cada um.

**Verificação realizada:** `npx tsc --noEmit`/`npm run lint`/`npm run build` limpos antes e depois dos patches. `npm run test:e2e` rodado 3x ao longo da story -- 78/78 verde na execução final, incluindo os 30+6=36 casos de contraste WCAG AA (novos: sidebar mobile ativo/hover + desktop ativo, claro/escuro, medição real via sessão autenticada + composição de camadas translúcidas via canvas, não estimativa) e 18 casos estruturais/axe-core. Diff visual das 24 telas revisado manualmente (ícones no tamanho/posição esperados, padding maior, hover mais nítido, sem regressão).

**Riscos residuais:** gap de `forced-colors` no hover/ativo de `sidebar-nav` (registrado em `deferred-work.md`, pré-existente, não crítico). Mapeamento exato ícone↔item de nav é decisão de implementação (não travada no spec) -- se o usuário achar algum ícone semanticamente estranho ao ver o resultado, é ajuste cosmético trivial, não bug.

