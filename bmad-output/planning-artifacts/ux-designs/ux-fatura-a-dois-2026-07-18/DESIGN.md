---
name: Fatura a Dois
description: Sistema visual utilitário e discreto para um casal conferir a fatura do cartão em poucos minutos — clareza numérica acima de qualquer ornamento.
sources:
  - "{planning_artifacts}/prds/prd-fatura-a-dois-2026-07-14/prd.md"
  - "{planning_artifacts}/architecture/architecture-fatura-a-dois-2026-07-16/ARCHITECTURE-SPINE.md"
status: final
updated: 2026-07-22
colors:
  background: '#ffffff' # sourced -- SnowUI-Light Background.1, identico ao valor atual
  background-dark: '#333333' # sourced -- SnowUI-Dark Background.1 (era #0b0d12 -- mudanca real, modo escuro fica bem mais claro)
  foreground: '#1a1f2b' # inalterado -- fora do escopo da troca de paleta aprovada (so accent/background/surface/danger/pending)
  foreground-dark: '#edf0f5' # inalterado
  muted-foreground: '#5b6472' # inalterado
  muted-foreground-dark: '#c6cbd4' # [VERIFICACAO DE CONTRASTE, rodada 9 -- bad_spec repair pass 3, matriz completa] RE-verificado contra o surface-dark FINAL desta rodada ('#464646', mais escuro que o '#565656' do pass anterior): 5.80:1 contra surface-dark, 7.76:1 contra background-dark -- ambos folgados, valor mantido sem mudanca (o novo surface mais escuro so aumenta a folga).
  surface: '#f9f9fa' # sourced -- SnowUI-Light Background.2 (era #f6f7f9, diferenca minima)
  surface-dark: '#464646' # [VERIFICACAO DE CONTRASTE, rodada 9 -- bad_spec repair pass 3, matriz completa] RESOLVIDO COMO SISTEMA -- o valor anterior ('#565656', pass 2) deixava accent-dark ('#adadfb', SOURCED/FIXO) em ~3.54:1 contra surface (falha de texto para .link/.badge-repasse) e danger-dark em ~2.62:1 (falha dupla). '#464646' e o cinza mais CLARO (varredura completa de 0-255) que ainda mantem accent-dark em >=4.5:1 (4.56:1 exato -- um passo mais claro, '#474747', ja cai para 4.49:1, abaixo do minimo). TRADE-OFF ACEITO E DOCUMENTADO: isso deixa surface-dark a so 1.34:1 de background-dark (menos "nitidamente distinguivel" que os 1.72:1 do pass anterior), mas ainda MELHOR que o baseline pre-SnowUI (surface '#12151c' vs background '#0b0d12' = 1.06:1, commit 7c464ef) -- nao regride, so nao atinge o ideal de ~3:1 porque accent-dark fixo consome parte da folga de luminancia disponivel.
  border: '#e2e5ea' # inalterado -- sem papel "Border" explicito no export do SnowUI, fora do escopo aprovado
  border-dark: '#929292' # [VERIFICACAO DE CONTRASTE, rodada 9 -- bad_spec repair pass 3, matriz completa] AJUSTADO -- era '#7c7f85' (rodada 7b), validado so contra background-dark (3.15:1, ok) mas NUNCA contra surface-dark, onde .card/.titular-badge/.icon-button de fato desenham a borda do outro lado. Contra o surface-dark antigo ('#565656') ja falhava (1.83:1); contra o novo ('#464646') melhora mas ainda falha (2.35:1) -- abaixo do minimo 3:1 de elemento grafico. Clareado ate 3.03:1 contra surface-dark (e 4.06:1 contra background-dark, folgado).
  accent: '#000000' # sourced -- SnowUI-Light Primary = Black.100% (era #2554c7 -- troca de identidade real, azul -> preto, decisao explicita do usuario apos ver Artifact comparativo)
  accent-dark: '#adadfb' # sourced -- SnowUI-Dark Primary = Secondary.Indigo (era #6f9bff -- azul -> roxo-claro)
  accent-hover: '#262626' # ESTIMADO -- sem papel de hover no export; leve clareamento do preto para dar feedback tatil
  accent-hover-dark: '#c2c2fd' # ESTIMADO -- leve clareamento do roxo-claro
  accent-foreground: '#ffffff' # sourced -- SnowUI-Light White.100% (papel de texto-sobre-accent do kit), inalterado
  accent-foreground-dark: '#000000' # sourced -- SnowUI-Dark White.100% = #000000 (o kit inverte Black/White por modo; mesmo papel de texto-sobre-accent, nao e um valor inventado)
  danger: '#e00000' # [VERIFICACAO DE CONTRASTE, rodada 9 -- bad_spec repair pass 3, matriz completa] AJUSTADO -- era '#ed0d00' (pass 2), validado so contra '#ffffff' (4.51:1, ok) mas .alert-error/.btn-danger-outline tambem renderizam dentro de <li className="card">, ou seja, sobre surface ('#f9f9fa'), onde '#ed0d00' caia para 4.28:1 (abaixo do minimo). Escurecido mais um pouco (mantendo H=0/S=100%) ate 4.79:1 contra surface e 5.04:1 contra background -- o par mais restritivo (surface) manda.
  danger-dark: '#ff9999' # [VERIFICACAO DE CONTRASTE, rodada 9 -- bad_spec repair pass 3, matriz completa] AJUSTADO -- era '#ff6a6a' (pass 2), validado so contra background-dark (4.53:1, ok) mas .btn-danger-outline tambem renderiza sobre surface-dark. Contra o surface-dark FINAL desta rodada ('#464646'), '#ff6a6a' caia para ~2.62:1 (falha dupla: nem 4.5:1 de texto nem 3:1 de borda). CLAREADO mais (mantendo H=0/S=100%, escurecer nao e matematicamente viavel contra um fundo ja escuro) ate 4.62:1 contra surface-dark e 6.18:1 contra background-dark -- o par mais restritivo (surface, por ser mais claro) manda.
  pending: '#d07900' # [VERIFICACAO DE CONTRASTE, rodada 8 -- bad_spec repair pass 2] AJUSTADO -- Secondary.Orange '#ff9500' (ESTIMADO) piorava o contraste pre-existente do texto branco (.badge-pending) de ~3.25:1 (valor antigo #b8860b) para ~2.20:1. Escurecido o minimo necessario para nao regredir: ~3.27:1 (levemente melhor que o antigo). Nao atinge 4.5:1 pleno -- gap pre-existente, ver deferred-work.md.
  pending-dark: '#ffb55b' # ESTIMADO -- mesmo motivo (era #e0b64d)
  highlight: '#ede9fe' # [PROPOSTO 2026-07-22, rodada 10] ESTIMADO -- lilas claro (lavanda suave), papel novo: destaque de LEITURA passiva no card "Total combinado" (ver Brand & Style rodada 10). Nao sourced do Figma (nenhum export cobre este papel ainda) -- primeiro valor de partida. [VERIFICACAO DE CONTRASTE, implementacao spec-snowui-sidebar-shell.md] Calculo feito na implementacao (luminancia relativa WCAG 2.1): {colors.foreground} ('#1a1f2b') sobre este highlight = 13.87:1, muito acima do minimo 4.5:1 para texto normal -- nenhum ajuste de tom necessario, valor mantido sem mudanca.
  highlight-dark: '#3f3b54' # [PROPOSTO 2026-07-22, rodada 10] ESTIMADO -- lilas escuro/acinzentado, luminancia posicionada entre {colors.background-dark} (#333333) e {colors.surface-dark} (#464646) com leve matiz roxo para manter familia com {colors.accent-dark} (#adadfb) sem ser o mesmo valor. [VERIFICACAO DE CONTRASTE, implementacao spec-snowui-sidebar-shell.md] {colors.foreground-dark} ('#edf0f5') sobre este highlight-dark = 9.36:1, muito acima do minimo 4.5:1 -- nenhum ajuste de tom necessario, valor mantido sem mudanca.
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
  sidebar-width: 240px # [PROPOSTO 2026-07-22, rodada 10] ESTIMADO -- largura fixa da sidebar em ≥768px, ver Layout & Spacing e Components. Sem medida real do Artifact aprovado (protótipo não expunha px); valor de partida plausível para brand mark + rótulos de 5 itens + badge, a confirmar na implementação.
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
    # [REVISADO 2026-07-22, rodada 10] — era background {colors.surface} + border 1px, zero sombra (ver histórico em Elevation & Depth). Light mode agora usa fundo puro + sombra fazendo o trabalho que a superfície cinza fazia antes; dark mode PERMANECE no padrão anterior (surface+border, sem sombra) — ver justificativa em Elevation & Depth, não é uma omissão.
    background: '{colors.background}' # light — era {colors.surface}
    background-dark: '{colors.surface-dark}' # dark inalterado — sombra não é o mecanismo de profundidade neste modo
    border: none # light — border removida, redundante com a sombra (ver Elevation & Depth)
    border-dark: '1px solid {colors.border-dark}' # dark mantém a borda já validada (WCAG, rodada 9)
    boxShadow: '0 1px 2px rgba(15, 15, 15, 0.06), 0 1px 1px rgba(15, 15, 15, 0.04)' # [ESTIMADO, rodada 10] light only, ver Elevation & Depth — sem par dark (justificado lá, não é omissão)
    radius: '{rounded.DEFAULT}'
    padding: '{spacing.2}'
  card-highlight:
    # [PROPOSTO 2026-07-22, rodada 10] — variante de `summary-card` só para o card "Total combinado" (ou equivalente de maior destaque agregado em outras telas, ver EXPERIENCE.md). Não é um componente novo de estrutura, é `card`/`summary-card` com fundo trocado — mesma borda/radius/padding/sombra do `card` base.
    background: '{colors.highlight}'
    background-dark: '{colors.highlight-dark}'
    border: '{components.card.border}'
    boxShadow: '{components.card.boxShadow}'
    radius: '{rounded.DEFAULT}'
    padding: '{spacing.2}'
  sidebar-nav:
    # [PROPOSTO 2026-07-22, rodada 10] — substitui `.app-nav` horizontal. Ver EXPERIENCE.md → "Sidebar e Reskin Visual" para comportamento (desktop fixa / mobile off-canvas) e DESIGN.md → Layout & Spacing.
    width: '{spacing.sidebar-width}'
    background: '{colors.background}'
    border-right: '1px solid {colors.border}'
    activeIndicator: '{colors.accent}' # mesmo tratamento do link ativo de hoje (`.app-nav-link.ativo`), reorientado verticalmente
    padding: '{spacing.2}'
  category-icon:
    # [PROPOSTO 2026-07-22, rodada 10] — indicador visual à esquerda de cada `item-card` de lançamento em /lancamentos. Protótipo aprovado usou emoji como placeholder; fonte final do glifo (emoji / SVG / inicial) e a paleta pequena e fechada de fundos rotacionados por categoria NÃO estão travadas nesta rodada — ver Do's and Don'ts e EXPERIENCE.md.
    size: 1.75rem # mesmo tamanho de `icon-button`, por consistência de família
    radius: '{rounded.full}'
    background: TBD # paleta pequena e fechada, derivada sistematicamente (não escolha livre por categoria) — decisão de implementação adiada
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

`[NOTA, rodada 6]` O token de acesso à API do Figma disponível naquela rodada não tinha escopo para ler valores de Figma Variables em massa (só estrutura/nomes de página e componente) — por isso aquela rodada não substituiu nenhum valor numérico.

`[DECISÃO 2026-07-22, rodada 7]` **Cores adotadas — o usuário exportou os tokens reais do Figma (plugin de export, formato W3C Design Tokens, 4 arquivos: `iOS-Light`/`iOS-Dark`/`SnowUI-Light`/`SnowUI-Dark`) e resolveu a limitação da rodada 6.** Usados os modos `SnowUI-Light`/`SnowUI-Dark` (não os `iOS-*`, que são um tema alternativo do mesmo kit). Gerado um comparativo visual (Artifact, componentes reais do produto renderizados nas duas paletas, claro e escuro) para o usuário decidir com o resultado final na frente, não só hex isolados — usuário confirmou explicitamente: "pode alterar para snowUI". Mudança pequena/cosmética (troca de valor de cor, zero impacto funcional) avaliada diretamente pelo orquestrador em vez de nova rodada de John/Winston/Sally, aplicando os 3 filtros que a própria rodada 6 já tinha pré-autorizado (ver nota abaixo) — registrado no memlog do goal-engine. Valores aplicados no frontmatter acima, cada um marcado `sourced` (lido direto do export) ou `ESTIMADO` (papel sem equivalente no export — hover, superfície translúcida, "pending"). Achado principal: **`{colors.accent}` deixa de ser azul e passa a ser preto (`#000000`) no modo claro e roxo-claro (`#adadfb`) no escuro** — o token `Primary` real do SnowUI, resolvido via `Black.100%`/`Secondary.Indigo`. `{colors.background-dark}` também muda de forma real (`#0b0d12` → `#333333`, bem mais claro) e `{colors.danger}` fica mais vívido (`#c0362c` → `#ff3b30`). `{colors.border}`/`{colors.foreground}`/`{colors.muted-foreground}` permanecem inalterados — fora do escopo do que foi comparado e aprovado.

`[ATENÇÃO PARA IMPLEMENTAÇÃO, rodada 7]` `{colors.muted-foreground-dark}` (`#9aa3b2`) e `{colors.border-dark}` (`#262b36`) foram calculados originalmente contra o fundo escuro antigo (`#0b0d12`, quase preto) — com o novo `{colors.background-dark}` bem mais claro (`#333333`), o contraste de ambos precisa ser reverificado (WCAG AA: ≥4.5:1 para texto normal, ≥3:1 para elementos gráficos/bordas) e ajustado se necessário antes do commit.

`[VERIFICAÇÃO DE CONTRASTE, rodada 7b]` Cálculo feito na implementação (luminância relativa WCAG 2.1, `(L1+0.05)/(L2+0.05)`):
- `{colors.muted-foreground-dark}` `#9aa3b2` contra o novo `{colors.background-dark}` `#333333`: **4.97:1** (era 7.64:1 contra o `#0b0d12` antigo). Acima do mínimo de 4.5:1 para texto normal — **nenhum ajuste necessário**, valor mantido.
- `{colors.border-dark}` `#262b36` contra o novo `{colors.background-dark}` `#333333`: **1.12:1** (era 1.37:1 contra o `#0b0d12` antigo). Muito abaixo do mínimo de ~3:1 — e `#262b36` é literalmente mais escura que o novo fundo `#333333`, o que tornaria a borda invisível/invertida (mais escura que o próprio card). **Ajustado** para `#7c7f85` (mantendo o leve matiz azulado original — B>G>R — só clareado), que atinge **3.15:1** contra `#333333`. Valor final aplicado em `app/globals.css` e no frontmatter `colors:` acima.
- `{colors.accent-foreground}` sobre `{colors.accent}`: branco `#ffffff` sobre preto `#000000` (claro) = **21:1** (máximo teórico da escala, contraste perfeito). Preto `#000000` sobre roxo-claro `#adadfb` (escuro) = **10.15:1**, bem acima do mínimo — confirmado adequado nos dois modos, nenhum ajuste necessário.

`[DECISÃO 2026-07-22, rodada 10 — REVISÃO DE FILOSOFIA, não exceção pontual]` O usuário aprovou visualmente um Artifact (protótipo HTML real, não um mock descrito em palavras) reimaginando `/lancamentos` com sidebar fixa, fundo branco puro e cards com sombra sutil — e pediu que fosse aplicado a **todas** as telas do produto. Isto contraria diretamente duas posturas registradas desde a rodada 1 e reafirmadas na rodada 6 ("recibo organizado, zero sombra decorativa" e "nunca um dashboard multi-coluna"). Resolução, tela a tela:

- **Zero sombra → sombra sutil sistemática: revisão de filosofia, não exceção.** A exceção de `/lancamentos` (2 colunas, rodada 4) era justificada por ser *uma tela* com *um motivo funcional concreto* (lista longa + total sempre visível) — o próprio texto daquela decisão dizia "esta é a única exceção do produto". O pedido desta rodada é categoricamente diferente: aplica-se a **todas** as telas, sem motivo funcional por tela, só por preferência visual do casal ao ver o resultado. Tratar isso como "mais uma exceção pontual" seria impreciso — o correto é reconhecer que a postura visual do produto mudou: de "recibo sem sombra" (rodada 1/6) para "SnowUI claro com sombra sutil e sidebar" (rodada 10). O raciocínio anterior (zero sombra = "parece confiável, não app de consumo") não estava errado no contexto em que foi escrito; foi **superado por decisão explícita e visualmente informada do usuário**, o padrão mais forte de evidência que esta run já teve para uma mudança de Brand & Style (compare com a adoção seletiva do SnowUI na rodada 6, que foi inferência de Sally sobre estrutura de kit, sem essa aprovação visual direta). Ver Elevation & Depth para a regra revisada e Do's and Don'ts para o registro de superação.
- **Sidebar substituindo nav horizontal: NÃO é uma revisão do princípio "nunca um dashboard multi-coluna".** Esse princípio (rodada 6) é sobre o **conteúdo** de cada tela (nunca uma grade de widgets lado a lado competindo por atenção) — não sobre o chrome de navegação. A nav horizontal de hoje já ocupa uma faixa fixa fora do fluxo de conteúdo (`position: sticky; top: 0`); uma sidebar fixa à esquerda cumpre exatamente o mesmo papel (navegação persistente, badge de pendência, item ativo destacado), só girada 90°. O conteúdo de cada tela continua coluna única dentro da área principal (à direita da sidebar) — a única exceção de múltiplas colunas de conteúdo do produto continua sendo `/lancamentos` (rodada 4), inalterada por esta rodada.
- **Card de destaque lilás e ícone por categoria são aditivos**, não revisam nenhum princípio anterior — ver Colors (`{colors.highlight}`) e Components (`category-icon`) abaixo.

Ver `EXPERIENCE.md` → "Sidebar e Reskin Visual (rodada 10, 2026-07-22)" para o desenho completo (desktop + mobile) e o racional do comportamento off-canvas em telas pequenas.

## Colors

- **`{colors.background}` / `{colors.foreground}`** — fundo e texto base. Alto contraste, sem tom de cor — o conteúdo (valores em reais, nomes de categoria) é o que deve chamar atenção, não o chrome da interface.
- **`{colors.surface}`** — fundo levemente destacado para `card`s (lançamentos, cartões pendentes, blocos de resumo). Diferença sutil o suficiente para não competir com o conteúdo do card.
- **`{colors.muted-foreground}`** — texto secundário: subtítulos de página, rótulos de campo, hints. Nunca usado para números de valor — valores em reais são sempre `{colors.foreground}` ou dentro de um card.
- **`{colors.border}`** — divisores e contornos de input/card. Nunca usado como cor de destaque.
- **`{colors.accent}`** — a única cor "de marca" do sistema: usado em links, botão primário, item de navegação ativo, foco de input. Uso deliberadamente escasso — se tudo usa a cor de destaque, nada se destaca. `[ATUALIZADO rodada 7]` Era azul (`#2554c7`/`#6f9bff`), agora é o `Primary` real do SnowUI: preto (`#000000`) no claro, roxo-claro (`#adadfb`) no escuro — mesmo papel, cor nova.
- **`{colors.danger}`** — reservado para mensagens de erro (`role="alert"`) e, futuramente, para confirmação de ações destrutivas (ver Do's and Don'ts). Nunca usado decorativamente.
- **`{colors.pending}`** *(proposto)* — hoje o sistema não tem uma cor semântica de "atenção/pendência" distinta de erro; estados como "cartão pendente de mapeamento" ou "lançamento pendente de revisão" usam texto neutro (`hint`) idêntico a qualquer outra informação secundária, o que faz pendências reais se misturarem visualmente com texto informativo comum. Proposto um terceiro tom (âmbar) exclusivamente para *coisas que esperam uma ação do casal* — nunca para erro, nunca para sucesso.
- **`{colors.accent}` em `badge-repasse`** *(proposto 2026-07-21, rodada 5)* — primeiro uso de `{colors.accent}` fora de link/botão primário/nav ativo/foco. Justificado porque um lançamento repassado é uma decisão deliberada do casal (não identidade neutra como `titular-badge`, não espera de ação como `{colors.pending}`, não erro/destrutivo como `{colors.danger}`) — nenhuma cor existente comunica "isto foi redirecionado por escolha". Ver `EXPERIENCE.md` → "Repasse de Lançamento para a Outra Pessoa".
- **`{colors.highlight}`** *(proposto 2026-07-22, rodada 10)* — tom lilás claro exclusivo do card "Total combinado" em `/lancamentos` (e cards equivalentes de maior destaque agregado, se surgirem). Papel diferente de `{colors.accent}`: accent é reservado a **ação** (link, botão primário, nav ativo, foco, `badge-repasse`) — uso deliberadamente escasso; `{colors.highlight}` é **leitura passiva**, chama atenção para o número mais importante de um grupo de cards de resumo sem convidar a nenhum clique. Nenhuma cor existente cumpria esse papel (`{colors.surface}` é neutro demais para "destaque"; reaproveitar `{colors.accent}` sobrecarregaria o mesmo tom usado para ações, confundindo "isto é clicável" com "isto é o número principal"). Escopado nesta rodada só ao card de Total combinado — mesma disciplina de escassez já aplicada a `{colors.accent}` (ver os três filtros da rodada 6 abaixo, aplicados aqui por analogia mesmo sendo um token novo, não uma amostragem do SnowUI). `[ASSUMPTION]` valores `#ede9fe`/`#3f3b54` são ESTIMADOS (sem amostragem real do Figma para este papel específico) e o contraste texto-sobre-highlight ainda não foi verificado — checar WCAG AA na implementação antes de travar.
- **Dark mode** já existe e é completo: cada token acima tem seu par `-dark`, ativado via `prefers-color-scheme: dark` (sem toggle manual). Qualquer novo token (como `pending`) precisa do par dark antes de ir para produção.

`[DECISÃO 2026-07-22, rodada 6]` Ao amostrar valores de cor do SnowUI (fora do escopo desta rodada, ver Brand & Style), qualquer substituição precisa passar por três filtros antes de entrar em produção: (1) **par dark obrigatório** — o kit não foi investigado a fundo quanto a modo escuro; se não tiver um par equivalente documentado, a implementação deriva um manualmente, nunca lança um token novo sem par `-dark`; (2) **paleta enxuta preservada** — o SnowUI, como kit genérico de SaaS, provavelmente define ramas de cor mais amplas (ex: 5-10 tons de cinza, azul, etc. nas Foundations); adotar no máximo um tom por papel semântico já existente aqui (background/foreground/surface/border/muted-foreground/accent/accent-hover/danger/pending), nunca importar a rampa inteira; (3) **escassez do accent preservada** — `{colors.accent}` continua reservado a link/botão-primário/nav-ativo/foco/`badge-repasse`; um kit de dashboard tende a usar a cor de marca com mais liberdade (gráficos, ícones decorativos, cards de destaque) — isso não se aplica aqui.

## Typography

Uma única família (`Geist Sans`, com fallback de sistema) e uma escala pequena e deliberada — não há necessidade de mais que isto para telas de formulário e lista. `page-title` (1.5rem/700) abre toda tela; `page-subtitle` (0.9rem, `{colors.muted-foreground}`) explica o que a tela faz em uma frase, sempre presente. `section-title` (1.1rem/700) é usado dentro da tela para blocos (ex: nome de cada pessoa em Gastos, cada mês em Parcelas) — hoje implementado ad-hoc com `style={{ marginBottom }}` inline em vez de classe compartilhada (ver Do's and Don'ts).

`[DECISÃO 2026-07-22, rodada 6]` **Família tipográfica: decisão em aberto, não travada nesta rodada.** A página "Design system" do SnowUI define Text Styles próprios (fonte + escala), ainda não amostrados (ver Brand & Style). Recomendação de Sally para quando a amostragem acontecer: se a fonte do SnowUI for uma web font de uso livre e fácil de auto-hospedar via `next/font` (ex.: familia estilo Inter/Geist, comum em kits desse tipo), pode substituir `Geist Sans` 1:1 sem violar o Do's and Don'ts atual (que proíbe uma *segunda* família simultânea, não a substituição da única existente); se for uma fonte proprietária/paga ou exigir carregamento externo, manter `Geist Sans` e adotar só a **escala** (tamanhos/pesos/line-heights) do SnowUI aplicada à família atual. De qualquer forma, a escala final precisa continuar pequena e deliberada (hoje 6 estilos nomeados) — não crescer só porque o kit de origem tem mais.

## Layout & Spacing

Layout de coluna única, `{spacing.page-max-width}` (720px) centralizado — deliberadamente estreito porque o conteúdo é sempre uma lista vertical de lançamentos/cartões/categorias, nunca um dashboard multi-coluna. Telas de autenticação e formulários curtos (login, upload, esqueci/redefinir senha, remover categoria) usam `{spacing.page-max-width-narrow}` (400px), reforçando visualmente "isto é uma ação pontual", não uma tela de navegação.

`[PROPOSTO]` **exceção deliberada (2026-07-19, rodada 4):** `/lancamentos` passa a usar duas colunas em `≥768px` — lista rolante à esquerda + painel de filtro/total estático à direita (ver `EXPERIENCE.md` → "Lista Rolante + Total Central Estático") — a pedido explícito do usuário, que quer o total sempre visível sem rolar a lista longa (100+ itens/competência). Isto substitui `{spacing.page-max-width}` (720px) por uma largura maior nesta tela específica (`{spacing.page-max-width-wide}` `[PROPOSTO]`, sugerido 1100–1200px — suficiente para duas colunas sem ficar excessivamente largo) — as demais telas continuam em 720px coluna única, esta é a única exceção do produto. Conflito com a decisão anterior ("nunca um dashboard multi-coluna") é reconhecido e resolvido a favor do novo pedido do usuário, por ser mais específico (uma tela, um motivo funcional concreto) que o princípio geral que o precedeu.

Padding lateral de página é `{spacing.page-padding-mobile}` em qualquer largura — não há breakpoint de padding hoje, e não precisa: como o conteúdo já é estreito, a mesma margem funciona de 360px a desktop. **Onde o layout atual não escala bem é a navegação** (ver EXPERIENCE.md → Responsive & Platform), não o conteúdo de página.

`[PROPOSTO 2026-07-22, rodada 10]` **Sidebar fixa (`{spacing.sidebar-width}`, 240px) substitui a nav horizontal em `≥768px`.** Todos os `{spacing.page-max-width}`/`{spacing.page-max-width-narrow}`/`{spacing.page-max-width-wide}` continuam centralizados como hoje, só que dentro da área de conteúdo à direita da sidebar, não mais do viewport inteiro — nenhum desses valores muda, só o espaço disponível em que centralizam. Em `<768px` a sidebar não ocupa largura fixa nenhuma (recolhe para uma barra superior fina + painel off-canvas, ver EXPERIENCE.md → "Sidebar e Reskin Visual"), então o conteúdo de página continua ocupando a largura total como hoje. Isto não reabre nem contradiz a exceção de 2 colunas de `/lancamentos` (rodada 4) — são dois eixos independentes: a sidebar organiza a navegação do produto inteiro, o layout de 2 colunas organiza o conteúdo só daquela tela; ambos coexistem sem conflito.

`[DECISÃO 2026-07-22, rodada 6]` **A adoção do SnowUI não reabre nem amplia a exceção de coluna única.** O kit inclui uma tela de exemplo "Dashboard" multi-widget (grade de cards/gráficos), o oposto da filosofia "nunca um dashboard multi-coluna" já registrada duas vezes nesta run (aqui e na exceção escopada de `/lancamentos`, rodada 4). Avaliado e decidido: a tela `/` (Início) e qualquer tela nova continuam em coluna única `{spacing.page-max-width}` (720px) — a inspiração do SnowUI para essas telas se limita a como os *átomos* (cards de resumo, badges, botões) são desenhados internamente, nunca à ideia de organizá-los numa grade de widgets lado a lado. A única exceção de múltiplas colunas do produto continua sendo `/lancamentos` (`{spacing.page-max-width-wide}`), pelo motivo funcional já registrado (lista longa + total que precisa ficar sempre visível) — não por influência do SnowUI, e não é ampliada para nenhuma outra tela por causa dele. Ver `EXPERIENCE.md` → "Adoção do SnowUI Design System" para o racional completo.

## Elevation & Depth

`[HISTÓRICO — SUPERADO NA RODADA 10]` Até a rodada 7, nenhuma sombra existia no sistema — profundidade era comunicada só por `{colors.surface}` vs `{colors.background}` e `1px solid {colors.border}`, consistente com a postura "recibo organizado, não app vitrine". A rodada 6 chegou a excluir explicitamente os Effect Styles (sombras) do SnowUI da adoção seletiva, pelo mesmo motivo. Este raciocínio não estava errado no contexto em que foi escrito — foi substituído por uma decisão posterior e mais forte (ver abaixo), não invalidado retroativamente.

`[DECISÃO 2026-07-22, rodada 10]` **Sombra sutil sistemática substitui "zero sombra" — modo claro.** O usuário aprovou visualmente um Artifact real reimaginando o produto com fundo branco puro e cards com `box-shadow` sutil, e pediu a aplicação em todas as telas — ver Brand & Style para o racional completo de por que isto é revisão de filosofia, não exceção pontual. Regra revisada: em modo claro, `{components.card.boxShadow}` (`0 1px 2px rgba(15, 15, 15, 0.06), 0 1px 1px rgba(15, 15, 15, 0.04)`, ESTIMADO — sem amostragem real de Effect Styles do Figma ainda, valor de partida a confirmar/ajustar na implementação) passa a ser o mecanismo primário de profundidade; `{colors.surface}` deixa de ser o fundo do `card` (que agora usa `{colors.background}`, branco puro) e a borda de 1px é removida do `card` em modo claro — redundante com a sombra, e duas pistas de profundidade ao mesmo tempo é mais "app de consumo" (o oposto do que a régua original buscava), não menos.

`[DECISÃO 2026-07-22, rodada 10]` **Modo escuro NÃO ganha sombra — mantém o mecanismo anterior (superfície + borda).** Sombra em CSS é luz simulada contra um fundo; ela lê bem sobre um fundo branco (rodada 10, modo claro) mas mal sobre um fundo cinza-médio como `{colors.background-dark}` (`#333333`) — não há "branco" para a sombra escurecer visivelmente, e uma sombra clara (efeito de brilho) exigiria uma régua e uma verificação de contraste totalmente novas, não amostradas nesta rodada. Em vez de introduzir um valor de sombra escura não verificado (risco de regressão silenciosa de legibilidade, o mesmo tipo de risco que a rodada 9 já teve que corrigir para `{colors.border-dark}`/`{colors.surface-dark}`), o `card` em modo escuro mantém `{colors.surface-dark}` como fundo e `1px solid {colors.border-dark}` como borda — mecanismo já existente, já com contraste WCAG verificado (rodada 9). Isto é uma decisão deliberada, não uma lacuna: os dois modos comunicam profundidade por mecanismos diferentes e ambos igualmente intencionais. `[ASSUMPTION]` — o Artifact aprovado pelo usuário mostrou só a versão clara; esta divergência de mecanismo por modo é extrapolação de Sally, não confirmação visual direta.

`[DECISÃO 2026-07-22, rodada 6]` A página "Design system" do SnowUI inclui Effect Styles (sombras) — **excluídos da adoção seletiva daquela rodada**. `[NOTA rodada 10]` Esta exclusão era sobre adotar a régua específica de sombra *do kit* sem justificativa própria; a rodada 10 introduz sombra por um motivo diferente e mais forte — aprovação visual direta do usuário sobre um Artifact do próprio produto, não inspiração de um kit genérico — e por isso não é uma contradição entre rodadas, é a rodada 6 sendo mais conservadora do que a rodada 10 precisou ser.

## Shapes

Cantos levemente arredondados (`{rounded.DEFAULT}` = 10px em cards, 8px em inputs/botões) — suave o bastante para não parecer um formulário de governo, comedido o bastante para não parecer um app de consumo. Radius consistente em todo componente hoje; manter essa uniformidade em qualquer componente novo.

`[DECISÃO 2026-07-22, rodada 6]` A página "Spacing/Size/Corner Radius" do SnowUI (Figma Variables) é candidata natural a fonte de uma escala de `spacing`/`rounded` mais refinada que a atual (hoje pequena e um tanto ad-hoc: `rounded.sm`/`DEFAULT`/`lg` com `DEFAULT`==`lg`==10px, sem diferenciação real entre os dois). Amostragem (fora do escopo desta rodada) deve preservar a **uniformidade de radius entre componentes do mesmo papel** (todo card com o mesmo radius, todo input/botão com o mesmo radius) — não adotar uma escala do SnowUI que introduza radius diferente por componente sem uma razão semântica nova.

## Components

- **Botão primário** (`button-primary`) — `{colors.accent}` sólido, usado para a ação principal de cada formulário (Entrar, Enviar, Salvar, Confirmar, Criar, Corrigir, Atribuir a X). Estado `disabled` com opacidade reduzida — já implementado nos formulários client-side (login, upload, senha), **ausente** nos formulários via Server Action direta (cartões, categorias, lançamentos) porque estes não têm estado de `loading` local. Ver EXPERIENCE.md → State Patterns.
- **Botão secundário** (`button-secondary`) — transparente com borda, usado para ações de saída/cancelamento ("Cancelar", "Não é do casal"). Hoje o mesmo estilo visual serve tanto para "cancelar sem consequência" quanto para uma ação destrutiva ("Não é do casal") — proposto: ações destrutivas sem tela de confirmação dedicada usam `{colors.danger}` como cor de texto/borda em vez do secundário neutro, para se diferenciarem visualmente de um simples cancelar. Ver EXPERIENCE.md → Component Patterns.
- **Card** (`card`) — contêiner de item de lista (lançamento, cartão pendente, categoria) e de bloco de resumo (pessoa em Gastos, mês em Parcelas). Um único componente visual serve papéis diferentes hoje (item individual vs. seção agregada) sem diferenciação — funciona, mas os dois usos merecem nomes distintos em EXPERIENCE.md (`item-card` vs `summary-card`) para as regras comportamentais não se confundirem. `[REVISADO 2026-07-22, rodada 10]` fundo/borda mudam por modo — ver Elevation & Depth: claro usa `{colors.background}` + sombra sem borda, escuro mantém `{colors.surface-dark}` + `1px solid {colors.border-dark}` sem sombra.
- **Card de destaque** (`card-highlight`) *(proposto 2026-07-22, rodada 10, não existe hoje)* — variante do `card`/`summary-card` só para o card "Total combinado" em `/lancamentos` (e equivalentes de maior destaque agregado, se surgirem): mesma borda/radius/padding/sombra do `card` base, fundo trocado para `{colors.highlight}`/`{colors.highlight-dark}`. Nunca usado para item individual de lista, só para o card de resumo mais importante de um grupo. Ver Colors → `{colors.highlight}`.
- **Sidebar** (`sidebar-nav`) *(proposto 2026-07-22, rodada 10, substitui `.app-nav` horizontal)* — largura fixa `{spacing.sidebar-width}` em `≥768px`, brand mark no topo, item ativo com o mesmo tratamento de hoje (`{colors.accent}`, reorientado para borda/indicador vertical em vez de sublinhado horizontal), badge de pendência inalterado (`badge-pending`, mesmo componente). Em `<768px` recolhe para painel off-canvas — comportamento completo em `EXPERIENCE.md` → "Sidebar e Reskin Visual".
- **Ícone de categoria** (`category-icon`) *(proposto 2026-07-22, rodada 10, não existe hoje)* — indicador visual circular à esquerda de cada `item-card` de lançamento em `/lancamentos`, cor de fundo associada à categoria. Fonte do glifo (emoji/SVG/inicial) e a paleta pequena e fechada de fundos rotacionados por categoria **não estão travadas nesta rodada** — ver Do's and Don'ts.
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
| `Navigation` | `sidebar-nav` *(era `.app-nav`)* | `[REVISADO 2026-07-22, rodada 10]` Nav horizontal vira sidebar vertical fixa — mudança estrutural, não só de pele (ver Layout & Spacing e Brand & Style). Comportamento mobile também muda: de dropdown que empurra conteúdo (`[IMPLEMENTADO 2026-07-18]`) para painel off-canvas (`[PROPOSTO]` rodada 10, ver `EXPERIENCE.md`). |
| `ButtonGroup` | Toggle Individual/Combinada (Lançamentos) | Único lugar do produto com um par de botões agindo como alternador — encaixe direto. |
| `Frame`/`Group` (variantes de composição) | `card` / `item-card` / `summary-card` | Estruturais, não visuais — cada composição de frame do kit é só um jeito de agrupar os átomos acima; não introduz um componente novo. |
| `Image` | — | Produto não usa imagem de conteúdo hoje (sem avatar, sem ilustração); átomo sem uso previsto. |

Explicitamente **fora do mapeamento**: as telas de exemplo do kit (Dashboard, Settings, ChatGPT/AI Chat) não são componentes atômicos e não são adotadas como template — ver Brand & Style e Layout & Spacing.

## Do's and Don'ts

- **Do** manter a paleta enxuta (fundo/texto/superfície/borda/accent/erro/pending/highlight) — qualquer cor nova precisa justificar por que não é redundante com uma existente (caso do `pending` proposto: nenhuma cor atual comunica "espera uma ação sua"; caso do `highlight`, rodada 10: nenhuma cor atual comunica "destaque de leitura passiva" sem colidir com o papel de ação do `accent`).
- `[SUPERADO 2026-07-22, rodada 10]` ~~Do manter zero sombra decorativa~~ — ver Elevation & Depth. Substituído por: **Do** usar a sombra sutil sistemática (`{components.card.boxShadow}`) em todo `card` de modo claro, no lugar da dupla superfície+borda anterior; **modo escuro continua sem sombra** (mantém superfície+borda, ver Elevation & Depth) — não é uma inconsistência, é a mesma régua aplicada ao mecanismo que funciona em cada modo. **Radius uniforme continua sem mudança** — é o que ainda faz o sistema parecer "confiável" em vez de "app de consumo" nesse eixo específico.
- **Don't** deixar a sombra virar decorativa — um único valor sutil e consistente em todo `card` (mesma disciplina de escassez já aplicada a `{colors.accent}`), nunca blur alto, múltiplas camadas ou cor saturada; sombra aqui substitui a borda como pista de profundidade, não é ornamento adicional por cima das duas.
- **Don't** introduzir uma segunda família tipográfica ou pesos além de 400/500/600/700 — a hierarquia atual (tamanho + peso) já é suficiente para telas de lista/formulário.
- **Don't** usar `{colors.danger}` fora de erro/destrutivo genuíno — não usar para "atenção" (esse é o papel do `{colors.pending}` proposto) nem para ênfase decorativa.
- **Don't** deixar estilo inline (`style={{ marginBottom: '0.75rem' }}`, visto hoje em `gastos`, `cartoes`, `parcelas`, `categorias/[id]/remover`) substituir uma classe utilitária compartilhada — cada ocorrência hoje repete o mesmo valor (`0.75rem`) sem um token nomeado; promover para uma classe (`.section-title` ou `.card-gap`) evita divergência silenciosa quando um valor mudar em uma tela e não nas outras.
- `[IMPLEMENTADO 2026-07-22]` A classe `.section-title` foi implementada em `app/globals.css` (`margin-bottom: 0.75rem;` **apenas**) e as 10 ocorrências de `<h2 style={{ marginBottom: '0.75rem' }}>` (em `page.tsx`, `cartoes/page.tsx`, `parcelas/page.tsx`, `lancamentos-view.tsx`) foram trocadas por `<h2 className="section-title">` — resolve o Don't acima. O `font-size` de 1.1rem do token `section-title` documentado nesta página **continua não implementado**: adicioná-lo mudaria o tamanho hoje renderizado do `<h2>` (que não tem `font-size` explícito, cai no default do navegador) em ~22%, o que é uma mudança visual real e deliberada que merece sua própria decisão explícita, não um side effect desta limpeza — por isso foi deferido por decisão própria, não por limitação técnica. `font-weight`/`letter-spacing` continuam vindo da regra pré-existente `h1, h2, h3` (globals.css), não duplicados em `.section-title`. `line-height` explícito também foi adicionado a `.page-title` (1.2, regra ≥24px do SnowUI), que não tinha essa propriedade. `.page-subtitle` **não** foi tocado — confirmado que adicionar `line-height: 1.5` lá seria um no-op, pois já herda `1.5` de `body`. **Limitação confirmada nesta rodada:** cor e corner-radius do kit SnowUI não puderam ser amostrados — o token de API disponível não tem escopo `file_variables:read` (403 em `/variables/local` e nas fills de swatches individuais, que resolvem como `VARIABLE_ALIAS`, não valor literal). Não re-tentar essa amostragem sem um token com esse escopo; os únicos dados literais confiáveis extraídos do kit nesta sessão foram a escala tipográfica (Inter, 12/14/16/18/24/32/48/64px, pesos 400/600, regra de line-height ≈1.5× para ≤18px e ≈1.2× para ≥24px) e a escala de espaçamento (0/4/8/12/16/20/24/28/32/40/48/80px).
- **Do** `[2026-07-22]` tratar o SnowUI Design System como fonte de **tokens visuais e átomos**, nunca como template de tela — qualquer novo componente inspirado no kit precisa primeiro achar seu papel semântico na tabela de mapeamento acima antes de ganhar estilo próprio.
- **Don't** `[2026-07-22]` deixar as telas de exemplo do SnowUI (Dashboard multi-widget, Settings, AI Chat) ditar reorganização de nenhuma tela real do produto — a única exceção de múltiplas colunas continua sendo `/lancamentos`, por motivo funcional já registrado, não por influência do kit.
- **Do** `[2026-07-22, rodada 10]` tratar a sidebar como mudança de **chrome de navegação**, não de conteúdo — o conteúdo de cada tela continua coluna única (`{spacing.page-max-width}`), a exceção de 2 colunas continua escopada só a `/lancamentos`. Ver Brand & Style para por que a sidebar não reabre o princípio "nunca um dashboard multi-coluna".
- **Don't** `[2026-07-22, rodada 10]` travar a paleta de `category-icon` ou a fonte do glifo (emoji/SVG/inicial) nesta rodada — ambos ficam como decisão de implementação adiada (ver Components); escolher hex por categoria "a olho" sem uma regra sistemática de derivação violaria o mesmo princípio de "paleta enxuta e não arbitrária" já aplicado a todo token de cor deste documento.
