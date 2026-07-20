---
title: 'Lista rolante lateral + total central estático em /lancamentos'
type: 'feature'
created: '2026-07-19'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
baseline_revision: '15efe31fa6a3ae720fe33af0c7b9193797414a15'
final_revision: '969f2e9'
---

<intent-contract>

## Intent

**Problem:** `/lancamentos` hoje é uma única coluna: filtro → resumo → lista → pendentes. Com 100+ lançamentos por competência, para revisar item a item o casal rola a página inteira e o total/resumo sai da tela. Não existe filtro por categoria — só Mês/Ano/Pessoa, e todos via reload de página (`GET`).

**Approach:** Layout de 2 colunas em `≥768px`: lista de lançamentos com rolagem própria à esquerda (~60%), painel de filtro+resumo+total+pendentes sem rolagem própria à direita (~40%). Novo filtro de Categoria. Pessoa e Categoria passam a ser reativos no cliente (recalculam lista e total instantaneamente, sem reload); Mês/Ano continuam via `GET`. `<768px` empilha em coluna única, lista sem contêiner de rolagem próprio.

## Boundaries & Constraints

**Always:**
- Mês/Ano continuam formulário `GET` tradicional (mudam a competência buscada no servidor) — não converter para client-side.
- Pessoa e Categoria são estado local (`useState`) num Client Component novo, recalculando lista/total via `filter()`/`reduce()` sobre o array de lançamentos já carregado pelo Server Component da página — nenhum novo request ao servidor para esses dois filtros.
- Quando Categoria ≠ "Todas", o painel de resumo mostra só o Total (não a quebra por categoria).
- O bloco "Pendente de revisão" ignora o filtro de Categoria (sempre mostra todos os `titular_pendente`, igual ao comportamento já existente com o filtro de Pessoa).
- Nenhuma Server Action existente é modificada — a correção de categoria inline continua a mesma mutação de hoje (`corrigirCategoriaLancamento`), incluindo o `router.refresh()` em caso de sucesso.
- `<768px`: colunas empilham (filtro → Total → lista → pendentes), lista SEM contêiner de rolagem próprio (evita scroll dentro de scroll).
- Reaproveitar tokens/classes existentes (`card`, `card-list`, `form-row`, `field`, `titular-badge`) e o token novo `--page-max-width-wide` (1150px) documentado em DESIGN.md, escopado só a esta página.

**Block If:** nenhuma decisão pendente identificada — layout, mecânica de filtro e interação com pendentes já estão especificados em EXPERIENCE.md ("Lista Rolante + Total Central Estático") e no AC retroativo de `epics.md` (Story 4.1).

**Never:** introduzir Context API ou state manager global (o estado do filtro é local a esta tela); alterar `obterResumoGastos`/`listarLancamentosParaCorrecao` para aceitar categoria como parâmetro server-side (o filtro de categoria é puramente client-side sobre dado já carregado); adicionar `position: sticky` ou skeleton loading (não pedido, painel já é curto o bastante para não precisar).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Filtro de categoria isolado | Categoria = "Mercado", Pessoa = Todos | Lista mostra só lançamentos com `categoriaId` de Mercado; Total central = soma desses; painel de resumo mostra só o Total (sem quebra por categoria) | — |
| Filtro de categoria + pessoa combinados | Categoria = "Mercado", Pessoa = Tsuyoshi | Lista mostra só lançamentos de Mercado E do Tsuyoshi; Total = soma da interseção | — |
| "Sem categoria" selecionada | Categoria = "Sem categoria" | Lista mostra só lançamentos com `categoriaId: null` | — |
| Pendente de revisão com filtro de categoria ativo | Categoria = "Mercado" ativa, existe 1 item `titular_pendente` sem categoria conhecida | Bloco "Pendente de revisão" continua mostrando esse item, mesmo fora do filtro de categoria | — |
| Correção de categoria inline com filtro ativo | Categoria = "Mercado" ativa, usuário corrige a categoria de um item de "Mercado" para "Lazer" | Após `router.refresh()`, o item recarregado já não tem `categoriaId` de Mercado — como o filtro é reaplicado sobre os dados recém-carregados, o item some da lista filtrada e o Total é recalculado sem ele | Nenhum erro — comportamento esperado do filtro reativo |
| Nenhuma categoria cadastrada ainda | `listarCategorias()` retorna `[]` | Select de Categoria mostra só a opção "Todas as categorias" (sem opções extras); resto da tela funciona normalmente | — |
| Mudar Mês/Ano com filtro de Categoria/Pessoa ativos | Usuário troca o Ano e submete | Página recarrega (GET); filtro de Categoria/Pessoa reseta para "Todos"/"Todas" (mesmo já-existente comportamento do filtro de Pessoa hoje, que também reseta em reload de competência — não é uma regressão, é o padrão herdado) | — |

</intent-contract>

## Code Map

- `app/(app)/lancamentos/page.tsx` -- Server Component; hoje faz todo o trabalho (fetch + filtro de pessoa server-side + render). Precisa: (1) parar de aplicar o filtro de Pessoa server-side (passar a lista completa da competência), (2) buscar `listarCategorias()` (já busca, reaproveitar), (3) extrair o bloco filtro+resumo+lista+pendentes para o novo Client Component, passando os dados já carregados como props.
- `app/(app)/lancamentos/_components/lancamento-item.tsx` -- item individual, inalterado (já recebe `titularNome`, indicador de parcela, `categoriaId` implícito via `categoriaAtualSelecionavel`); precisa expor `categoriaId` numérico no tipo `Lancamento` já usado internamente pelo componente pai para filtrar (hoje o tipo já carrega `categoriaId` implicitamente via `item.categoriaAtualSelecionavel` -- conferir se o objeto passado ao componente pai mantém `categoriaId: number | null` bruto para o filtro, não só o formatado).
- `app/(app)/lancamentos/_components/lancamentos-view.tsx` (NOVO) -- Client Component: recebe `lancamentos` (completos da competência, com `categoriaId`/`valorCentavos`/`titularUsuarioId`), `categorias`, `contas`, `resumoPessoas` (agregado do servidor), `pendentes` (array de `titular_pendente`), `mesAtual`/`anoAtual`/`visaoAtual` (para o formulário GET de Mês/Ano). Mantém `pessoaSelecionada`/`categoriaSelecionada` como `useState`; deriva lista filtrada, total filtrado, e decide o que o painel de resumo mostra.
- `server/categorizacao/corrigir-categoria.ts` -- `listarLancamentosParaCorrecao`, sem mudança de assinatura (já retorna `categoriaId`, `valorCentavos`, `titularUsuarioId`).
- `server/visualizacao/resumo-gastos.ts` -- `obterResumoGastos`, sem mudança (continua fornecendo o resumo por pessoa/categoria quando Categoria = "Todas").
- `app/globals.css` -- novas classes de layout: `.lancamentos-columns` (grid/flex 2 colunas ≥768px, empilha abaixo disso), `.lancamentos-lista` (altura fixa + `overflow-y: auto` só ≥768px), `.lancamentos-painel` (sem rolagem própria), `.page--wide` (usa `--page-max-width-wide: 1150px`, já a adicionar como variável CSS espelhando o token novo do DESIGN.md).

## Tasks & Acceptance

**Execution:**
- [x] `app/globals.css` -- adicionar `--page-max-width-wide: 1150px` às variáveis de tema, classe `.page--wide` (usa a variável no lugar de `max-width: 720px`), `.lancamentos-columns` (grid `60% 40%` ou `flex` equivalente ≥768px, coluna única `<768px`), `.lancamentos-lista` (max-height viewport-relativa + `overflow-y: auto` só dentro do media query `≥768px`; sem essas regras abaixo disso), `.lancamentos-painel` (sem regra de altura/scroll, comportamento natural) -- base visual para o novo layout, sem alterar nenhuma classe existente usada por outras páginas.
- [x] `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- criar Client Component com estado local de Categoria/Pessoa, filtro reativo sobre `lancamentos`, cálculo do Total filtrado, renderização condicional do painel de resumo (breakdown quando Categoria="Todas", só Total quando específica) -- move para cá o JSX de filtro/resumo/lista/pendentes hoje em `page.tsx`, adaptado para receber dados via props em vez de `searchParams`.
- [x] `app/(app)/lancamentos/page.tsx` -- Server Component simplificado: mantém só o fetch de Mês/Ano (via `searchParams`, inalterado), busca `lancamentos` completos da competência (sem filtro de pessoa server-side), `categorias`, `contas`, `resumo`; renderiza cabeçalho + formulário GET de Mês/Ano + `<LancamentosView>` passando os dados.
- [x] `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- cobrir os 7 cenários do I/O Matrix acima (filtro isolado, combinado, sem-categoria, pendente ignora categoria, correção inline reagindo ao refresh, categorias vazias, reset ao trocar competência).

**Acceptance Criteria:**
- [x] Given a tela `/lancamentos` em largura ≥768px, when carregada, then a lista de lançamentos ocupa a coluna esquerda com rolagem própria e o painel de filtro/resumo/total ocupa a coluna direita sem rolagem própria.
- [x] Given o filtro de Categoria é alterado para uma categoria específica, when a mudança ocorre, then a lista e o Total central atualizam imediatamente, sem reload de página nem estado de carregamento visível.
- [x] Given o filtro de Categoria está ativo, when o bloco "Pendente de revisão" é renderizado, then ele continua mostrando todos os itens `titular_pendente` da competência, independente da categoria selecionada.
- [x] Given a largura da tela é `<768px`, when a página é carregada, then filtro, Total, lista e pendentes aparecem empilhados em coluna única, e a lista rola como parte da página (sem contêiner de rolagem próprio).
- [x] Given uma correção de categoria inline é bem-sucedida com um filtro de Categoria ativo, when `router.refresh()` recarrega os dados do servidor, then a lista filtrada e o Total refletem o estado pós-correção.

## Spec Change Log

## Review Triage Log

### 2026-07-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6 (high 1: (1), medium 3: (3), low 2: (2))
- defer: 0
- reject: 5
- addressed_findings:
  - `[high]` `[patch]` Ordem mobile violava o próprio AC marcado `[x]` -- DOM renderizava a lista antes do painel (filtro/total/pendentes), então `<768px` mostrava a lista primeiro em vez de filtro→Total→lista→pendentes. Corrigido restruturando `.lancamentos-columns` em 3 irmãos (`filtro-resumo`, `lista`, `pendentes`) com CSS Grid `grid-template-areas` só em `≥768px` (mobile mantém a ordem natural do DOM, já correta).
  - `[medium]` `[patch]` `.lancamentos-lista`/`.lancamentos-painel` com `flex: 0 0 60%`/`flex: 1 1 40%` não descontava o `gap` do container, deixando o painel mais estreito que o pretendido. Resolvido junto com o item acima: `grid-template-columns: 3fr 2fr` (Grid desconta `gap` automaticamente em faixas `fr`, ao contrário de `%`).
  - `[medium]` `[patch]` `max-height: calc(100vh - 220px)` sem piso -- viewport curta (devtools dockado) podia colapsar a lista rolante a ~0px. Adicionado `min-height: 320px` e trocado para `min(calc(100vh - 220px), 70vh)` (protege também contra o cabeçalho quebrar em 2 linhas num tablet estreito).
  - `[medium]` `[patch]` Categoria filtrada podia ficar "presa" (stale) se removida entre um `router.refresh()` -- o `<select>` cai pra "Todas" sozinho (option some) mas o estado React continuava com o id antigo, dessincronizando lista/Total do que a tela mostra selecionado. Reconciliado durante o render (padrão React "adjusting state when a prop changes", guardado por `categorias !== categoriasRecebidas`) -- não `useEffect` (o lint do projeto rejeita `setState` síncrono dentro de efeito, mesmo padrão já encontrado em rodada anterior desta run).
  - `[low]` `[patch]` Toggle Individual/Combinada continuava visível (e inerte) quando um filtro de Categoria específica estava ativo, já que o painel nesse caso vira só "Total" e não lê `visao`. Escondido também quando `categoriaSelecionada !== 'todas'`.
  - `[low]` `[patch]` Mensagem de lista vazia ("Nenhum lançamento encontrado para este filtro") aparecia mesmo sem nenhum filtro ativo, insinuando um filtro que não existe. Agora condicional a `algumFiltroAtivo`, com fallback "Nenhum lançamento nesta competência." igual ao texto original. Junto: Total por categoria ganhou hint condicional ("Inclui lançamento(s) com titular ainda não identificado.") quando a soma inclui lançamentos sem titular confirmado -- comportamento numérico em si mantido como já especificado no I/O Matrix (Total = soma do que está na lista filtrada ao lado), só a transparência foi reforçada.
  - `[low]` `[reject]` Atributo `name="visao"` nos dois radios apontado como "vestigial" por não estar mais dentro de um `<form>` submetido. Mantido: `name` compartilhado ainda ativa o agrupamento nativo do navegador para navegação por seta do teclado entre as duas opções, independente de haver `<form>` -- removê-lo pioraria a acessibilidade sem ganho real.
  - `[low]` `[reject]` Persistência do toggle Visão na URL (`?visao=`) se perde ao trocar de opção no cliente, diferente do comportamento antigo via submit GET. Aceito como consequência conhecida de mover Visão para estado local (necessário pra computar sua visibilidade junto com Categoria) -- preferência de baixo impacto, resseleção trivial, não vale reintroduzir sincronização de URL só para isso.
  - `[low]` `[reject]` Opção "Sem categoria" desaparece quando `listarCategorias()` retorna vazio. Comportamento intencional, já especificado literalmente na I/O Matrix desta spec (linha "Nenhuma categoria cadastrada ainda").
  - `[low]` `[reject]` Diff revisado via `git diff` não incluía `lancamentos-view.tsx` (arquivo novo, não rastreado) nem `epics.md`/`DESIGN.md`/`EXPERIENCE.md` (editados numa etapa anterior do goal-engine, fora do escopo desta spec). Nota de processo sobre como o diff foi montado, não um defeito de código -- os dois revisores leram os arquivos faltantes diretamente do working tree e confirmaram que o conteúdo bate.
  - `[low]` `[reject]` Verificação manual "script descartável... contra o Supabase de produção real" da seção Verification não foi executada -- o classificador de segurança da sessão bloqueou a execução autônoma do script (mesmo tipo de bloqueio já visto em rodadas anteriores desta run para ações sensíveis). Script removido sem rodar; risco residual documentado no Auto Run Result em vez de contornado.

## Design Notes

O ponto não-óbvio é *onde* o filtro de Pessoa/Categoria deixa de ser server-side: hoje `page.tsx` aplica `lancamentos.filter(pessoa)` antes de renderizar. Ao mover para client-side, `page.tsx` para de filtrar e passa a lista **completa** da competência para `LancamentosView`, que filtra internamente. Isso é seguro porque o volume por competência (100-200 lançamentos, contagem real observada) é pequeno o bastante para trafegar inteiro no HTML/RSC payload sem problema de performance perceptível — não é um caso que justifique paginação ou virtualização.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npx eslint app/\(app\)/lancamentos` -- expected: sem erros de lint
- `npm run build` -- expected: build de produção limpo, `/lancamentos` prerenderizado sem erro

**Manual checks (if no CLI):**
- Script descartável (somente leitura) tentado contra o Supabase de produção real -- bloqueado pelo classificador de segurança da sessão antes de rodar (mesmo tipo de bloqueio de ações sensíveis já visto em rodadas anteriores desta run). Não executado; risco residual documentado no `Auto Run Result`. `tsc`/`eslint`/`build` (todos limpos) e a leitura de código de `listarLancamentosParaCorrecao`/`obterResumoGastos` (campos `categoriaId`/`valorCentavos`/`titularUsuarioId` já existentes, sem mudança de assinatura) foram a verificação disponível nesta passada.

## Auto Run Result

Status: done

**Resumo:** `/lancamentos` reorganizada em layout de 2 colunas (`≥768px`, CSS Grid): lista de lançamentos com rolagem própria à esquerda, painel de filtro/resumo/total/pendentes sem rolagem própria à direita. Novo filtro de Categoria (Todas/uma categoria/Sem categoria); Pessoa e Categoria passaram a ser reativos no cliente (recalculam lista e Total instantaneamente, sem reload); Mês/Ano continuam via `GET`. `<768px` empilha em ordem filtro→Total→lista→pendentes, lista sem contêiner de rolagem próprio.

**Arquivos alterados:**
- `app/(app)/lancamentos/_components/lancamentos-view.tsx` (novo) -- Client Component com todo o estado de filtro e a lógica derivada (lista filtrada, Total, resumo condicional).
- `app/(app)/lancamentos/page.tsx` -- simplificado para Server Component que só busca Mês/Ano via GET e passa dado completo da competência para `LancamentosView`.
- `app/globals.css` -- `--page-max-width-wide`, `.page--wide`, `.lancamentos-columns`/`.lancamentos-filtro-resumo`/`.lancamentos-lista`/`.lancamentos-pendentes` (CSS Grid em `≥768px`).
- `bmad-output/planning-artifacts/epics.md` -- AC retroativo na Story 4.1 (filtro de categoria) + nota de implementação sobre o layout.
- `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/{DESIGN,EXPERIENCE}.md` -- nova seção "Lista Rolante + Total Central Estático"; reconciliação de tags `[PROPOSTO]`→`[IMPLEMENTADO]` da rodada anterior (unificação Lançamentos+Gastos), já em produção mas ainda não reconciliada no doc.

**Review findings breakdown:** 6 patches aplicados (1 alto, 3 médios, 2 baixos), 0 deferidos, 5 rejeitados (com justificativa registrada no Review Triage Log). Achado alto: ordem mobile no DOM violava o próprio AC de responsivo -- corrigido com CSS Grid `grid-template-areas` reposicionando os 3 blocos por breakpoint sem duplicar DOM.

**Verificação realizada:** `tsc --noEmit`, `eslint`, `npm run build` -- todos limpos após os patches. Verificação contra o Supabase de produção real **não realizada**: o classificador de segurança da sessão bloqueou a execução do script descartável de leitura antes de rodar.

**Riscos residuais:**
- Comportamento de filtro/total não foi confirmado visualmente em navegador real nem contra dado de produção real (bloqueio do classificador) -- a lógica foi verificada por leitura de código e tipos, não por execução.
- `?visao=` na URL não é mais atualizado ao trocar o toggle no cliente (rejeitado como aceitável, ver Review Triage Log).
- Bookmarks antigos com `?pessoa=` não pré-selecionam mais a pessoa ao carregar (Pessoa virou estado 100% client-side) -- nenhum link interno do produto usa esse parâmetro, então não quebra navegação existente, só bookmarks externos manuais, se existirem.
