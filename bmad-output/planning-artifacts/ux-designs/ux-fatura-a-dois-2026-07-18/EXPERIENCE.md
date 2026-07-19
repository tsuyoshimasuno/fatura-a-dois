---
name: Fatura a Dois
status: final
sources:
  - "{planning_artifacts}/prds/prd-fatura-a-dois-2026-07-14/prd.md"
  - "{planning_artifacts}/architecture/architecture-fatura-a-dois-2026-07-16/ARCHITECTURE-SPINE.md"
  - "{planning_artifacts}/epics.md"
updated: 2026-07-19
---

# Fatura a Dois — Experience Spine

> Auditoria de UX do produto **já implementado e em produção** (5 épicos, 15 stories concluídas) — não um planejamento pré-implementação. Toda observação de estado atual abaixo vem de leitura direta do código-fonte (`app/(app)/*`, `app/(auth)/*`), não de suposição. Onde este documento propõe uma mudança em vez de descrever o que já existe, a proposta é marcada com uma tag entre colchetes.
>
> **Nota de reconciliação (2026-07-19):** as 7 propostas da auditoria de 2026-07-18 (dashboard inicial, feedback/loading em Server Actions, nav mobile, competência persistente, badge de pendência, botão destrutivo, alert-error estendido) foram todas implementadas e verificadas em produção (ver `.memlog.md` deste workspace) — as tags abaixo, antes `[PROPOSTO]`, agora dizem `[IMPLEMENTADO 2026-07-18]` para refletir isso. Uma nova rodada de auditoria (correção funcional, ver seção "Achados de Correção Funcional" ao final) foi conduzida em 2026-07-19; suas propostas ainda em aberto usam `[PROPOSTO]` normalmente.

## Foundation

Web responsivo, single-tenant para duas pessoas (o casal) — sem app nativo, sem multiusuário (PRD §5). Next.js 16 + React 19, sem biblioteca de componentes (nenhum shadcn/MUI/Tailwind no projeto) — o sistema visual é CSS puro artesanal já documentado em `DESIGN.md`. Server Actions para toda mutação (`'use server'` inline nas páginas), Server Components para leitura — não há camada de API REST intermediária que o front consuma.

As duas contas reais (Tsuyoshi e Milena, provisionadas na Story 1.1) enxergam os mesmos dados de fatura, mas cada lançamento pertence a um titular. Não há conceito de "meu espaço" vs. "espaço do parceiro" na navegação — é um único espaço compartilhado, o que já está correto e deve ser preservado (qualquer proposta abaixo mantém essa premissa).

## Information Architecture

| Surface | Alcançada de | Propósito | Estado atual |
|---|---|---|---|
| **Início** (`/`) | Nav / login | Ponto de partida da jornada mensal (PRD UJ-1) | `[IMPLEMENTADO 2026-07-18]` Dashboard real com os 3 estados priorizados (fatura não enviada / cartões pendentes / gastos processados), descrito em Key Flow 1. |
| Enviar fatura (`/upload`) | Nav | Selecionar competência (mês/ano) e enviar planilha .xlsx | Funcional; link pós-sucesso já implementado (ver Key Flow 1). |
| Cartões (`/cartoes`) | Nav | Mapear cartão/titular novo → conta do casal | Funcional; badge de pendência na nav (`[IMPLEMENTADO 2026-07-18]`) já dá a pista antes exigida em outra tela. `[IMPLEMENTADO 2026-07-19]` mapeamento agora informa quantos lançamentos existentes foram afetados; seção separada lista cartões marcados "não é do casal" com opção de desfazer (ver "Achados de Correção Funcional" #2). |
| Categorias (`/categorias`) | Nav | Criar/editar/remover categorias do casal | Funcional. |
| Remover categoria (`/categorias/[id]/remover`) | Link "Remover" em Categorias | Confirmação dedicada antes de excluir, com contagem de impacto | Já é o padrão certo — replicar para outras ações destrutivas (ver Component Patterns). |
| Lançamentos (`/lancamentos`) | Nav | Revisar/corrigir categoria por competência | Competência persistente com Gastos já implementada (`[IMPLEMENTADO 2026-07-18]`). `[IMPLEMENTADO 2026-07-19]` indicador de parcela ("N/M") e datas em `DD-MM-AAAA` (ver "Achados de Correção Funcional" #1 e #3). |
| Gastos (`/gastos`) | Nav | Total por pessoa/categoria na competência, visão individual ou combinada | Competência persistente com Lançamentos já implementada. Bloco "Pendente de revisão" — `[IMPLEMENTADO 2026-07-19]` datas em `DD-MM-AAAA` e link "Resolver em Cartões" nos itens `titular_pendente`. |
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
| `item-card` (era `card`) | Um lançamento, um cartão pendente, uma categoria | Contém sempre uma ação primária de linha (Corrigir, Atribuir, Salvar) e nunca mais de uma ação secundária. Estado de carregamento por item — enquanto a Server Action daquele card está em voo, seu botão mostra `disabled` + rótulo de progresso (`[IMPLEMENTADO 2026-07-18]`, ver State Patterns), os demais cards da lista continuam interativos. |
| `summary-card` (era `card`) | Bloco agregado por pessoa (Gastos) ou por mês (Parcelas) | Título do bloco é sempre "quem/quando + valor total" (`{typography.section-title}`); nunca mistura ação de mutação — é só leitura. |
| Botão destrutivo `[IMPLEMENTADO 2026-07-18]` | "Não é do casal" (Cartões) | Hoje visualmente idêntico a "Cancelar" (`btn-secondary`). Passa a usar cor `{colors.danger}` no texto/borda — sinaliza "isto tem consequência" sem exigir uma tela de confirmação nova (a ação já é rara — cartão de terceiro é caso de borda, não fluxo comum). Remover categoria mantém sua página de confirmação dedicada (ação mais comum e com impacto maior: redireciona lançamentos). |
| Seletor de competência (mês/ano) | Upload, Lançamentos, Gastos | Hoje três instâncias independentes do mesmo par `<select>`. `[IMPLEMENTADO 2026-07-18]` — mesmo componente visual, mas ao navegar entre Lançamentos ↔ Gastos via nav, a competência selecionada persiste (ver IA). Upload continua sempre partindo do mês calendário atual — faz sentido para ele ser independente, já que upload é sempre "a fatura que acabou de fechar", raramente uma competência passada. |
| Badge de pendência `[IMPLEMENTADO 2026-07-18]` | Item de nav "Cartões" (quando há pendente) e "Lançamentos" (quando há "pendente de revisão" na competência atual) | Número pequeno ao lado do rótulo do link, cor `{colors.pending}`. Nunca bloqueia navegação — é aviso, não gate. Desaparece assim que a contagem chega a zero. |
| `empty-state` | Toda lista vazia | Já consistente (Cartões, Categorias, Lançamentos, Gastos, Parcelas). Manter: nunca texto vazio nem tabela sem linhas — sempre a frase + borda tracejada. |
| `alert-error` | Formulários | Já usado em Login/Upload/Senha. `[IMPLEMENTADO 2026-07-18]` — estender às Server Actions que hoje só logam no console (ver State Patterns). |

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

## Accessibility Floor

- Já implementado e correto: `role="alert"` + `aria-live` nos formulários client-side (Login, Upload, Esqueci senha, Redefinir senha); `aria-current="page"` no link de nav ativo; `<label>` associado a todo input; foco visível via anel de 2px (`{colors.accent}`). **Manter em qualquer tela nova ou corrigida.**
- Gap real: Server Actions sem feedback (ver State Patterns) também são um gap de acessibilidade, não só visual — hoje um usuário de leitor de tela não recebe nenhum anúncio de sucesso/falha ao corrigir uma categoria ou mapear um cartão, porque não há elemento `role="alert"`/`aria-live` nessas telas (não existe conteúdo para anunciar). Corrigir o gap de State Patterns resolve este também, com o mesmo componente (`alert-error`/`hint` com `aria-live="polite"`, já usado em Upload).
- WCAG 2.2 AA como piso — dark mode já respeita contraste (paleta com pares `-dark` dedicados, não é apenas inversão automática).
- Toda ação destrutiva (remover categoria, rejeitar cartão) precisa continuar operável só por teclado — a página de confirmação de Remover categoria já funciona assim (form + botão); o botão destrutivo proposto para "Não é do casal" deve manter o mesmo comportamento de `<button type="submit">` dentro de `<form>`, sem depender de clique de mouse ou hover.

## Key Flows

### Flow 1 — Revisão da fatura do mês (Tsuyoshi, fatura do Itaú acabou de fechar)

Realiza UJ-1 (PRD §2.3).

1. Tsuyoshi abre o app pelo celular, no fim de semana em que a fatura fechou. Hoje ele cai em `/` (Início) e vê só "Use o menu acima para enviar a fatura do mês..." — nenhuma indicação se a fatura de julho já foi enviada ou não.
2. `[IMPLEMENTADO 2026-07-18]` Com o dashboard: `/` mostra a competência atual (mês calendário) com um destes três estados, na ordem em que a jornada realmente progride — (a) "Fatura de julho ainda não enviada" + botão direto para `/upload`; (b) "3 cartões pendentes de mapeamento" + link para `/cartoes` (quando há pendência de FR-6 bloqueando a visão); (c) "Gastos de julho: R$ X (2 lançamentos pendentes de revisão)" + link para `/gastos`, quando já há dado processado.
3. Tsuyoshi vê "(a)", toca no botão, chega em `/upload` com mês/ano já pré-selecionado (o mês que o dashboard identificou como pendente, não necessariamente o mês calendário do dia — cobre o caso de conferir uma fatura de um mês anterior).
4. Envia a planilha. Upload processa (FR-2 a FR-6); ao concluir com sucesso, a mensagem de resultado `[IMPLEMENTADO 2026-07-18]` inclui um link direto: "12 lançamentos importados. Ver gastos de julho →" — hoje o sucesso só limpa o formulário, sem indicar o próximo passo.
5. Ele segue o link, chega em `/gastos?mes=7&ano=2026`, vê o bloco "Pendente de revisão" com 2 lançamentos sem categoria clara.
6. Segue para `/lancamentos` — `[IMPLEMENTADO 2026-07-18]` já com mês/julho pré-selecionado (competência persistente), não precisa reescolher.
7. Corrige as 2 categorias. Cada correção mostra feedback imediato (`[IMPLEMENTADO 2026-07-18]`: "Categoria atualizada." — hoje, nada aparece).
8. **Clímax:** volta para `/gastos` (mesma competência, sem reescolher) e vê o número final: quanto cada um gastou e em quê — em poucos minutos, sem ter aberto a planilha manualmente, exatamente o clímax descrito no PRD.
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
| `≥ 768px` (desktop/tablet) | Nav horizontal com título + 7 links, `flex-wrap` | Manter como está — cabe confortavelmente. |
| `< 768px` (celular, uso mais provável para conferir fatura no dia a dia) | Mesma nav horizontal quebra em 2–3 linhas (título + 7 links não cabem em 360–414px), empurrando o conteúdo da página para baixo da dobra | `[IMPLEMENTADO 2026-07-18]` nav colapsa para: título + botão de menu (hambúrguer) abrindo lista vertical de links, mesmo padrão de destaque do link ativo (`aria-current="page"`, borda `{colors.accent}`) já usado hoje |

Nenhuma diferença de conteúdo entre mobile e desktop é necessária — é o mesmo dado, mesma densidade; o ajuste é exclusivamente na navegação.

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
