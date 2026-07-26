# Epic 7 Context: Infraestrutura de Design System — Migração para shadcn/ui

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

O produto migra de CSS artesanal (`app/globals.css`) para o shadcn/ui real — Tailwind CSS + Radix UI + componentes copiados via CLI (`components.json`) — preservando integralmente a paleta de cor (preto/roxo-claro, já verificada WCAG), o radius (10px unificado) e a sombra sutil sistemática já aprovados, além de todo comportamento de UX já especificado (sidebar off-canvas mobile sem modal, feedback inline de Server Action, disciplina de coluna única, `<select>` nativo). É trabalho de infraestrutura de apresentação: nenhuma capacidade nova, nenhum FR novo, nenhum comportamento de usuário deve mudar — só a implementação visual por baixo. A migração acontece porque hoje o produto não tem Tailwind/Radix/lib de componentes nem rede de teste automatizado real (zero `*.spec.ts` apesar do Playwright instalado), tornando a reescrita de componentes em produção um risco técnico real que a Story 7.1 existe para mitigar antes de qualquer mudança visual.

## Stories

- Story 7.1: Suíte de QA automatizada (Playwright) + baseline — pré-requisito bloqueante de toda story seguinte
- Story 7.2: Setup do Tailwind + shadcn/ui e camada de tokens
- Story 7.3: Shell de navegação — sidebar (corte atômico)
- Story 7.4: Migração de componentes — telas de autenticação de baixo tráfego
- Story 7.5: Migração de componentes — login
- Story 7.6: Migração de componentes — telas de conteúdo simples (Parcelas, Cartões)
- Story 7.7: Migração de componentes — Categorias
- Story 7.8: Migração de componentes — Início (Dashboard)
- Story 7.9: Migração de componentes — Upload
- Story 7.10: Migração de componentes — Lançamentos (última, maior risco)

## Requirements & Constraints

- Zero mudança de comportamento de usuário em qualquer story — só troca de implementação visual/estrutural. Onde a aparência muda de fato (sombra/sidebar), é reafirmação de decisão já aprovada em rodada anterior, não decisão nova desta épica.
- Nenhuma story de migração de tela (7.3–7.10) começa sem a suíte de QA (7.1) rodando e o baseline capturado; cada uma precisa que a suíte confirme zero regressão estrutural/de acessibilidade/visual antes de ser considerada concluída.
- QA suite cobre: ausência de erro de console/página; zero violação crítica/séria de acessibilidade (axe-core); contraste WCAG AA calculado via `getComputedStyle` nos pares texto/fundo já documentados, em claro e escuro; diff de screenshot contra baseline nas 4 telas amostradas (`/lancamentos`, `/categorias`, `/`, `/login`), sinalizando mudança visual para revisão humana em vez de bloquear automaticamente.
- Ordem de migração fixa, risco crescente: 7.1 → 7.2 (zero mudança visual, paridade de pixel) → 7.3 (corte atômico) → 7.4 → 7.5 → 7.6 → 7.7 → 7.8 → 7.9 (+ verificação manual com upload real) → 7.10 (+ verificação manual com dado real, claro e escuro).
- Dark mode deve usar a variante de media query (`prefers-color-scheme`), nunca a variante `.dark` por classe manual do boilerplate padrão — o produto não tem toggle manual; a convenção errada faria todo `dark:` das stories seguintes nunca disparar em produção, silenciosamente.
- Atomicidade: chrome compartilhado (sidebar, tokens globais) migra numa passada única — nunca duas telas com sidebar/tokens diferentes coexistindo. Conteúdo por tela pode migrar gradualmente, desde que os tokens já estejam unificados.

## Technical Decisions

- Dependências novas (Story 7.2): `tailwindcss`, `class-variance-authority`, `clsx`+`tailwind-merge`, `lucide-react`, `@radix-ui/react-slot` (+ `@radix-ui/react-*` por primitiva efetivamente adotada).
- `{colors.accent}` (preto claro / roxo-claro escuro) vira `--primary` do shadcn, mesmo papel. `--accent` do shadcn (hover sutil, papel diferente) recebe token próprio novo, nunca reaproveita nome/valor de `{colors.accent}`.
- `--card`/`--card-foreground` ficam definidos mas o `Card` real do produto não os consome: mecanismo dual (claro: fundo+sombra sem borda; escuro: superfície+borda sem sombra) fica numa classe composta própria, não CSS variable — shadcn assume `--card` único e estável nos 2 modos, o que contradiria esse mecanismo.
- Radius unificado em `var(--radius)` = 10px (correção pré-existente já aplicada: `input`/`select`/`textarea`/`button` tinham 8px hardcoded). Escala derivada típica do shadcn (`--radius-sm/md/lg`) não adotada — falta amostragem real do Figma do usuário (rate-limit persistente da API).
- `<select>` permanece nativo, só estilizado por fora — Radix `Select` não adotado, perderia o picker nativo do SO em mobile.
- `Sidebar` do shadcn adotado só para a estrutura desktop; o painel off-canvas mobile é a implementação customizada já existente, não o `Sheet`/`Dialog` do bloco oficial (modal de verdade, `role="dialog"` + focus-trap completo, contradiz o contrato "sem modal" já documentado).
- `AlertDialog` deferido — nenhuma ação destrutiva órfã hoje (remover-categoria e desfazer-rejeição-de-cartão já têm tratamento próprio). `Toast` não adotado — feedback inline já existente (`alert-error`/`hint`, `aria-live`) é mais preciso.
- Substituição por componente: `Button`/`Separator`/`Tabs` diretos; `Badge` precisa variante custom via `cva` para `titular-badge`; `Input` só estilo; `Card` exige adaptação real (mecanismo dual); `Tooltip` direto, baixa prioridade, cuidado com toque em mobile.
- Cor/radius/sombra exatos do Figma do usuário seguem não amostrados (rate-limit persistente); valores já aprovados em rodadas anteriores mantidos por decisão explícita do usuário — revisitável se houver export manual futuro.

## UX & Interaction Patterns

- Sidebar desktop (`≥768px`): fixa à esquerda, largura própria, brand mark no topo, item ativo com indicador `{colors.accent}` + `aria-current="page"`. Mobile (`<768px`): recolhe para barra superior fina (brand mark + hambúrguer); tocar abre um painel off-canvas deslizando da esquerda sobre um scrim.
- O painel off-canvas mobile é deliberadamente **não tratado como modal**: `<nav aria-label="Navegação principal">`, hambúrguer com `aria-expanded`/`aria-controls`, sem `role="dialog"` e sem focus-trap completo (Tab não fica preso dentro). Ao abrir, foco move para o primeiro link do painel. Fecha em: seleção de link, tecla Escape, ou clique/toque fora (no scrim).
- Conteúdo de cada tela continua coluna única na largura já definida (a sidebar é só chrome de navegação); a única exceção de múltiplas colunas do produto continua sendo `/lancamentos`, inalterada por esta épica.
- Piso de acessibilidade a preservar em qualquer tela migrada: `role="alert"`+`aria-live` em formulários client-side, `<label>` associado a todo input, anel de foco visível de 2px em `{colors.accent}`, WCAG 2.2 AA como mínimo de contraste em claro e escuro.

## Cross-Story Dependencies

- Story 7.1 é bloqueante: nenhuma story seguinte (7.2–7.10) começa sem o baseline capturado e a suíte de QA funcional.
- Story 7.2 (tokens) precisa estar concluída antes de 7.3, já que qualquer componente shadcn depende da camada de tema configurada.
- Story 7.3 (sidebar) é um corte atômico sobre todo o grupo de rotas `(app)` — não é fatiada por tela; nenhuma tela fica com nav antiga enquanto outra já tem a nova.
- Stories 7.4 a 7.10 seguem ordem fixa de risco crescente e dependem da fundação de tokens (7.2) e sidebar (7.3) já estarem em produção.
- Stories 7.9 e 7.10 exigem verificação funcional manual adicional (envio de arquivo real; uso com dado real em claro e escuro) além da suíte de QA automatizada antes de serem consideradas concluídas.
