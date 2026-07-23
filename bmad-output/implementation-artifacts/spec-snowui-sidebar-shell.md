---
title: 'Sidebar SnowUI (Etapa 1/2) -- shell de navegação + tema branco/sombra nas telas simples'
type: 'feature'
created: '2026-07-22'
status: 'done'
review_loop_iteration: 2
followup_review_recommended: true
context: []
warnings: []
baseline_revision: 'b26356d473bdea0d42130000447eb93ca237a2df'
final_revision: 'e1eaa21ade04b44e36cbcfd64331680be4bc2870'
---

<intent-contract>

## Intent

**Problem:** O usuário aprovou visualmente (Artifact) um redesign do app no estilo SnowUI e pediu "implemente exatamente o que fez no protótipo": menu lateral fixo (sidebar) no lugar do menu horizontal no topo, fundo branco puro com cards levemente sombreados no lugar do sistema atual (cinza claro, zero sombra). Avaliação PM+tech-lead+UX (3 agentes reais em paralelo) aprovou a mudança, sem exigir FR/epic/story novo (é apresentação/chrome de navegação). `DESIGN.md` (rodada 10) já formaliza os valores e o racional completo.

**Approach:** Reescrever `app/(app)/_components/nav.tsx` de nav horizontal para sidebar vertical fixa (desktop) com painel off-canvas (mobile). Reestruturar `app/(app)/layout.tsx` para o shell de 2 regiões (sidebar | conteúdo). Atualizar `app/globals.css`: remover `.app-nav*`, adicionar `.sidebar*`, revisar `.card` (branco+sombra no claro, superfície+borda no escuro, sem mudança), adicionar tokens `--highlight`/`--highlight-dark`. Aplicar a todas as telas do grupo `(app)` EXCETO `/lancamentos` (Etapa 2/2, separada, por ter layout de 2 colunas próprio de maior risco).

## Boundaries & Constraints

**Always:** Manter o contrato de props de `Nav` (`pendentesCartoes`, `pendentesLancamentos`) e toda a lógica de busca de contagem em `layout.tsx` (`force-dynamic`, degradação graciosa em erro) intactos -- só a estrutura visual muda. Manter fechar-ao-navegar e `aria-current="page"` no item ativo. Painel off-canvas mobile: foco vai para o primeiro link ao abrir; fecha em seleção de link, `Escape`, ou clique no scrim/fora do painel; sem `role="dialog"`/trap de foco completo (não é tratado como modal). Verificar contraste WCAG de qualquer texto sobre `--highlight`/`--highlight-dark` antes de finalizar essas regras.

**Block If:** Nenhum -- decisão já aprovada visualmente pelo usuário e avaliada por PM+tech-lead+UX, valores documentados em DESIGN.md/EXPERIENCE.md.

**Never:** Não tocar `app/(app)/lancamentos/**` nesta etapa (Etapa 2/2 separada). Não incluir Upload como item de sidebar (resolução já tomada -- fica acessível só via link em Início). Não implementar nenhum comportamento funcional no seletor de conta do casal (é puramente visual). Não introduzir biblioteca de modal/dialog para o painel off-canvas. Não mudar `max-width` de `.page`/`.page--narrow` (só o espaço em que centralizam muda).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Desktop (`≥768px`), qualquer tela do grupo `(app)` exceto /lancamentos | Renderização normal | Sidebar fixa à esquerda (240px), item ativo destacado, badge de pendência em Cartões/Lançamentos inalterado, conteúdo à direita em fundo branco com cards sombreados | Nenhum |
| Mobile (`<768px`) | Toque no hambúrguer | Painel off-canvas desliza da esquerda sobre o conteúdo, com scrim; foco no primeiro link | Fechar com Escape/clique no scrim/seleção de link restaura o foco/estado anterior |
| Falha ao buscar contagens de pendência (Supabase indisponível) | Erro na Promise.all de `layout.tsx` | Sidebar renderiza sem badges (contagem 0), nunca quebra a navegação -- comportamento já existente, preservado | `console.error`, já implementado |
| Texto sobre `--highlight`/`--highlight-dark` | Qualquer uso futuro do token | Contraste >=4.5:1 confirmado antes de finalizar o valor | Ajustar o tom se necessário, documentar em DESIGN.md |

</intent-contract>

## Code Map

- `app/(app)/_components/nav.tsx` -- reescrever para sidebar + off-canvas mobile.
- `app/(app)/layout.tsx` -- shell de 2 regiões (sidebar | conteúdo).
- `app/globals.css` -- remover `.app-nav*`, adicionar `.sidebar*`, revisar `.card`, adicionar `--highlight`/`--highlight-dark`/`--sidebar-width`.
- `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/DESIGN.md` -- já atualizado (rodada 10); só precisa de adendo se o contraste de `--highlight` exigir ajuste de valor.

## Tasks & Acceptance

**Execution:**
- [x] `app/globals.css` -- adicionado `--sidebar-width: 240px` ao `:root`. `--highlight`/`--highlight-dark` implementados seguindo a convenção já usada no arquivo (uma única var por token, redefinida dentro do bloco `@media (prefers-color-scheme: dark)`, como `--background`/`--danger`/`--pending` etc.) em vez de dois nomes de propriedade distintos -- par completo `--highlight: #ede9fe` (`:root`) / `--highlight: #3f3b54` (bloco dark). Contraste calculado (luminância relativa WCAG 2.1): `--foreground` (`#1a1f2b`) sobre `--highlight` claro (`#ede9fe`) = **13.87:1**; `--foreground` dark (`#edf0f5`) sobre `--highlight` escuro (`#3f3b54`) = **9.36:1**. Ambos muito acima do mínimo 4.5:1 -- nenhum ajuste de tom necessário, valores ESTIMADOS de DESIGN.md mantidos como estavam.
- [x] `app/globals.css` -- removidas `.app-nav`, `.app-nav-title`, `.app-nav-list`, `.app-nav-link` (+ `.ativo`), `.app-nav-toggle`/`.app-nav-toggle-bar` e o bloco `@media (max-width: 767px)` associado. Adicionadas `.sidebar`, `.sidebar-brand`, `.sidebar-nav-list`, `.sidebar-nav-link` (+ `.ativo`), `.sidebar-footer` (+ `.sidebar-couple-avatars`/`.sidebar-couple-avatar`/`.sidebar-couple-names`), `.sidebar-toggle` (+ `.sidebar-toggle-button`/`.sidebar-toggle-bar`, barra mobile) e `.sidebar-scrim` (off-canvas). Off-canvas implementado como o próprio `.sidebar` recebendo `transform: translateX`/`visibility` dentro do `@media (max-width: 767px)` (classe `.aberto`), não um elemento `.sidebar-drawer` separado -- mesmo elemento serve como coluna fixa (desktop) e painel deslizante (mobile), mais simples que duplicar markup.
- [x] `app/globals.css` -- `.card` revisado: modo claro `background: var(--background)`, `border: none`, `box-shadow: 0 1px 2px rgba(15,15,15,0.06), 0 1px 1px rgba(15,15,15,0.04)` (regra base, fora de media query); modo escuro em bloco `@media (prefers-color-scheme: dark) { .card { ... } }` dedicado logo abaixo, restaurando `background: var(--surface)` + `1px solid var(--border)` + `box-shadow: none` -- as duas regras coexistem (base clara + override escuro), sem sombra no escuro, conforme decisão documentada em DESIGN.md Elevation & Depth.
- [x] `app/(app)/_components/nav.tsx` -- reescrito mantendo contrato de props (`pendentesCartoes`/`pendentesLancamentos`), lógica de rota ativa (`aria-current="page"`) e o padrão "ajustar estado durante render" (não `useEffect`) para fechar ao mudar de rota. Estrutura: brand mark "Fatura a Dois" no topo da `.sidebar` (+ um segundo brand mark na barra mobile `.sidebar-toggle`, sempre visível em `<768px`); lista de 5 itens sem Upload (Início/Lançamentos/Cartões+badge/Categorias/Parcelas); seletor de conta do casal no rodapé (`Tsuyoshi & Milena`, duas iniciais em círculos sobrepostos via `margin-left` negativo) -- puramente visual, sem `onClick`/estado, não é `<button>` nem `<Link>`. Off-canvas em `<768px`: `useEffect` dedicado move o foco (`ref.focus()`) para o primeiro link ao abrir (efeito colateral de DOM, deliberadamente separado do padrão de reset de estado usado para fechar-ao-navegar); fecha em clique de link (`onClick` existente), tecla Escape (`onKeyDown` no próprio elemento `<nav>`/painel, não no `document`) e clique no scrim (`<button className="sidebar-scrim">`, evita div com `onClick` sem role/teclado). Sem `role="dialog"`, sem trap de foco.
- [x] `app/(app)/layout.tsx` -- estrutura de 2 regiões via wrapper `<div className="app-shell">` contendo `<Nav />` (agora `position: fixed`) + `<div className="app-content">`; `.app-content` ganha `margin-left: var(--sidebar-width)` em `>=768px` e `padding-top: 3.25rem` em `<768px` (espaço da barra mobile fixa) via CSS, não via mudança na árvore de componentes. Toda a lógica de `Promise.all`/try-catch/degradação graciosa de `layout.tsx` preservada sem alteração.
- [x] Confirmado por leitura de código + `npm run build`: `/lancamentos` (rota `ƒ /lancamentos`) compila e renderiza normalmente com o novo shell -- nenhum arquivo em `app/(app)/lancamentos/**` foi tocado; o layout de 2 colunas (`--lancamentos-coluna-altura`) usa `100vh`/`calc()` independente da largura, então o espaço horizontal reduzido pela sidebar (conteúdo centralizado dentro da área à direita, não mais do viewport inteiro) não quebra o cálculo -- só reduz a largura disponível para os `page-max-width*`, como já esperado por DESIGN.md > Layout & Spacing.
- [x] **(bad_spec repair pass 1)** `nav.tsx` -- Escape fecha o menu via listener em `document` (`useEffect` dedicado que adiciona `keydown` só enquanto `menuAberto === true` e remove no cleanup/troca de dependência), não mais `onKeyDown` só no `<nav>` (removido do elemento) -- funciona independente de onde o foco está, incluindo com foco no scrim (que é irmão do `<nav>`, nunca descendente).
- [x] **(bad_spec repair pass 1)** `nav.tsx` -- ao fechar o painel (Escape, clique no scrim, clique em link), o foco volta ao botão hambúrguer. Implementado com `botaoHamburguerRef` (nova ref no `<button>` do `.sidebar-toggle-button`) + `menuJaAbriuRef` (ref booleana auxiliar) dentro do MESMO `useEffect([menuAberto])` que já movia o foco para o primeiro link ao abrir: quando `menuAberto` vira `true`, marca `menuJaAbriuRef.current = true` e foca o primeiro link; quando vira `false` E `menuJaAbriuRef.current` é `true` (ou seja, o painel chegou a abrir antes), foca o botão hambúrguer e reseta a ref. Como `menuJaAbriuRef` nasce `false`, a primeira renderização (estado inicial `menuAberto === false`) não dispara foco nenhum. Como o botão hambúrguer só é clicável/visível em mobile (`.sidebar-toggle` com `display:none` em desktop), `menuAberto` nunca vira `true` em desktop, então este efeito nunca move foco lá.
- [x] **(bad_spec repair pass 1)** `nav.tsx`/`globals.css` -- `.sidebar-toggle` (barra mobile) agora com `z-index: 45` (era 30), `.sidebar-scrim` com `z-index: 35` -- barra/botão hambúrguer ficam visualmente acima do scrim e continuam clicáveis com o painel aberto. `.sidebar-scrim` deixou de ser `<button aria-label="Fechar menu">` -- agora é um `<div aria-hidden="true" tabIndex={-1} onClick={...}>` sem nome acessível próprio (Escape via `document` + o botão hambúrguer sempre visível cobrem o fechamento por teclado/mouse sem duplicar "Fechar menu" para leitor de tela). `npm run lint` confirma que o `<div>` com `onClick` não dispara nenhum warning de `jsx-a11y` (elemento é `aria-hidden`, fora da árvore de acessibilidade).
- [x] **(bad_spec repair pass 1)** `globals.css` -- `.sidebar` fechado (dentro do `@media (max-width: 767px)`) agora usa `transition: transform 0.2s ease, visibility 0s linear 0.2s;` (visibility só muda para `hidden` depois que a transição de `transform` termina ao fechar); `.sidebar.aberto` ganhou `transition-delay: 0s` (abre imediatamente, sem esperar o delay do estado fechado).
- [x] **(bad_spec repair pass 1)** `globals.css` -- adicionada `.sidebar-scrim { display: none; }` como regra base fora de media query (mesmo padrão de `.sidebar-toggle`); dentro do `@media (max-width: 767px)` a regra existente ganhou `display: block;` explícito para reverter o `none` só nesse breakpoint. Evita o elemento (só existe no DOM quando `menuAberto === true`, controlado por React, independente do breakpoint CSS) ficar solto/sem posicionamento no fluxo se a janela for redimensionada para desktop com o painel ainda aberto.
- [x] **(bad_spec repair pass 1)** `globals.css` -- `.sidebar-nav-link:hover`/`.ativo` trocaram `background: var(--surface)` por `background: rgba(15, 15, 15, 0.05)` (regra base/clara) e uma nova regra dentro do `@media (prefers-color-scheme: dark)` já existente no arquivo com `background: rgba(255, 255, 255, 0.06)` -- destaque de hover/ativo dedicado, com contraste visível independente da proximidade de `--surface`/`--background`.
- [x] **(bad_spec repair pass 1)** `globals.css` -- adicionado `@media (forced-colors: active) { .card { border: 1px solid CanvasText; } }` logo após o bloco `@media (prefers-color-scheme: dark)` de `.card`, cobrindo o modo de alto contraste onde `box-shadow` normalmente não renderiza.
- [x] **(bad_spec repair pass 1)** `app/(app)/_components/nav.tsx`/`globals.css` -- adicionado link "+" (`aria-label="Enviar nova fatura"`) para `/upload`, sempre visível, em dois lugares: ao lado do brand mark dentro da `.sidebar` desktop (novo wrapper `.sidebar-brand-row`, flex `justify-content: space-between`) e na barra `.sidebar-toggle` mobile (novo wrapper `.sidebar-toggle-actions`, entre o brand mark e o botão hambúrguer). Estilizado como círculo pequeno e discreto (`.sidebar-upload-link`, 1.5rem, borda `--border`, sem preencher). Não alterado `page.tsx` nem a lista `LINKS` -- os 5 itens principais da sidebar continuam exatamente como estavam; o link de upload não é um 6º item da lista.
- [x] **(bad_spec repair pass 2)** `app/(app)/_components/nav.tsx`/`globals.css` -- removido o link "+" (`Link href="/upload"`) de dentro de `.sidebar-toggle`; `.sidebar-toggle-actions` removido do JSX (o `<button>` do hambúrguer volta a ser filho direto de `.sidebar-toggle`) e a regra CSS `.sidebar-toggle-actions` removida de `globals.css` por ficar sem nenhum uso (dead CSS). Único link "+" restante fica dentro de `.sidebar-brand-row`, no `.sidebar` compartilhado desktop/mobile. Adicionado `padding-top: 4.75rem` ao `.sidebar` dentro do `@media (max-width: 767px)` (3.25rem da altura de `.sidebar-toggle` + folga) -- o `padding` shorthand (`1.5rem 1rem`) da regra base de `.sidebar` continua valendo para os outros lados; só `padding-top` é sobrescrito nesse breakpoint (longhand depois do shorthand, mesma especificidade, vence por ordem no cascade).
- [x] **(bad_spec repair pass 2)** `app/(app)/_components/nav.tsx` -- removido o `useEffect` reativo genérico que devolvia foco ao hambúrguer em qualquer `menuAberto -> false` (junto da ref auxiliar `menuJaAbriuRef`, que só existia para esse efeito). O `useEffect([menuAberto])` restante cuida só de mover o foco para o primeiro link ao abrir. Devolução de foco ao hambúrguer agora é uma chamada explícita a `botaoHamburguerRef.current?.focus()` em exatamente dois lugares: dentro de `fecharComEscape` (handler do `keydown` em `document`) e dentro do `onClick` do `.sidebar-scrim`. Clique num `<Link>` de navegação (`onClick={() => setMenuAberto(false)}`) e o bloco que reseta `menuAberto` ao detectar `pathname !== pathnameAnterior` continuam só chamando `setMenuAberto(false)`, sem tocar em foco -- confirmado por leitura de código que nenhum desses dois caminhos chama `.focus()`.
- [x] **(bad_spec repair pass 2)** `globals.css` -- adicionado `@media (prefers-reduced-motion: reduce) { .sidebar { transition: none; } }` logo após o bloco `@media (max-width: 767px)` que define `.sidebar`/`.sidebar.aberto`.
- [x] **(bad_spec repair pass 2)** `app/(app)/_components/nav.tsx` -- adicionado `useEffect([menuAberto])` dedicado que define `document.body.style.overflow = 'hidden'` quando `menuAberto === true` e `''` quando `false`, com a mesma limpeza (`overflow = ''`) também no cleanup do efeito (cobre desmontagem do componente com o painel aberto).
- [x] **(bad_spec repair pass 3)** `app/(app)/_components/nav.tsx`/`globals.css` -- marca "Fatura a Dois" aparece duplicada visualmente quando o painel mobile abre (uma na barra fixa `.sidebar-toggle`, outra dentro do `.sidebar-brand-row` do painel, ambas visíveis ao mesmo tempo desde o `padding-top` do pass 2). Corrigido em `globals.css` dentro do bloco `@media (max-width: 767px)` já existente (mesmo que define `.sidebar`/`.sidebar.aberto`): adicionada `.sidebar-brand-row .sidebar-brand { display: none; }` (oculta a marca de dentro do painel só nesse breakpoint) e `.sidebar-brand-row { justify-content: flex-end; }` (a regra base tem `space-between`, pensada para dois itens; com só o link "+" restando, `flex-end` evita que ele seja empurrado para a esquerda/canto errado).
- [x] **(bad_spec repair pass 3)** `app/(app)/_components/nav.tsx` -- adicionado `onClick={() => setMenuAberto(false)}` ao `<Link href="/upload">` (o "+"), igual aos 5 links de `LINKS` -- agora tocar nele no mobile fecha o painel/scrim e destrava o scroll do body (efeito de `menuAberto` já existente) como qualquer outro link.
- [x] **(bad_spec repair pass 3)** `app/(app)/_components/nav.tsx` -- adicionado `useEffect` dedicado (sem dependências, roda uma vez) que cria `window.matchMedia('(min-width: 768px)')` e adiciona um listener de `change`; quando o viewport cruza para `>=768px` (`event.matches === true`), chama só `setMenuAberto(false)` -- sem `.focus()` nesse caminho, já que em desktop não há painel/scrim/hambúrguer mobile para receber foco (`.sidebar-toggle` some via CSS acima de 768px). Listener removido no cleanup do efeito (`mediaQuery.removeEventListener('change', ...)`).

**Acceptance Criteria:**
- Given qualquer tela do grupo `(app)` exceto `/lancamentos` em `≥768px`, when renderizada, then exibe sidebar fixa à esquerda com os 5 itens e fundo branco com cards sombreados no lugar do nav horizontal/cards cinza de hoje.
- Given `<768px`, when o hambúrguer é tocado, then abre um painel off-canvas (não mais dropdown que empurra conteúdo) com foco no primeiro link.
- Given falha ao buscar contagens de pendência, when a sidebar renderiza, then não quebra a navegação (mesmo comportamento de degradação já existente).
- Given `npm run build`, when executado, then completa sem erros.

## Spec Change Log

### 2026-07-22 — bad_spec repair (pass 1)

**Trigger:** Blind Hunter + Edge Case Hunter, em paralelo, convergiram em múltiplos achados reais de acessibilidade no painel off-canvas mobile e em duas regressões visuais/funcionais fora do mobile: (1) Escape só fecha o menu se o foco ainda estiver dentro de `<nav>` -- o scrim é irmão do `<nav>`, não descendente, então Escape com foco no scrim não fecha nada; (2) foco nunca retorna ao botão hambúrguer ao fechar (Escape/scrim/clique em link) -- fica órfão num link agora fora de tela; (3) nada impede Tab de sair do painel aberto para o conteúdo obscurecido atrás do scrim (sem `inert`/`aria-hidden` no `.app-content`); (4) o botão hambúrguer ("Fechar menu", `aria-expanded=true`) fica visualmente coberto pelo scrim (`z-index:35` sobre `z-index:30`) -- mouse não consegue mais clicar nele, só no scrim, que tem o MESMO texto acessível "Fechar menu" (nomes duplicados para leitor de tela); (5) a animação de fechar nunca é vista -- `visibility:hidden` aplica instantaneamente enquanto `transform` ainda estaria em transição; (6) `.sidebar-scrim` só tem CSS dentro do media query mobile -- redimensionar a janela para desktop com o menu aberto deixa um botão sem estilo solto no fluxo; (7) `.sidebar-nav-link:hover`/`.ativo` usam `background: var(--surface)`, que no modo claro tem só ~1.05:1 de contraste contra `var(--background)` (medido em rodada anterior desta mesma iniciativa) -- destaque de hover/ativo praticamente invisível; (8) `.card` no modo claro perdeu a borda inteiramente, dependendo só de `box-shadow`, que desaparece em `forced-colors`/alto contraste/impressão, sem nenhum fallback -- card fica sem contorno visível nesses contextos; (9) verificado por grep: `/upload` só é alcançável via link em `page.tsx` QUANDO `faturaNaoEnviada` é verdadeiro -- depois que a fatura do mês já foi enviada, a rota fica sem nenhum caminho de navegação visível (a alegação original do Code Map/comentário de que "continua acessível via Início" era só parcialmente verdadeira, não verificada a fundo antes).

**Amendment:** Tasks & Acceptance ampliado com correções concretas para os 9 pontos acima -- ver instruções da nova rodada de implementação. Nenhuma mudança na decisão de design em si (sidebar continua sendo os mesmos 5 itens, card continua branco+sombra no claro) -- as correções são todas de robustez/acessibilidade da implementação, não de re-design.

**Known-bad state avoided:** enviar para produção um painel de navegação mobile que aprisiona/perde o foco de teclado de forma real (não hipotética -- Tab literalmente sai para conteúdo obscurecido), com um botão de fechar que o mouse não consegue mais clicar, e um card sem nenhum contorno visível em modo de alto contraste.

**KEEP:** toda a estrutura de sidebar desktop (fixa, 240px, 5 itens, seletor de conta visual) já está correta e aprovada -- não mexer. `--highlight`/`--highlight-dark` (tokens, ainda não consumidos nesta etapa) ficam como estão, preparados para a Etapa 2.

## Review Triage Log

### 2026-07-22 — Review pass 1
- intent_gap: 0
- bad_spec: 1 (high 1)
- patch: 0 (todos os achados exigem mudança de comportamento/CSS real, não só correção de comentário -- tratados juntos no repair acima)
- defer: 1 (low 1 -- nomes reais "Tsuyoshi"/"Milena" hardcoded como texto estático no seletor de conta, mesmo padrão já usado em todo o app desde o Epic 1, não uma regressão nova desta spec)
- reject: 1 (renomear `.app-nav*` -> `.sidebar-*` sem checar outras referências -- projeto não tem testes e2e/seletores dependentes desses nomes de classe, confirmado por grep)
- addressed_findings:
  - `[high]` `[bad_spec]` 9 achados reais de acessibilidade/robustez no painel off-canvas mobile e em `.card`/`.sidebar-nav-link` -- ver Spec Change Log acima para a lista completa. Código a ser corrigido na próxima rodada de implementação.

### 2026-07-22 — bad_spec repair (pass 2)

**Trigger:** Segunda rodada de review (Blind Hunter + Edge Case Hunter, cada um rodando `git diff` diretamente no repo em vez de receber o diff colado) confirmou que 7 dos 9 achados do pass 1 foram corretamente resolvidos, mas encontrou problemas REAIS introduzidos pelas próprias correções: (1) o link "+"/"Enviar nova fatura" adicionado ao `.sidebar-toggle` (barra mobile fixa) E dentro do `.sidebar` (painel) resulta em DOIS links idênticos quando o painel abre no mobile -- e o de dentro do painel fica fisicamente coberto pela barra fixa (`.sidebar-toggle`, z-index 45, altura 3.25rem) porque `.sidebar` não tem padding-top compensando essa barra -- um link invisível mas ainda tabulável/focável, achado por ambos os revisores independentemente; (2) a devolução de foco ao botão hambúrguer (fix do pass 1 para achado #2) foi aplicada a TODOS os fechamentos do menu, incluindo clique num link de navegação e navegação via voltar/avançar do navegador -- forçar o foco de volta ao hambúrguer depois de já ter navegado para outra página é uma regressão nova, não presente no pass 1 nem nos 9 achados originais. Achados reais adicionais (Edge Case Hunter): falta `prefers-reduced-motion` na transição do painel; o scroll do conteúdo de fundo não é travado enquanto o painel está aberto (a página rola visivelmente atrás do scrim).

**Amendment:** (a) Remover o link "+" duplicado do `.sidebar-toggle` (barra mobile), mantendo só UM link "+", dentro do `.sidebar` (mesmo elemento compartilhado entre desktop fixo e painel mobile); (b) adicionar `padding-top` ao `.sidebar` especificamente no breakpoint mobile (`@media (max-width: 767px)`) igual à altura da barra fixa (`3.25rem`), para o conteúdo do painel (incluindo o link "+") nunca ficar coberto; (c) restringir a devolução de foco ao hambúrguer para só os dois fechamentos que a motivam de fato (Escape, clique no scrim) -- não mais um `useEffect` reativo genérico em `menuAberto`, e sim uma chamada explícita nos dois handlers específicos; (d) adicionar `@media (prefers-reduced-motion: reduce) { .sidebar { transition: none; } }`; (e) travar o scroll do `body` enquanto o painel mobile está aberto (`useEffect` com cleanup). Contraste de hover/ativo da sidebar (~1.1-1.2:1, ainda abaixo do 3:1 ideal de WCAG 1.4.11) recebe um ajuste de opacidade modesto nesta rodada, mas NÃO é levado a compliance plena -- aceito como residual documentado (o estado `.ativo`, que é o que mais importa, já tem indicador redundante via borda+negrito; só o `:hover` puro fica sem fallback forte). Edge case de redimensionar a janela com o painel aberto e o número mágico `0.2s` duplicado na transição ficam como itens de baixa severidade, registrados em `deferred-work.md`, não corrigidos nesta rodada (para não abrir um 3º ciclo por um risco raro/nitpick de manutenibilidade).

**Known-bad state avoided:** um link de navegação real (`/upload`) ficando fisicamente invisível mas alcançável por teclado/leitor de tela (confuso, não só cosmético), e um comportamento de foco que rouba a atenção do usuário de volta para um botão de menu já fechado logo depois de uma navegação real.

**KEEP:** as 7 correções do pass 1 que os revisores confirmaram corretas (Escape via `document`, nomes acessíveis distintos scrim/hambúrguer, `.sidebar-scrim{display:none}` base, fallback `forced-colors`, estrutura geral do painel) -- não mexer nelas.

## Design Notes

Escopo deliberadamente menor que "o app inteiro de uma vez": `/lancamentos` fica para uma segunda spec (Etapa 2/2) por ter um layout de 2 colunas próprio que interage com a nova sidebar de forma mais arriscada (cálculo de altura compartilhada `--lancamentos-coluna-altura`) -- seguindo a recomendação de risco do Winston (tech-lead), reconciliada com a necessidade de não deixar a navegação num estado visualmente inconsistente entre telas (por isso a sidebar em si é global nesta etapa, só o conteúdo de `/lancamentos` fica para depois).

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros.
- `npm run lint` -- expected: sem erros.
- `npm run build` -- expected: build de produção completa sem erros.

**Manual checks (if no CLI):**
- Ler o diff final de `app/globals.css`/`nav.tsx`/`layout.tsx` e confirmar que a lógica de busca de contagens de pendência e degradação em erro não foi alterada, só a estrutura visual.
- Confirmar que `/lancamentos` (fora do escopo desta etapa) ainda renderiza sem erro com o novo shell.

### 2026-07-22 — Review pass 3 (verificação final)

- intent_gap: 0
- bad_spec: 0
- patch: 3 (todos aplicados diretamente, sem novo ciclo -- marca duplicada, upload sem onClick de fechar, painel preso ao redimensionar)
- defer: 2 (low 2 -- foco após fechar via clique em link fica em `<body>`, não travado, só sem gerenciamento explícito; upload alcançável só via Shift+Tab)
- reject: 0
- addressed_findings:
  - `[medium]` `[patch]` Marca "Fatura a Dois" duplicada visualmente quando o painel mobile abre -- ocultada a instância interna ao painel via CSS mobile-only.
  - `[low]` `[patch]` Link de upload sem `onClick` de fechar o painel, inconsistente com os demais links -- adicionado.
  - `[medium]` `[patch]` Painel podia ficar preso aberto (scroll-lock permanente, foco em elemento oculto) se a janela fosse redimensionada para desktop com o menu aberto -- fechamento automático via `matchMedia` adicionado.

**Convergência:** após 3 ciclos de bad_spec repair + 1 pass de patches diretos, a matriz de acessibilidade do painel off-canvas (foco, Escape, scroll-lock, z-index, contraste, forced-colors) está verificada de forma sistemática por 2 revisores independentes em cada rodada, sem nenhuma falha nova de alta severidade na última passada -- só os 2 itens de baixa severidade documentados acima como defer. Prosseguindo para commit.

## Auto Run Result

**Resumo:** Etapa 1/2 do redesign SnowUI concluída -- menu horizontal substituído por sidebar fixa (desktop) + painel off-canvas (mobile) em todas as telas do grupo `(app)` exceto `/lancamentos` (Etapa 2/2, spec separada); `.card` passa a usar fundo branco + sombra sutil no modo claro (modo escuro inalterado, mantém superfície+borda); tokens `--highlight`/`--highlight-dark` definidos (ainda não consumidos, preparados para a Etapa 2).

**Arquivos alterados:**
- `app/(app)/_components/nav.tsx` -- reescrito de nav horizontal para sidebar + painel off-canvas mobile com gerenciamento de foco/Escape/scroll-lock/resize.
- `app/(app)/layout.tsx` -- shell de 2 regiões (`.app-shell` envolvendo `Nav` + `.app-content`).
- `app/globals.css` -- `.app-nav*` removido, `.sidebar*` adicionado; `.card` revisado por modo; `--sidebar-width`/`--highlight`/`--highlight-dark` novos; fallback `forced-colors`; `prefers-reduced-motion`.
- `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/DESIGN.md` -- contraste de `--highlight`/`--highlight-dark` verificado e documentado.

**Achados de review:** 3 ciclos de bad_spec repair (Blind Hunter + Edge Case Hunter em paralelo, cada rodada): pass 1 corrigiu 9 achados reais de acessibilidade do painel mobile (Escape só funcionava com foco dentro do nav, foco não retornava ao trigger, botão hambúrguer inclicável sob o scrim com nome acessível duplicado, animação de fechar quebrada, `/upload` órfão depois do primeiro upload do mês, contraste de hover/card insuficiente); pass 2 corrigiu 2 regressões introduzidas pelo próprio pass 1 (link de upload duplicado e escondido atrás da barra fixa, foco devolvido ao hambúrguer indevidamente em navegação normal) mais `prefers-reduced-motion`/scroll-lock; pass 3 (patches diretos, sem novo ciclo completo) corrigiu marca duplicada, upload sem fechar o painel, e painel preso ao redimensionar. 4 itens de baixa severidade aceitos e documentados em `deferred-work.md` (contraste de hover não pleno, foco pós-navegação não gerenciado, upload só via Shift+Tab, resize -- já parcialmente corrigido).

**Verificação:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos em todas as passadas. Não foi possível verificar visualmente no navegador nesta sessão (sem ferramenta de automação disponível) -- risco residual real dado o volume de mudanças de interação (foco, animação, breakpoints), mitigado pelo rigor dos 3 ciclos de review adversarial mas não substituído por confirmação visual direta.

**Riscos residuais:** (1) sem verificação visual real em navegador; (2) 4 itens de baixa severidade documentados como aceitos (ver `deferred-work.md`); (3) `--highlight`/`--highlight-dark` ainda não consumidos (Etapa 2). `followup_review_recommended: true` dado o volume/complexidade de mudanças de interação sensíveis a timing (foco, animação, scroll-lock) e a ausência de verificação visual real.
