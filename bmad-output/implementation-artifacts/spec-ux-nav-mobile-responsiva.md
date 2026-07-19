---
title: 'UX: navegação colapsa em menu hambúrguer abaixo de 768px'
type: 'feature'
created: '2026-07-18'
status: 'done'
baseline_revision: '5c349fbe24e28a1c19072635ffab229219838e21'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/EXPERIENCE.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** `app/(app)/_components/nav.tsx` renderiza uma única lista horizontal (título "Fatura a Dois" + 7 links) que só usa `flex-wrap` para responsividade. Em telas de 360-414px (uso mais provável para conferir a fatura no celular), título + 7 links não cabem numa linha e quebram em 2-3 linhas, empurrando o conteúdo da página para baixo da dobra — um problema real de navegabilidade (o PRD §7 exige usabilidade sem scroll horizontal/zoom a partir de 360px, e uma nav que consome metade da tela viola o espírito disso mesmo sem violar a letra).

**Approach:** Abaixo de 768px, a nav colapsa para título + botão hambúrguer que abre/fecha uma lista vertical dos mesmos 7 links; acima de 768px, comportamento idêntico ao atual (inalterado). Implementado com CSS puro (media query) + `useState` local em `nav.tsx` (já é Client Component) — sem biblioteca nova.

## Boundaries & Constraints

**Always:**
- Breakpoint de colapso: `768px` (mesmo valor de referência usado no `EXPERIENCE.md` → Responsive & Platform).
- Acima de 768px, a nav deve renderizar e se comportar exatamente como hoje — nenhuma mudança visual ou de markup para desktop/tablet.
- O link ativo continua marcado com `aria-current="page"` e a classe `app-nav-link ativo` (borda inferior na cor de destaque), em ambos os modos.
- Botão de menu operável por teclado (é um `<button>` nativo, não uma `<div>` com `onClick`), com `aria-label` (`"Abrir menu"` / `"Fechar menu"`, alternando com o estado) e `aria-expanded` refletindo se o menu está aberto.
- Clicar em qualquer link fecha o menu automaticamente — não deixar o usuário precisar fechar manualmente depois de navegar.

**Block If:**
- Nenhuma condição identificada que exija decisão humana.

**Never:**
- Não introduzir Tailwind, shadcn, ou qualquer dependência de UI nova — o projeto não tem nenhuma (confirmado em `package.json`); tudo em CSS puro em `app/globals.css`, seguindo os tokens já documentados em `DESIGN.md`.
- Não criar nova rota, não tocar em nenhuma outra tela (`/`, `/cartoes`, `/categorias`, `/lancamentos`, `/gastos`, `/parcelas`, `/upload`) — escopo é só `nav.tsx` + CSS de navegação.
- Não mudar a lista de links nem seus destinos — os mesmos 7 links (`Início`, `Lançamentos`, `Gastos`, `Parcelas`, `Upload`, `Categorias`, `Cartões`) na mesma ordem.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Viewport ≥ 768px | Qualquer estado do menu | Nav horizontal idêntica à atual; botão hambúrguer não aparece (ou é ocultado via CSS) | — |
| Viewport < 768px, menu fechado (padrão) | Carregamento inicial da página | Só título + botão hambúrguer visíveis; lista de links oculta | — |
| Viewport < 768px, usuário clica no botão | Menu fechado | Lista vertical de links aparece; `aria-expanded="true"`; rótulo do botão vira "Fechar menu" | — |
| Viewport < 768px, usuário clica num link com o menu aberto | Menu aberto | Navega para a rota do link E o menu fecha (sem exigir um segundo clique) | — |
| Viewport < 768px, usuário clica no botão novamente | Menu aberto | Lista de links esconde; `aria-expanded="false"`; rótulo volta a "Abrir menu" | — |
| Redimensionar de <768px (menu aberto) para ≥768px | Menu aberto em mobile | Nav volta ao layout horizontal; estado de aberto/fechado do menu mobile deixa de ser relevante (não deve causar layout quebrado ao voltar para <768px depois) | — |

</intent-contract>

## Code Map

- `app/(app)/_components/nav.tsx` -- adicionar `useState` para `menuAberto`; renderizar um `<button>` de hambúrguer (visível só em mobile via CSS) entre o título e a lista; fechar o menu (`setMenuAberto(false)`) no `onClick` de cada link; classes condicionais para abrir/fechar a lista em mobile
- `app/globals.css` -- adicionar media query `@media (max-width: 767px)` para as classes `.app-nav`/`.app-nav-list`/`.app-nav-link` colapsarem em coluna, mais as classes novas do botão de menu (`.app-nav-toggle`) e o estado aberto/fechado da lista em mobile (`.app-nav-list.aberto` ou equivalente); acima de 768px as regras atuais continuam valendo sem alteração

## Tasks & Acceptance

**Execution:**
- [x] `app/(app)/_components/nav.tsx` -- adicionar estado `menuAberto` (`useState<boolean>`), botão hambúrguer com `aria-label`/`aria-expanded`, fechar o menu ao clicar em qualquer link (`onClick` além do `Link` existente), classe condicional na lista de links refletindo o estado
- [x] `app/globals.css` -- media query `max-width: 767px` colapsando a nav (lista vertical, escondida por padrão, exibida quando o estado "aberto" está ativo) + estilo do botão de hambúrguer; nenhuma regra fora dessa media query pode mudar o comportamento atual em ≥768px

**Acceptance Criteria:**
- Given a viewport ≥ 768px, when a página carrega, then a nav se comporta exatamente como antes desta mudança (sem hambúrguer visível, lista horizontal)
- Given a viewport < 768px e o menu fechado, when o usuário clica no botão de hambúrguer, then a lista de links aparece verticalmente, `aria-expanded` vira `"true"` e o rótulo do botão muda para indicar que ele fecha o menu
- Given a viewport < 768px e o menu aberto, when o usuário clica em qualquer link da lista, then a navegação ocorre e o menu fecha automaticamente, sem exigir uma segunda ação do usuário
- Given qualquer viewport, when o link da rota atual é renderizado, then ele mantém `aria-current="page"` e a classe `ativo`, em ambos os modos (colapsado e expandido)

## Spec Change Log

## Review Triage Log

### 2026-07-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4 (medium 4, low 0)
- defer: 4 (low 4)
- reject: 9 (low 9)
- addressed_findings:
  - `[medium]` `[patch]` Both reviewers flagged that closing the menu only via each `<Link>`'s `onClick` misses browser back/forward navigation (pathname changes without any `onClick` firing), leaving the menu open over new page content. Fixed by adjusting state during render when `pathname` differs from the previously-seen value (React's recommended pattern for this case) instead of `useEffect` — the first attempt using `useEffect` was caught by this project's own `react-hooks/set-state-in-effect` lint rule and corrected before commit.
  - `[medium]` `[patch]` Edge Case Hunter (and implicitly Blind Hunter's "standard ARIA disclosure pattern" note): toggle button had no `aria-controls` linking it to the disclosed list. Added `id="app-nav-list"` + `aria-controls="app-nav-list"`.
  - `[medium]` `[patch]` Blind Hunter: 36px touch target below the ~44px recommended minimum for mobile controls. Bumped `.app-nav-toggle` to 2.75rem (44px).
  - `[medium]` `[patch]` Blind Hunter: decorative hamburger bars not explicitly hidden from assistive tech. Added `aria-hidden="true"` to the three `<span className="app-nav-toggle-bar">` elements.
  - `[low]` `[defer]` No Escape-key handler, no click-outside handler, no focus management (move into menu on open / back to button on close) — real accessibility improvements but beyond this story's explicit scope (button keyboard-operable + aria-label/aria-expanded + close-on-navigate), logged to `deferred-work.md` for a dedicated accessibility pass.
  - `[low]` `[defer]` No open/close transition, no bars→X icon morph — visual polish not requested; consistent with the app's existing no-decorative-animation posture (`DESIGN.md`), logged to `deferred-work.md`.
  - `[low]` `[reject]` "State survives resize round-trip" (menu re-opens if narrowed back below 768px after being left open) — this is exactly the scenario the spec's own I/O matrix anticipated and only required "not broken," which it is (CSS still hides it correctly above 768px regardless of state). Meets the stated bar.
  - `[low]` `[reject]` No test coverage, breakpoint magic number not extracted to a CSS variable, modifier-click (Ctrl/Cmd/middle-click) still closes the menu, no transition/animation, "desktop unchanged" not independently verifiable from the diff alone — no test infra anywhere in this project (established convention), no existing breakpoint-variable pattern to extend, modifier-click has negligible real consequence, and "desktop unchanged" was independently confirmed by reading the full current `nav.tsx`/`globals.css` directly rather than trusting the diff alone.
  - `[low]` `[reject]` Edge Case Hunter's title/toggle overlap on very narrow screens or large OS text scaling — speculative, no evidence this occurs at any realistic width ≥320px given the short title text and fixed-size button with `justify-content: space-between`.

## Design Notes

Padrão de implementação: `nav.tsx` já é `'use client'` com `usePathname()` para o link ativo -- adicionar um segundo `useState` para o menu é uma extensão direta, sem introduzir Context/Provider (escopo é um único componente, sem necessidade de compartilhar o estado do menu com o resto da árvore). CSS puro: a lista de links já existe como `<ul className="app-nav-list">`; a media query só precisa alternar `display`/`flex-direction` baseado em uma classe adicional condicionada ao estado `menuAberto`, sem duplicar o markup dos 7 links entre um modo "desktop" e um "mobile".

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção conclui sem erro

**Manual checks (if no CLI):**
- Rodar `npm run dev` e, no navegador, redimensionar a janela para <768px e para ≥768px, confirmar visualmente o colapso/expansão do menu, o clique em link fechando o menu, e os atributos `aria-expanded`/`aria-label` via DevTools -- este projeto não tem ferramenta de automação de navegador disponível nesta sessão, então esta verificação visual fica registrada como pendente de confirmação manual pelo usuário.

## Auto Run Result

Status: done

**Resumo:** A nav (`app/(app)/_components/nav.tsx`) agora colapsa para título + botão hambúrguer abaixo de 768px, abrindo/fechando uma lista vertical dos mesmos 7 links; acima de 768px, comportamento e markup permanecem inalterados (confirmado por leitura direta do arquivo antes e depois). Sem biblioteca nova -- CSS puro + `useState`.

**Arquivos alterados:**
- `app/(app)/_components/nav.tsx` -- estado `menuAberto`, botão de menu com `aria-label`/`aria-expanded`/`aria-controls`, fecha ao clicar em link ou ao mudar de rota (via ajuste de estado durante a renderização, não `useEffect`)
- `app/globals.css` -- `.app-nav-toggle` (oculto por padrão) + media query `max-width: 767px` para o colapso, toque de 44px, ícone de 3 barras `aria-hidden`

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada):** 0 `bad_spec`, 4 `patch` (médios) aplicados -- fechar em navegação via voltar/avançar do navegador (corrigido durante a implementação do patch, que inicialmente usou `useEffect` e foi pego pelo próprio lint do projeto, `react-hooks/set-state-in-effect`, antes do commit), `aria-controls` ausente, alvo de toque abaixo do mínimo recomendado, barras decorativas sem `aria-hidden`. 4 `defer` (Escape/clique-fora/gestão de foco, transição visual) registrados em `deferred-work.md`. 9 `reject` (sem infra de teste no projeto, cenários especulativos ou já cobertos pela própria barra de aceite da spec).

**Follow-up review recomendado:** false -- mudança contida (2 arquivos, sem Server Action/dado envolvido), 0 `bad_spec`, patches aplicados são pequenos e mecânicos.

**Verificação realizada:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos. Sem Server Action envolvida nesta story -- nenhum script de verificação contra o Supabase foi necessário. `npm run build` prerenderizou `/` estaticamente, confirmando que a árvore com o `<Nav>` novo renderiza sem erro no servidor.

**Riscos residuais:** o comportamento responsivo real (colapso/expansão visual, toggle de `aria-expanded` ao clicar, aparência do menu mobile) não foi confirmado em um navegador real nesta sessão -- não há ferramenta de automação de navegador disponível. Recomenda-se que o usuário abra o app localmente e redimensione a janela para confirmar visualmente antes de considerar o achado #6 da auditoria de UX totalmente resolvido na prática.
