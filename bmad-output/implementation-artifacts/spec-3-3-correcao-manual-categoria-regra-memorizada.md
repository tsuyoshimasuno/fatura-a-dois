---
title: 'Story 3.3: Correção manual de categoria com regra memorizada'
type: 'feature'
created: '2026-07-18'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
baseline_revision: '4b73a90c4ce91fedf89bf7a0860a059b3d8247ff'
final_revision: '4f06eac41fd7347afb9c170ff7a29b55abc8b15f'
---

<intent-contract>

## Intent

**Problem:** `resolverCategoriaSugerida` (Story 3.2) sempre retorna `null` porque não existe nenhuma regra memorizada ainda, e não há nenhuma tela onde o casal possa corrigir a categoria de um lançamento -- a correção manual e o aprendizado por padrão de estabelecimento (FR10) não existem.

**Approach:** Nova tabela `regra_categorizacao` (padrão de estabelecimento normalizado -> categoria, compartilhada pelas duas contas). Tela `/lancamentos` (por competência) lista lançamentos com sua categoria atual e permite corrigir cada um; a correção atualiza o lançamento imediatamente e cria/atualiza (upsert) a regra memorizada daquele padrão de estabelecimento. `resolverCategoriaSugerida` passa a consultar `regra_categorizacao` via `similarity()` (`pg_trgm`, confirmado disponível no Supabase real via spike) antes do fallback -- fecha a etapa 1 de AD-3, que a Story 3.2 deixou como seam. `removerCategoria` (Story 3.1) passa a redirecionar ou remover as regras que apontavam para a categoria excluída, fechando o acoplamento já previsto entre as duas stories.

## Boundaries & Constraints

**Always:** `regra_categorizacao.padrao_estabelecimento` é única (uma regra por padrão normalizado) -- corrigir a categoria de um lançamento faz upsert (`ON CONFLICT`) na regra daquele padrão, nunca duplica. Corrigir a categoria de um lançamento aplica-se imediatamente a ele (`lancamento.categoria_id`) e vale para as duas contas, independente de quem corrigiu. A resolução de sugestão (`resolverCategoriaSugerida`) primeiro busca a regra memorizada cujo padrão tem `similarity()` acima do limiar contra o estabelecimento normalizado; entre as regras acima do limiar, a mais recentemente `atualizado_em` vence; sem regra acima do limiar, cai no fallback já existente (`null`). Excluir uma categoria (`removerCategoria`, Story 3.1) com substituta redireciona toda `regra_categorizacao` que apontava para a categoria removida para a substituta (mesma transação); sem substituta, essas regras são apagadas (nunca ficam sugerindo uma categoria inexistente).

**Block If:** nenhuma decisão de código aqui depende de informação exclusiva do usuário. (`pg_trgm` já confirmado disponível via spike direto no Supabase de produção antes desta spec -- não é uma decisão em aberto.)

**Never:** Nunca introduzir uma segunda função de resolução de sugestão -- a extensão acontece dentro do corpo de `resolverCategoriaSugerida` (Story 3.2), nunca em paralelo. Nunca deixar uma `regra_categorizacao` apontando para uma categoria removida (`removido_em` não nulo) depois que `removerCategoria` roda -- redirecionar ou apagar, nunca deixar órfã. Nunca adicionar índice GIN trigram nesta story -- volume de dados (uso doméstico, 2 pessoas) não justifica; `similarity()` sobre a tabela inteira é suficiente e revisitável depois se necessário.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Corrigir categoria de um lançamento (primeira vez para aquele padrão) | Lançamento com categoria sugerida errada, padrão de estabelecimento sem regra ainda | `lancamento.categoria_id` atualizado; nova `regra_categorizacao` criada com aquele padrão | Nenhum erro |
| Corrigir categoria de um lançamento (padrão já tem regra) | Padrão de estabelecimento já tem uma regra apontando para outra categoria | `lancamento.categoria_id` atualizado; regra existente tem `categoria_id` e `atualizado_em` atualizados (upsert, não duplica) | Nenhum erro |
| Corrigir para uma categoria inexistente/removida | `categoriaId` inválido ou de categoria já removida | Rejeitado, nada alterado | Mensagem de erro |
| Corrigir um `lancamentoId` inexistente | Id não existe | Rejeitado, nada alterado | Mensagem de erro |
| Lançamento novo com estabelecimento aproximado ao de uma regra existente | Upload novo traz lançamento cujo estabelecimento normalizado tem `similarity()` acima do limiar contra uma regra | Persistido já com a `categoria_id` da regra (via `resolverCategoriaSugerida`) | Nenhum erro |
| Lançamento novo sem nenhuma regra correspondente acima do limiar | Nenhuma regra casa | Persistido com `categoria_id: null` (fallback existente) | Nenhum erro |
| Duas regras conflitantes acima do limiar para o mesmo estabelecimento | Duas regras de padrões distintos ambas casam | Prevalece a regra com `atualizado_em` mais recente | Nenhum erro |
| Remover categoria com substituta, categoria tinha regra memorizada | `removerCategoria(categoriaId, substitutaId)` | Regra redirecionada para `substitutaId` | Nenhum erro |
| Remover categoria sem substituta, categoria tinha regra memorizada | `removerCategoria(categoriaId, null)` | Regra apagada | Nenhum erro |

</intent-contract>

## Code Map

- `db/schema/index.ts` -- MODIFICAR: nova tabela `regraCategorizacao` (id, padraoEstabelecimento único, categoriaId FK not null, atualizadoEm)
- `db/migrations/000X_*.sql` -- gerada por `drizzle-kit generate`; adicionar manualmente `CREATE EXTENSION IF NOT EXISTS pg_trgm;` no início do arquivo antes de aplicar (extensão já confirmada disponível via spike)
- `server/categorizacao/resolver-categoria-sugerida.ts` -- MODIFICAR: implementar a etapa 1 de AD-3 (consulta `regra_categorizacao` via `similarity()`), mantendo a assinatura (`estabelecimento`, `executor`) já preparada pela Story 3.2
- `server/categorizacao/gerenciar-categorias.ts` -- MODIFICAR: `removerCategoria` também redireciona (com substituta) ou apaga (sem substituta) `regra_categorizacao` que aponta para a categoria removida, dentro da mesma transação
- `server/categorizacao/corrigir-categoria.ts` -- NOVO: `listarLancamentosParaCorrecao(ano, mes)`, `corrigirCategoriaLancamento(lancamentoId, categoriaId)`
- `app/(app)/lancamentos/page.tsx` -- NOVO: tela por competência (seletor mês/ano via GET, lista de lançamentos com categoria atual e formulário de correção por linha)

## Tasks & Acceptance

**Execution:**
- [x] `db/schema/index.ts` -- `export const regraCategorizacao = pgTable('regra_categorizacao', { id: serial('id').primaryKey(), padraoEstabelecimento: text('padrao_estabelecimento').notNull().unique(), categoriaId: integer('categoria_id').notNull().references(() => categoria.id), atualizadoEm: timestamp('atualizado_em').notNull().defaultNow() })`; gerar migration (`npm run db:generate`), editar o arquivo gerado para incluir `CREATE EXTENSION IF NOT EXISTS pg_trgm;` como primeira instrução, depois aplicar (`npm run db:migrate`)
- [x] `server/categorizacao/resolver-categoria-sugerida.ts` -- normalizar `estabelecimento` via `normalizarEstabelecimento`; consultar `regraCategorizacao` com `sql`similarity(padrao_estabelecimento, ${normalizado}) > ${LIMIAR_SIMILARIDADE}`` (constante nomeada, ex. `0.3`, comentário citando que é decisão de tuning), `ORDER BY atualizado_em DESC LIMIT 1`; se encontrar, retornar `categoriaId` da regra; senão, manter o fallback `null` já existente
- [x] `server/categorizacao/gerenciar-categorias.ts` -- dentro da transação de `removerCategoria`, depois de resolver `substitutaFinalId` e migrar os lançamentos: se `substitutaFinalId !== null`, `UPDATE regra_categorizacao SET categoria_id = substitutaFinalId, atualizado_em = now() WHERE categoria_id = categoriaId`; se `substitutaFinalId === null` (nenhuma substituta), `DELETE FROM regra_categorizacao WHERE categoria_id = categoriaId`
- [x] `server/categorizacao/corrigir-categoria.ts` -- `'use server'`; `listarLancamentosParaCorrecao(ano: number, mes: number)` retorna lançamentos da competência com `LEFT JOIN categoria` (para saber nome e se `removido_em` não é nulo -- "categoria removida"), ordenado por `data`; `corrigirCategoriaLancamento(lancamentoId: number, categoriaId: number)` numa transação: valida que a categoria existe e está ativa (senão erro), valida que o lançamento existe (senão erro), `UPDATE lancamento SET categoria_id = categoriaId WHERE id = lancamentoId`, calcula `padraoEstabelecimento = normalizarEstabelecimento(lancamento.estabelecimento)`, `INSERT INTO regra_categorizacao (padrao_estabelecimento, categoria_id, atualizado_em) VALUES (...) ON CONFLICT (padrao_estabelecimento) DO UPDATE SET categoria_id = excluded.categoria_id, atualizado_em = excluded.atualizado_em`; `safeRevalidate('/lancamentos')` (mesmo padrão de `gerenciar-categorias.ts`) em caso de sucesso
- [x] `app/(app)/lancamentos/page.tsx` -- Server Component recebendo `searchParams: Promise<{ mes?: string; ano?: string }>`; default para mês/ano atuais se ausentes/inválidos; formulário `method="GET"` no topo para trocar a competência (mesmo padrão de seletores mês/ano de `/upload`); lista cada lançamento (data, estabelecimento, valor formatado, categoria atual -- nome, "Sem categoria" se `categoriaId` nulo, ou "Categoria removida" se a categoria associada tiver `removido_em` não nulo) com um `<select>` das categorias ativas (`listarCategorias`) + botão "Corrigir" chamando `corrigirCategoriaLancamento` via Server Action inline; mensagem "Nenhum lançamento nesta competência." se lista vazia

**Acceptance Criteria:**
- Given um lançamento com categoria sugerida errada, when eu corrijo manualmente para outra categoria, then a correção se aplica imediatamente, e uma regra memorizada por padrão de estabelecimento (normalizado) é criada/atualizada, valendo para as duas contas
- Given a regra memorizada existe, when um lançamento novo com estabelecimento aproximado (fuzzy match, não exato) ao da regra aparece, then ele já vem sugerido com a categoria da regra, com prioridade sobre a sugestão genérica (Story 3.2, que hoje sempre retorna `null`)
- Given duas regras memorizadas conflitantes poderiam casar com o mesmo lançamento, when a sugestão é calculada, then a regra mais recentemente atualizada prevalece
- Given uma regra memorizada aponta para uma categoria que é excluída (Story 3.1), when a exclusão acontece com substituta escolhida, then a regra é redirecionada para a categoria substituta, and se a exclusão acontecer sem substituta, a regra é removida junto -- nunca fica sugerindo uma categoria que não existe mais

## Design Notes

`pg_trgm` foi confirmado disponível no Supabase de produção real via spike direto (`CREATE EXTENSION IF NOT EXISTS pg_trgm` + `similarity()` executados com sucesso) antes desta spec ser escrita -- não é mais uma suposição em aberto (AD-3 previa essa validação como pré-requisito). O fallback de fuzzy-match em nível de aplicação citado em AD-3 não é necessário.

O limiar de similaridade é uma constante nomeada no código (decisão de tuning, não invariante, conforme o próprio AD-3 registra) -- ajustável sem mudar a forma da consulta.

`/lancamentos` é uma tela mínima construída para tornar esta story demonstrável (não existe nenhuma listagem de lançamentos ainda -- Epic 2 só fez ingestão, Epic 3.1 só geriu categorias). O Epic 4 (Visão de Gastos por Competência) vai construir a visualização completa (agrupamento por pessoa/categoria, "pendente de revisão", parcelas); esta tela não antecipa nada disso, só lista e permite corrigir -- o mínimo necessário para o AC desta story.

A extensão de `removerCategoria` (Story 3.1) para lidar com `regra_categorizacao` é o acoplamento já documentado no `epic-3-context.md` ("Story 3.1 e Story 3.3 são acopladas na exclusão") -- não é escopo novo inesperado.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

### 2026-07-18 — Review pass 1

- intent_gap: 0
- bad_spec: 0
- patch: 4 (high 0, medium 1, low 3)
- defer: 1 (low 1)
- reject: 16
- addressed_findings:
  - `[medium]` `[patch]` `resolverCategoriaSugerida` não filtrava regras cujo `categoria_id` aponta para uma categoria já removida (soft-delete) -- sob operação normal isso nunca deveria acontecer (`removerCategoria` já limpa isso na mesma transação), mas a consulta não deveria confiar cegamente nesse invariante contra futuras corridas ou caminhos de escrita ainda não previstos. Adicionado `innerJoin` com `categoria` + `isNull(categoria.removidoEm)` no `WHERE`, como defesa em profundidade.
  - `[low]` `[patch]` A tela de confirmação de remoção de categoria (`/categorias/[id]/remover`, Story 3.1) avisava quantos lançamentos seriam afetados, mas nunca mencionava que regras memorizadas (Story 3.3) também seriam redirecionadas/apagadas -- o usuário não tinha visibilidade desse efeito colateral novo. Adicionado `contarRegrasPorCategoria` + aviso na tela quando `> 0`.
  - `[low]` `[patch]` `Number(formData.get('categoria_id'))` com o campo vazio resulta em `Number('') === 0`, que passa `Number.isInteger` e chamaria `corrigirCategoriaLancamento` com `categoriaId: 0` (nunca existe, mas a rejeição vinha da camada errada). Adicionado guard explícito checando o valor bruto antes do `Number()`.
  - `[low]` `[patch]` O `<select>` de correção em `/lancamentos` sempre começava em branco, mesmo quando o lançamento já tinha uma categoria ativa -- forçava reescolher do zero a cada correção. Agora usa a categoria atual (se ativa) como `defaultValue`. Também tratado o caso de `listarCategorias()` vazia (nenhuma categoria cadastrada ainda): mostra uma mensagem em vez de um formulário inutilizável.
- deferred:
  - `[low]` Corrida (TOCTOU) entre `corrigirCategoriaLancamento` (que lê o estado ativo da categoria numa `SELECT` e só depois escreve) e `removerCategoria` sem substituta (que apaga a regra) rodando concorrentemente -- uma correção que comita bem no meio desse intervalo poderia recriar uma regra apontando para uma categoria que acabou de ser removida. Mitigado na prática pela defesa em profundidade adicionada em `resolverCategoriaSugerida` (a regra órfã nunca seria usada para sugerir), mas a regra em si ficaria orfã na tabela até uma próxima remoção da mesma categoria. Baixíssima probabilidade para um casal operando manualmente; registrado em `deferred-work.md`, mesmo padrão de outras corridas já aceitas nas Stories 2.2/2.3/3.1.
- Rejeitados (com razão): ordenação por `atualizadoEm` em vez de força de `similarity()` entre regras acima do limiar -- reject, é exatamente o comportamento especificado no AC ("a regra mais recentemente atualizada prevalece"), não um bug; ausência de índice GIN trigram -- reject, decisão explícita já registrada nas Boundaries & Constraints desta spec (volume de dados de uso doméstico não justifica); limiar de similaridade hardcoded sem teste -- reject, decisão de tuning explicitamente não-invariante (AD-3), mesmo padrão de outras constantes do projeto; `CREATE EXTENSION` no schema `public` em vez de um schema dedicado (lint da Supabase) -- reject, prática comum e de baixo risco para uma app de 2 usuários, complexidade desproporcional ao risco real; falta de retroatividade (corrigir um lançamento não corrige outros lançamentos históricos com o mesmo padrão) -- reject, não pedido por nenhum AC, escopo novo e maior que o desta story; falta de feedback visível na UI além de `console.error` -- reject, mesmo padrão já estabelecido e aceito desde a Story 2.3; falta de testes automatizados -- reject, gap pré-existente de todo o projeto já registrado em `deferred-work.md` desde a Story 1.2; sem paginação/limite de linhas em `listarLancamentosParaCorrecao` -- reject, volume real (~100-160 lançamentos/mês) desproporcional para justificar complexidade extra numa app de uso doméstico; FK `ON DELETE no action` não protege contra um hipotético script futuro que fizesse soft-delete direto sem passar por `removerCategoria` -- reject, especulativo, mesmo padrão de rejeição já usado na Story 3.1; limite `>` vs `>=` no threshold de similaridade -- reject, nitpick arbitrário de tuning, sem diferença funcional relevante; risco de padrão "match-tudo" com estabelecimento vazio -- reject, verificado empiricamente que `similarity('', qualquer_coisa) = 0` no Postgres real, o oposto do que o achado presumia; ano selecionado via URL manual fora das 3 opções do dropdown não aparecer selecionado -- reject, cosmético, só alcançável editando a URL manualmente, filtro em si continua correto; extensão `pg_trgm` poder exigir privilégio elevado em Postgres gerenciado -- reject, já verificado empiricamente disponível nesta instância real do Supabase antes da spec ser escrita.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: sucesso
- `npm run db:generate` / `npm run db:migrate` -- expected: `regra_categorizacao` criada, extensão `pg_trgm` habilitada, aplicada em produção

**Manual checks (if no CLI):**
- Acessar `/lancamentos` autenticado numa competência com lançamentos reais (Epic 2) -- corrigir a categoria de um -- deve refletir imediatamente e criar uma regra memorizada
- Corrigir outro lançamento com o mesmo padrão de estabelecimento (ou um estabelecimento aproximado) para outra categoria -- a regra deve ser atualizada (upsert), não duplicada
- Chamar `resolverCategoriaSugerida` diretamente (script temporário) com um estabelecimento aproximado ao de uma regra criada -- deve retornar a categoria da regra
- Criar duas regras com `atualizado_em` diferentes que casem com o mesmo estabelecimento -- a mais recente deve prevalecer
- Remover uma categoria que tem regra memorizada, escolhendo substituta -- a regra deve apontar para a substituta depois
- Remover uma categoria que tem regra memorizada, sem substituta -- a regra deve ser apagada

## Auto Run Result

Status: done

**Summary:** Fecha o Epic 3. Nova tabela `regra_categorizacao` (padrão de estabelecimento normalizado -> categoria, compartilhada). Tela `/lancamentos` (por competência) lista lançamentos e permite corrigir a categoria de qualquer um; a correção aplica-se imediatamente e faz upsert da regra memorizada daquele padrão. `resolverCategoriaSugerida` (seam da Story 3.2) agora consulta `regra_categorizacao` via `similarity()` (`pg_trgm`, confirmado disponível via spike direto na produção real antes da spec) com prioridade por recência entre regras acima do limiar, antes de cair no fallback `null`. `removerCategoria` (Story 3.1) passou a redirecionar ou apagar as regras que apontavam para a categoria excluída, na mesma transação.

**Files changed:**
- `db/schema/index.ts` -- nova tabela `regraCategorizacao` (padrão único, FK para `categoria`)
- `db/migrations/0004_elite_ricochet.sql` (novo) -- inclui `CREATE EXTENSION IF NOT EXISTS pg_trgm;`, aplicada em produção
- `server/categorizacao/resolver-categoria-sugerida.ts` -- implementa a consulta real de fuzzy match (antes sempre `null`); agora também filtra regras que apontem para categoria removida (defesa em profundidade)
- `server/categorizacao/gerenciar-categorias.ts` -- `removerCategoria` redireciona/apaga `regra_categorizacao`; nova `contarRegrasPorCategoria`
- `server/categorizacao/corrigir-categoria.ts` (novo) -- `listarLancamentosParaCorrecao`, `corrigirCategoriaLancamento`
- `app/(app)/lancamentos/page.tsx` (novo) -- tela de listagem/correção por competência
- `app/(app)/categorias/[id]/remover/page.tsx` -- agora também avisa quantas regras memorizadas serão afetadas

**Review findings breakdown:** 4 patches aplicados (1 médio: `resolverCategoriaSugerida` passou a filtrar regras apontando para categoria removida, defesa em profundidade contra a corrida identificada por ambos os revisores; 3 baixos: aviso de impacto em regras na tela de remoção de categoria, guard contra string vazia virando `categoriaId: 0`, select de correção default para a categoria atual + tratamento de lista de categorias vazia). 1 deferido (corrida de baixíssima probabilidade entre correção manual e remoção de categoria concorrentes, mitigada na prática pela defesa em profundidade). 16 rejeitados -- a maioria confirmando que o comportamento apontado já é exatamente o especificado no AC (prioridade por recência, não por força de similaridade), decisões de escopo/tuning já documentadas na própria spec, ou reafirmações verificadas empiricamente (pg_trgm disponível, `similarity('', x) = 0`).

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos. Migration (com `pg_trgm`) aplicada em produção. Testado de ponta a ponta com um script temporário (removido após o uso) contra o Supabase de produção real, usando um lançamento real como cobaia (restaurado ao estado original ao final) e categorias/regras sintéticas (removidas fisicamente ao final, sem resíduo): correção cria regra nova; segunda correção do mesmo padrão faz upsert (não duplica); sugestão por match exato e por match aproximado (fuzzy, com sufixo extra) retornam a categoria certa; duas correções conflitantes -- a mais recente prevalece; correção para categoria inexistente/removida rejeitada; correção de lançamento inexistente rejeitada; listagem por competência mostra a categoria certa; remoção de categoria com substituta redireciona a regra; sugestão continua correta após o redirect; remoção sem substituta apaga a regra; sugestão volta ao fallback `null` depois. Todos os 13 cenários passaram.

**Residual risks:** Corrida de baixíssima probabilidade entre correção manual e remoção concorrente de categoria (ver `deferred-work.md`, mitigada na prática); sem retroatividade (corrigir um lançamento não reaplica a categoria a outros lançamentos históricos do mesmo padrão -- fora do escopo desta story); sem cobertura de teste automatizado (gap pré-existente de todo o projeto).

Follow-up review recommended: true -- esta é a story mais complexa do Epic 3 (nova lógica de fuzzy matching, acoplamento com duas stories anteriores via transações compartilhadas, tabela nova central para o comportamento de categorização futura do app), e o achado de severidade média (defesa em profundidade contra regra órfã) justifica uma segunda revisão independente antes do Epic 4 passar a depender deste módulo.
