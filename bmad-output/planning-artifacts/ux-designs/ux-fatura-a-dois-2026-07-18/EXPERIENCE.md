---
name: Fatura a Dois
status: final
sources:
  - "{planning_artifacts}/prds/prd-fatura-a-dois-2026-07-14/prd.md"
  - "{planning_artifacts}/architecture/architecture-fatura-a-dois-2026-07-16/ARCHITECTURE-SPINE.md"
  - "{planning_artifacts}/epics.md"
updated: 2026-07-23
---

# Fatura a Dois — Experience Spine

> Auditoria de UX do produto **já implementado e em produção** (5 épicos, 15 stories concluídas) — não um planejamento pré-implementação. Toda observação de estado atual abaixo vem de leitura direta do código-fonte (`app/(app)/*`, `app/(auth)/*`), não de suposição. Onde este documento propõe uma mudança em vez de descrever o que já existe, a proposta é marcada com uma tag entre colchetes.
>
> **Nota de reconciliação (2026-07-19):** as 7 propostas da auditoria de 2026-07-18 (dashboard inicial, feedback/loading em Server Actions, nav mobile, competência persistente, badge de pendência, botão destrutivo, alert-error estendido) foram todas implementadas e verificadas em produção (ver `.memlog.md` deste workspace) — as tags abaixo, antes `[PROPOSTO]`, agora dizem `[IMPLEMENTADO 2026-07-18]` para refletir isso. Uma nova rodada de auditoria (correção funcional, ver seção "Achados de Correção Funcional" ao final) foi conduzida em 2026-07-19; suas propostas ainda em aberto usam `[PROPOSTO]` normalmente.
>
> **Nota de reconciliação (2026-07-19, rodada 3):** o usuário pediu para unificar `/lancamentos` e `/gastos` numa única visão, com titular por lançamento e filtro por pessoa. Seção "Unificação de Lançamentos e Gastos" adicionada ao final com o desenho completo — implementada e em produção (commits `fb0d836`/`15efe31`); as tags `[PROPOSTO]` dessa seção e das linhas relacionadas na IA/Component Patterns/Key Flow foram atualizadas para `[IMPLEMENTADO 2026-07-19]`.
>
> **Nota de reconciliação (2026-07-19, rodada 4):** o usuário pediu para reorganizar o layout de `/lancamentos` — lista de lançamentos em menu rolante na lateral esquerda, total de gastos fixo/estático no centro, atualizando dinamicamente conforme o filtro de categoria (novo) e o filtro de pessoa (já existente) são ajustados. Seção "Lista Rolante + Total Central Estático" adicionada ao final; suas propostas usam `[PROPOSTO]` até a implementação confirmar.
>
> **Nota de reconciliação (2026-07-21, rodada 5):** o usuário pediu poder marcar um lançamento específico como "repassado" para a outra pessoa do casal — autoria de quem gastou continua visível, mas o valor passa a contar no total/lista da pessoa destinatária. Seção "Repasse de Lançamento para a Outra Pessoa" adicionada ao final; suas propostas usam `[PROPOSTO]` até a implementação confirmar.
>
> **Nota de reconciliação (2026-07-22, rodada 6):** o usuário pediu avaliar a adoção do "SnowUI Design System" (kit de UI genérico da comunidade do Figma) como base visual do produto. Seção "Adoção do SnowUI Design System" adicionada ao final com a decisão (adoção seletiva de tokens/átomos visuais, rejeição do paradigma de layout de dashboard multi-widget do kit), o mapeamento de impacto tela-a-tela, e os próximos passos de implementação. Ver também `DESIGN.md` (Brand & Style, Layout & Spacing, Components).
>
> **Nota de reconciliação (2026-07-22, rodada 10):** o usuário aprovou visualmente um Artifact (protótipo HTML real de `/lancamentos`) e pediu para aplicar o mesmo visual a **todas** as telas do produto: sidebar fixa substituindo a nav horizontal, fundo branco puro + cards com sombra sutil substituindo o sistema zero-sombra, card de destaque em lilás claro no "Total combinado", e ícone colorido por categoria em cada lançamento. Seção "Sidebar e Reskin Visual" adicionada ao final com o desenho completo (desktop + mobile). Esta rodada **revisa** — não amplia como exceção pontual — a filosofia "zero sombra decorativa" registrada desde a rodada 1 e reafirmada na rodada 6; ver `DESIGN.md` → Brand & Style para o racional completo de por que é revisão e não exceção. A tabela de Responsive & Platform e o Component Patterns abaixo foram atualizados para refletir a sidebar; a Information Architecture (surfaces/rotas) **não muda** — é puramente reskin + reorganização de chrome, nenhuma tela nova/removida/renomeada.

## Foundation

Web responsivo, single-tenant para duas pessoas (o casal) — sem app nativo, sem multiusuário (PRD §5). Next.js 16 + React 19, sem biblioteca de componentes (nenhum shadcn/MUI/Tailwind no projeto) — o sistema visual é CSS puro artesanal já documentado em `DESIGN.md`. Server Actions para toda mutação (`'use server'` inline nas páginas), Server Components para leitura — não há camada de API REST intermediária que o front consuma.

As duas contas reais (Tsuyoshi e Milena, provisionadas na Story 1.1) enxergam os mesmos dados de fatura, mas cada lançamento pertence a um titular. Não há conceito de "meu espaço" vs. "espaço do parceiro" na navegação — é um único espaço compartilhado, o que já está correto e deve ser preservado (qualquer proposta abaixo mantém essa premissa).

`[DECISÃO 2026-07-22, rodada 6]` Continua sem biblioteca de componentes em código (CSS puro, `app/globals.css`) — a avaliação do "SnowUI Design System" (kit Figma) não muda isso: SnowUI é adotado como **referência visual de design** (tokens + átomos, ver `DESIGN.md` → Brand & Style/Components), não como uma dependência de código instalada no projeto. Ver "Adoção do SnowUI Design System" ao final para o racional completo e o mapeamento de impacto por tela.

## Information Architecture

| Surface | Alcançada de | Propósito | Estado atual |
|---|---|---|---|
| **Início** (`/`) | Nav / login | Ponto de partida da jornada mensal (PRD UJ-1) | `[IMPLEMENTADO 2026-07-18]` Dashboard real com os 3 estados priorizados (fatura não enviada / cartões pendentes / gastos processados), descrito em Key Flow 1. |
| Enviar fatura (`/upload`) | Nav | Selecionar competência (mês/ano) e enviar planilha .xlsx | Funcional; link pós-sucesso já implementado (ver Key Flow 1). |
| Cartões (`/cartoes`) | Nav | Mapear cartão/titular novo → conta do casal | Funcional; badge de pendência na nav (`[IMPLEMENTADO 2026-07-18]`) já dá a pista antes exigida em outra tela. `[IMPLEMENTADO 2026-07-19]` mapeamento agora informa quantos lançamentos existentes foram afetados; seção separada lista cartões marcados "não é do casal" com opção de desfazer (ver "Achados de Correção Funcional" #2). |
| Categorias (`/categorias`) | Nav | Criar/editar/remover categorias do casal | Funcional. |
| Remover categoria (`/categorias/[id]/remover`) | Link "Remover" em Categorias | Confirmação dedicada antes de excluir, com contagem de impacto | Já é o padrão certo — replicar para outras ações destrutivas (ver Component Patterns). |
| Lançamentos (`/lancamentos`) | Nav | Visão única: total por pessoa/categoria da competência **e** lista de lançamentos individuais para revisar/corrigir categoria, com titular por linha e filtro por pessoa | `[IMPLEMENTADO 2026-07-18]` indicador de parcela e data `DD-MM-AAAA`. `[IMPLEMENTADO 2026-07-19]` absorveu o papel de `/gastos` — rota canônica única, nav com 6 itens. `[PROPOSTO]` layout de lista rolante lateral + total central estático + filtro de categoria (ver "Lista Rolante + Total Central Estático" ao final). `[PROPOSTO]` rodada 5: cada lançamento pode ser repassado para a outra pessoa do casal, mudando de quem é o total sem apagar quem gastou (ver "Repasse de Lançamento para a Outra Pessoa" ao final). |
| ~~Gastos (`/gastos`)~~ | Nav | ~~Total por pessoa/categoria na competência, visão individual ou combinada~~ | `[IMPLEMENTADO 2026-07-19]` rota removida da nav; `/gastos?…` redireciona para `/lancamentos?…` preservando querystring (bookmarks antigos continuam funcionando). |
| Parcelas (`/parcelas`) | Nav | Parcelas futuras projetadas + comprometimento de limite mensal | Sem seletor (mostra todos os meses futuros com parcela pendente) — correto, é uma unidade diferente de "competência de fatura". `[IMPLEMENTADO 2026-07-19]` linha "Pendente" ganhou link "Resolver em Cartões". |
| Entrar (`/login`) | Redirecionamento não-autenticado | Login | Funcional, já com estado de erro/loading. |
| Esqueci minha senha (`/esqueci-senha`) | Link em Login | Solicitar redefinição | Funcional, mensagem anti-enumeração já correta. |
| Redefinir senha (`/redefinir-senha`) | Link do e-mail de redefinição | Definir nova senha | Funcional, já trata link expirado. |

`[IMPLEMENTADO 2026-07-18]` **Competência compartilhada.** Hoje mês/ano é estado local de cada tela (`searchParams` próprio de `/lancamentos` e `/gastos`, seletor separado em `/upload`). Propõe-se que a competência seja um contexto de navegação: ao trocar de `/gastos?mes=7&ano=2026` para `/lancamentos`, o link de navegação carrega a mesma competência, em vez de resetar para o mês calendário atual. Ver Key Flow 2 e Interaction Primitives.

Modal stacks: não existem hoje (Remover categoria é página própria, não modal sobre a lista) — manter essa escolha; não introduzir modal para a proposta de badge de pendência nem para confirmações destrutivas (ver Component Patterns), para não adicionar uma camada de complexidade (foco/escape/overlay) que o produto nunca precisou até aqui.

## Voice and Tone

Microcopy. Voz e postura de marca vivem em `DESIGN.md.Brand & Style`.

| Do (já em produção) | Don't |
|---|---|
| "Nenhum cartão pendente de mapeamento." | "Tudo certo por aqui! 🎉" |
| "Se esse e-mail tiver uma conta, um link de redefinição foi enviado." (anti-enumeração) | Confirmar ou negar existência da conta |
| "3 lançamento(s) serão afetados." | "Tem certeza? Essa ação não pode ser desfeita!!!" |
| "E-mail ou senha inválidos." (nunca especifica qual campo) | Indicar se o e-mail existe mas a senha está errada |

`[IMPLEMENTADO 2026-07-18]` — mensagens de erro de Server Action hoje só existem como `console.error`, nunca chegam à tela (ver State Patterns). Ao adicioná-las, seguir o mesmo tom direto e factual já estabelecido: "Não foi possível salvar a categoria. Tente novamente." — nunca genérico tipo "Algo deu errado" nem alarmista.

## Component Patterns

Comportamental. Especificação visual vive em `DESIGN.md.Components`.

| Componente | Uso | Regras comportamentais |
|---|---|---|
| `item-card` (era `card`) | Um lançamento, um cartão pendente, uma categoria | Contém sempre uma ação primária de linha (Corrigir, Atribuir, Salvar) e nunca mais de uma ação secundária. Estado de carregamento por item — enquanto a Server Action daquele card está em voo, seu botão mostra `disabled` + rótulo de progresso (`[IMPLEMENTADO 2026-07-18]`, ver State Patterns), os demais cards da lista continuam interativos. `[PROPOSTO]` rodada 5: o `item-card` de lançamento ocupa sua única vaga de ação secundária com o ícone de repasse (ver linha própria abaixo) — nenhum item ganha uma terceira ação. |
| Ícone de repasse `[PROPOSTO]` rodada 5 | `item-card` de lançamento em `/lancamentos`, ao lado do ícone de Corrigir categoria | Segundo `icon-button` no cabeçalho do card (mesma família visual do lápis já existente). Um clique único ("Repassar para {primeiro nome do outro}") reatribui o lançamento à outra pessoa do casal — sem seletor, o casal só tem duas contas, então o destino nunca é ambíguo. Mesmo padrão de ação direta de "Atribuir a {email}" (`/cartoes`), não o painel expansível de Corrigir categoria (que precisa de `<select>` porque há N categorias). Uma vez repassado, o mesmo botão alterna para "Desfazer repasse" — par idêntico a `rejeitarCartaoTerceiro`/`desfazerRejeicaoCartao` já implementado em `/cartoes`. Sem confirmação em página dedicada (não é destrutivo nem em cascata, é instantaneamente reversível). Só aparece em itens com titular conhecido (motivo `titular_pendente` não tem "de quem" repassar). Ver "Repasse de Lançamento para a Outra Pessoa". |
| `badge-repasse` `[PROPOSTO]` rodada 5 | Ao lado do `titular-badge`, em qualquer `item-card` de lançamento já repassado | Indica "o valor conta para esta pessoa, mas quem está no `titular-badge` foi quem de fato gastou" — nunca deixa um lançamento repassado parecer que o destinatário comprou. Visualmente distinto do `titular-badge` (identidade neutra): usa `{colors.accent}` (texto/borda, fundo transparente) — a única cor "de marca" do sistema, sinalizando decisão deliberada do casal. Nunca reaproveita `{colors.pending}` (repasse é resolvido, não uma espera) nem `{colors.danger}`. Ver "Repasse de Lançamento para a Outra Pessoa" e `DESIGN.md`. |
| `summary-card` (era `card`) | Bloco agregado por pessoa (Gastos) ou por mês (Parcelas) | Título do bloco é sempre "quem/quando + valor total" (`{typography.section-title}`); nunca mistura ação de mutação — é só leitura. |
| Botão destrutivo `[IMPLEMENTADO 2026-07-18]` | "Não é do casal" (Cartões) | Hoje visualmente idêntico a "Cancelar" (`btn-secondary`). Passa a usar cor `{colors.danger}` no texto/borda — sinaliza "isto tem consequência" sem exigir uma tela de confirmação nova (a ação já é rara — cartão de terceiro é caso de borda, não fluxo comum). Remover categoria mantém sua página de confirmação dedicada (ação mais comum e com impacto maior: redireciona lançamentos). |
| Seletor de competência (mês/ano) | Upload, Lançamentos (unificada) | `[IMPLEMENTADO 2026-07-18]` competência persistente entre Lançamentos ↔ Gastos via nav — `[IMPLEMENTADO 2026-07-19]` ficou sem objeto próprio após a fusão (é a mesma tela, não precisa mais persistir *entre* telas). Continua como `<form method="GET">` (recarrega, pois muda a competência buscada no servidor) — diferente do filtro de Pessoa/Categoria, que passam a ser reativos no cliente (ver "Lista Rolante + Total Central Estático"). Upload continua sempre partindo do mês calendário atual — faz sentido para ele ser independente, já que upload é sempre "a fatura que acabou de fechar", raramente uma competência passada. |
| Filtro de categoria `[PROPOSTO]` | Formulário de filtro em `/lancamentos` | Quarto controle, ao lado do filtro de Pessoa — "Todas as categorias" (default) + uma opção por categoria ativa (`listarCategorias()`) + "Sem categoria". Reativo no cliente (sem reload): filtra a lista e recalcula o Total central instantaneamente. Ver "Lista Rolante + Total Central Estático". |
| Badge de pendência `[IMPLEMENTADO 2026-07-18]` | Item de nav "Cartões" (quando há pendente) e "Lançamentos" (quando há "pendente de revisão" na competência atual) | Número pequeno ao lado do rótulo do link, cor `{colors.pending}`. Nunca bloqueia navegação — é aviso, não gate. Desaparece assim que a contagem chega a zero. |
| `empty-state` | Toda lista vazia | Já consistente (Cartões, Categorias, Lançamentos, Gastos, Parcelas). Manter: nunca texto vazio nem tabela sem linhas — sempre a frase + borda tracejada. |
| `alert-error` | Formulários | Já usado em Login/Upload/Senha. `[IMPLEMENTADO 2026-07-18]` — estender às Server Actions que hoje só logam no console (ver State Patterns). |
| `titular-badge` `[IMPLEMENTADO 2026-07-19]` | Cada `item-card` de lançamento em `/lancamentos` | Texto curto (primeiro nome, não o e-mail inteiro) junto da linha data/estabelecimento/valor. **Não** ganha cor nova — reaproveita `{colors.muted-foreground}` sobre `{colors.surface}` (mesmo tom de `hint`), com borda `1px solid {colors.border}` e `{rounded.full}`, mesma família visual do badge de pendência mas sem a cor semântica (isto é identidade, não estado de espera). Quando o titular não é conhecido (`titular_pendente`), o badge não aparece — o item já carrega o rótulo "Titular pendente de mapeamento" (ver State Patterns), redundância seria ruído. `[PROPOSTO]` rodada 5: **nunca muda com o repasse** — continua mostrando sempre quem de fato gastou, mesmo depois de um lançamento ser repassado para a outra pessoa; o repasse ganha seu próprio indicador (`badge-repasse`), nunca sobrescreve este. |
| Filtro de pessoa `[IMPLEMENTADO 2026-07-19]` | Formulário de filtro em `/lancamentos` (mesma linha do seletor de competência) | "Todos" (default) + uma opção por conta real do casal (`listarContasCasal()`). Ao selecionar uma pessoa específica, filtra a lista de lançamentos **e** a seção de resumo para essa pessoa só, e o toggle Individual/Combinada fica sem sentido e some da tela enquanto o filtro estiver ativo. `[PROPOSTO]` rodada 4: deixa de disparar reload de página (GET) e passa a ser reativo no cliente, mesmo mecanismo do novo filtro de Categoria — ver "Lista Rolante + Total Central Estático". `[PROPOSTO]` rodada 5: passa a filtrar pelo **responsável** (destinatário do repasse, quando houver; titular original, quando não houver), não mais só pelo titular bruto — extensão natural do que "Pessoa = X" já significava ("o que conta para o total dela"). Ver "Repasse de Lançamento para a Outra Pessoa". |
| `sidebar-nav` `[PROPOSTO]` rodada 10 (substitui `.app-nav`) | Toda tela do grupo `(app)` | Sidebar fixa à esquerda em `≥768px`: brand mark no topo, 5 itens de navegação (Início/Lançamentos/Cartões/Categorias/Parcelas — ver nota sobre Upload abaixo), badge de pendência inalterado (Cartões/Lançamentos), item ativo com indicador `{colors.accent}` reorientado verticalmente, seletor de conta do casal no rodapé. Em `<768px` recolhe para barra fina + painel off-canvas. Ver "Sidebar e Reskin Visual". |
| Seletor de conta do casal `[PROPOSTO]` rodada 10 (novo) | Rodapé da `sidebar-nav` | Alterna entre Tsuyoshi/Milena — **não é um novo mecanismo de autenticação/sessão**, é um seletor de "ver como" que provavelmente pré-seleciona o filtro de Pessoa em `/lancamentos` ao trocar. Comportamento exato de que outras telas ele afeta é `[ASSUMPTION]` desta rodada — ver "Sidebar e Reskin Visual". |
| `card-highlight` `[PROPOSTO]` rodada 10 (variante de `summary-card`) | Card "Total combinado" em `/lancamentos` (e equivalentes de maior destaque agregado) | Mesmo comportamento de leitura passiva do `summary-card` — nunca ação, nunca mutação. Só o tratamento visual muda (`{colors.highlight}`), nenhuma regra comportamental nova. Ver `DESIGN.md` → Components. |
| Ícone de categoria (`category-icon`) `[PROPOSTO]` rodada 10 (novo) | À esquerda de cada `item-card` de lançamento em `/lancamentos` | Puramente identificador visual (associa cor/glifo à categoria já selecionada do lançamento) — não é interativo, não abre nada ao clicar, não substitui o `<select>` de correção de categoria já existente. Fonte do glifo e paleta de cores por categoria ainda não decididas (ver `DESIGN.md` → Do's and Don'ts). |

## State Patterns

| Estado | Superfície | Tratamento atual | Proposta |
|---|---|---|---|
| Falha de Server Action | Cartões (atribuir/rejeitar), Categorias (criar/editar/remover), Lançamentos (corrigir) | **Falha silenciosa** — `console.error`, nenhuma UI. O casal clica "Salvar" e, se falhar, a tela simplesmente não muda; não há como distinguir "sucesso silencioso" de "falha silenciosa" sem abrir o console do navegador. | `[IMPLEMENTADO 2026-07-18]` — toda Server Action retorna `{ ok, message }` (padrão já usado em `/upload`) e a página client-side exibe `alert-error`/`hint` conforme o resultado, igual ao que Login/Upload já fazem. Este é o achado de maior impacto na jornada: hoje uma correção de categoria que falha parece ter funcionado. |
| Envio em andamento (Server Action direta) | Cartões, Categorias, Lançamentos, Remover categoria | Sem estado de loading — botão permanece clicável durante toda a chamada. | `[IMPLEMENTADO 2026-07-18]` — `disabled` + rótulo de progresso no botão daquele item específico ("Salvando…", "Atribuindo…"), mesmo padrão já usado em Login ("Entrando...")/Upload ("Enviando..."). |
| Vazio | Qualquer lista (Cartões pendentes, Categorias, Lançamentos, Parcelas, Gastos) | Já tratado — `empty-state` com frase específica por tela. **Nenhuma mudança necessária.** | — |
| Competência sem nenhum dado | Gastos, Lançamentos | Cai no `empty-state` genérico da lista — não distingue "mês sem fatura enviada ainda" de "mês com fatura enviada mas nada nela". | `[IMPLEMENTADO 2026-07-18]` — Key Flow 1 (dashboard) cobre isso na origem: o casal já sabe, antes de entrar em Gastos, se a fatura do mês foi ou não enviada. |
| Pendente de revisão | Gastos (`resumo.pendentes`) | Já mostrado como bloco visível e separado, nunca omitido silenciosamente (cumpre FR-11). **Manter.** | Badge de pendência `[IMPLEMENTADO 2026-07-18]` na nav é um atalho para chegar aqui mais cedo, não uma substituição. |
| Sessão de redefinição de senha expirada | Redefinir senha | Já tratado — mensagem + link "Solicitar novo link". **Bom padrão, nenhuma mudança.** | — |
| Cold load (carregamento inicial de dado) | Todas as Server Components (Cartões, Categorias, Lançamentos, Gastos, Parcelas) | Sem skeleton — Next.js renderiza no servidor, então o "cold load" visível é só a navegação de página inteira do App Router. Aceitável para a escala e frequência de uso (mensal, duas pessoas) — não introduzir skeleton só por convenção; sem sinal de que o tempo de resposta real incomoda. | — |

## Interaction Primitives

Não há atalho de teclado nem gesto touch especial hoje — todas as interações são clique/toque em link, botão ou campo de formulário padrão. Isso é apropriado ao produto: uso mensal, não uma ferramenta de produtividade de uso intenso onde atalhos se pagam.

`[IMPLEMENTADO 2026-07-18]` única primitiva nova: **competência como parâmetro de navegação persistente** — ao ir de Gastos para Lançamentos (ou vice-versa) pela nav, o mês/ano selecionado viaja junto na URL (`?mes=X&ano=Y`) em vez de cada tela resetar para o mês calendário atual. Upload não participa dessa persistência (ver Component Patterns).

`[PROPOSTO]` rodada 4: **filtro reativo no cliente** — Pessoa e Categoria em `/lancamentos` deixam de ser campos de formulário `GET` (recarregam a página) e passam a ser controles client-side que recalculam a lista visível e o Total central instantaneamente, sem round-trip ao servidor. Mês/Ano continuam via `GET` (mudam o dado buscado no banco). Esta é a primeira interação verdadeiramente instantânea do produto — todo o resto até aqui é navegação de página inteira ou submit de formulário; justificada aqui porque o próprio pedido do usuário ("o total vai somando" enquanto ajusta o filtro) é sobre percepção de resposta imediata, não sobre uma preferência estética por SPA.

## Accessibility Floor

- Já implementado e correto: `role="alert"` + `aria-live` nos formulários client-side (Login, Upload, Esqueci senha, Redefinir senha); `aria-current="page"` no link de nav ativo; `<label>` associado a todo input; foco visível via anel de 2px (`{colors.accent}`). **Manter em qualquer tela nova ou corrigida.**
- Gap real: Server Actions sem feedback (ver State Patterns) também são um gap de acessibilidade, não só visual — hoje um usuário de leitor de tela não recebe nenhum anúncio de sucesso/falha ao corrigir uma categoria ou mapear um cartão, porque não há elemento `role="alert"`/`aria-live` nessas telas (não existe conteúdo para anunciar). Corrigir o gap de State Patterns resolve este também, com o mesmo componente (`alert-error`/`hint` com `aria-live="polite"`, já usado em Upload).
- WCAG 2.2 AA como piso — dark mode já respeita contraste (paleta com pares `-dark` dedicados, não é apenas inversão automática).
- Toda ação destrutiva (remover categoria, rejeitar cartão) precisa continuar operável só por teclado — a página de confirmação de Remover categoria já funciona assim (form + botão); o botão destrutivo proposto para "Não é do casal" deve manter o mesmo comportamento de `<button type="submit">` dentro de `<form>`, sem depender de clique de mouse ou hover.
- `[PROPOSTO 2026-07-22, rodada 10]` **Painel off-canvas da sidebar em `<768px` NÃO é um modal** — decisão deliberada, para não introduzir a primeira camada de modal do produto (ver Information Architecture: "Modal stacks: não existem hoje... manter essa escolha") por causa de um painel de navegação, que é categoricamente diferente de um modal de conteúdo/confirmação. Tratamento: `<nav>` com `aria-label="Navegação principal"`, botão hambúrguer com `aria-expanded`/`aria-controls` (mesmo padrão já usado em `.app-nav-toggle` hoje) — **sem** `role="dialog"` e **sem** trap de foco completo (Tab não fica preso dentro do painel). Ao abrir, foco move para o primeiro link do painel (mudança em relação ao dropdown atual, que não move foco); fecha em: (a) seleção de um link (comportamento já existente, mantido), (b) tecla Escape (novo), (c) clique/toque fora do painel — no scrim/overlay (novo). Justificativa: um painel de navegação com 5 links + 1 seletor de conta é simples o bastante para não precisar do rigor de foco de um modal de conteúdo, e a ausência de modal em todo o resto do produto pesa contra introduzir a complexidade de foco/escape associada só para a nav.

## Key Flows

### Flow 1 — Revisão da fatura do mês (Tsuyoshi, fatura do Itaú acabou de fechar)

Realiza UJ-1 (PRD §2.3).

1. Tsuyoshi abre o app pelo celular, no fim de semana em que a fatura fechou. Hoje ele cai em `/` (Início) e vê só "Use o menu acima para enviar a fatura do mês..." — nenhuma indicação se a fatura de julho já foi enviada ou não.
2. `[IMPLEMENTADO 2026-07-18]` Com o dashboard: `/` mostra a competência atual (mês calendário) com um destes três estados, na ordem em que a jornada realmente progride — (a) "Fatura de julho ainda não enviada" + botão direto para `/upload`; (b) "3 cartões pendentes de mapeamento" + link para `/cartoes` (quando há pendência de FR-6 bloqueando a visão); (c) "Gastos de julho: R$ X (2 lançamentos pendentes de revisão)" + link para `/gastos`, quando já há dado processado.
3. Tsuyoshi vê "(a)", toca no botão, chega em `/upload` com mês/ano já pré-selecionado (o mês que o dashboard identificou como pendente, não necessariamente o mês calendário do dia — cobre o caso de conferir uma fatura de um mês anterior).
4. Envia a planilha. Upload processa (FR-2 a FR-6); ao concluir com sucesso, a mensagem de resultado `[IMPLEMENTADO 2026-07-18]` inclui um link direto: "12 lançamentos importados. Ver gastos de julho →" — hoje o sucesso só limpa o formulário, sem indicar o próximo passo.
5. Ele segue o link, chega em `/lancamentos?mes=7&ano=2026` `[IMPLEMENTADO 2026-07-19]` — já a visão unificada: resumo por pessoa no topo, lista de lançamentos logo abaixo, cada um mostrando de quem foi. Vê o bloco "Pendente de revisão" com 2 lançamentos sem categoria clara, sem precisar trocar de tela. `[PROPOSTO]` rodada 4: com o novo layout, a lista já está na coluna esquerda rolante e o resumo/total já está na coluna central estática, então ele nem precisa procurar — os dois estão lado a lado desde a chegada.
6. ~~Segue para `/lancamentos`~~ `[IMPLEMENTADO 2026-07-19]` — passo eliminado pela fusão: já está na tela que tem a lista de lançamentos para corrigir, não existe mais um "ida" separada.
7. Corrige as 2 categorias, na mesma tela. Cada correção mostra feedback imediato (`[IMPLEMENTADO 2026-07-18]`: "Categoria atualizada." — hoje, nada aparece).
8. **Clímax:** `[IMPLEMENTADO 2026-07-19]` o resumo por pessoa no topo da própria tela já reflete a correção assim que ela acontece (mesmo Server Component, um único `router.refresh()`) — Tsuyoshi vê o número final: quanto cada um gastou e em quê, sem sair da tela nem voltar por um link — em poucos minutos, sem ter aberto a planilha manualmente, exatamente o clímax descrito no PRD. Se ele quiser saber só o que é dele, usa o filtro de pessoa; o resumo e a lista filtram juntos. `[PROPOSTO]` rodada 4: e se quiser ver só uma categoria (ex: "quanto já gastamos em Mercado este mês"), o Total central na coluna estática soma na hora, sem esperar reload — o clímax passa a acontecer enquanto ele mexe no filtro, não só depois de submeter um formulário.
9. **Falha:** se a correção do passo 7 falhar (ex: categoria removida entre a carga da lista e o clique), hoje a tela simplesmente não muda — Tsuyoshi assume que funcionou. `[IMPLEMENTADO 2026-07-18]`: mensagem de erro inline no card daquele lançamento, categoria permanece com o valor anterior selecionado, ele tenta de novo.

### Flow 2 — Conferir o comprometimento futuro antes da fatura fechar (Milena, meio do mês, pensando numa compra maior)

Realiza UJ-2 (PRD §2.3).

1. Milena abre o app pelo celular no meio do mês. Ela não veio para conferir a fatura — quer saber se pode comprar algo maior agora.
2. Hoje: precisa lembrar que a informação está em "Parcelas" no menu (rótulo não deixa óbvio que é sobre "quanto já está comprometido", só "parcelas"). `[IMPLEMENTADO 2026-07-18]`: dashboard de Início (Flow 1) também expõe um resumo de uma linha — "Agosto já tem R$ 850 comprometido em parcelas" — como atalho, sem precisar entrar em Parcelas para ter o número-chave.
3. Ela toca em "Parcelas" (ou segue o atalho do dashboard), chega em `/parcelas`, vê os meses futuros agrupados, cada um com total e quebra por pessoa.
4. **Clímax:** decide a compra com o número real na frente — vê que agosto já tem R$ 850 comprometido e a compra que está avaliando levaria para R$ 1.200, decide adiar para setembro.
5. **Falha:** nenhuma — esta tela é só leitura, sem ação que possa falhar. O único risco é o número estar desatualizado se uma fatura recente ainda não foi processada; isso já é coberto pela jornada (Flow 1 sempre precede, mensalmente).

## Responsive & Platform

Web responsivo é requisito explícito do PRD (§7: "usável sem scroll horizontal e sem zoom manual a partir de 360px"). O conteúdo de página já cumpre isso (coluna única, `card-list` empilha nativamente, sem tabela). **A navegação não cumpre hoje:**

| Largura | Comportamento atual | Proposta |
|---|---|---|
| `≥ 768px` (desktop/tablet) | Nav horizontal com título + 6 links, `flex-wrap` | `[PROPOSTO]` rodada 10 — substituída por `sidebar-nav` fixa à esquerda (`{spacing.sidebar-width}`, 240px), ver "Sidebar e Reskin Visual". Cabia confortavelmente como nav horizontal; a sidebar é uma escolha visual do usuário (aprovação do Artifact), não uma correção de um problema de espaço nesta largura. |
| `< 768px` (celular, uso mais provável para conferir fatura no dia a dia) | Nav horizontal colapsa para hambúrguer + dropdown vertical que empurra o conteúdo para baixo (`[IMPLEMENTADO 2026-07-18]`/`[IMPLEMENTADO 2026-07-19]`) | `[PROPOSTO]` rodada 10 — sidebar recolhe para barra superior fina (brand mark + hambúrguer) e o conteúdo da sidebar abre como painel off-canvas deslizante da esquerda, **sobrepondo** o conteúdo em vez de empurrá-lo para baixo. Ver "Sidebar e Reskin Visual" para o racional e o comportamento de foco/fechamento. |

Até aqui, nenhuma diferença de conteúdo entre mobile e desktop era necessária — mesmo dado, mesma densidade, ajuste só na navegação. `[PROPOSTO]` rodada 4 introduz a primeira exceção real: o layout de duas colunas de `/lancamentos` (ver "Lista Rolante + Total Central Estático") empilha em coluna única abaixo de `768px` — não há largura para uma coluna de lista rolante e uma coluna central lado a lado num celular de 360–414px. Isso continua inalterado pela sidebar (rodada 10) — são dois eixos independentes, ver `DESIGN.md` → Layout & Spacing.

## Achados de Correção Funcional (auditoria 2026-07-19)

> Segunda rodada de auditoria, escopo ampliado além de navegação/UX: o usuário reportou 3 bugs concretos observados em uso real e pediu uma varredura completa do site. Cada achado abaixo vem de leitura direta do código-fonte real e, para o achado 2, de uma consulta somente-leitura contra o Supabase de produção real (script descartável, removido após uso, nenhuma escrita) — não de suposição.
>
> **Reconciliação (2026-07-19, mesma sessão):** os 4 achados abaixo foram todos implementados e verificados ponta a ponta contra o Supabase de produção real (scripts descartáveis, removidos após uso) na mesma sessão em que foram documentados — as tags `[PROPOSTO]` foram atualizadas para `[IMPLEMENTADO 2026-07-19]`. `epics.md` também foi atualizado com ACs retroativos nas Stories 2.3 e 5.1 (ver seção respectiva) para que os gaps que permitiram esses bugs fiquem fechados no documento-fonte, não só no código.

### 1. `/lancamentos` não mostra que um lançamento é parcela (bug reportado pelo usuário) — CONFIRMADO

`lancamento` já grava `compraParceladaId`/`parcelaNumero`/`parcelaTotal` na escrita (Epic 5, Story 5.1). O gap é só de leitura+exibição: a query que alimenta `/lancamentos` (`listarLancamentosParaCorrecao` em `server/categorizacao/corrigir-categoria.ts`) nunca seleciona `parcelaNumero`/`parcelaTotal`, e `lancamento-item.tsx` nunca os renderiza. `/parcelas` já tem o padrão certo (`{item.parcelaNumero}/{item.totalParcelas}`) — é o mesmo dado, só não propagado para esta tela. `[IMPLEMENTADO 2026-07-19]` os dois campos foram incluídos na query e "3/12" passou a ser exibido ao lado do lançamento quando `parcelaTotal > 1` (nada exibido para lançamento avulso). `spec-ux-parcela-e-data-lancamentos.md`.

### 2. Mapeamento de cartão→pessoa não reflete nos totais existentes (bug reportado pelo usuário) — INVESTIGADO, ARQUITETURA CONFIRMADA CORRETA (não é bug de agregação)

Investigação completa do schema real (`db/schema/index.ts`): `lancamento` **não tem nenhuma coluna de titular/usuarioId denormalizada** — não há nada para "dessincronizar" ou fazer backfill. `server/visualizacao/resumo-gastos.ts` e `server/parcelas/comprometimento-limite.ts` fazem *join ao vivo* via `cartao.usuarioId` a cada leitura (nenhum dos dois cacheia ou materializa); `app/(app)/layout.tsx` já é `force-dynamic`. `server/ingestao/mapear-cartao.ts`'s `mapearCartao` faz um `UPDATE cartao` atômico e retorna `ok:false` se a linha já foi resolvida — sem falha silenciosa. Consulta real (somente leitura) contra produção confirmou: nenhum cartão está num estado inconsistente; os cartões ainda pendentes (`usuarioId IS NULL`) têm lançamentos concentrados majoritariamente em competências diferentes da exibida por padrão em `/gastos`/`/parcelas` (mês calendário atual) — a explicação mais provável para "os totais não mudaram" é o usuário ter olhado o mês errado após mapear, não um bug de agregação.

Achado real relacionado, encontrado durante esta investigação (já estava listado em `deferred-work.md` da Story 2.3, aqui elevado a corrigir nesta rodada porque explica um cenário real de "os totais nunca vão mudar"): **`rejeitarCartaoTerceiro` ("Não é do casal") não tem desfazer.** Uma vez marcado `terceiro=true`, o cartão some de `/cartoes` para sempre (`listarCartoesPendentes` filtra `terceiro=false`) e seus lançamentos são excluídos de toda agregação permanentemente (`resumo-gastos.ts`/`comprometimento-limite.ts` pulam `cartaoTerceiro`). Se o casal rejeitar um cartão por engano, não há UI para reverter — só edição direta no banco. `[IMPLEMENTADO 2026-07-19]` `desfazerRejeicaoCartao` (limpa `terceiro`, volta o cartão para a lista de pendentes) + nova seção "Cartões marcados como não sendo do casal" em `/cartoes`. `spec-ux-desfazer-rejeicao-cartao.md`.

`[IMPLEMENTADO 2026-07-19]` segundo, menor: a resposta de sucesso de `mapearCartao` agora reporta quantos lançamentos existentes daquele cartão foram afetados e em quais competências ("Cartão atribuído. 3 lançamento(s) existente(s) agora conta(m) para essa pessoa (Junho/2026: 1, Julho/2026: 2)."), eliminando a ambiguidade "mapeei e nada mudou". `spec-ux-feedback-mapeamento-cartao-e-links-pendencia.md`.

### 3. Datas em `/lancamentos` e `/gastos` no formato AAAA-MM-DD em vez de DD-MM-AAAA (bug reportado pelo usuário) — CONFIRMADO

Nenhum helper de formatação de data existe em `lib/` (só `lib/moeda.ts`, `lib/competencia.ts`). `item.data` (coluna `date` do Postgres, vem como string `'YYYY-MM-DD'` via Drizzle) é interpolado cru em dois lugares: `lancamento-item.tsx` (`<strong>{item.data}</strong>`) e `gastos/page.tsx` (lista de pendentes, `{item.data}`). `[IMPLEMENTADO 2026-07-19]` `lib/data.ts` (`formatarData`) criado e usado nos dois pontos; requisito registrado retroativamente em `epics.md` (Additional Requirements) para não regredir. `spec-ux-parcela-e-data-lancamentos.md`.

### 4. Itens "Pendente" em `/gastos` e `/parcelas` não linkam para `/cartoes` — CONFIRMADO, já rastreado parcialmente

`/parcelas` (`deferred-work.md`, spec-5-3) já tinha esse gap documentado só para si; confirmado que `/gastos` (bloco "Pendente de revisão", motivo `titular_pendente`) tem o mesmo problema — texto plano, sem link acionável de volta para onde a pendência de fato se resolve. `[IMPLEMENTADO 2026-07-19]` link "Resolver em Cartões" adicionado nos itens com motivo `titular_pendente`/pendência de cartão, nas duas telas (deep-link ao cartão específico deferido — `deferred-work.md`). `spec-ux-feedback-mapeamento-cartao-e-links-pendencia.md`.

### Achados investigados e já rastreados em `deferred-work.md` — sem ação nesta rodada

Confirmados ainda válidos por leitura de código, mas de baixa probabilidade/escopo maior que esta rodada, mantidos como deferred (critério igual ao já usado nas rodadas anteriores desta run): (a) sem UI de restauração de categoria removida (spec-3-1); (b) `delta.atualizar` não revalida `compraParceladaId` numa correção de valor de lançamento já parcelado (spec-5-1); (c) `getUser()` do middleware sem timeout (spec-1-2). Nenhum é um bug reportado pelo usuário nem foi encontrado como causa dos 3 bugs desta rodada.

## Unificação de Lançamentos e Gastos numa Única Visão (auditoria 2026-07-19, rodada 3)

> O usuário pediu para juntar `/lancamentos` e `/gastos` numa única tela, com UX moderna/fácil/agradável, mostrando de quem foi cada lançamento e com filtro por pessoa. `[IMPLEMENTADO 2026-07-19]` — implementado, revisado e em produção (commits `fb0d836`/`15efe31`); os detalhes abaixo descrevem o comportamento real, não mais uma proposta. O layout desta tela evolui de novo na rodada 4 (ver "Lista Rolante + Total Central Estático" ao final) — esta seção descreve a estrutura de conteúdo (o quê), a rodada 4 descreve o novo arranjo espacial e a interatividade (como).

### Por que fundir (não só listar lado a lado)

Hoje as duas telas mostram o **mesmo recorte de dados** (lançamentos da competência) em duas granularidades — `/gastos` é o agregado, `/lancamentos` é o detalhe — e o próprio Key Flow 1 (PRD UJ-1) já faz o casal pingue-pongar entre elas: chega em Gastos pelo link do upload, desce até "Pendente de revisão", segue para Lançamentos para corrigir, volta para Gastos para ver o número final. Fundir não é só economizar um clique — elimina a necessidade de **duas cópias do mesmo seletor de competência sincronizadas por querystring** (gambiarra da rodada 07-18) e faz o clímax da jornada (ver o total atualizado) acontecer *na mesma tela* onde a correção aconteceu, sem navegação.

### Rota e navegação

- **`/lancamentos` vira a rota canônica única.** É o nome mais específico dos dois (lista de lançamentos é o conteúdo central; "gastos" descrevia só uma das duas visões possíveis sobre esse conteúdo) e já carrega o badge de pendência na nav.
- **`/gastos` deixa de existir como destino de navegação** (removido de `LINKS` em `nav.tsx`, nav cai de 7 para 6 itens) mas **continua resolvendo**: qualquer link/bookmark antigo para `/gastos?mes=X&ano=Y&visao=Z` redireciona (redirect de servidor, preservando querystring) para `/lancamentos?mes=X&ano=Y&visao=Z`. Ninguém com o link salvo cai em 404.
- O link cruzado "Ver gastos desta competência" / "Ver lançamentos desta competência" que hoje existe nas duas telas **deixa de fazer sentido e é removido** — não há mais para onde ir, já se está na tela.
- Badge de pendência na nav (hoje só em "Lançamentos") passa a refletir a mesma contagem de `resumo.pendentes.itens.length` que já alimenta o bloco "Pendente de revisão" da tela unificada — nenhuma mudança de fonte de dado, só um item de nav a menos disputando espaço.

### Layout da tela unificada (de cima para baixo)

1. **Cabeçalho** — título "Lançamentos", subtítulo atualizado para descrever as duas funções: "Veja quanto cada um gastou e corrija a categoria de cada lançamento da competência."
2. **Formulário de filtro** (`form-row`, mesmo padrão visual de hoje) — três controles na mesma linha: Mês, Ano, **Pessoa** `[IMPLEMENTADO 2026-07-19]` (select: "Todos" default + uma opção por conta real do casal). O toggle "Individual/Combinada" que hoje existe em Gastos **só é renderizado quando Pessoa = Todos** (ver "Interação do filtro" abaixo) — quando uma pessoa específica está selecionada, ele é redundante (só há uma pessoa para agregar) e some da tela em vez de ficar desabilitado, para não ocupar espaço com um controle sem efeito. `[PROPOSTO]` rodada 4 acrescenta **Categoria** como quarto controle — ver "Lista Rolante + Total Central Estático".
3. **Resumo por pessoa** (`summary-card`, mesmo componente de hoje) — um card por pessoa (ou um card "Casal" combinado, conforme o toggle), exatamente como `/gastos` já renderiza hoje. Continua no topo porque é a resposta mais rápida à pergunta que motiva a maior parte das visitas ("quanto eu/nós gastamos") — não teria sentido empurrar para baixo da lista detalhada.
4. **Lista de lançamentos** (`item-card` em `card-list`, mesmo componente de `/lancamentos` hoje) — cada item ganha o `titular-badge` (ver Component Patterns) e continua com a ação de corrigir categoria inline. Esta lista é filtrada pela Pessoa selecionada no passo 2.
5. **Pendente de revisão** (`summary-card`, mesmo bloco de hoje) — mantém-se como seção separada ao final, não misturada com a lista principal (motivos diferentes de pendência precisam do rótulo explícito que já existem, ver State Patterns). Também respeita o filtro de Pessoa quando o motivo tem titular conhecido (`sem_categoria`, `categoria_removida`); itens com motivo `titular_pendente` (titular desconhecido) **sempre aparecem**, independente do filtro — filtrar por "quem" não deveria esconder justamente os lançamentos cujo "quem" ainda não se sabe, isso seria perder o único lugar onde essa pendência é visível.

### Interação do filtro de Pessoa × toggle Individual/Combinada

Os dois controles respondem à mesma pergunta em eixos diferentes — "de quem eu quero ver" vs. "como somar o que eu já decidi ver" — e um deles fica redundante quando o outro está no extremo mais específico:

- **Pessoa = Todos** (default): toggle Individual/Combinada aparece e funciona exatamente como hoje em `/gastos` (dois `summary-card`s por pessoa, ou um "Casal" combinado). A lista de lançamentos abaixo mostra todo mundo, cada item com seu `titular-badge`.
- **Pessoa = uma conta específica**: toggle some (não há o que combinar/individualizar quando só uma pessoa está no recorte). Resumo mostra um único `summary-card` dessa pessoa. Lista de lançamentos mostra só os dela. `titular-badge` continua aparecendo em cada item mesmo assim — remover o badge quando o filtro já garante que é sempre a mesma pessoa economizaria uma leitura visual, mas manter é mais simples de implementar (mesmo componente, sem variante condicional) e não atrapalha; não vale a complexidade extra para este produto pequeno.

### Mudança de dado necessária para a implementação

`listarLancamentosParaCorrecao` (`server/categorizacao/corrigir-categoria.ts`) hoje não seleciona titular — precisa ganhar o mesmo join `lancamento -> cartao -> usuário` que `resumo-gastos.ts` já faz, para alimentar o `titular-badge`. `ItemPendente` (`resumo-gastos.ts`) também precisa ganhar `usuarioId`/`email` (hoje só tem `id/data/estabelecimento/valorCentavos/motivo`) para que o filtro de Pessoa consiga aplicar-se aos itens pendentes com titular conhecido (`sem_categoria`, `categoria_removida`) — decisão de dado, não de UX, mas registrada aqui porque a spec de implementação vai precisar dela.

### `titular-badge`: de onde vem o nome exibido

As contas reais só têm e-mail (`listarContasCasal()` retorna `{id, email}`, sem nome de exibição em lugar nenhum do sistema — não há tabela de perfil). Mostrar o e-mail inteiro (`tsuyoshi.masuno@gmail.com`) no badge de cada card poluiria a lista. `[IMPLEMENTADO 2026-07-19]` (`lib/pessoa.ts`, `primeiroNome`) derivado do prefixo do e-mail antes do primeiro `.` (capitalizado): `tsuyoshi.masuno@...` → "Tsuyoshi", `milena.smasuno@...` → "Milena" — mesma convenção usada tanto no resumo quanto na lista. `[ASSUMPTION]` — nenhuma fonte real de "nome de exibição" existe hoje; se o casal um dia quiser um nome que não bate com o prefixo do e-mail, isso exigiria um campo de perfil novo, fora do escopo desta fusão.

### O que NÃO muda

- `/parcelas` continua separada — unidade de dado diferente (parcelas futuras projetadas, não lançamentos de uma competência fechada), já documentado como correto na tabela de IA.
- `/upload` continua com seletor de competência independente (não participa da fusão nem do filtro de pessoa).
- Nenhum token novo de `DESIGN.md` — `titular-badge` reaproveita `muted-foreground`/`surface`/`border`/`rounded.full`, já existentes.

## Lista Rolante + Total Central Estático (auditoria 2026-07-19, rodada 4)

> O usuário pediu para reorganizar `/lancamentos`: a lista de lançamentos vira um menu rolante na lateral esquerda, o total de gastos fica fixo/estático no centro da tela, e o total recalcula dinamicamente conforme o filtro de categoria (novo) — e o de pessoa, já existente — é ajustado, sem precisar rolar a lista para ver o total. Todo item abaixo é `[PROPOSTO]` até a implementação confirmar. Parte central: o clímax do Key Flow 1 (ver acima) passa a acontecer *enquanto* o filtro é ajustado, não só depois de um submit.

### Por que isto não é só um reskin

Hoje a tela é uma coluna única, de cima para baixo: filtro → resumo → lista → pendentes. Com ~100+ lançamentos por competência (contagem real observada em produção, Épico 2), o resumo/total fica ancorado no topo e, para revisar item por item, o casal rola a página inteira para baixo — o total sai da tela assim que a rolagem passa da primeira dobra. O pedido do usuário resolve exatamente isso: a lista (que é o conteúdo longo) ganha rolagem própria, contida numa coluna; o total e o resumo (conteúdo curto, a resposta mais consultada) ficam numa coluna que não precisa rolar porque seu conteúdo sempre cabe na tela — "estático" aqui significa "sempre visível", não "não interativo": o número dentro dele muda ao vivo com o filtro.

### Layout de duas colunas (`≥ 768px`)

Duas colunas lado a lado abaixo do cabeçalho (título + subtítulo, inalterados):

- **Coluna esquerda — lista rolante** (~60% da largura): a lista de lançamentos (`item-card` em `card-list`, com `titular-badge` e indicador de parcela, inalterados) dentro de um contêiner com altura fixa (viewport menos cabeçalho/nav) e `overflow-y: auto` — rolagem própria, independente da página. É literalmente o "menu rolante" pedido: continua se comportando como a lista de hoje (mesma ação de corrigir categoria inline por item), só ganha um contêiner de rolagem dedicado.
- **Coluna direita/central — painel estático** (~40% da largura): formulário de filtro (Mês, Ano, Pessoa, **Categoria** `[PROPOSTO]`) no topo, resumo por pessoa/categoria (`summary-card`, ver "Interação dos filtros" abaixo) logo abaixo, e o bloco "Pendente de revisão" ao final do mesmo painel. Este painel não tem altura fixa nem rolagem própria — seu conteúdo é sempre curto o bastante para caber, o que já o torna "estático" na prática; não é necessário `position: sticky` para cumprir o pedido, mas nada nesta proposta impede usá-lo como reforço visual caso a implementação prefira (decisão de implementação, não de UX).

O rótulo "central" do pedido do usuário é interpretado como "a coluna de maior destaque visual, sempre à vista" — não literalmente o meio geométrico da tela (que dependeria de uma terceira coluna). Duas colunas (lista + painel) cobre a intenção sem introduzir uma divisão de tela que o conteúdo atual não sustenta.

### Filtro de Categoria (novo)

Quarto controle no formulário de filtro, ao lado de Pessoa: "Todas as categorias" (default) + uma opção por categoria ativa (`listarCategorias()`, mesma fonte que a correção inline por item já usa) + "Sem categoria" (cobre lançamentos com `categoriaId: null`, hoje já existentes e visíveis na lista, mas sem forma de isolá-los). Ao selecionar uma categoria específica:

- A lista na coluna esquerda mostra só os lançamentos daquela categoria (combinando com o filtro de Pessoa, se também ativo — os dois filtram em conjunto, não um sobrepõe o outro).
- O painel de resumo colapsa para mostrar só o Total (não faz sentido reexibir a quebra por categoria quando já se filtrou para uma única categoria — seria uma linha repetindo o total).
- O bloco "Pendente de revisão" **ignora o filtro de Categoria** — mesmo princípio já estabelecido para `titular_pendente` e o filtro de Pessoa: a pendência é justamente "categoria desconhecida ou removida", então filtrar por categoria escondê-la-ia do único lugar em que ela é visível e acionável. `sem_categoria`/`categoria_removida` continuam aparecendo na lista principal (não duplicados no bloco de pendentes, comportamento já correto de hoje) e respondem ao filtro de Categoria normalmente ali.

### Mecânica de atualização dinâmica do Total

Mês/Ano continuam como formulário `GET` tradicional (recarrega a página) — mudam a competência buscada no banco, não há como evitar uma nova consulta. Pessoa e Categoria passam a ser **reativos no cliente**: a seção de filtro+lista+painel é extraída para um Client Component que recebe, já carregados pelo Server Component da página, o array completo de lançamentos da competência (já inclui `categoriaId`/`valorCentavos`/`titularUsuarioId`, nenhum dado novo do servidor é necessário para o Total) e mantém Pessoa/Categoria como estado local (`useState`). A cada mudança de um dos dois selects:

- A lista visível é recalculada por `filter()` sobre o array já em memória.
- O Total central é a soma de `valorCentavos` dos itens que passam no filtro — cálculo direto em JS, sem nova consulta ao servidor, sem *loading state* (é instantâneo o bastante para não precisar de um).
- O resumo por pessoa/categoria (quando Categoria = Todas) continua vindo do agregado que o servidor já calcula (`obterResumoGastos`) para a combinação de Mês/Ano/visão — não recalculado no cliente, evita duplicar a lógica de agregação por pessoa que já existe e é testada.

Isto não muda o padrão arquitetural do produto (Server Components para leitura, Server Actions para mutação, ver Foundation) — a correção de categoria inline por item continua sendo a mesma Server Action de hoje; o que muda é que a *filtragem de leitura já carregada* deixa de depender de um novo request ao servidor.

### Responsivo (`< 768px`)

Colunas empilham: filtro → Total (painel) → lista de lançamentos → pendentes, mesma ordem de hoje. A lista volta a rolar como parte da página inteira (sem contêiner de rolagem própria) — um scroll dentro de outro scroll é um padrão de UX ruim em telas pequenas, e a rolagem própria da coluna esquerda só se justifica quando ela compete por espaço vertical com uma coluna vizinha, o que não acontece quando está sozinha. O Total, por já ser um bloco curto no topo do fluxo empilhado, permanece visível na maior parte da rolagem inicial sem precisar de tratamento especial.

### `[ASSUMPTION]`

- Proporção 60/40 entre as colunas é um ponto de partida razoável (lista é o conteúdo mais denso), não uma medida exata — a implementação pode ajustar dentro do razoável sem violar esta spec.
- Breakpoint reaproveita os `768px` já usados pela nav (ver Responsive & Platform) por consistência, não por uma medição específica de onde o conteúdo de duas colunas realmente quebra — se a implementação achar que o conteúdo já fica apertado antes de `768px`, ajustar é uma decisão de implementação, não uma mudança de UX.

## Repasse de Lançamento para a Outra Pessoa (rodada 5, 2026-07-21)

> O usuário pediu: poder marcar um lançamento específico (que caiu no cartão de uma pessoa) como "repassado" para a outra pessoa do casal — a autoria de quem gastou continua visível, mas o valor passa a contar no total/lista da pessoa destinatária, não mais na de quem originalmente comprou. Hoje `cartao.usuarioId` decide o titular de TODO lançamento daquele cartão, sem exceção por lançamento — este é o primeiro caso do produto em que "quem gastou" (identidade) e "de quem é o gasto para fins de total" (responsabilidade) deixam de ser sempre o mesmo valor. Todo item abaixo é `[PROPOSTO]` até a implementação confirmar.

### Por que "titular" deixa de bastar sozinho

Até aqui, `titular-badge` respondia a uma única pergunta ("quem comprou") que também definia o total de cada pessoa — as duas coisas colapsavam no mesmo dado (`cartao.usuarioId`). O pedido do usuário separa essas duas perguntas: **quem gastou** (fato histórico, nunca muda) e **de quem é o gasto para fins de soma/lista** (pode ser redirecionado, um lançamento por vez, para o outro membro do casal). Como o produto já rejeita o conceito de "meu espaço" vs. "espaço dela" (ver Foundation) — é um espaço compartilhado — este recurso não cria uma segunda área privada; ele só desacopla duas informações que hoje estão fundidas numa só, sem alterar a premissa de espaço único.

### Onde e como o repasse é acionado

Segundo ícone-botão no cabeçalho de cada `item-card` da lista, ao lado do ícone de lápis (Corrigir categoria) já existente — mesma família visual (`icon-button`, ícone de 14px, `stroke="currentColor"`), respeitando a regra já estabelecida em Component Patterns ("nunca mais de uma ação secundária" por item — hoje zero, este recurso ocupa a única vaga disponível). Como o casal são sempre exatamente duas contas, não existe ambiguidade de destino: um clique único em "Repassar para {primeiro nome do outro}" (`aria-label`/`title` já mostram o nome, sem exigir abrir um formulário ou selecionar em uma lista) — mesmo padrão de ação direta de um clique já usado em "Atribuir a {email}" (`/cartoes`, `cartao-pendente-item.tsx`), não o padrão de painel expansível usado pela correção de categoria (que precisa de um `<select>` porque há N categorias possíveis; aqui há só 1 destino possível).

Sem confirmação em página dedicada — não é uma ação destrutiva que perde dado ou faz cascata (compare com Remover categoria, que redireciona lançamentos e por isso tem página própria): é uma troca de responsável instantaneamente reversível. Uma vez repassado, o mesmo ícone-botão alterna para "Desfazer repasse" (mesmo elemento, rótulo/estado alternando, idêntico ao par `rejeitarCartaoTerceiro`/`desfazerRejeicaoCartao` já implementado em `/cartoes`) — nenhuma tela nova, nenhum modal (o produto não usa modal hoje, ver Information Architecture, e este recurso não é motivo para introduzir o primeiro).

Estado de carregamento por item, mesmo padrão já estabelecido (`[IMPLEMENTADO 2026-07-18]`, State Patterns): botão `disabled` + rótulo de progresso ("Repassando...", "Desfazendo repasse...") enquanto a Server Action está em voo; falha exibe `alert-error` inline no card, sem alterar o estado local (item continua mostrando o responsável anterior até uma tentativa bem-sucedida) — mesmo contrato de falha já usado em Corrigir categoria.

### Como aparece para quem gastou originalmente

Autoria nunca desaparece: o `titular-badge` de um item repassado continua mostrando o nome de quem efetivamente comprou (`cartao.usuarioId` — este dado não muda com o repasse, é sobre o fato histórico, não sobre a soma). O que muda é a participação do item no total e na lista *filtrada por pessoa*: com o filtro de Pessoa = quem gastou originalmente, o item deixa de aparecer (seu valor não conta mais para essa pessoa, exatamente o pedido do usuário: "não mais na minha lista/total"). Com o filtro de Pessoa = Todos (default), o item continua visível normalmente na lista rolante — nada some da visão compartilhada, só das visões filtradas por pessoa que já não se aplicam a ele.

Risco de "desaparecimento confuso": se Tsuyoshi está com o filtro de Pessoa = "Tsuyoshi" ativo e clica em "Repassar para Milena" no próprio item que está olhando, o item vai sumir da lista filtrada assim que a mutação resolver — mesmo risco de "sumiço sem contexto" já resolvido em `CartaoRejeitadoItem`/`CartaoPendenteItem` (`ATRASO_REFRESH_MS`, 2500ms). Mesma solução: mensagem de confirmação inline no card ("Repassado para Milena.", tom `hint`, não `alert-error`) por um breve atraso antes do refresh que remove o item da lista filtrada — dá ao usuário um instante para ler o que aconteceu antes do item sair do seu campo de visão, em vez de um sumiço instantâneo e mudo.

### Como aparece para a pessoa destinatária

Quando Pessoa = destinatário (ou Todos), o item aparece na lista/total dela, mas nunca como se ela tivesse comprado: ao lado do `titular-badge` inalterado (nome de quem gastou), um segundo indicador — `badge-repasse` `[PROPOSTO]` (ver Component Patterns e `DESIGN.md`) — deixa explícito que o valor foi redirecionado, não gasto por ela. Visualmente distinto do `titular-badge` (identidade neutra, família `muted-foreground`/`surface`): usa `{colors.accent}` como cor de texto/borda sobre fundo transparente, mesma família de forma (`rounded.full`, borda 1px) mas a única cor "de marca" do sistema sinalizando "isto é uma decisão deliberada do casal, não um dado neutro" (mesmo raciocínio de uso escasso de `{colors.accent}` já documentado em `DESIGN.md` → Colors). Nunca reaproveita `{colors.pending}` (esse tom é reservado para "espera uma ação"; um repasse já é uma decisão resolvida, não uma pendência) nem `{colors.danger}` (não é erro nem ação destrutiva).

### Interação com os filtros existentes

- **Filtro de Pessoa**: passa a filtrar pelo **responsável** (destinatário do repasse, quando houver; titular original, quando não houver) — não mais só pelo titular bruto. Não é uma mudança de comportamento visível na semântica do filtro: "Pessoa = Milena" já significava "o que conta para o total dela"; com repasse, isso passa a incluir itens repassados a ela, exatamente a extensão natural do que o filtro sempre quis dizer.
- **Filtro de Categoria**: ortogonal, nenhuma mudança — continua filtrando por `categoriaId`, independente de quem é o responsável.
- **Resumo por pessoa/categoria** (`summary-card`, painel estático): os totais agregados também passam a somar por responsável, não por titular — mesma mudança de fonte que o filtro de Pessoa, a refletir em `obterResumoGastos` (fora do escopo desta spec de UX, decisão de implementação/dado).
- **Bloco "Pendente de revisão"**: um lançamento só pode ser repassado depois que seu titular é conhecido (não há "de quem" repassar quando o titular ainda está pendente) — por isso o ícone de repasse não aparece em itens com motivo `titular_pendente`. Para os outros dois motivos (`sem_categoria`, `categoria_removida`), que já respeitam o filtro de Pessoa (regra existente, ver "Unificação de Lançamentos e Gastos"), o repasse se aplica normalmente: um item `sem_categoria` repassado passa a respeitar o filtro de Pessoa pelo responsável (destinatário), mesma regra acima — nenhuma exceção nova precisa ser documentada, o bloco de pendentes já delega ao mesmo conceito de "pessoa" que o resto da tela.

### O que NÃO muda

- Só existem duas contas no casal — repasse é sempre "para a outra pessoa", nunca uma escolha entre N destinos. Se o produto um dia deixar de ser 1-casal-2-contas, este desenho (clique único, sem seletor) precisaria ser revisto — fora de escopo aqui.
- Um lançamento só pode estar em um de dois estados quanto a repasse: não repassado, ou repassado para a única outra pessoa. Não há "repasse em cadeia" nem repasse parcial de valor (repassa o lançamento inteiro, nunca uma fração) — o pedido do usuário nunca menciona split parcial, e introduzir isso aumentaria a complexidade da UI (precisaria de um campo de valor) sem necessidade expressa.
- Categoria do lançamento é inalterada pelo repasse — são decisões independentes (a categoria continua sendo "o que foi comprado", o repasse é só "quem responde pelo valor").

### `[ASSUMPTION]`

- O rótulo exato do botão/ícone ("Repassar para {nome}" vs. um ícone só com tooltip) é uma escolha de implementação dentro do padrão já estabelecido (`icon-button` com `aria-label` explícito, mesmo padrão do lápis de Corrigir categoria) — não uma decisão de UX em aberto.
- `badge-repasse` reaproveitando `{colors.accent}` é a proposta desta rodada; se a implementação achar que o contraste com `titular-badge` fica confuso lado a lado, o texto do badge (não a cor) é o primeiro ajuste a tentar antes de propor uma cor nova.

## Adoção do SnowUI Design System (rodada 6, 2026-07-22)

> O usuário quer adotar o "SnowUI Design System" — kit de UI genérico da comunidade do Figma (`file_key beubf9x3kZWqhsHLaGmKer`, node `8300:425`, https://www.figma.com/design/beubf9x3kZWqhsHLaGmKer/SnowUI-Design-System--Community-?node-id=8300-425) — extraindo tokens visuais (cor, tipografia, espaçamento, radius) e componentes atômicos para o Fatura a Dois. Estrutura do arquivo já investigada via API REST do Figma nesta rodada: páginas FOUNDATIONS + "Design system" (Variables/Colors/Text Styles/Effect Styles/Spacing-Size-Corner Radius, implementadas como Figma Variables — token de acesso disponível não tem escopo para ler valores em massa, só estrutura/nomes); página Base (node investigado) com os átomos Text, Icon, IconText, Frame (várias variantes de composição), Group, Button (+Active/Disabled), Image, Link, Navigation, Strip, Line, Tag, Badge, Chip, Separator, ButtonGroup; páginas Common/Mobile/Brand (variações, não investigadas em detalhe); e páginas de telas de exemplo — Dashboard, Settings, ChatGPT/AI Chat, Authentication.

### A decisão: adoção seletiva, não total

**Adoção seletiva** — tokens visuais (cor/tipografia/espaçamento/radius) e componentes atômicos do kit são adotados; o paradigma de layout multi-widget do Dashboard de exemplo **não é**. A estrutura de layout já decidida nas rodadas anteriores desta run (coluna única `{spacing.page-max-width}`, com a única exceção já escopada e justificada de `/lancamentos`, ver "Lista Rolante + Total Central Estático") permanece intacta.

**Por que não adoção total:** as quatro páginas de exemplo do kit (Dashboard, Settings, ChatGPT/AI Chat, Authentication) são um SaaS genérico sem relação de domínio com um app financeiro doméstico de casal. Confrontando com a IA real do produto:

| Página de exemplo SnowUI | Tela real equivalente | Grau de sobreposição |
|---|---|---|
| Authentication | `/login`, `/esqueci-senha`, `/redefinir-senha` | Parcial — mesma ideia de formulário curto centralizado, já é como `page--narrow` funciona hoje. Boa fonte de inspiração visual, sem tensão com a filosofia de layout. |
| Dashboard | `/` (Início) | Parcial e só na ideia — cards de resumo, não a grade multi-widget do kit. `/` já é (`[IMPLEMENTADO 2026-07-18]`) um resumo vertical de 3 estados, não um dashboard de métricas soltas; **não vira uma grade de widgets** por causa do kit. |
| Settings | *(nenhuma)* | Nenhuma tela do produto tem o papel de "configurações" — sem equivalente, sem ação a tomar. |
| ChatGPT / AI Chat | *(nenhuma)* | Produto não tem chat/IA — sem equivalente, sem ação a tomar. |
| *(nenhuma no kit)* | `/lancamentos`, `/cartoes`, `/categorias`, `/parcelas` | As telas financeiras reais — o coração do produto — **não têm contraparte no kit**. Exigem composição original com os átomos+fundações do SnowUI, não adaptação de um template existente. |

Adotar "à risca" o kit (inclusive seus layouts multi-coluna) exigiria ou (a) inventar conteúdo de dashboard que o produto não tem só para preencher o template, ou (b) forçar as telas financeiras reais — desenhadas e refinadas ao longo de 5 rodadas de auditoria de UX documentadas nesta run — a se parecerem com um SaaS genérico sem que nenhum pedido do usuário jamais tenha apontado nessa direção. Isso desfaria decisões deliberadas e já justificadas (postura "recibo organizado, não app vitrine"; cor de destaque escassa; zero sombra decorativa; coluna única com uma única exceção funcional, não estética). Os átomos e tokens de fundação do kit, por outro lado, não carregam essa tensão — um `Button`, uma `Tag` ou uma escala de espaçamento servem qualquer arranjo de coluna única tão bem quanto serviriam um dashboard.

### O que muda / o que não muda

**Muda:**
- Fonte de referência visual para tokens (cor/tipografia/espaçamento/radius) passa a ser o SnowUI, amostrado componente-a-componente durante a implementação (ver "Próximos passos" abaixo) — os valores atuais em `DESIGN.md`/`app/globals.css` continuam em produção até essa amostragem confirmar substituições concretas.
- Vocabulário de componentes atômicos ganha uma referência formal externa (ver mapeamento em `DESIGN.md` → Components) para `button-primary`/`button-secondary`, `badge-pending`/`badge-repasse`/`titular-badge`, `icon-button`, divisores de lista e o toggle Individual/Combinada.
- Telas com sobreposição parcial (`/login`, `/esqueci-senha`, `/redefinir-senha`, e a ideia de resumo de `/`) podem se inspirar mais diretamente na composição visual do SnowUI para esses papéis específicos.

**Não muda:**
- Information Architecture — nenhuma tela nova, removida ou renomeada por causa desta decisão.
- Layout de coluna única como padrão do produto, e a exceção única/escopada de `/lancamentos` (não ampliada, não generalizada para outras telas).
- Nenhum modal introduzido (produto continua sem essa camada, ver Information Architecture) mesmo que o kit possua padrões de overlay.
- Filtros, fluxos, Key Flows, State Patterns, Accessibility Floor — nenhum comportamento muda; isto é puramente uma decisão de camada visual.
- `Foundation` — continua sem biblioteca de componentes de código; SnowUI é referência de design, não uma dependência instalada.

### Impacto por tela

| Tela | Impacto |
|---|---|
| `/login`, `/esqueci-senha`, `/redefinir-senha` | Reskin direto — tokens novos (quando amostrados) + átomos `Button`/Text/Link do kit, layout `page--narrow` centralizado inalterado (mesmo papel do exemplo "Authentication" do kit). |
| `/` (Início) | Reskin dos `summary-card`s dos 3 estados (Key Flow 1) usando os átomos do kit; **layout permanece vertical/coluna única** — nenhuma grade de widgets. |
| `/lancamentos` | Reskin de `item-card`, `titular-badge`, `badge-repasse`, `badge-pending`, filtros e do toggle Individual/Combinada com os átomos do kit; **arranjo de 2 colunas (lista rolante + painel estático) permanece exatamente como já escopado** — o kit não amplia nem justifica mudança estrutural aqui. |
| `/cartoes`, `/categorias`, `/categorias/[id]/remover`, `/parcelas` | Reskin de `item-card`/`summary-card`/`empty-state`/`alert-error`/botão destrutivo com os átomos do kit; composição original (sem template do kit para essas telas), layout de coluna única inalterado. |
| Nav (`.app-nav`) | Reskin usando o átomo `Navigation` do kit; comportamento de colapso mobile (`[IMPLEMENTADO 2026-07-18]`) inalterado. |

### Mapeamento de átomos

Ver `DESIGN.md` → Components → "Mapeamento de átomos do SnowUI" para a tabela completa (Button, Tag/Badge/Chip, IconText/Icon, Line/Separator, Navigation, ButtonGroup, Frame/Group) — comportamento de cada componente já especificado nesta run permanece o mesmo; o mapeamento é só visual.

### Próximos passos (fora do escopo desta rodada)

1. **Amostragem componente-a-componente** dos Figma Variables reais (cor/tipografia/espaçamento/radius) — o token de API disponível não tem escopo para leitura em massa; requer inspeção manual na UI do Figma ou um token com escopo de `variables:read`. Resultado esperado: substituição concreta de valores no frontmatter de `DESIGN.md`, respeitando as restrições já registradas lá (par dark obrigatório, paleta enxuta, escassez do accent, radius uniforme, zero sombra).
2. **Decisão de família tipográfica** (manter `Geist Sans` vs. adotar a fonte do SnowUI) — ver `DESIGN.md` → Typography para os critérios.
3. **Protótipos de tela** para `/lancamentos`, `/cartoes`, `/categorias`, `/parcelas` (sem equivalente no kit) — composição original usando os átomos+tokens do SnowUI uma vez amostrados, mantendo a estrutura de IA/comportamento já especificada nesta run.

### `[ASSUMPTION]`

- Sem sessão de elicitação nova (rodada headless, via `bmad-goal-engine`) — a decisão de adoção seletiva vs. total foi tomada por Sally com base no confronto direto entre a estrutura real do kit (investigada via API do Figma) e a IA/filosofia de layout já registrada nesta run, não por preferência coletada do usuário nesta rodada especificamente. Se o usuário quiser reabrir para adoção total (inclusive dashboard multi-coluna), isso contradiria a premissa de produto pequeno/utilitário estabelecida desde `epics.md` e precisaria ser um pedido explícito e novo, não uma inferência desta rodada.
- "Adoção seletiva" cobre tokens + átomos; não cobre os Effect Styles (sombra) do kit, deliberadamente excluídos (ver `DESIGN.md` → Elevation & Depth). `[NOTA rodada 10]` esta exclusão específica foi superada pela rodada 10 por um motivo diferente (aprovação visual direta do usuário, não inspiração do kit) — ver `DESIGN.md` → Elevation & Depth para a reconciliação completa.

## Sidebar e Reskin Visual (rodada 10, 2026-07-22)

> O usuário aprovou visualmente um Artifact (protótipo HTML real de `/lancamentos`) reimaginando o produto e pediu para aplicar o mesmo visual a **todas** as telas: sidebar fixa substituindo a nav horizontal, fundo branco puro + cards com sombra sutil, card de destaque em lilás claro no "Total combinado", e ícone colorido por categoria em cada lançamento. O Artifact mostrou a versão desktop; comportamento mobile e vários detalhes de interação abaixo são extrapolação de Sally, marcados `[ASSUMPTION]`. Ver `DESIGN.md` → Brand & Style para o racional de por que isto é uma **revisão de filosofia** (zero sombra → sombra sutil) e não uma exceção pontual, e por que a sidebar **não** reabre o princípio "nunca um dashboard multi-coluna" (é chrome de navegação, não conteúdo).

### Sidebar — desktop (`≥768px`)

Substitui `.app-nav` (nav horizontal sticky-top). Fixa à esquerda, `{spacing.sidebar-width}` (240px), altura total da viewport:

1. **Brand mark** — "Fatura a Dois" no topo, mesmo papel que `.app-nav-title` cumpre hoje (texto, sem logotipo/ilustração — produto não usa imagem de marca, ver Component Patterns).
2. **Itens de navegação** — Início, Lançamentos, Cartões (badge de pendência inalterado), Categorias, Parcelas. `[ASSUMPTION]` Upload não está na lista de 5 itens que o usuário enumerou explicitamente no pedido desta rodada; mantido como item de nav (não removido da IA) até confirmação — se o Artifact aprovado de fato omitiu Upload da sidebar, isso é uma mudança de IA real (não só reskin) que merece confirmação explícita antes de remover um destino de navegação existente, não uma inferência de Sally. Item ativo usa `{colors.accent}` como indicador (borda/barra lateral vertical, reorientação do sublinhado horizontal de hoje) + `aria-current="page"` (inalterado).
3. **Seletor de conta do casal** — Tsuyoshi/Milena, no rodapé da sidebar. Elemento novo, sem equivalente hoje. `[ASSUMPTION]` **não é autenticação/troca de sessão** — o produto continua single-tenant-de-casal, os dois membros veem o mesmo espaço compartilhado (ver Foundation: "não há conceito de 'meu espaço' vs. 'espaço do parceiro'"), essa premissa não muda. A leitura mais provável é um atalho de "ver como" que pré-seleciona o filtro de Pessoa já existente em `/lancamentos` ao trocar — mas o comportamento exato (se afeta só `/lancamentos` ou também filtra outras telas, se persiste entre navegações) não foi especificado pelo usuário nesta rodada e fica como decisão de implementação a confirmar, não travada aqui.

### Sidebar — mobile (`<768px`)

Uma sidebar fixa não pode simplesmente empilhar/quebrar como a nav horizontal fazia antes do hambúrguer (`[IMPLEMENTADO 2026-07-18]`) — não há espaço vertical de sobra na tela para uma coluna de 240px permanente num celular de 360–414px. `[PROPOSTO]`/`[ASSUMPTION]` desenho adotado:

- A sidebar recolhe para uma **barra superior fina**: brand mark + botão hambúrguer, mesma altura/estilo mínimo da barra mobile já existente hoje (reaproveita `.app-nav-toggle`).
- Tocar o hambúrguer abre o conteúdo completo da sidebar (itens de nav + badges + seletor de conta) como **painel off-canvas deslizante da esquerda**, sobrepondo o conteúdo da página (com um scrim/overlay atrás) — não mais um dropdown que empurra o conteúdo para baixo, como o padrão atual.
- Por que off-canvas e não dropdown: preserva a identidade "sidebar" (mesmo conteúdo, mesma ordem, mesmo seletor de conta no rodapé) em todas as larguras, em vez de degradar para um padrão de nav horizontal que deixou de existir no resto do desenho. Um dropdown que empurra conteúdo faria sentido para uma nav horizontal (era exatamente o padrão de hoje); para uma sidebar, deslizar da esquerda é a metáfora mais direta ("é a mesma coluna, só entra e sai de cena").
- Comportamento de foco/fechamento e por que isto **não** é tratado como modal: ver Accessibility Floor acima.
- Mesmo breakpoint `768px` já usado por toda a nav/responsividade do produto (nav de hoje, layout de 2 colunas de `/lancamentos`) — reaproveitado por consistência, não por medição nova.

### Card de destaque "Total combinado"

Em `/lancamentos`, os `summary-card`s de resumo (hoje: um por pessoa, ou "Casal" combinado — ver "Unificação de Lançamentos e Gastos") ganham um card adicional ou reformulado de "Total combinado", com tratamento visual `card-highlight` (`{colors.highlight}`, ver `DESIGN.md`). Nenhuma mudança de comportamento — é o mesmo dado agregado que o painel de resumo já mostra hoje, só com destaque visual maior para o número que soma tudo. `[ASSUMPTION]` se "Total combinado" é um card novo (terceiro, ao lado de Gasto Tsuyoshi/Gasto Milena) ou uma reformulação visual de um card "Casal" que já existe quando o toggle Individual/Combinada está em "Combinada" — a leitura mais simples é a segunda (reaproveita o card que já existe, só muda o estilo), mas o Artifact aprovado pode ter mostrado os três cards simultaneamente (2 individuais + 1 combinado, sem toggle) — se for esse o caso, é uma mudança de Component Patterns além do reskin (elimina a necessidade do toggle Individual/Combinada nesta visão), a confirmar antes de implementar.

### Ícone de categoria

Cada `item-card` de lançamento em `/lancamentos` ganha um `category-icon` (ver `DESIGN.md` → Components) à esquerda da linha data/estabelecimento/valor — puramente identificador visual, não interativo (não abre nada ao clicar, não substitui o `<select>` de correção de categoria já existente, que continua sendo a única forma de mudar a categoria de um lançamento).

`[IMPLEMENTADO 2026-07-22]` Fase 1 (rodada 10, spec-snowui-lancamentos-highlight-e-icone-categoria.md): cor de fundo derivada da categoria por índice determinístico (hash do nome) sobre uma paleta fechada de 6 tons (`--category-color-1..6`, ver `DESIGN.md` → Colors), com a **inicial maiúscula do nome da categoria** como glifo. Funciona para qualquer categoria (texto livre, sem enum) sem exigir curadoria.

`[DECIDIDO 2026-07-22, rodada 11]` Fase 2 — fonte do glifo para categorias comuns: o protótipo original aprovado usou emoji como placeholder de baixa fidelidade (não uma decisão de linguagem visual). Avaliação PM+tech-lead+UX (John, Winston, Sally) convergiu de forma unânime, sem divergência a arbitrar:

- **Rejeitado:** inferir o ícone automaticamente por palavra-chave no nome da categoria. Categoria é texto livre — uma heurística de palavras-chave falha silenciosamente (ou pior, casa errado com confiança visual) para qualquer nome fora do dicionário, o que é estruturalmente pior que o fallback neutro atual. É a mesma violação, em espírito, do princípio "paleta enxuta e não arbitrária" já aplicado à cor (ver `DESIGN.md` → Do's and Don'ts).
- **Adotado:** o casal **escolhe** o ícone ao criar ou editar uma categoria, de um conjunto curado e **fechado** de 7 opções (mesma disciplina de escassez já aplicada à paleta de cor, 6 tons). Campo sempre **opcional** — nunca obrigatório, nunca com pressão de completude (não é pendência que bloqueia decisão financeira, como cartão não mapeado ou categoria sem revisão; é puramente estético).
- **Fallback círculo+inicial: permanente, não um estado transitório.** Categoria sem ícone escolhido continua exibindo o círculo+inicial indefinidamente — é a resposta estruturalmente correta para o fato de categoria ser texto livre (sempre vai existir categoria fora do conjunto curado de 7), não uma versão incompleta aguardando preenchimento.
- **Estilo do glifo:** SVG inline, `stroke="currentColor"`, monocromático — mesma linguagem visual dos ícones funcionais já existentes em `lancamento-item.tsx` (lápis de editar, seta de repasse). Nunca emoji real: quebraria o tema/contraste AA já calibrado (emoji não respeita `currentColor` nem dark mode, renderiza de forma inconsistente entre sistemas operacionais) e reabriria a classe de bug de glifo composto (par substituto cortado ao meio) já corrigida na Fase 1.
- **Conjunto de 7 ícones** (chave curta → SVG, mapeamento em `DESIGN.md` → Components): Mercado/Compras (carrinho), Transporte (carro), Saúde (cruz), Lazer (claquete), Moradia (casa), Contas/Serviços (documento), Outro (etiqueta — para quem quer escolher "algo" sem se encaixar nos outros 6).
- **Interação no formulário de categoria** (`/categorias`, Story 3.1): grade pequena de botões-ícone clicáveis (radio group estilizado, "sticker picker"), não dropdown de texto — ícone é reconhecido visualmente, um dropdown textual inverteria o canal errado de reconhecimento. Opção "Nenhum" (= sem ícone, cai no fallback círculo+inicial) sempre presente e pré-selecionada por padrão.
- **Dado:** campo novo `categoria.icone`, nullable, chave curta validada em código contra o enum fechado das 7 opções (mesmo padrão de `validarNome`) — nunca emoji livre, nunca Postgres enum type (menos fricção para adicionar uma 8ª opção no futuro). Migration aditiva, sem backfill — categorias existentes nascem com `icone = null` e continuam no fallback até o casal optar por definir um.

### O que NÃO muda

- Information Architecture — nenhuma rota nova, removida ou renomeada (exceto a ressalva `[ASSUMPTION]` sobre Upload acima, a confirmar).
- O princípio "conteúdo de cada tela é coluna única" — a sidebar é chrome, o conteúdo à direita dela continua `{spacing.page-max-width}` (720px), com a única exceção de `/lancamentos` (2 colunas, rodada 4) inalterada.
- O produto continua sem biblioteca de modal — o painel off-canvas mobile é tratado como disclosure de navegação, não como modal (ver Accessibility Floor).
- Nenhum dado novo de autenticação/sessão — o seletor de conta do casal não introduz "espaços" separados por pessoa.

### `[ASSUMPTION]` (resumo desta seção)

- Comportamento mobile da sidebar (barra fina + off-canvas) é extrapolação de Sally — o Artifact aprovado mostrou só desktop.
- Se Upload permanece item de sidebar (assumido que sim, produto mantém os 6 destinos de nav de hoje) — a confirmar contra o Artifact real.
- Comportamento exato do seletor de conta do casal (o que ele afeta, se persiste entre navegações) — não especificado, fica como decisão de implementação.
- Se "Total combinado" é card novo (3 cards sempre visíveis) ou reformulação visual do card "Casal" já existente sob o toggle Individual/Combinada — a confirmar contra o Artifact real antes de decidir se o toggle Individual/Combinada continua necessário nesta tela.
- Fonte do glifo e regra de derivação de cor do `category-icon` — decisão de implementação adiada, não travada nesta rodada.
- Valores `{colors.highlight}`/`{colors.highlight-dark}` e a régua de `box-shadow` do `card` são ESTIMADOS (sem amostragem real do Figma para esses papéis específicos) — ver `DESIGN.md` → Colors e Elevation & Depth.
