---
title: 'Story 4.1: Visão de gastos por pessoa e categoria'
type: 'feature'
created: '2026-07-18'
status: 'done'
baseline_revision: '21e58d58f0fc4853a1e97632d3744293c52e9cd5'
final_revision: 'fde6f87'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** O casal processa faturas (Epic 2) e corrige categorias (Epic 3), mas não existe nenhuma tela que resuma, para uma competência escolhida, quanto cada um gastou e em quê — hoje isso só é visível reabrindo a lista crua de lançamentos em `/lancamentos`.

**Approach:** Nova rota `/gastos` (Server Component) que agrega `lancamento` por competência, mostrando total + detalhamento por categoria por pessoa (via `server/visualizacao/resumo-gastos.ts`), com alternância combinada/individual via parâmetro de busca, e um grupo separado "pendente de revisão" para o que não pode ser atribuído com confiança.

## Boundaries & Constraints

**Always:**
- Agrupar sempre pela competência da fatura (`lancamento.competenciaAno`/`competenciaMes`), nunca pela data individual do lançamento.
- Um lançamento só entra no total/detalhamento de uma pessoa quando **ambos** são conhecidos e ativos: `cartao.usuarioId` não nulo **e** `lancamento.categoriaId` não nulo apontando para uma categoria com `removidoEm IS NULL`. Qualquer lançamento que falhe uma dessas condições (titular pendente de mapeamento, sem categoria, ou categoria removida) vai inteiro para o grupo "pendente de revisão" — nunca fica ausente da tela nem é contado parcialmente em algum total de pessoa.
- Exceção à regra acima: lançamentos de um cartão marcado `terceiro = true` (Story 2.3, "Não é do casal") são excluídos inteiramente da tela — nem em total de pessoa, nem em "pendente de revisão". Essa ambiguidade já foi resolvida explicitamente pelo casal; não é uma pendência acionável nesta tela (achado do review, corrigido antes do commit).
- Sempre listar as duas contas do casal (via `listarContasCasal()`, mesma função já usada em `/cartoes`) mesmo que uma delas não tenha nenhum lançamento resolvido na competência — mostrar total R$ 0,00 nesse caso, nunca omitir a pessoa.
- Reaproveitar o padrão já usado em `/lancamentos` e `/upload` para o seletor de competência: `<form method="GET">` com `mes`/`ano`, validado/default no servidor (mesma lógica de `competenciaValida`).
- A alternância combinada/individual é outro parâmetro do mesmo `GET` (`visao=combinada|individual`), não estado de cliente novo — mesma filosofia de UI sem fetch client-side já usada no restante do app. Default: `individual`.
- Extrair o formatador de centavos → R$ (hoje duplicado ad-hoc em `/lancamentos`) para `lib/moeda.ts` (`formatarValorEmReais(valorCentavos: number): string`) e usar esse helper tanto na página nova quanto em `/lancamentos/page.tsx` (substituindo a função local lá).
- UI nunca consulta o banco diretamente: toda leitura passa por `server/visualizacao/resumo-gastos.ts`.
- Valores em centavos (inteiro) do banco até a borda de formatação — nunca float intermediário.

**Block If:** Nenhuma decisão identificada que exija input humano — esta story é somente leitura (nenhuma mutação nova) sobre dados e regras já existentes (Epic 2/3).

**Never:**
- Não criar nenhuma tabela ou migration nova — o índice `lancamento_competencia_idx` já existe (`competenciaAno`, `competenciaMes`) e a agregação é toda em cima de tabelas existentes (`lancamento`, `cartao`, `categoria`).
- Não filtrar/considerar `compraParceladaId`/parcelas projetadas (Epic 5) — esta tela só enxerga lançamentos reais já persistidos.
- Não adicionar nenhuma mutação nesta tela (nem atalho para corrigir categoria) — isso já existe em `/lancamentos`; esta story é puramente de leitura/agregação.
- Não reintroduzir escopo por `auth.uid()` — dado do casal é compartilhado sem filtro de linha, mesma convenção de todo o restante do app.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path combinado | Competência com lançamentos resolvidos das duas pessoas em 3 categorias distintas | Total do casal = soma das duas pessoas; detalhamento por categoria mescla os totais das duas pessoas por `categoriaId` | Nenhum erro esperado |
| Happy path individual | Mesma competência, `visao=individual` (ou default) | Uma seção por pessoa, cada uma com seu total e seu detalhamento por categoria | Nenhum erro esperado |
| Titular pendente | Lançamento cujo `cartao.usuarioId` é nulo | Aparece no grupo "pendente de revisão", não soma em nenhum total de pessoa nem de categoria | Nenhum erro esperado |
| Categoria removida | Lançamento com `categoriaId` apontando para categoria com `removidoEm` preenchido | Aparece em "pendente de revisão"; não soma no detalhamento por categoria de ninguém | Nenhum erro esperado |
| Sem categoria (nunca corrigido) | Lançamento com `categoriaId` nulo (sugestão da Story 3.2 nunca resultou em match nem foi corrigido manualmente) | Aparece em "pendente de revisão" pelo mesmo princípio de "nunca ausente silenciosamente" — não é um caso citado à parte no AC, mas cai na mesma regra dos dois casos citados | Nenhum erro esperado |
| Competência vazia | Nenhum lançamento na competência selecionada | Cada pessoa mostra total R$ 0,00 e nenhuma categoria; grupo "pendente de revisão" não aparece (ou aparece vazio/omitido) | Nenhum erro esperado |
| `mes`/`ano` inválidos ou ausentes na URL | `searchParams` malformado | Cai no mês/ano atuais, mesma lógica de `competenciaValida` já usada em `/lancamentos` | Nenhum erro — nunca 500 por parâmetro de URL |
| `listarContasCasal()` falha (Admin API indisponível) | Erro de rede/credencial na chamada Supabase Admin | Página ainda renderiza; grupo "pendente de revisão" mostra todos os lançamentos da competência (já que nenhuma pessoa pode ser confirmada), mesma degradação graciosa (`try/catch` → lista vazia/log) já usada em `listarContasCasal` | Erro logado via `console.error`, nunca propaga para quebrar a página |

</intent-contract>

## Code Map

- `db/schema/index.ts` -- schema de `lancamento`/`cartao`/`categoria` já existente, sem alteração; índice de competência já cobre esta agregação.
- `server/ingestao/mapear-cartao.ts` -- `listarContasCasal()` já existe e será reaproveitada (mesma função usada em `/cartoes`).
- `server/categorizacao/corrigir-categoria.ts` -- referência de padrão (`Executor`/tipos de retorno) para o novo módulo `server/visualizacao`.
- `app/(app)/lancamentos/page.tsx` -- referência de padrão (seletor de competência via GET, formatação de moeda a ser extraída de lá).
- `app/(app)/_components/nav.tsx` -- adicionar item de navegação "Gastos".

## Tasks & Acceptance

**Execution:**
- [x] `lib/moeda.ts` -- NOVO: extrair `formatarValorEmReais(valorCentavos: number): string` (mesmo `Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'})` já usado em `/lancamentos`) -- centraliza formatação de moeda antes de uma segunda tela precisar dela
- [x] `app/(app)/lancamentos/page.tsx` -- ATUALIZAR: remover `formatadorValor`/`formatarValor` locais, importar `formatarValorEmReais` de `lib/moeda.ts` -- elimina a duplicação assim que ela aparece pela segunda vez
- [x] `server/visualizacao/resumo-gastos.ts` -- NOVO: `obterResumoGastos(ano: number, mes: number)` retornando `{ pessoas: {usuarioId, email, totalCentavos, categorias: {categoriaId, nome, totalCentavos}[]}[], pendentes: {totalCentavos, itens: {id, data, estabelecimento, valorCentavos, motivo: 'titular_pendente'|'sem_categoria'|'categoria_removida'}[]} }` -- uma query (`leftJoin` cartao + categoria, filtrando por competência) seguida de agregação em memória, cruzando com `listarContasCasal()` para garantir as duas pessoas sempre presentes -- lógica central da story, isolada e testável sem depender de UI
- [x] `app/(app)/gastos/page.tsx` -- NOVO: Server Component `async`; lê `searchParams` (`mes`, `ano`, `visao`), valida com a mesma lógica de `competenciaValida` (duplicar localmente, mesmo padrão já repetido em `/upload` e `/lancamentos`), chama `obterResumoGastos`, renderiza formulário GET (mês/ano + toggle combinada/individual como radios que também submetem via GET), seção por pessoa (ou seção combinada somando por categoria) e seção "pendente de revisão" com os itens e o motivo -- é a superfície visível da story, cobre todas as três Given/When/Then do AC
- [x] `app/(app)/_components/nav.tsx` -- ATUALIZAR: adicionar `{ href: '/gastos', label: 'Gastos' }` ao array `LINKS`, entre "Lançamentos" e "Upload" -- sem isso a tela existe mas fica inacessível pelo fluxo normal de navegação
- [x] Testar a combinação combinada/individual e os três motivos de "pendente de revisão" com um script temporário contra o Supabase de produção real (mesmo padrão das stories anteriores: dados sintéticos, removidos após o uso, sem tocar dado real do casal)

**Acceptance Criteria:**
- Given lançamentos existentes para uma competência com titular e categoria ativa resolvidos, when seleciono essa competência, then vejo o total gasto por pessoa e o detalhamento por categoria dentro do gasto de cada pessoa
- Given a tela de gastos está aberta, when alterno entre visão combinada e individual, then os totais mudam de acordo (combinada = soma das duas pessoas por categoria; individual = uma seção por pessoa)
- Given lançamentos com titular pendente de mapeamento, sem categoria, ou com categoria removida, when vejo a competência, then eles aparecem num grupo separado "pendente de revisão", nunca ausentes silenciosamente da visão nem contados em algum total de pessoa

## Spec Change Log

(vazio -- nenhum loopback de bad_spec disparado nesta story; o achado sobre cartão `terceiro` foi endereçado como patch direto, ver Review Triage Log.)

## Review Triage Log

### 2026-07-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4 (1: high 0, medium 1, low 3)
- defer: 2 (0: high 0, medium 0, low 2)
- reject: 6 (0: high 0, medium 0, low 6)
- addressed_findings:
  - `[medium]` `[patch]` Lançamentos de um cartão marcado `terceiro = true` (Story 2.3, "Não é do casal") caíam em "pendente de revisão" com motivo `titular_pendente` para sempre, mesmo já resolvidos pelo casal — inflava a pendência com itens não-acionáveis e o rótulo era enganoso. `resumo-gastos.ts` agora seleciona `cartao.terceiro` e exclui essas linhas inteiramente (nem pessoa, nem pendente). Boundaries & Constraints amendada para documentar a exceção.
  - `[low]` `[patch]` `categoriaId` não nulo com `categoriaNome` nulo (referência órfã, não deveria acontecer sob operação normal já que categoria só some via soft-delete) tratado como defesa em profundidade: cai em `sem_categoria` em vez de arriscar um `nome: null` vazando pro total de uma pessoa via cast indevido.
  - `[low]` `[patch]` Visão individual não mostrava nenhuma mensagem quando `resumo.pessoas` vem vazio (`listarContasCasal()` degradado) — página parecia quebrada/em branco. Adicionada mensagem de fallback, mesmo padrão de estado vazio já usado em `/lancamentos`.
  - `[low]` `[patch]` `competenciaValida` duplicada uma terceira vez dentro do próprio diff, inconsistente com a extração de `formatarValorEmReais` feita no mesmo diff pela mesma razão (2ª ocorrência). Extraída para `lib/competencia.ts`, reaproveitada por `/lancamentos` e `/gastos` (`/upload` mantém cópia própria — arquivo não tocado por esta story).
- deferred:
  - `[low]` Item de "pendente de revisão" com motivo `categoria_removida` não mostra o nome da categoria removida — dificulta decidir para qual categoria recategorizar. Não exigido pelo AC; possível melhoria futura.
  - `[low]` Se `listarContasCasal()` falhar (Admin API indisponível), a visão combinada ainda mostra o card "Casal -- R$ 0,00" com aparência de normalidade, indistinguível de um mês real sem gastos. Padrão de degradação silenciosa já aceito no restante do app (Story 2.3); correção completa (banner de erro explícito) é uma preocupação transversal, fora do escopo desta story.
- Rejeitados (com razão): falta de suíte de testes automatizados -- reject, gap pré-existente de todo o projeto, já documentado em `deferred-work.md` desde a Story 1.2; `combinarCategorias` confiar em `categoriaId` como chave segura entre pessoas sem guard defensivo -- reject, especulativo sobre uma mudança de schema hipotética futura (categoria é documentadamente compartilhada/global hoje), mesmo padrão de rejeição de Story 3.3; falta de critério de desempate na ordenação por `totalCentavos` -- reject, cosmético, app de uso doméstico de 2 usuários, mesmo padrão de rejeição de nitpicks de ordenação da Story 3.3; `mes`/`ano` inválidos na URL substituídos silenciosamente pelo mês/ano atual sem indicação -- reject, comportamento idêntico e pré-existente em `/lancamentos` e `/upload`, não introduzido por esta story; `ano` válido (2000-2100) mas fora do intervalo do dropdown (anoAtual-1..+1) aparece com seleção incompatível -- reject, mesmo padrão pré-existente compartilhado com `/lancamentos` e `/upload`; `titularConfirmado` exigir presença em `listarContasCasal()` em vez de só `usuarioId` não nulo -- reject, decisão deliberada e já documentada em comentário no código, é exatamente o que resolve o edge case de degradação exigido pela I/O Matrix da própria spec.

## Design Notes

Toggle combinada/individual e seletor de competência via `<form method="GET">` (não estado de cliente) -- mesma filosofia de todas as outras telas do app (sem fetch client-side). `obterResumoGastos` faz uma única query com dois `leftJoin` e agrega em memória (JS `Map`) em vez de `GROUP BY` no SQL, porque a regra de negócio ("ambos titular e categoria devem estar resolvidos, senão vai inteiro para pendente") é mais simples de expressar como um filtro por linha do que como agregação SQL condicional, e o volume de dados (~100-160 lançamentos/mês) não justifica a complexidade extra de mover isso pro banco.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem violações
- `npm run build` -- expected: build de produção limpo, incluindo a nova rota `/gastos`

**Manual checks (if no CLI):**
- Contra o Supabase de produção real, com um script temporário (removido após o uso): criar lançamentos sintéticos cobrindo os 3 motivos de pendência + pelo menos 2 categorias ativas para cada uma das duas contas reais numa competência de teste; acessar `/gastos?ano=...&mes=...` e `/gastos?ano=...&mes=...&visao=combinada` (via `curl` ou navegação) e conferir que os totais batem com a soma esperada manualmente; limpar os dados sintéticos ao final.

## Auto Run Result

Status: done

**Summary:** Nova tela `/gastos` (Epic 4, Story 4.1): para uma competência selecionada, mostra o total gasto por pessoa e o detalhamento por categoria dentro do gasto de cada uma, com alternância combinada/individual, e um grupo "pendente de revisão" (titular pendente de mapeamento, sem categoria, ou categoria removida) que nunca fica ausente da visão. Nova função de agregação `obterResumoGastos` em `server/visualizacao/resumo-gastos.ts`, módulo novo dedicado a leitura/visualização.

**Files changed:**
- `server/visualizacao/resumo-gastos.ts` (novo) -- `obterResumoGastos(ano, mes)`: uma query com dois `leftJoin` + agregação em memória, cruzada com `listarContasCasal()`
- `app/(app)/gastos/page.tsx` (novo) -- Server Component; seletor de competência + toggle combinada/individual via `GET`; seções por pessoa/combinada + "pendente de revisão"
- `lib/moeda.ts` (novo) -- `formatarValorEmReais`, extraído de `/lancamentos` assim que uma segunda tela precisou do mesmo formatador
- `lib/competencia.ts` (novo) -- `competenciaValida`, extraído de `/lancamentos` durante o review para evitar uma terceira duplicação dentro do próprio diff
- `app/(app)/lancamentos/page.tsx` -- atualizado para importar `formatarValorEmReais`/`competenciaValida` dos novos helpers em vez de definições locais
- `app/(app)/_components/nav.tsx` -- adicionado item de navegação "Gastos"

**Review findings breakdown:** 4 patches aplicados (1 médio: lançamentos de cartão `terceiro` -- já resolvido como "não é do casal", Story 2.3 -- caíam em "pendente de revisão" para sempre, item não-acionável e enganoso; corrigido excluindo essas linhas inteiramente da agregação; 3 baixos: defesa em profundidade contra `categoriaNome` nulo com `categoriaId` não nulo, mensagem de fallback na visão individual quando nenhuma conta é resolvida, dedup de `competenciaValida` introduzida pelo próprio diff). 2 deferidos (nome da categoria removida não aparece no item pendente; degradação silenciosa de `listarContasCasal()` na visão combinada, padrão já aceito no resto do app). 6 rejeitados -- majoritariamente comportamento pré-existente e idêntico em `/lancamentos`/`/upload` não introduzido por esta story, ou especulação sobre mudanças de schema hipotéticas futuras, mesmo padrão de rejeição das stories anteriores do Epic 3.

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos, incluindo a nova rota `/gastos`. Testado de ponta a ponta com um script temporário (removido após o uso, sem resíduo confirmado por query pós-limpeza) contra o Supabase de produção real, usando as duas contas reais do casal + categorias/cartões/lançamentos sintéticos: total e detalhamento por categoria por pessoa, soma correta na visão combinada, os 3 motivos de pendência distintos e corretos, e (após o patch) confirmação de que um lançamento de cartão `terceiro` não aparece nem em pessoa nem em pendente. Todas as 12 verificações passaram nas duas rodadas (antes e depois do patch do cartão terceiro).

**Residual risks:** Degradação silenciosa se `listarContasCasal()` falhar (ver deferred-work.md, padrão pré-existente); sem retroatividade automática se uma categoria for removida com lançamentos antigos (já eram "pendente de revisão" antes desta story, apenas agora visíveis); sem cobertura de teste automatizado (gap pré-existente de todo o projeto).

Follow-up review recommended: false -- feature de leitura/agregação pura (sem mutação nova), um único achado de severidade média já corrigido e reverificado ponta a ponta contra produção real, sem acoplamento novo com lógica de escrita de outras stories.
