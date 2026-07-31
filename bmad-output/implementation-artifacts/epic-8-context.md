# Epic 8 Context: Redesign Profissional — Ícones de Navegação e Hierarquia Visual

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Depois do Epic 7 (migração real para shadcn/ui) concluído, o usuário pediu que o produto "pareça produto profissional, não recibo minimalista", citando os Examples e o Bootstrap Icons do Bootstrap como inspiração de repertório visual — **nunca** dependência literal (nem o framework CSS, nem o pacote `bootstrap-icons` são adotados). Escopo confirmado com o usuário: ícones reais (`lucide-react`) no chrome de navegação compartilhado, cards com mais respiro (padding), hover/ativo de navegação mais nítido. Explicitamente **fora** de escopo: qualquer paradigma de layout tipo dashboard/marketing dos Examples do Bootstrap, paleta de cor nova, dependências novas (Radix/Tailwind adicional). O usuário quer uma mudança visual perceptível, não um ajuste sutil. É trabalho de infraestrutura de apresentação — nenhum comportamento de usuário muda, nenhuma rota nova, nenhum FR coberto.

## Stories

- Story 8.1: Chrome compartilhado — ícones de navegação e tokens base (done)
- Story 8.2: Consistência estrutural e telas simples (done)
- Story 8.3: Telas complexas — Lançamentos e autenticação (última, maior risco)

## Requirements & Constraints

- Nenhum FR coberto — puramente apresentacional; nenhuma rota nova/removida/renomeada; nenhum comportamento de usuário muda.
- NFR6: interface usável sem scroll horizontal e sem zoom manual a partir de 360px de largura continua valendo para qualquer tela tocada.
- Qualquer par de cor novo/alterado (ex. hover/ativo intensificado) precisa de verificação WCAG AA (≥4.5:1 texto) nos dois modos claro/escuro, idealmente com teste automatizado (`getComputedStyle`), não só cálculo manual.
- Suíte de QA (Playwright, `e2e/`, criada no Epic 7) precisa passar após cada story: zero violação nova de acessibilidade (axe-core), zero regressão estrutural/funcional; diffs visuais são esperados e revisados manualmente, não tratados como falha automática.
- Migração do chrome compartilhado é sempre de passada única — nunca duas telas do grupo `(app)` com `nav.tsx`/tokens divergentes coexistindo em produção (mesma regra já aplicada à sidebar no Epic 7).

## Technical Decisions

- **Ícones:** exclusivamente `lucide-react` (já instalado desde o Epic 7, zero dependência nova), gramática `stroke="currentColor"`, monocromático — mesma linguagem de `category-icon`. Nunca `bootstrap-icons` (majoritariamente preenchido/sólido, incompatível), nunca emoji. `nav-icon` (navegação) e `category-icon` (categoria financeira) são curadorias **separadas** — não compartilham enum/token mesmo quando o conceito visual coincide.
- **Padding de `Card`:** já subiu de `py-6/px-6` para `py-7/px-7` (1.5rem→1.75rem) no `components/ui/card.tsx` vendorizado (Story 8.1). Qualquer tela que já usa o `Card` real herda isso automaticamente — não precisa reimplementação por tela (confirmado em `/categorias`/`/parcelas` na Story 8.2).
- **Hover/ativo de `sidebar-nav`:** mobile intensificado via `rgba` em `app/globals.css` (0.05→0.08 claro, 0.06→0.1 escuro); desktop usa token dedicado `--color-sidebar-accent` (`color-mix` 6%→10% sobre `--foreground`) — deliberadamente **não** reaproveita o `--accent` genérico do shadcn, que intensificaria todo botão `ghost`/`outline` do app, não só a sidebar.
- **Item de tipografia `section-title` REMOVIDO do escopo:** o token documentado (1.1rem/17.6px) nunca foi de fato aplicável — o Epic 7 (Story 7.8) já hardcoded `text-[22.5px] font-bold` (via `CardTitle asChild` ou direto no `<h2>`) em 10 das 11 ocorrências, sem ler o token antigo. Aplicar 1.1rem agora **encolheria** a única ocorrência restante, o oposto de "hierarquia mais forte" — e não há headroom para aumentar mais (22.5px já fica a 1.5px de `page-title`=24px). Token corrigido em DESIGN.md/EXPERIENCE.md para 22.5px; a última ocorrência crua (`cartoes/page.tsx`) já foi migrada na Story 8.2.
- **Lição real da Story 8.2 (crítica para 8.3):** nunca copiar um padrão de `Card` envolvendo uma seção de uma tela para outra sem antes ler a estrutura real da lista por baixo. `parcelas/page.tsx` (lista de texto plano dentro de 1 `Card`) e `cartoes/page.tsx` (lista cujos itens, `CartaoRejeitadoItem`, já são `Card`s individuais) pareciam o mesmo problema ("heading de seção fora de Card") mas produzem resultados opostos ao receber o mesmo tratamento — a 1ª tentativa em 8.2 introduziu "card dentro de card" (bug real, achado pelo review adversarial, exigiu ciclo de bad_spec repair). Antes de envolver qualquer heading/lista de `/lancamentos` num `Card` na Story 8.3, ler o componente de item real primeiro.
- **Trap de `font-weight` (herdado da Story 7.8):** `CardTitle asChild` sem `font-bold` explícito renderiza peso 600 em vez de 700 (`@layer base` perdendo para `@layer utilities`). Reabre o mesmo risco em qualquer `<h2>` cru que só agora ganhe `CardTitle` — verificar via `getComputedStyle`.
- **`forced-colors` (Windows alto contraste):** investigação real na Story 8.1 concluiu que `.nav-icon` (`stroke="currentColor"` dentro de `<Link>`) **não precisa** de fallback explícito — o navegador resolve `currentColor`→`LinkText` automaticamente em `forced-colors: active`. Isso é diferente de `.card`/`.category-icon`, que dependem de `background-color`/`box-shadow` (removidos nesse modo) e por isso exigem fallback explícito (`border: 1px solid CanvasText`). Não assumir que todo token visual novo precisa de regra `forced-colors` — verificar empiricamente caso a caso.
- Não reabrir sombra no `Card` em modo escuro (decisão deliberada, claro usa sombra sem borda / escuro usa superfície+borda sem sombra). Não recriar a colisão de nome `--accent` (hover sutil do shadcn vs. `{colors.accent}` de marca do produto). Manter `{rounded.DEFAULT}` único — não introduzir radius diferenciado por componente. Nenhuma dependência nova (sem Bootstrap, sem Radix/Tailwind adicional).
- `/lancamentos` continua a única exceção de 2 colunas do produto (motivo funcional, inalterado por este épico). Princípio "sem modal" do painel off-canvas mobile permanece.

## UX & Interaction Patterns

- Mapeamento de ícone por item de nav (decisão de implementação, ajustável): Início→`Home`, Lançamentos→`Receipt`, Cartões→`CreditCard`, Categorias→`Tag`, Parcelas→`CalendarClock`/`CalendarDays`. `size={18}`, `strokeWidth={2}`, `aria-hidden="true"` (o rótulo de texto já é o nome acessível do link).
- Achado real de implementação (Story 8.1): `sidebarMenuButtonVariants` do shadcn força `[&>svg]:size-4` (16px) via CSS em qualquer `<svg>` filho direto do `SidebarMenuButton` desktop, vencendo o atributo `size` do lucide-react (atributo de apresentação, sempre perde para CSS externo). Sem tratamento (`className="nav-icon size-[18px]!"`), desktop renderiza a 16px enquanto mobile renderiza a 18px — divergência proibida. Mesmo cuidado se aplica a qualquer ajuste visual futuro no ícone dentro do componente vendorizado `Sidebar`.
- Calibração de intensidade: o usuário quer perceber a diferença — aplicar os tokens (ícone em todo item, padding cheio, hover mais nítido) integralmente, não em fração. Isso não é licença para reabrir paradigma de layout ou dependências.
- Contraste já verificado e medido (não estimado) para o hover/ativo intensificado da sidebar: permanece bem acima do mínimo AA (≥4.5:1) nos dois modos após a intensificação.

## Cross-Story Dependencies

- Depende do Epic 7 (concluído): suíte de QA Playwright (`e2e/`) e componentes vendorizados `Card`/`Sidebar` do shadcn são pré-requisitos já em produção.
- Story 8.1 estabeleceu os tokens compartilhados (ícone de nav, padding de `Card`, hover/ativo de `sidebar-nav`) que as demais stories herdam via componente compartilhado — nenhuma reimplementação por tela.
- Story 8.2 fechou o último gap estrutural fora do padrão `Card` (`cartoes/page.tsx`) e confirmou que `/categorias`/`/parcelas` já herdam os tokens da 8.1 sem código novo.
- Story 8.3 é a última e a de maior risco: `/lancamentos` (maior densidade visual do produto — `category-icon`, `titular-badge`, `badge-repasse`, indicador de parcela, 2 `icon-button` por item, grid de 2 colunas) e o fluxo de autenticação (`/login`, `/esqueci-senha`, `/redefinir-senha` — menor tolerância a regressão). Precisa confirmar que os tokens propagados não quebram layout/legibilidade da lista rolante nem introduzem regressão funcional no acesso; um dos dois precisa usar `/lancamentos` com dado real antes de considerar o Epic 8 concluído.
