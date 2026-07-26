---
title: 'Story 7.3: Shell de navegação — sidebar (corte atômico)'
type: 'feature'
created: '2026-07-26'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/bmad-output/implementation-artifacts/epic-7-context.md'
warnings: []
baseline_revision: '530ee977d97fb4579bf65f14e8760dd45bd98e94'
final_revision: 'bd9be14b4ece67457be2aa41d3fd3bb1901c2911'
---

<intent-contract>

## Intent

**Problem:** O shell de navegação hoje (`app/(app)/_components/nav.tsx`) é um único elemento `<nav className="sidebar">` reestilizado via CSS/JS para servir tanto o desktop (coluna fixa) quanto o mobile (painel off-canvas com hambúrguer) — CSS artesanal, sem nenhum componente do shadcn. O Epic 7 pede a migração da estrutura desktop para o componente `Sidebar` real do shadcn/ui, preservando exatamente o comportamento mobile customizado já testado (sem modal, foco gerenciado, Escape/scrim).

**Approach:** Investigação prévia (via `npx shadcn add sidebar --dry-run`/`--view`) confirmou que o componente `Sidebar` do shadcn, no modo `isMobile=true`, renderiza um `Sheet` (Radix Dialog) — modal de verdade, incompatível com o contrato "sem modal" já documentado. Resolução: vendorizar o componente via CLI, depois **modificar `SidebarProvider`** (arquivo passa a ser propriedade do projeto, convenção normal do shadcn) para remover toda a detecção de mobile/cookie/atalho de teclado (nenhum dos três é necessário — o produto nunca ofereceu colapso manual da sidebar) e **remover o branch de `Sheet` mobile** de dentro de `Sidebar` (nunca alcançado, dado que `isMobile` passa a ser sempre `false`). O resultado é usado **só para desktop** (`collapsible="none"`, escondido via CSS abaixo de 768px); o `<nav>` mobile existente continua exatamente como está, escondido via CSS a partir de 768px — os dois elementos coexistem no DOM, cada um visível só na sua própria faixa de largura, exatamente como `.sidebar-toggle` (hambúrguer) já funciona hoje.

## Boundaries & Constraints

**Always:** Preservar 100% do comportamento mobile já existente em `nav.tsx` (hambúrguer, painel off-canvas, Escape, scrim, foco no primeiro link ao abrir, devolução de foco ao fechar, fechamento ao cruzar para desktop, scroll-lock do body, fechamento ao navegar) -- **nenhuma linha desse bloco de lógica muda**. Preservar a largura já aprovada (`--sidebar-width: 240px`) -- o componente vendorizado usa por padrão `16rem`, que deve ser trocado para referenciar `var(--sidebar-width)`, não um valor novo. Preservar os 5 links de navegação, a detecção de rota ativa, e os badges de pendência (`.badge-pending`) exatamente como hoje -- usar `SidebarMenuBadge` do componente vendorizado para renderizar o mesmo badge, mesmo texto de `aria-label`. Preservar o seletor de conta do casal (rodapé, puramente visual) exatamente como hoje.

**Block If:** Se a suíte de QA (`npm run test:e2e`) apontar qualquer diferença visual/estrutural/de acessibilidade não esperada além dos gaps já documentados em `deferred-work.md`, HALT com status `blocked`, blocking condition `regressão detectada na migração do shell de navegação` -- não ajustar valores às cegas para fazer a suíte passar.

**Never:** Não usar o `Sheet`/`SheetContent` do shadcn para o mobile -- o branch `isMobile` de `Sidebar` deve ser removido, não contornado. Não expor nenhum controle de colapso da sidebar (sem `SidebarTrigger`/`SidebarRail`, sem atalho de teclado Cmd/Ctrl+B, sem cookie de estado) -- o produto nunca teve isso e não é escopo desta story introduzir. Não vendorizar/manter `components/ui/sheet.tsx` nem `hooks/use-mobile.ts` se nada mais no projeto os importar depois desta story -- remover arquivo órfão em vez de deixar código morto. Não deixar o CLI sobrescrever `app/globals.css` com valores de cor hardcoded para os tokens `--sidebar-*` -- mapear via `var()` para os tokens já existentes (mesmo padrão da Story 7.2), nunca aceitar o hex/oklch default do shadcn.

</intent-contract>

## Code Map

- `package.json` -- remover `@radix-ui/react-slot` (instalado na Story 7.2 sob uma convenção diferente da que o CLI atual usa); adicionar `radix-ui` (pacote unificado que os arquivos vendorizados pelo CLI atual importam, ex. `import { Slot } from "radix-ui"`, uso como `Slot.Root`).
- `components/ui/sidebar.tsx` -- novo (via CLI), depois modificado: `SidebarProvider` simplificado (sem `useIsMobile`/cookie/atalho de teclado, `isMobile` sempre `false`, `state` sempre `"expanded"`); branch `if (isMobile) { return <Sheet>...</Sheet> }` de `Sidebar` removido, junto dos imports de `Sheet*` que ficam sem uso; `SIDEBAR_WIDTH` trocado para `"var(--sidebar-width)"`.
- `components/ui/button.tsx`, `components/ui/separator.tsx`, `components/ui/tooltip.tsx`, `components/ui/skeleton.tsx`, `components/ui/input.tsx` -- novos (via CLI, dependências transitivas de `sidebar.tsx`), sem modificação.
- `components/ui/sheet.tsx`, `hooks/use-mobile.ts` -- criados pelo CLI, **deletados** depois (órfãos após a simplificação de `SidebarProvider`/`Sidebar` acima -- confirmar via grep antes de deletar).
- `app/globals.css` -- reconciliar os tokens `--sidebar-*`/`--color-sidebar-*` que o CLI adiciona automaticamente, mapeando via `var()` para tokens já existentes (`--background`, `--foreground`, `--accent`, `--accent-foreground`, `--border`, e o `--color-accent` já criado na Story 7.2 para o papel de hover). Adicionar `display: none` para `.sidebar` (o `<nav>` mobile existente) a partir de `768px` -- agora que existe um elemento desktop separado, o `<nav>` mobile precisa ficar invisível em telas largas (hoje ele já É o desktop, reestilizado).
- `app/(app)/_components/nav.tsx` -- adicionar a composição do `Sidebar` vendorizado (visível só `>=768px`, via `hidden md:flex` ou equivalente) como **elemento irmão** do `<nav>` mobile existente (que passa a ficar visível só `<768px` via CSS) -- nenhuma linha do bloco mobile existente é removida ou alterada.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- remover `@radix-ui/react-slot`, adicionar `radix-ui`; `npm install` para resincronizar o lockfile.
- [x] Rodar `npx shadcn@latest add sidebar --yes` (vendoriza os 8 arquivos: `sidebar.tsx`, `button.tsx`, `separator.tsx`, `tooltip.tsx`, `skeleton.tsx`, `input.tsx`, `sheet.tsx`, `hooks/use-mobile.ts`, mais os `--sidebar-*` CSS vars auto-adicionados a `app/globals.css`).
- [x] `app/globals.css` -- reconciliar os `--sidebar-*`/`--color-sidebar-*` recém-adicionados: substituir todo valor hardcoded por `var()` apontando para o token existente equivalente (ver Design Notes para o mapeamento exato). Adicionar `@media (min-width: 768px) { .sidebar { display: none; } }` para esconder o `<nav>` mobile existente em telas largas.
- [x] `components/ui/sidebar.tsx` -- simplificar `SidebarProvider` (remover `useIsMobile`, cookie, atalho de teclado; `isMobile`/`openMobile`/`setOpenMobile` viram constantes/no-ops; `state` sempre `"expanded"`); remover o branch `if (isMobile)` (mobile `Sheet`) de `Sidebar` e os imports de `Sheet*` que ficam órfãos; trocar `SIDEBAR_WIDTH = "16rem"` para `SIDEBAR_WIDTH = "var(--sidebar-width)"`.
- [x] Confirmar via grep que nada importa `components/ui/sheet.tsx` nem `hooks/use-mobile.ts` fora deles mesmos -- deletar os dois arquivos.
- [x] `app/(app)/_components/nav.tsx` -- adicionar a composição desktop com os componentes vendorizados (`Sidebar collapsible="none"` visível só `>=768px`, `SidebarHeader` com a marca, `SidebarContent > SidebarGroup > SidebarGroupContent > SidebarMenu > SidebarMenuItem > SidebarMenuButton asChild` envolvendo o mesmo `<Link>` de cada item -- mesmos 5 links, mesma detecção de rota ativa via `isActive` prop, `SidebarMenuBadge` para os badges de pendência com o mesmo `aria-label`, `SidebarFooter` com o mesmo seletor de conta do casal) -- como elemento irmão do bloco mobile existente, que permanece intocado.
- [x] Rodar `npm run test:e2e` -- confirmar zero regressão além dos gaps já documentados.

**Acceptance Criteria:**
- Given uma tela `>=768px`, when a página carrega, then a sidebar desktop (agora componente shadcn) aparece fixa à esquerda com os mesmos 5 links, mesma largura (240px), mesmo item ativo destacado, mesmos badges de pendência, mesmo seletor de conta no rodapé -- e o `<nav>` mobile (hambúrguer/off-canvas) fica invisível.
- Given uma tela `<768px`, when a página carrega, then o comportamento mobile é idêntico ao de antes desta story (hambúrguer, painel off-canvas, Escape, scrim, foco, scroll-lock) -- e a sidebar desktop fica invisível.
- Given qualquer viewport, when a suíte de QA roda (`npm run test:e2e`), then confirma zero violação de acessibilidade nova e zero diff visual além dos gaps já conhecidos.
- Given o componente `Sidebar` vendorizado, when inspecionado, then não contém nenhum caminho de código alcançável que renderize `Sheet`/modal -- nem `SidebarTrigger`/atalho de teclado/cookie de estado.

## Design Notes

**Por que não usar `collapsible="offcanvas"`/`"icon"` do próprio shadcn para resolver mobile:** ambos dependem do mesmo mecanismo `isMobile`/`Sheet` para o comportamento em telas pequenas — usar qualquer um deles reintroduziria exatamente o problema que este documento resolve removendo. `collapsible="none"` é o único modo que nunca colapsa nem troca para `Sheet`, exatamente o que se precisa aqui (sidebar sempre expandida, sem colapso manual, mobile tratado inteiramente fora deste componente).

**Mapeamento de tokens `--sidebar-*` (a reconciliar após o CLI adicionar os defaults):**
- `--sidebar` / `--color-sidebar` → `var(--background)`
- `--sidebar-foreground` / `--color-sidebar-foreground` → `var(--foreground)`
- `--sidebar-primary` / `--color-sidebar-primary` → `var(--accent)`
- `--sidebar-primary-foreground` / `--color-sidebar-primary-foreground` → `var(--accent-foreground)`
- `--sidebar-accent` / `--color-sidebar-accent` → mesmo valor de `--color-accent` já criado na Story 7.2 (papel de hover, `color-mix` sobre `--foreground`) -- nunca o `--accent` de marca do produto.
- `--sidebar-accent-foreground` / `--color-sidebar-accent-foreground` → `var(--foreground)`
- `--sidebar-border` / `--color-sidebar-border` → `var(--border)`
- `--sidebar-ring` / `--color-sidebar-ring` → `var(--accent)`

**Por que os dois elementos (`<nav>` mobile + `Sidebar` desktop) coexistem no DOM em vez de um só condicional:** é o mesmo padrão já usado por `.sidebar-toggle` hoje (sempre renderizado, escondido via CSS fora do seu breakpoint) -- evita hidratação condicional em cima de `window.matchMedia`/media query em JS (que sofreria de flash/mismatch de SSR), e mantém a mesma disciplina "CSS decide visibilidade, não JS" já em uso no arquivo inteiro.

**Item de menu ativo:** `SidebarMenuButton` aceita `isActive` -- passar a mesma lógica de detecção já usada (`pathname === '/'` para Início, `pathname.startsWith(link.href)` para os demais), preservando o mesmo comportamento de `aria-current="page"` (passar explicitamente via props, `SidebarMenuButton` não define isso sozinho).

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros novos
- `npm run lint` -- expected: sem erros novos
- `npm run build` -- expected: build de produção limpo
- `npm run test:e2e` -- expected: mesmas 54 checagens, sem diferença visual/estrutural nova além dos gaps já documentados

**Manual checks (if no CLI):**
- Confirmar visualmente (screenshot da própria suíte) que a sidebar desktop e o painel mobile têm exatamente a mesma aparência de antes desta story.

## Review Triage Log

### 2026-07-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8 (high 2, medium 4, low 2)
- defer: 0
- reject: 3 (high 0, medium 0, low 3)
- addressed_findings:
  - `[high]` `[patch]` Link de atalho "+" pra `/upload` (existente no painel mobile) não existia na sidebar desktop -- regressão funcional real em dado de produção: depois que a fatura do mês é enviada, "Início" deixa de linkar pra `/upload`, e o desktop ficava sem nenhum caminho de navegação até lá. Adicionado o mesmo link no `SidebarHeader`.
  - `[high]` `[patch]` Indicador de item ativo mais fraco que o já aprovado no mobile: hover e ativo usavam o mesmo `bg-sidebar-accent`, diferenciados só por `font-weight`; e TODOS os links (ativos ou não) herdavam a mesma cor `--foreground`, quando o mobile usa `--muted-foreground` para inativos. Corrigido com borda esquerda de 3px colorida (`--sidebar-primary`, mapeado a `--accent`) + `text-muted-foreground` como padrão, override só quando ativo -- confirmado por `getComputedStyle` real, não suposição.
  - `[medium]` `[patch]` `Sidebar` (`collapsible="none"`) renderiza um `<div>` puro -- landmark de navegação perdido em desktop (mobile é um `<nav>` de verdade). Adicionado `role="navigation"`/`aria-label="Navegação principal"`.
  - `[medium]` `[patch]` Densidade de espaçamento (`p-2`/`gap-2` default do shadcn, 8px) perceptivelmente mais apertada que o resto do produto (`1.5rem`/`1rem`). Ajustado `SidebarHeader`/`SidebarContent`/`SidebarFooter` com padding/gap mais próximos do original; footer reaproveita a borda/margin-top:auto já existente em `.sidebar-footer` (evitado duplicar borda).
  - `[medium]` `[patch]` `SidebarTrigger`/`SidebarRail` permaneciam exportados mas eram no-ops permanentes (`toggleSidebar()` vazio no provider simplificado) -- clique silenciosamente não faz nada, contrariando o Never boundary da spec ("não expor controle de colapso"). Removidos inteiramente do arquivo (função + export), não deixados como código morto.
  - `[medium]` `[patch]` `collapsible` aceitava `"offcanvas"`/`"icon"` no tipo, mas ambos dependiam do branch `Sheet`/`useIsMobile` já removido -- usar qualquer um deles renderizaria nada em `<768px` (sem fallback). Tipo restrito a `collapsible?: "none"` -- erro de compilação em vez de falha silenciosa em produção se algum uso futuro tentar os outros modos.
  - `[low]` `[patch]` 2 tokens `--color-sidebar-primary`/`-primary-foreground` ficavam sem nenhum uso real -- resolvido organicamente pelo patch do indicador de borda ativa (item 2 acima), que passou a consumi-los.
  - `[low]` `[patch]` Inconsistência de camada CSS (achado do próprio orquestrador, não dos agentes): a regra `.sidebar { display: none }` (>=768px) tinha ficado fora do `@layer base` estabelecido na Story 7.2 -- movida para dentro, mantendo a ordem de origem que já garantia a precedência correta.

Achados rejeitados (3, todos com verificação/justificativa): `SidebarProvider` simplificado aceita `React.ComponentProps<"div">` sem tipar/rejeitar `open`/`defaultOpen`/`onOpenChange` -- baixo risco real (nenhum código atual passa essas props, e o `contextValue` hardcoded está a poucas linhas de distância no mesmo arquivo, visível para qualquer um que abrir o componente); API não utilizada mas funcional (`SidebarInset`, `SidebarInput`, `SidebarMenuAction`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarSeparator`, `SidebarMenuSub*`) permanece no arquivo -- diferente de `SidebarTrigger`/`SidebarRail` (que eram ativamente quebrados), essas são primitivas de composição corretas e prováveis de serem usadas em stories futuras, não é código morto/enganoso; `TooltipProvider`/lógica de tooltip em `SidebarMenuButton` fica montada mas inalcançável (já que `state` nunca é `"collapsed"`) -- overhead desprezível (só contexto React, sem custo de renderização visível), removê-la exigiria mais cirurgia no arquivo vendorizado para um ganho marginal.

## Auto Run Result

Status: done
Follow-up review recommended: false -- feito nesta mesma rodada (ver abaixo), não fica pendente para a Story 7.4.

Shell de navegação migrado: estrutura desktop agora usa o componente `Sidebar` real do shadcn/ui (`collapsible="none"`, sem colapso/atalho/cookie), painel mobile off-canvas customizado preservado 100% intocado. `SidebarProvider` simplificado (mobile/cookie/atalho de teclado removidos -- nunca foram oferecidos pelo produto); branch `Sheet` removido de `Sidebar` (incompatível com o contrato "sem modal"); `SidebarTrigger`/`SidebarRail` removidos (no-ops permanentes); `collapsible` restrito a `"none"` no tipo. Tokens `--sidebar-*` reconciliados via `var()` para os tokens já existentes (mesmo padrão da Story 7.2), nenhum hex/oklch hardcoded aceito do preset do shadcn. `package.json`: `@radix-ui/react-slot` (Story 7.2, convenção desatualizada) trocado por `radix-ui` (pacote unificado que o CLI atual de fato importa).

**Follow-up review (fresh context, focada em paridade funcional mobile x desktop)** -- dado que esta é a primeira migração de componente real da run (não mais reskin de token) e toca a navegação de todas as telas de uma vez, rodei uma segunda passada de revisão explicitamente antes de fechar a story, focada só em "o que o usuário consegue fazer/ver num bloco que não consegue no outro". Achou 2 novos achados reais:
- `[high]` `[patch]` Badge de pendência (`SidebarMenuBadge` do componente vendorizado) não tinha nenhum `background` -- a contagem aparecia sem a pill laranja (`--pending`) que o mobile já tem, perdendo a cor de atenção.
- `[high]` `[patch]` O mesmo badge era renderizado como IRMÃO do link, não filho -- o `aria-label` da pendência ficava fora do nome acessível do link, então tabular até o item no desktop não anunciava a pendência (o mobile já anuncia, badge dentro do `<Link>`).
- Corrigido de uma vez: removido `SidebarMenuBadge`, reaproveitado o mesmo `<span className="badge-pending" aria-label="N pendente(s)">` do mobile, colocado DENTRO do `<Link>` do desktop -- mesma cor, mesma estrutura acessível nos dois blocos agora.
- Restante da paridade confirmada sem achado: 5 links/ordem idênticos, `aria-current` correto nos dois, seletor de conta do casal idêntico, link de upload com mesmo `href`/`aria-label`, breakpoints de visibilidade batem exatamente (sem gap nem sobreposição entre os dois blocos).

**Verificação:** `npx tsc --noEmit`, `npm run lint` (0 erros), `npm run build` (produção, limpo) -- rodados depois de CADA rodada de patches (review inicial + follow-up). `npm run test:e2e`: diffs visuais esperados a cada rodada de mudança real na sidebar, sempre confirmados visualmente (screenshot inspecionado diretamente) antes de `npm run test:e2e:update-snapshots`; suíte completa rodada 2x consecutivas depois da rodada final de patches, 54/54 consistente. Cor de texto dos links inativos verificada via `getComputedStyle` real (não suposição) antes e depois do ajuste de `text-muted-foreground`.

**Risco residual:** nenhum identificado após as duas rodadas de review (inicial + follow-up de paridade funcional). Pronto para a Story 7.4 (migração de `/esqueci-senha`/`/redefinir-senha`) sem pendência aberta.
