---
name: Fatura a Dois
description: Sistema visual utilitário e discreto para um casal conferir a fatura do cartão em poucos minutos — clareza numérica acima de qualquer ornamento.
sources:
  - "{planning_artifacts}/prds/prd-fatura-a-dois-2026-07-14/prd.md"
  - "{planning_artifacts}/architecture/architecture-fatura-a-dois-2026-07-16/ARCHITECTURE-SPINE.md"
status: final
updated: 2026-07-22
colors:
  background: '#ffffff'
  background-dark: '#0b0d12'
  foreground: '#1a1f2b'
  foreground-dark: '#edf0f5'
  muted-foreground: '#5b6472'
  muted-foreground-dark: '#9aa3b2'
  surface: '#f6f7f9'
  surface-dark: '#12151c'
  border: '#e2e5ea'
  border-dark: '#262b36'
  accent: '#2554c7'
  accent-dark: '#6f9bff'
  accent-hover: '#1d4399'
  accent-hover-dark: '#8db0ff'
  accent-foreground: '#ffffff'
  accent-foreground-dark: '#0b0d12'
  danger: '#c0362c'
  danger-dark: '#ff8377'
  pending: '#b8860b'
  pending-dark: '#e0b64d'
typography:
  font-family-base: 'var(--font-geist-sans), Arial, Helvetica, sans-serif'
  page-title:
    fontFamily: '{typography.font-family-base}'
    fontSize: 1.5rem
    fontWeight: '700'
    letterSpacing: -0.01em
  page-subtitle:
    fontFamily: '{typography.font-family-base}'
    fontSize: 0.9rem
    fontWeight: '400'
  section-title:
    fontFamily: '{typography.font-family-base}'
    fontSize: 1.1rem # NAO IMPLEMENTADO em CSS -- .section-title (app/globals.css) so define margin-bottom; aplicar este fontSize mudaria o <h2> renderizado hoje em ~22% (ver DESIGN.md Do's and Don'ts [IMPLEMENTADO 2026-07-22] e spec-snowui-design-system-tokens.md). Nao copiar este valor sem decisao explicita.
    fontWeight: '700' # ja vem da regra global h1,h2,h3 -- nao duplicado em .section-title
    letterSpacing: -0.01em # idem
  body:
    fontFamily: '{typography.font-family-base}'
    fontSize: 15px
    lineHeight: '1.5'
  label:
    fontFamily: '{typography.font-family-base}'
    fontSize: 0.875rem
    fontWeight: '500'
  hint:
    fontFamily: '{typography.font-family-base}'
    fontSize: 0.875rem
    fontWeight: '400'
rounded:
  sm: 8px
  DEFAULT: 10px
  lg: 10px
  full: 9999px
spacing:
  '1': 0.375rem
  '2': 0.75rem
  '3': 1.25rem
  '4': 1.75rem
  '5': 2.5rem
  page-padding-mobile: 1.5rem
  page-max-width: 720px
  page-max-width-narrow: 400px
  page-max-width-wide: 1150px # proposto 2026-07-19 (rodada 4) — exceção só para /lancamentos, ver Layout & Spacing
components:
  button-primary:
    background: '{colors.accent}'
    color: '{colors.accent-foreground}'
    radius: '{rounded.sm}'
    hoverBackground: '{colors.accent-hover}'
  button-secondary:
    background: transparent
    color: '{colors.foreground}'
    border: '1px solid {colors.border}'
    radius: '{rounded.sm}'
  card:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    radius: '{rounded.DEFAULT}'
    padding: '{spacing.2}'
  input:
    background: '{colors.background}'
    border: '1px solid {colors.border}'
    radius: '{rounded.sm}'
    focusRing: '2px solid {colors.accent}'
  alert-error:
    color: '{colors.danger}'
  badge-pending:
    # proposto — nao existe hoje, ver Do's and Don'ts
    background: '{colors.pending}'
    color: '{colors.accent-foreground}'
    radius: '{rounded.full}'
  badge-repasse:
    # proposto 2026-07-21 (rodada 5) — sinaliza lancamento repassado para a
    # outra pessoa, ver EXPERIENCE.md -> "Repasse de Lancamento para a Outra
    # Pessoa". Fundo transparente (nao solido, ao contrario de badge-pending)
    # porque e um indicador ao lado do titular-badge, nao um contador isolado.
    background: transparent
    color: '{colors.accent}'
    border: '1px solid {colors.accent}'
    radius: '{rounded.full}'
  empty-state:
    color: '{colors.muted-foreground}'
    border: '1px dashed {colors.border}'
    radius: '{rounded.DEFAULT}'
---

## Brand & Style

Fatura a Dois não tem "marca" no sentido comercial — é uma ferramenta doméstica para duas pessoas conferirem juntas para onde vai o dinheiro do cartão. O tom visual certo é **utilitário-confiável**: nada que compita com os números pela atenção, nada que pareça um produto tentando vender algo. A régua é "recibo bem organizado", não "app fintech com gráficos". Esse posicionamento já existe hoje no código (`app/globals.css`) e este documento o formaliza — não é uma proposta de reskin.

Esta seção descreve o sistema **como ele já é** implementado, destilado diretamente de `app/globals.css`. Onde este documento propõe um ajuste (não uma descrição do que já existe), a proposta está marcada explicitamente.

`[DECISÃO 2026-07-22, rodada 6]` **Adoção do SnowUI Design System — seletiva, não total.** O usuário pediu para avaliar a adoção do "SnowUI Design System" (kit genérico de UI da comunidade do Figma, `beubf9x3kZWqhsHLaGmKer`) como base visual do produto. Decisão: **adotar seletivamente tokens visuais e componentes atômicos do kit, rejeitar seu paradigma de layout de dashboard multi-widget.** Razão: o kit inclui páginas de exemplo (Dashboard, Settings, ChatGPT/AI Chat, Authentication) que são SaaS genérico — sem equivalente real nas telas do produto, exceto uma sobreposição parcial e solta com `/login`+`/esqueci-senha`+`/redefinir-senha` (Authentication) e com `/` (Dashboard, só na ideia de "resumo em cards", não na grade multi-widget). As telas financeiras reais do produto (`/lancamentos`, `/cartoes`, `/categorias`, `/parcelas`) não têm contraparte no kit e exigiriam composição original de qualquer forma. Forçar essas telas reais a se parecerem com um dashboard de SaaS genérico desfaria cinco rodadas de decisão de UX deliberada e já registrada nesta run (postura "recibo organizado", coluna única, cor de destaque escassa, zero sombra decorativa) só para bater com um kit sem relação com o domínio do produto (finanças domésticas de um casal). Os **átomos** do kit (Text, Icon, IconText, Button+estados, Tag, Badge, Chip, Line, Separator, Navigation, ButtonGroup) e os **tokens de fundação** (cor, tipografia, espaçamento, raio) são, por outro lado, matéria-prima genuinamente reaproveitável — não carregam a decisão de layout junto, servem qualquer arranjo de coluna única. Ver detalhamento tela-a-tela e mapeamento de átomos em `EXPERIENCE.md` → "Adoção do SnowUI Design System".

`[NOTA]` O token de acesso à API do Figma disponível nesta rodada não tem escopo para ler valores de Figma Variables em massa (só estrutura/nomes de página e componente). Por isso esta rodada **não substitui nenhum valor numérico** (hex, rem, px) do frontmatter abaixo — faria isso por suposição, o que a regra deste workflow proíbe ("nunca inventar"). Os valores atuais continuam sendo a fonte da verdade em produção até uma amostragem componente-a-componente (manual, na própria UI do Figma, ou com um token de acesso com escopo de variables) confirmar quais valores do SnowUI substituem quais tokens hoje existentes — trabalho de implementação, não desta etapa de design.

## Colors

- **`{colors.background}` / `{colors.foreground}`** — fundo e texto base. Alto contraste, sem tom de cor — o conteúdo (valores em reais, nomes de categoria) é o que deve chamar atenção, não o chrome da interface.
- **`{colors.surface}`** — fundo levemente destacado para `card`s (lançamentos, cartões pendentes, blocos de resumo). Diferença sutil o suficiente para não competir com o conteúdo do card.
- **`{colors.muted-foreground}`** — texto secundário: subtítulos de página, rótulos de campo, hints. Nunca usado para números de valor — valores em reais são sempre `{colors.foreground}` ou dentro de um card.
- **`{colors.border}`** — divisores e contornos de input/card. Nunca usado como cor de destaque.
- **`{colors.accent}`** — a única cor "de marca" do sistema: usado em links, botão primário, item de navegação ativo, foco de input. Uso deliberadamente escasso — se tudo é azul, nada é.
- **`{colors.danger}`** — reservado para mensagens de erro (`role="alert"`) e, futuramente, para confirmação de ações destrutivas (ver Do's and Don'ts). Nunca usado decorativamente.
- **`{colors.pending}`** *(proposto)* — hoje o sistema não tem uma cor semântica de "atenção/pendência" distinta de erro; estados como "cartão pendente de mapeamento" ou "lançamento pendente de revisão" usam texto neutro (`hint`) idêntico a qualquer outra informação secundária, o que faz pendências reais se misturarem visualmente com texto informativo comum. Proposto um terceiro tom (âmbar) exclusivamente para *coisas que esperam uma ação do casal* — nunca para erro, nunca para sucesso.
- **`{colors.accent}` em `badge-repasse`** *(proposto 2026-07-21, rodada 5)* — primeiro uso de `{colors.accent}` fora de link/botão primário/nav ativo/foco. Justificado porque um lançamento repassado é uma decisão deliberada do casal (não identidade neutra como `titular-badge`, não espera de ação como `{colors.pending}`, não erro/destrutivo como `{colors.danger}`) — nenhuma cor existente comunica "isto foi redirecionado por escolha". Ver `EXPERIENCE.md` → "Repasse de Lançamento para a Outra Pessoa".
- **Dark mode** já existe e é completo: cada token acima tem seu par `-dark`, ativado via `prefers-color-scheme: dark` (sem toggle manual). Qualquer novo token (como `pending`) precisa do par dark antes de ir para produção.

`[DECISÃO 2026-07-22, rodada 6]` Ao amostrar valores de cor do SnowUI (fora do escopo desta rodada, ver Brand & Style), qualquer substituição precisa passar por três filtros antes de entrar em produção: (1) **par dark obrigatório** — o kit não foi investigado a fundo quanto a modo escuro; se não tiver um par equivalente documentado, a implementação deriva um manualmente, nunca lança um token novo sem par `-dark`; (2) **paleta enxuta preservada** — o SnowUI, como kit genérico de SaaS, provavelmente define ramas de cor mais amplas (ex: 5-10 tons de cinza, azul, etc. nas Foundations); adotar no máximo um tom por papel semântico já existente aqui (background/foreground/surface/border/muted-foreground/accent/accent-hover/danger/pending), nunca importar a rampa inteira; (3) **escassez do accent preservada** — `{colors.accent}` continua reservado a link/botão-primário/nav-ativo/foco/`badge-repasse`; um kit de dashboard tende a usar a cor de marca com mais liberdade (gráficos, ícones decorativos, cards de destaque) — isso não se aplica aqui.

## Typography

Uma única família (`Geist Sans`, com fallback de sistema) e uma escala pequena e deliberada — não há necessidade de mais que isto para telas de formulário e lista. `page-title` (1.5rem/700) abre toda tela; `page-subtitle` (0.9rem, `{colors.muted-foreground}`) explica o que a tela faz em uma frase, sempre presente. `section-title` (1.1rem/700) é usado dentro da tela para blocos (ex: nome de cada pessoa em Gastos, cada mês em Parcelas) — hoje implementado ad-hoc com `style={{ marginBottom }}` inline em vez de classe compartilhada (ver Do's and Don'ts).

`[DECISÃO 2026-07-22, rodada 6]` **Família tipográfica: decisão em aberto, não travada nesta rodada.** A página "Design system" do SnowUI define Text Styles próprios (fonte + escala), ainda não amostrados (ver Brand & Style). Recomendação de Sally para quando a amostragem acontecer: se a fonte do SnowUI for uma web font de uso livre e fácil de auto-hospedar via `next/font` (ex.: familia estilo Inter/Geist, comum em kits desse tipo), pode substituir `Geist Sans` 1:1 sem violar o Do's and Don'ts atual (que proíbe uma *segunda* família simultânea, não a substituição da única existente); se for uma fonte proprietária/paga ou exigir carregamento externo, manter `Geist Sans` e adotar só a **escala** (tamanhos/pesos/line-heights) do SnowUI aplicada à família atual. De qualquer forma, a escala final precisa continuar pequena e deliberada (hoje 6 estilos nomeados) — não crescer só porque o kit de origem tem mais.

## Layout & Spacing

Layout de coluna única, `{spacing.page-max-width}` (720px) centralizado — deliberadamente estreito porque o conteúdo é sempre uma lista vertical de lançamentos/cartões/categorias, nunca um dashboard multi-coluna. Telas de autenticação e formulários curtos (login, upload, esqueci/redefinir senha, remover categoria) usam `{spacing.page-max-width-narrow}` (400px), reforçando visualmente "isto é uma ação pontual", não uma tela de navegação.

`[PROPOSTO]` **exceção deliberada (2026-07-19, rodada 4):** `/lancamentos` passa a usar duas colunas em `≥768px` — lista rolante à esquerda + painel de filtro/total estático à direita (ver `EXPERIENCE.md` → "Lista Rolante + Total Central Estático") — a pedido explícito do usuário, que quer o total sempre visível sem rolar a lista longa (100+ itens/competência). Isto substitui `{spacing.page-max-width}` (720px) por uma largura maior nesta tela específica (`{spacing.page-max-width-wide}` `[PROPOSTO]`, sugerido 1100–1200px — suficiente para duas colunas sem ficar excessivamente largo) — as demais telas continuam em 720px coluna única, esta é a única exceção do produto. Conflito com a decisão anterior ("nunca um dashboard multi-coluna") é reconhecido e resolvido a favor do novo pedido do usuário, por ser mais específico (uma tela, um motivo funcional concreto) que o princípio geral que o precedeu.

Padding lateral de página é `{spacing.page-padding-mobile}` em qualquer largura — não há breakpoint de padding hoje, e não precisa: como o conteúdo já é estreito, a mesma margem funciona de 360px a desktop. **Onde o layout atual não escala bem é a navegação** (ver EXPERIENCE.md → Responsive & Platform), não o conteúdo de página.

`[DECISÃO 2026-07-22, rodada 6]` **A adoção do SnowUI não reabre nem amplia a exceção de coluna única.** O kit inclui uma tela de exemplo "Dashboard" multi-widget (grade de cards/gráficos), o oposto da filosofia "nunca um dashboard multi-coluna" já registrada duas vezes nesta run (aqui e na exceção escopada de `/lancamentos`, rodada 4). Avaliado e decidido: a tela `/` (Início) e qualquer tela nova continuam em coluna única `{spacing.page-max-width}` (720px) — a inspiração do SnowUI para essas telas se limita a como os *átomos* (cards de resumo, badges, botões) são desenhados internamente, nunca à ideia de organizá-los numa grade de widgets lado a lado. A única exceção de múltiplas colunas do produto continua sendo `/lancamentos` (`{spacing.page-max-width-wide}`), pelo motivo funcional já registrado (lista longa + total que precisa ficar sempre visível) — não por influência do SnowUI, e não é ampliada para nenhuma outra tela por causa dele. Ver `EXPERIENCE.md` → "Adoção do SnowUI Design System" para o racional completo.

## Elevation & Depth

Nenhuma sombra no sistema atual — profundidade é comunicada só por `{colors.surface}` vs `{colors.background}` e `1px solid {colors.border}`. Isso é consistente com a postura "recibo organizado, não app vitrine" e deve ser mantido: não introduzir `box-shadow` decorativo.

`[DECISÃO 2026-07-22, rodada 6]` A página "Design system" do SnowUI inclui Effect Styles (sombras) — **explicitamente excluídos da adoção seletiva**. Um kit de dashboard genérico tende a usar sombra para separar cards/widgets numa grade densa; este produto já resolve profundidade com cor+borda e são só 3-6 itens por lista, não uma grade de widgets. Não importar essa camada do kit.

## Shapes

Cantos levemente arredondados (`{rounded.DEFAULT}` = 10px em cards, 8px em inputs/botões) — suave o bastante para não parecer um formulário de governo, comedido o bastante para não parecer um app de consumo. Radius consistente em todo componente hoje; manter essa uniformidade em qualquer componente novo.

`[DECISÃO 2026-07-22, rodada 6]` A página "Spacing/Size/Corner Radius" do SnowUI (Figma Variables) é candidata natural a fonte de uma escala de `spacing`/`rounded` mais refinada que a atual (hoje pequena e um tanto ad-hoc: `rounded.sm`/`DEFAULT`/`lg` com `DEFAULT`==`lg`==10px, sem diferenciação real entre os dois). Amostragem (fora do escopo desta rodada) deve preservar a **uniformidade de radius entre componentes do mesmo papel** (todo card com o mesmo radius, todo input/botão com o mesmo radius) — não adotar uma escala do SnowUI que introduza radius diferente por componente sem uma razão semântica nova.

## Components

- **Botão primário** (`button-primary`) — `{colors.accent}` sólido, usado para a ação principal de cada formulário (Entrar, Enviar, Salvar, Confirmar, Criar, Corrigir, Atribuir a X). Estado `disabled` com opacidade reduzida — já implementado nos formulários client-side (login, upload, senha), **ausente** nos formulários via Server Action direta (cartões, categorias, lançamentos) porque estes não têm estado de `loading` local. Ver EXPERIENCE.md → State Patterns.
- **Botão secundário** (`button-secondary`) — transparente com borda, usado para ações de saída/cancelamento ("Cancelar", "Não é do casal"). Hoje o mesmo estilo visual serve tanto para "cancelar sem consequência" quanto para uma ação destrutiva ("Não é do casal") — proposto: ações destrutivas sem tela de confirmação dedicada usam `{colors.danger}` como cor de texto/borda em vez do secundário neutro, para se diferenciarem visualmente de um simples cancelar. Ver EXPERIENCE.md → Component Patterns.
- **Card** (`card`) — contêiner de item de lista (lançamento, cartão pendente, categoria) e de bloco de resumo (pessoa em Gastos, mês em Parcelas). Um único componente visual serve papéis diferentes hoje (item individual vs. seção agregada) sem diferenciação — funciona, mas os dois usos merecem nomes distintos em EXPERIENCE.md (`item-card` vs `summary-card`) para as regras comportamentais não se confundirem.
- **Input/select** (`input`) — borda `{colors.border}`, foco com anel `{colors.accent}` 2px. Consistente em toda tela.
- **Badge de pendência** (`badge-pending`) *(proposto, não existe hoje)* — pequeno indicador numérico (contagem) usando `{colors.pending}`, para sinalizar em texto de navegação/menu que há itens esperando ação (cartões não mapeados, lançamentos pendentes de revisão) sem o casal precisar abrir a tela para descobrir. Ver EXPERIENCE.md → Key Flows.
- **Badge de repasse** (`badge-repasse`) *(proposto 2026-07-21, rodada 5, não existe hoje)* — indicador ao lado do `titular-badge` num lançamento repassado para a outra pessoa: fundo transparente, texto/borda `{colors.accent}`, mesma forma (`{rounded.full}`, borda 1px) do `titular-badge`, mas com cor para deixar claro que é uma decisão deliberada, não identidade neutra. Nunca sólido como `badge-pending` — não é um contador, é um qualificador ao lado de um nome que já está lá. Ver EXPERIENCE.md → "Repasse de Lançamento para a Outra Pessoa".
- **Empty state** (`empty-state`) — borda tracejada, texto centralizado, `{colors.muted-foreground}`. Já presente e consistente em toda tela de lista (cartões, categorias, lançamentos, parcelas, gastos). Manter esse padrão para qualquer lista nova.
- **Alert de erro** (`alert-error`) — `role="alert"`, cor `{colors.danger}`. Presente em login, upload, esqueci-senha, redefinir-senha. **Ausente** nos Server Actions de cartões/categorias/lançamentos (falham hoje só com `console.error`, invisível ao casal) — o componente já existe e está especificado; falta apenas ser usado nessas telas. Ver EXPERIENCE.md → State Patterns.

### Mapeamento de átomos do SnowUI `[DECISÃO 2026-07-22, rodada 6]`

Correspondência entre os átomos do kit (página "Base", node `8300:425`) e os componentes já especificados acima — nenhum componente novo nasce desta rodada, é reaproveitamento visual do que já existe:

| Átomo SnowUI | Componente equivalente aqui | Nota |
|---|---|---|
| `Button` (+ Active/Disabled) | `button-primary`, `button-secondary`, botão destrutivo | Estados Active/Disabled do kit mapeiam 1:1 para os estados hover/disabled já especificados; nenhuma mudança comportamental. |
| `Tag` / `Badge` / `Chip` | `badge-pending`, `badge-repasse`, `titular-badge` | Três variações semânticas já existentes no produto provavelmente correspondem a três variantes visuais distintas do kit (sólido/contorno/neutro) — a amostragem deve preservar qual variante vai para qual papel semântico (pendência=sólido, repasse=contorno accent, identidade=neutro), não escolher por preferência estética. |
| `IconText` / `Icon` | `icon-button` (lápis de Corrigir categoria, ícone de repasse) | O kit já modela "ícone + rótulo" como átomo formal — bom encaixe para os `aria-label`/`title` que `icon-button` já exige aqui. |
| `Line` / `Separator` | Divisores entre itens de `card-list`, entre seções de `.page` | Hoje implícito via `gap` de flexbox; o kit formaliza como átomo — avaliar na implementação se compensa introduzir um elemento visual explícito ou manter espaçamento puro (mais simples, já funciona). |
| `Navigation` | `.app-nav` | Nav já colapsa em mobile (`[IMPLEMENTADO 2026-07-18]`); qualquer refinamento visual do átomo do kit não muda esse comportamento, só a pele. |
| `ButtonGroup` | Toggle Individual/Combinada (Lançamentos) | Único lugar do produto com um par de botões agindo como alternador — encaixe direto. |
| `Frame`/`Group` (variantes de composição) | `card` / `item-card` / `summary-card` | Estruturais, não visuais — cada composição de frame do kit é só um jeito de agrupar os átomos acima; não introduz um componente novo. |
| `Image` | — | Produto não usa imagem de conteúdo hoje (sem avatar, sem ilustração); átomo sem uso previsto. |

Explicitamente **fora do mapeamento**: as telas de exemplo do kit (Dashboard, Settings, ChatGPT/AI Chat) não são componentes atômicos e não são adotadas como template — ver Brand & Style e Layout & Spacing.

## Do's and Don'ts

- **Do** manter a paleta enxuta (fundo/texto/superfície/borda/accent/erro) — qualquer cor nova precisa justificar por que não é redundante com uma existente (caso do `pending` proposto: nenhuma cor atual comunica "espera uma ação sua").
- **Do** manter zero sombra decorativa e radius uniforme — é o que faz o sistema parecer "confiável" em vez de "app de consumo".
- **Don't** introduzir uma segunda família tipográfica ou pesos além de 400/500/600/700 — a hierarquia atual (tamanho + peso) já é suficiente para telas de lista/formulário.
- **Don't** usar `{colors.danger}` fora de erro/destrutivo genuíno — não usar para "atenção" (esse é o papel do `{colors.pending}` proposto) nem para ênfase decorativa.
- **Don't** deixar estilo inline (`style={{ marginBottom: '0.75rem' }}`, visto hoje em `gastos`, `cartoes`, `parcelas`, `categorias/[id]/remover`) substituir uma classe utilitária compartilhada — cada ocorrência hoje repete o mesmo valor (`0.75rem`) sem um token nomeado; promover para uma classe (`.section-title` ou `.card-gap`) evita divergência silenciosa quando um valor mudar em uma tela e não nas outras.
- `[IMPLEMENTADO 2026-07-22]` A classe `.section-title` foi implementada em `app/globals.css` (`margin-bottom: 0.75rem;` **apenas**) e as 10 ocorrências de `<h2 style={{ marginBottom: '0.75rem' }}>` (em `page.tsx`, `cartoes/page.tsx`, `parcelas/page.tsx`, `lancamentos-view.tsx`) foram trocadas por `<h2 className="section-title">` — resolve o Don't acima. O `font-size` de 1.1rem do token `section-title` documentado nesta página **continua não implementado**: adicioná-lo mudaria o tamanho hoje renderizado do `<h2>` (que não tem `font-size` explícito, cai no default do navegador) em ~22%, o que é uma mudança visual real e deliberada que merece sua própria decisão explícita, não um side effect desta limpeza — por isso foi deferido por decisão própria, não por limitação técnica. `font-weight`/`letter-spacing` continuam vindo da regra pré-existente `h1, h2, h3` (globals.css), não duplicados em `.section-title`. `line-height` explícito também foi adicionado a `.page-title` (1.2, regra ≥24px do SnowUI), que não tinha essa propriedade. `.page-subtitle` **não** foi tocado — confirmado que adicionar `line-height: 1.5` lá seria um no-op, pois já herda `1.5` de `body`. **Limitação confirmada nesta rodada:** cor e corner-radius do kit SnowUI não puderam ser amostrados — o token de API disponível não tem escopo `file_variables:read` (403 em `/variables/local` e nas fills de swatches individuais, que resolvem como `VARIABLE_ALIAS`, não valor literal). Não re-tentar essa amostragem sem um token com esse escopo; os únicos dados literais confiáveis extraídos do kit nesta sessão foram a escala tipográfica (Inter, 12/14/16/18/24/32/48/64px, pesos 400/600, regra de line-height ≈1.5× para ≤18px e ≈1.2× para ≥24px) e a escala de espaçamento (0/4/8/12/16/20/24/28/32/40/48/80px).
- **Do** `[2026-07-22]` tratar o SnowUI Design System como fonte de **tokens visuais e átomos**, nunca como template de tela — qualquer novo componente inspirado no kit precisa primeiro achar seu papel semântico na tabela de mapeamento acima antes de ganhar estilo próprio.
- **Don't** `[2026-07-22]` deixar as telas de exemplo do SnowUI (Dashboard multi-widget, Settings, AI Chat) ditar reorganização de nenhuma tela real do produto — a única exceção de múltiplas colunas continua sendo `/lancamentos`, por motivo funcional já registrado, não por influência do kit.
