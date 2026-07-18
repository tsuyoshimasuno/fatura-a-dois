---
title: 'Story 3.2: Sugestão automática de categoria'
type: 'feature'
created: '2026-07-18'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'e73a1fb8013ea5352e2c820cf02270780f0910c1'
final_revision: 'b6312084efa033b8f9060d0b0f2e68f1bd42c83a'
---

<intent-contract>

## Intent

**Problem:** Todo `lancamento` novo é inserido hoje (Story 2.2/2.4) sem nenhuma tentativa de categorização -- `categoriaId` nunca é setado no `INSERT`, então mesmo quando `lancamento-matching`/`upload.ts` gravam a linha, não existe nenhum ponto de código que decida "qual categoria sugerir" para esse lançamento.

**Approach:** Introduzir a função de resolução única prevista em AD-3 (`server/categorizacao/resolver-categoria-sugerida.ts`), chamada no ponto exato onde `upload.ts` insere lançamentos genuinamente novos (`delta.inserir`, nunca `delta.atualizar` -- reenvio nunca deve tocar a categoria de um lançamento já existente). Como a tabela `regra_categorizacao` (a etapa 1 de AD-3: regra memorizada fuzzy) só é criada na Story 3.3, a função nesta story implementa só o fallback -- toda resolução retorna `null` ("sem categoria") por enquanto. A Story 3.3 estende o corpo desta mesma função para checar `regra_categorizacao` antes de cair no fallback; nenhuma outra story precisa mudar depois disso.

## Boundaries & Constraints

**Always:** Todo `lancamento` genuinamente novo (`delta.inserir` em `upload.ts`) tem sua `categoriaId` decidida por `resolverCategoriaSugerida`, nunca deixada de fora do `INSERT` por omissão. `resolverCategoriaSugerida` é a única função de resolução de categoria sugerida -- nenhum outro ponto do código decide isso de forma independente (AD-3), preparando o terreno para a Story 3.3 estender o mesmo corpo sem introduzir uma segunda função paralela.

**Block If:** nenhuma decisão de código aqui depende de informação exclusiva do usuário.

**Never:** Nunca alterar `categoriaId` de um lançamento que já existia antes deste upload (`delta.atualizar`) -- reenvio de fatura nunca sobrescreve categorização (invariante herdado da Story 2.4/3.1). Nunca criar ou referenciar `regra_categorizacao` nesta story -- a tabela não existe até a Story 3.3; `resolverCategoriaSugerida` documenta esse fallback como um seam explícito, não como comportamento final. Nunca inventar uma heurística de categorização alternativa (palavras-chave fixas, etc.) não prevista em nenhum documento de planejamento -- a única fonte de sugestão prevista é a regra memorizada da Story 3.3.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Upload com lançamentos genuinamente novos | Planilha traz lançamentos que não existem ainda na competência | Cada lançamento novo é inserido com `categoriaId` explicitamente resolvido por `resolverCategoriaSugerida` (hoje sempre `null`, nunca omitido do INSERT) | Nenhum erro |
| Reenvio da mesma competência sem mudança | Lançamentos já existem (`delta.atualizar`/sem mudança) | `categoriaId` existente nunca é tocado | Nenhum erro |
| `resolverCategoriaSugerida` chamada diretamente | Qualquer texto de estabelecimento (normalizado ou não) | Retorna `null` (nenhuma regra memorizada existe ainda) | Nenhum erro |

</intent-contract>

## Code Map

- `server/categorizacao/resolver-categoria-sugerida.ts` -- NOVO: `resolverCategoriaSugerida(estabelecimento: string): Promise<number | null>`, hoje sempre retorna `null` (seam documentado para a Story 3.3 estender)
- `server/ingestao/upload.ts` -- MODIFICAR: no loop de `delta.inserir`, chamar `resolverCategoriaSugerida(item.estabelecimento)` e incluir o resultado como `categoriaId` no `INSERT`

## Tasks & Acceptance

**Execution:**
- [x] `server/categorizacao/resolver-categoria-sugerida.ts` -- criar `resolverCategoriaSugerida(estabelecimento: string): Promise<number | null>`; normaliza o estabelecimento via `normalizarEstabelecimento` (`server/shared/normalizar-estabelecimento`, AD-9) e retorna `null`; comentário explícito documentando que esta é a única função de resolução (AD-3) e que a Story 3.3 vai estender o corpo para checar `regra_categorizacao` (fuzzy match, prioridade por recência) antes do fallback, sem introduzir uma segunda função
- [x] `server/ingestao/upload.ts` -- no loop `for (const item of delta.inserir)`, antes do `tx.insert(lancamento).values({...})`, chamar `const categoriaId = await resolverCategoriaSugerida(item.estabelecimento);` e incluir `categoriaId` no objeto de valores do insert; não alterar o loop de `delta.atualizar` de forma nenhuma

**Acceptance Criteria:**
- Given um lançamento novo extraído (Epic 2), when ele é persistido pela primeira vez, then já tem uma categoria sugerida com base na descrição do estabelecimento ou "sem categoria" (`categoriaId: null`) explícito -- nunca fica de fora do INSERT sem essa decisão ter sido tomada
- Given um lançamento que já existia antes do upload atual, when a fatura é reenviada, then sua `categoriaId` permanece inalterada, independente do resultado de `resolverCategoriaSugerida`

## Design Notes

Esta story é deliberadamente um "seam": a função de resolução e o ponto de chamada em `upload.ts` já existem e já são exercitados a cada upload, mas o resultado prático hoje é sempre `null` porque `regra_categorizacao` (Story 3.3) ainda não existe. Isso evita duas alternativas piores: (a) esperar a Story 3.3 para tocar `upload.ts` pela primeira vez, misturando duas stories numa mudança só; ou (b) a Story 3.3 introduzir sua própria função de resolução paralela, violando AD-3 (uma função única). Quando a Story 3.3 criar `regra_categorizacao`, ela só precisa adicionar a consulta de fuzzy match dentro do corpo de `resolverCategoriaSugerida` antes do `return null` -- nenhuma mudança adicional em `upload.ts`.

O parâmetro recebe o estabelecimento bruto (não pré-normalizado) porque a normalização é responsabilidade interna da função de resolução (mesma decisão de design de `lancamento-matching`, que também normaliza internamente em vez de exigir que o chamador normalize antes).

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

### 2026-07-18 — Review pass 1

- intent_gap: 0
- bad_spec: 0
- patch: 2 (high 0, medium 2, low 0)
- defer: 0
- reject: 9
- addressed_findings:
  - `[medium]` `[patch]` `resolverCategoriaSugerida` chamava `normalizarEstabelecimento` e descartava o resultado -- código morto que não fazia nada além de simular uso futuro. Removida a chamada; a normalização real fica para a Story 3.3, quando o valor efetivamente for usado numa consulta.
  - `[medium]` `[patch]` A assinatura não recebia nenhum executor de banco (`db`/`tx`), então a promessa do Design Notes de que "a Story 3.3 não precisa mudar `upload.ts`" seria falsa assim que essa story precisasse consultar `regra_categorizacao` dentro da mesma transação do upload. Adicionado parâmetro `executor: Executor = db` (mesmo tipo estrutural `Pick<typeof db, 'select'>` já usado em `gerenciar-categorias.ts`); o call site em `upload.ts` já passa `tx`.
- Rejeitados (com razão): "a mudança é funcionalmente um no-op hoje" -- reject, é o comportamento deliberado de uma story-seam, já explícito no Design Notes da spec; falta de testes automatizados -- reject, gap pré-existente de todo o projeto já registrado em `deferred-work.md` desde a Story 1.2; comentário afirma um invariante (função única, AD-3) que nada além do próprio comentário garante -- reject, mesmo nível de enforcement de todo outro invariante arquitetural deste projeto (ex. AD-8), sem infraestrutura de lint customizado; risco de raio de explosão de falha quando a Story 3.3 adicionar a consulta real dentro da transação -- reject, especulativo sobre o desenho de uma story futura, a função atual não pode lançar exceção; padrão N+1 sequencial dentro do loop -- reject, mesmo padrão já usado no loop de resolução de `cartaoId` logo acima no mesmo arquivo, sem problema de escala real para 2 pessoas fazendo upload manual; async/Promise sem trabalho assíncrono ainda -- reject, decisão deliberada de assinatura prevendo a Story 3.3 (mesma lógica de manter `executor` desde já); documentação duplicada entre comentário e spec -- reject, mesmo padrão de comentários explicativos já usado em todo o projeto (`gerenciar-categorias.ts`, `mapear-cartao.ts`); falta de tratamento explícito de estabelecimento vazio -- reject, nenhuma diferença de comportamento hoje (sempre retorna `null`), decisão de matching fica para a Story 3.3; analogia imprecisa com `lancamento-matching` no comentário -- reject, resolvido como efeito colateral da remoção da chamada morta (comentário reescrito sem essa analogia).

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: sucesso

**Manual checks (if no CLI):**
- Chamar `resolverCategoriaSugerida` diretamente com alguns textos de estabelecimento reais (via script temporário) -- deve retornar `null` sem lançar erro
- Ler o `INSERT` de `delta.inserir` em `upload.ts` -- confirmar que `categoriaId` está explicitamente presente no objeto de valores (não omitido)
- Confirmar que o loop de `delta.atualizar` não foi alterado (sem qualquer menção a `categoriaId`)

## Auto Run Result

Status: done

**Summary:** Introduzida a função única de resolução de categoria sugerida (AD-3), `resolverCategoriaSugerida`, chamada no ponto de inserção de lançamentos genuinamente novos em `upload.ts` (`delta.inserir`). Hoje sempre retorna `null` ("sem categoria") porque `regra_categorizacao` só existe na Story 3.3; a assinatura já aceita um executor de banco (`db` ou uma transação) para que a Story 3.3 possa consultar a futura tabela dentro da mesma transação do upload, sem precisar tocar em `upload.ts` de novo.

**Files changed:**
- `server/categorizacao/resolver-categoria-sugerida.ts` (novo) -- `resolverCategoriaSugerida(estabelecimento, executor?)`, sempre retorna `null` por enquanto
- `server/ingestao/upload.ts` -- loop de `delta.inserir` agora chama `resolverCategoriaSugerida(item.estabelecimento, tx)` e inclui `categoriaId` explicitamente no `INSERT`; loop de `delta.atualizar` inalterado

**Review findings breakdown:** 2 patches aplicados (ambos médios: remoção de uma chamada morta a `normalizarEstabelecimento` cujo resultado era descartado; adição de um parâmetro de executor de banco para a função poder rodar dentro da transação de `upload.ts` quando a Story 3.3 precisar consultar `regra_categorizacao`, honrando a promessa de não alterar `upload.ts` de novo). 0 deferidos. 9 rejeitados -- majoritariamente preocupações especulativas sobre o desenho da Story 3.3 (raio de explosão de falha, padrão N+1) fora do escopo desta story-seam, ou convenções já estabelecidas no projeto (documentação por comentário, ausência de testes automatizados).

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos. Testado com um script temporário (removido após o uso) chamando `resolverCategoriaSugerida` diretamente com `db` global, com estabelecimento vazio/whitespace, e dentro de uma transação real (mesmo padrão do call site em `upload.ts`) -- todos os 3 cenários retornaram `null` sem lançar erro. Não foi necessário testar via upload real de planilha: a mudança em `upload.ts` é puramente estrutural (inclui uma chave já nula no INSERT) e já foi confirmada por leitura de código + tsc/lint/build; um reenvio das planilhas reais de fixture arriscaria tocar dado real sem necessidade, já que a função em si não tem lógica condicional a testar ainda.

**Residual risks:** Nenhum tratamento de exceção pensado para quando a Story 3.3 adicionar a consulta real a `regra_categorizacao` dentro do loop de `delta.inserir` -- uma falha nessa consulta vai abortar a transação inteira do upload; a Story 3.3 precisa decidir se isso é aceitável ou se precisa de um fallback silencioso.

Follow-up review recommended: false -- mudança pequena, sem alteração de comportamento observável em produção (o valor gravado em `categoria_id` continua sempre `null`), e os 2 patches aplicados são de limpeza/preparação de assinatura, não de correção de um defeito de dado ou de segurança.
