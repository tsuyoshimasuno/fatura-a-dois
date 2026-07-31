# Epic 8 Context: Redesign Profissional — Ícones de Navegação e Hierarquia Visual

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Depois do Epic 7 (migração completa para shadcn/ui), o usuário pediu que o produto "pareça produto profissional, não recibo minimalista", citando os Examples do Bootstrap e o Bootstrap Icons como inspiração de repertório visual — nunca como dependência literal. Este épico é trabalho puro de infraestrutura de apresentação: ícones reais no chrome de navegação compartilhado, hierarquia tipográfica mais forte, cards com mais respiro e hover de navegação mais nítido. Nenhum comportamento de usuário muda, nenhuma rota nova é criada, nenhuma FR é coberta — é polimento visual sistemático aplicado do chrome compartilhado para fora, por ordem de risco crescente, até cobrir todas as telas do produto.

## Stories

- Story 8.1: Chrome compartilhado — ícones de navegação e tokens base
- Story 8.2: Hierarquia tipográfica e telas simples
- Story 8.3: Telas complexas — Lançamentos e autenticação (última, maior risco)

## Requirements & Constraints

- Trabalho é infraestrutura de apresentação pura: sem FRs novas, sem rotas novas, sem mudança de comportamento — só visual.
- Ícones novos usam exclusivamente `lucide-react` (já instalado via CLI do shadcn, zero dependência nova), gramática `stroke="currentColor"`, monocromático — nunca o pacote `bootstrap-icons` (majoritariamente preenchido/sólido, incompatível) nem emoji.
- O usuário pediu explicitamente mudança visual **significativa e perceptível**, não um ajuste sutil: aplicar os tokens abaixo integralmente (ícone em todo item de nav sem exceção, salto tipográfico completo, passo inteiro de padding) — não é licença para reabrir escopo além do listado.
- Fora de escopo, mesmo com o pedido de "mudança perceptível": novo paradigma de layout (dashboard/marketing/hero dos Examples do Bootstrap), nova paleta de cor, dependência nova além de Tailwind+shadcn já adotados (rodada 13).
- Migração de chrome compartilhado (`nav.tsx`) é de passada única — nunca duas telas do grupo `(app)` com sidebar com/sem ícone coexistindo em produção simultaneamente.
- Cada fase fecha com o mesmo ritual do Epic 7: `npx tsc --noEmit` / `npm run lint` / `npm run build` limpos, suíte `test:e2e` (Story 7.1) verde, snapshot visual novo (claro+escuro) revisado manualmente antes de avançar para a fase seguinte — a mudança afeta toda tela do grupo `(app)` simultaneamente.
- Contraste WCAG AA deve ser verificado nos dois modos para o novo hover de navegação antes de aceitar.

## Technical Decisions

- **Padding de card**: `{components.card.padding}` sobe para `{spacing.4}` (1.75rem). `[CORRIGIDO 2026-07-30]` o token documentava antes `{spacing.2}`/`{spacing.3}`, mas isso descrevia a classe CSS artesanal `.card` (já morta desde o Épico 7, zero uso em produção). O `Card` vendorizado real (`components/ui/card.tsx`, `py-6`/`px-6` do Tailwind) já está em 1.5rem — maior que os dois valores antigos, que seriam uma redução. `{spacing.4}` é aumento real sobre o 1.5rem já implementado. Afeta `card`/`item-card`/`summary-card`/`card-highlight` uniformemente via o mesmo componente `Card`.
- **Hover/ativo de `sidebar-nav`**: `rgba(15,15,15,0.05)` → `rgba(15,15,15,0.08)` no claro; par escuro `rgba(255,255,255,0.06)` → `rgba(255,255,255,0.1)`.
- **`{typography.section-title.fontSize}`** (1.1rem, documentado desde a rodada 6, nunca aplicado) finalmente implementado — todo `<h2 className="section-title">` do produto passa a usar esse tamanho (~22% maior que o default atual sem `font-size` explícito). `font-weight`/`letter-spacing` já vêm da regra global `h1,h2,h3` — não duplicar em `.section-title`.
- **`nav-icon`** (novo componente): `size: 1.125rem` (18px, entre `category-icon` 22px e `icon-button` funcional 16px), `stroke: currentColor`, `strokeWidth: 2`, fonte `lucide-react`. Curadoria própria de 5-8 ícones, separada e sem enum/token compartilhado com `category-icon` (7 ícones fechados de categoria financeira) — mesmo ícone conceitual pode aparecer nos dois papéis sem virar o mesmo token.
- **Sequenciamento obrigatório** (mesmo padrão de risco do Epic 7): (1) chrome compartilhado — `nav.tsx` + tokens base de `button`/`card` (atômico, passada única); (2) telas simples já migradas para shadcn — `/categorias`, `/parcelas`, `/cartoes`; (3) telas complexas por último — `/lancamentos` (maior densidade visual) e fluxo de autenticação (`/login`, `/esqueci-senha`, `/redefinir-senha`, menor tolerância a regressão).
- **Armadilhas técnicas a evitar**: não reabrir sombra no `card` em modo escuro (decisão deliberada da rodada 10 — escuro mantém `{colors.surface-dark}` + borda, sem sombra); não recriar a colisão de nome `--accent` (hover sutil do shadcn vs. `{colors.accent}` de marca/ação do produto); manter `{rounded.DEFAULT}` único, não introduzir radius diferenciado por componente inspirado nos Examples do Bootstrap; cuidado com o bug de `font-weight` já corrigido na Story 7.8 (`@layer base` de `h1,h2,h3{font-weight:700}` perdendo para `@layer utilities` de `CardTitle`/`font-semibold`) — pode reabrir em qualquer `<h2 className="section-title">` ainda cru que só agora recebe `CardTitle`, verificar via `getComputedStyle`; `nav-icon` precisa de fallback `forced-colors` (Windows alto contraste), mesmo cuidado já aplicado a `.card`/`.category-icon` em `app/globals.css`.

## UX & Interaction Patterns

- Mapeamento exato de qual ícone Lucide representa cada item de nav (Início/Lançamentos/Cartões/Categorias/Parcelas) é decisão de implementação, não travada no spec — exigência é semântica clara + consistência de estilo (exemplos sugeridos: `Home`/`Receipt`/`CreditCard`/`Tag`/`Calendar` ou equivalentes).
- Comportamento existente da sidebar permanece inalterado: item ativo, badge de pendência, painel off-canvas mobile com foco/Escape/scrim, `aria-current`.
- O que explicitamente NÃO muda: paleta de cor (preto/roxo-claro), radius único, mecanismo dual claro/escuro de sombra, conjunto fechado de 7 ícones de `category-icon`, Information Architecture (nenhuma rota nova/removida/renomeada), princípio "sem modal" e "nunca dashboard multi-coluna" (`/lancamentos` continua a única exceção de 2 colunas, por motivo funcional já registrado, não afetada por este épico).

## Cross-Story Dependencies

- Story 8.1 (chrome compartilhado) precisa fechar primeiro e atomicamente — os tokens de padding/hover e o `nav-icon` que ela introduz são a base visual que 8.2 e 8.3 propagam; nenhuma delas pode começar com `nav.tsx` parcialmente migrado.
- Story 8.2 depende dos tokens de padding/hover da 8.1 já propagados; aplica adicionalmente `section-title.fontSize` às telas simples já migradas no Epic 7.
- Story 8.3 depende do padrão já validado visualmente nas Stories 8.1/8.2 antes de tocar as telas de maior risco (`/lancamentos`, densidade visual máxima; fluxo de autenticação, menor tolerância a regressão). Um dos dois usuários precisa exercitar `/lancamentos` com dado real antes de considerar o Epic 8 concluído.
