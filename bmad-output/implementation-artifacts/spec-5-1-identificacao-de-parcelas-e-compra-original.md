---
title: 'Story 5.1: Identificação de parcelas e compra original'
type: 'feature'
created: '2026-07-18'
status: 'done'
baseline_revision: 'b6d0948db5635b9f66a90899539599a6582e00b9'
final_revision: '6981ecd'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** `lancamento.parcelaNumero`/`parcelaTotal` já são extraídos e persistidos desde a Story 2.2, mas nada hoje reconhece que duas parcelas de faturas diferentes (ex: "3/10" em julho, "4/10" em agosto) pertencem à mesma compra original — sem essa identidade, não há como projetar parcelas futuras (Story 5.2) nem somar comprometimento de limite (Story 5.3).

**Approach:** Nova tabela `compra_parcelada` (identidade da compra, AD-4) e um módulo `server/parcelas` que, ao processar cada lançamento inserido com `parcelaNumero`/`parcelaTotal` preenchidos (upload/merge, Epic 2), identifica a compra original pela chave `cartaoId + estabelecimento normalizado + valor da parcela + total de parcelas` -- reaproveitando a compra existente ou criando uma nova -- e liga `lancamento.compraParceladaId` a ela. Por AD-7, `server/ingestao` nunca escreve em `compra_parcelada` diretamente; sempre chama uma função de `server/parcelas`.

## Boundaries & Constraints

**Always:**
- A chave de identidade da compra é exatamente `cartaoId + estabelecimento normalizado (AD-9) + valorCentavos da parcela + parcelaTotal` (AD-4) -- nenhuma outra heurística (nunca usar `data`, nunca usar `parcelaNumero` na chave, já que ele varia entre parcelas da mesma compra).
- `server/parcelas` é o único módulo que escreve em `compra_parcelada` (AD-7). `server/ingestao` chama uma função de serviço exposta por `server/parcelas`; nunca faz `insert`/`select` direto nessa tabela.
- A identificação roda dentro da mesma transação do upload/merge (`server/ingestao/upload.ts`, loop de `delta.inserir`) -- se a transação do upload falhar, nenhuma `compra_parcelada` órfã fica gravada.
- Normalização de estabelecimento reaproveita `server/shared/normalizar-estabelecimento` (AD-9) -- nunca uma normalização própria.
- Ao criar uma `compra_parcelada` nova (nenhuma correspondência pela chave), a competência do lançamento que disparou a criação vira `competenciaInicialAno`/`competenciaInicialMes` -- é apenas um metadado de âncora/exibição; a lógica de projeção (Story 5.2) não depende dele para calcular meses futuros (usa a competência e o número da parcela do lançamento real mais recente conhecido).
- Corrida entre duas linhas da mesma compra dentro do mesmo upload (ou uploads concorrentes) tentando criar a mesma `compra_parcelada` simultaneamente é resolvida via `ON CONFLICT` na chave única + fallback de leitura -- nunca deixar a constraint de unicidade estourar como erro 500 do upload.
- Valores monetários em centavos (inteiro) -- nunca float.

**Block If:** Nenhuma decisão identificada que exija input humano -- schema novo aditivo, sem impacto em dado existente (`lancamento.compraParceladaId` já existe, hoje sempre nulo).

**Never:**
- Não mexer em `delta.atualizar` nem `delta.remover` do merge por delta -- reidentificar/retrair uma compra quando um lançamento existente é atualizado ou removido é escopo da Story 5.2 (a própria AC do épico associa isso a "projeção", não a "identificação").
- Não criar nenhuma tela/rota nova (`/parcelas`) nem tocar `nav.tsx` -- nenhum AC desta story pede UI; a exibição chega com a Story 5.2/5.3.
- Não implementar projeção de parcelas futuras nem soma de comprometimento de limite -- só a identidade da compra original.
- Não reimplementar `normalizar-estabelecimento` nem a chave de matching de `lancamento-matching` (AD-2) -- são conceitos e módulos diferentes, mesmo reaproveitando a mesma função de normalização.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Duas parcelas, mesma compra, faturas diferentes | Lançamento "3/10" em jul/2026 já processado; upload de ago/2026 traz "4/10" mesmo cartão/estabelecimento/valor de parcela | Nova linha de `lancamento` para "4/10" recebe o mesmo `compraParceladaId` da linha "3/10" | Nenhum erro esperado |
| Primeira parcela vista de uma compra nova | Lançamento com `parcelaNumero`/`parcelaTotal` preenchidos, nenhuma `compra_parcelada` com a chave correspondente | Nova `compra_parcelada` criada (âncora = competência deste lançamento), `lancamento.compraParceladaId` aponta pra ela | Nenhum erro esperado |
| Lançamento sem parcela | `parcelaNumero`/`parcelaTotal` ambos nulos | `compraParceladaId` permanece nulo, nenhuma chamada a `server/parcelas` | Nenhum erro esperado |
| Duas compras coincidentes (mesmo estabelecimento/valor, `parcelaTotal` diferente) | Ex: duas compras de R$100 em 5x vs. 10x na mesma loja | Duas `compra_parcelada` distintas -- `parcelaTotal` faz parte da chave | Nenhum erro esperado |
| Duas parcelas da mesma compra no mesmo upload (mesma competência, ex. reenvio inicial trazendo "1/3" e sequência já fechada) | `delta.inserir` contém mais de um lançamento com a mesma chave de identidade dentro da mesma transação | Todas apontam pra uma única `compra_parcelada` criada uma única vez (segunda chamada encontra a primeira via `ON CONFLICT`/leitura, não duplica) | Nenhum erro esperado |
| Reenvio da mesma competência sem mudança (merge por delta, Story 2.4) | Lançamento parcela já existente, delta não gera `inserir` nem `atualizar` para ele | `compraParceladaId` já setado permanece intocado -- nenhuma nova chamada de identificação | Nenhum erro esperado |

</intent-contract>

## Code Map

- `db/schema/index.ts` -- `lancamento.compraParceladaId` já existe (sem FK, comentário "tabela só existe no Epic 5") e `parcelaNumero`/`parcelaTotal` já persistidos desde a Story 2.2.
- `server/ingestao/upload.ts` -- loop de `delta.inserir` (linha ~160) é onde a identificação precisa ser chamada, dentro da mesma `tx`.
- `server/shared/normalizar-estabelecimento.ts` -- reaproveitada (AD-9).
- `server/categorizacao/corrigir-categoria.ts` -- referência de padrão de upsert com `onConflictDoUpdate` já usado no projeto (`regraCategorizacao`).
- `server/ingestao/mapear-cartao.ts` -- referência de padrão `Executor`/tipo de retorno já usado em outros módulos de `server/`.

## Tasks & Acceptance

**Execution:**
- [x] `db/schema/index.ts` -- ATUALIZAR: nova tabela `compraParcelada` (`id`, `cartaoId` FK, `estabelecimentoNormalizado`, `valorParcelaCentavos`, `totalParcelas`, `competenciaInicialAno`, `competenciaInicialMes`, `createdAt`) com índice único composto em `(cartaoId, estabelecimentoNormalizado, valorParcelaCentavos, totalParcelas)` (AD-4); adicionar `.references(() => compraParcelada.id)` em `lancamento.compraParceladaId` -- materializa a identidade da compra original
- [x] `npm run db:generate` + `npm run db:migrate` -- gera e aplica a migration em produção -- sem isso a tabela não existe de fato
- [x] `server/parcelas/identificar-compra-parcelada.ts` -- NOVO: `identificarOuCriarCompraParcelada(executor, { cartaoId, estabelecimento, valorParcelaCentavos, totalParcelas, competenciaAno, competenciaMes }): Promise<number>` -- normaliza o estabelecimento, tenta `insert ... onConflictDoNothing` na chave única, e se não retornou linha (já existia) faz um `select` pela mesma chave -- único ponto de escrita em `compra_parcelada` (AD-7)
- [x] `server/ingestao/upload.ts` -- ATUALIZAR: no loop de `delta.inserir`, quando `item.parcelaNumero !== null`, chamar `identificarOuCriarCompraParcelada(tx, {...})` antes do `insert` do lançamento e passar o `compraParceladaId` retornado; quando `parcelaNumero === null`, manter `compraParceladaId: null` -- fecha o elo entre a extração (Epic 2) e a identidade da compra
- [x] Testar com um script temporário contra o Supabase de produção real: duas parcelas da mesma compra em competências diferentes linkando à mesma `compra_parcelada`; compra nova criando uma linha; lançamento sem parcela sem tocar `compra_parcelada`; duas compras com `parcelaTotal` diferente gerando linhas distintas; duas parcelas da mesma compra no mesmo upload sem duplicar a `compra_parcelada` -- dados sintéticos, removidos após o uso, sem tocar dado real do casal
- [x] `scripts/backfill-compra-parcelada.ts` -- NOVO (achado do review): 32 lançamentos reais de parcela já existiam em produção de antes desta story (uploads do Epic 2, quando `compra_parcelada` ainda não existia) e ficariam com `compraParceladaId` nulo para sempre sem um backfill explícito -- script idempotente, ordenado por competência, executado uma vez contra produção via `identificarOuCriarCompraParcelada`

**Acceptance Criteria:**
- Given um lançamento com indicação de parcela na descrição (ex: "3/10", Epic 2 Story 2.2), when ele é extraído, then o sistema registra o número da parcela atual, o total de parcelas, e o valor de cada parcela (já satisfeito desde a Story 2.2 -- esta story não regride isso)
- Given duas parcelas da mesma compra em faturas diferentes, when ambas são processadas, then são reconhecidas como pertencentes à mesma compra original via a chave titular/cartão + estabelecimento normalizado + valor da parcela + total de parcelas (AD-4, AD-9)

## Spec Change Log

(vazio -- nenhum loopback de bad_spec disparado; os 2 achados de severidade média/alta do review (backfill de dados existentes, guard "1/1") foram endereçados como patches diretos, ver Review Triage Log.)

## Review Triage Log

### 2026-07-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5 (1: high 0, medium 1, low 4)
- defer: 1 (0: high 0, medium 0, low 1)
- reject: 6 (0: high 0, medium 0, low 6)
- addressed_findings:
  - `[medium]` `[patch]` 32 lançamentos reais de parcela já existiam em produção (uploads do Epic 2, antes de `compra_parcelada` existir) e ficariam com `compraParceladaId` nulo para sempre -- confirmado empiricamente por query direta em produção antes de decidir a correção (não hipotético). `scripts/backfill-compra-parcelada.ts` criado, executado uma vez (32/32 linhas linkadas corretamente, pares da mesma compra em competências diferentes casaram certo, ex. "Drimar 1/2" e "Drimar 2/2" -> mesma `compra_parcelada`), reexecutado para confirmar idempotência (0 pendentes na segunda vez).
  - `[low]` `[patch]` Lançamento "1/1" (não é parcela de verdade, sem parcela futura a projetar) materializava uma `compra_parcelada` desnecessária -- `upload.ts` agora exige `parcelaTotal > 1` antes de chamar a identificação.
  - `[low]` `[patch]` Fallback de `identificarOuCriarCompraParcelada` desestruturava `existente.id` sem checar se a linha foi encontrada -- um `TypeError` cru estouraria dentro da transação se a garantia de "sempre acha uma linha após conflito" for violada por algum caminho futuro. Guard explícito com erro tipado adicionado.
  - `[low]` `[patch]` Comentário do schema afirmava que a identificação acontece em "upload ou merge", mas só o caminho de `upload` (`delta.inserir`) está de fato implementado -- corrigido para não sugerir uma cobertura que não existe.
  - `[low]` `[patch]` (agrupado com o item de backfill acima) reexecução de idempotência do script de backfill como parte da própria verificação.
- deferred:
  - `[low]` `delta.atualizar` (merge por delta, quando o valor de um lançamento já existente muda) nunca reidentifica/revalida `compraParceladaId` -- se uma correção de valor mudar o que deveria ser a chave de identidade real da parcela, o link antigo fica desatualizado silenciosamente. Fora do escopo desta story (a própria spec já excluía `delta.atualizar`/`delta.remover`); a Story 5.2 (que lida com reconciliação/retração) é o lugar natural para revisitar isso se necessário.
- Rejeitados (com razão): risco de fragmentação da identidade por arredondamento de centavos entre parcelas (ex. última parcela com valor levemente diferente) -- reject, verificado empiricamente contra as 32 parcelas reais já em produção (12 pares parcela-a-parcela da mesma compra, incluindo pelo menos um par alcançando a última parcela): valor e total de parcelas idênticos em 100% dos pares observados, nenhuma evidência de drift no formato real do Itaú; risco análogo para `totalParcelas` divergir entre avistamentos da mesma compra -- reject, mesma verificação empírica, nenhuma divergência observada; normalização fraca de estabelecimento (sem remoção de acento) -- reject, função `normalizarEstabelecimento` é uma decisão de arquitetura já adotada (AD-9) e reaproveitada verbatim por 3 módulos em produção desde o Epic 2 sem nenhum caso real de colisão reportado, fora do escopo desta story alterar unilateralmente; ausência de `ON DELETE CASCADE`/`SET NULL` nas novas FKs -- reject, especulativo, nenhum fluxo de exclusão de cartão ou compra existe hoje, mesmo padrão de rejeição já usado na Story 3.1; âncora `competenciaInicial` não garantidamente reflete a primeira parcela real se uploads forem feitos fora de ordem -- reject, a própria spec já documenta que é só metadado de exibição, sem uso na lógica de projeção; migration sem newline final -- reject, cosmético, saída padrão do `drizzle-kit generate`; falta de teste automatizado para o novo módulo -- reject, gap pré-existente de todo o projeto, já documentado desde a Story 1.2.

## Design Notes

`identificarOuCriarCompraParcelada` usa `insert ... onConflictDoNothing({ target: [...colunas da chave única] })` em vez de `select` seguido de `insert` condicional -- evita uma corrida real dentro do próprio loop de `delta.inserir` (duas parcelas da mesma compra no mesmo upload) sem precisar de um lock explícito: se duas tentativas de criação colidirem na constraint única, a segunda simplesmente não insere e o `select` de fallback enxerga a linha que a primeira acabou de criar (mesma transação, leitura consistente).

`scripts/backfill-compra-parcelada.ts` reaproveita `identificarOuCriarCompraParcelada` em vez de inserir `compra_parcelada` por conta própria -- mesma garantia de ponto único de escrita (AD-7) vale para dado histórico, não só para o fluxo de upload novo.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem violações
- `npm run build` -- expected: build de produção limpo
- `npm run db:generate` / `npm run db:migrate` -- expected: `compra_parcelada` criada e FK em `lancamento.compra_parcelada_id` aplicada em produção

**Manual checks (if no CLI):**
- Script temporário (removido após o uso) chamando `identificarOuCriarCompraParcelada` diretamente e simulando um upload com 2 parcelas da mesma compra em 2 competências -- confirmar que ambos os lançamentos sintéticos apontam para a mesma `compra_parcelada`, que uma segunda compra com `parcelaTotal` diferente gera uma linha própria, e que um lançamento sem parcela não cria nenhuma linha em `compra_parcelada`.

## Auto Run Result

Status: done

**Summary:** Nova tabela `compra_parcelada` (Epic 5, AD-4) e módulo `server/parcelas` que identifica -- ou cria, se nova -- a compra original de um lançamento parcelado (`parcelaNumero`/`parcelaTotal`, já extraídos desde a Story 2.2) pela chave cartão + estabelecimento normalizado + valor da parcela + total de parcelas, e liga `lancamento.compraParceladaId` a ela. `server/ingestao/upload.ts` chama essa identificação dentro da mesma transação do merge por delta, nunca escrevendo em `compra_parcelada` diretamente (AD-7). Fecha a base de dados que as Stories 5.2 (projeção) e 5.3 (comprometimento de limite) vão consumir.

**Files changed:**
- `db/schema/index.ts` -- nova tabela `compraParcelada` (índice único composto, chave AD-4) + FK real em `lancamento.compraParceladaId`
- `db/migrations/0005_odd_gateway.sql` (novo) -- aplicada em produção
- `server/parcelas/identificar-compra-parcelada.ts` (novo) -- `identificarOuCriarCompraParcelada`, único ponto de escrita em `compra_parcelada`
- `server/ingestao/upload.ts` -- chama a identificação no loop de `delta.inserir` quando `parcelaTotal > 1`
- `scripts/backfill-compra-parcelada.ts` (novo, achado do review) -- backfill idempotente de 32 lançamentos de parcela reais já existentes em produção de antes desta story, executado uma vez

**Review findings breakdown:** 5 patches aplicados (1 médio: 32 lançamentos reais de parcela pré-existentes em produção ficariam com `compraParceladaId` nulo para sempre sem backfill -- confirmado empiricamente antes de corrigir, script de backfill criado e executado, idempotência reverificada; 4 baixos: guard `parcelaTotal > 1` para não materializar compra em lançamento "1/1", defesa em profundidade no fallback de `identificarOuCriarCompraParcelada`, correção de comentário impreciso, verificação de idempotência do backfill). 1 deferido (`delta.atualizar` não revalida `compraParceladaId` em correções de valor -- baixa probabilidade, já fora do escopo explícito da spec, relevante para a Story 5.2). 6 rejeitados -- destaque para 2 riscos teóricos (arredondamento de centavos e divergência de `totalParcelas` entre avistamentos da mesma compra) verificados empiricamente contra as 32 parcelas reais já em produção e não observados (12 pares parcela-a-parcela, valor e total idênticos em 100% dos casos, incluindo a última parcela de uma compra).

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos. Migration aplicada em produção (`compra_parcelada` criada, FK em `lancamento.compra_parcelada_id`). Testado de ponta a ponta com um script temporário (removido após o uso) contra o Supabase de produção real: normalização casando duas parcelas da mesma compra, `parcelaTotal` diferente gerando compra distinta, chamadas duplicadas na mesma competência não duplicando a compra, lançamentos reais persistidos com `compraParceladaId` correto -- 6 cenários, todos passaram. Backfill executado uma vez contra produção (32/32 lançamentos linkados corretamente, pares da mesma compra em competências diferentes casaram certo) e reexecutado para confirmar idempotência (0 pendentes na segunda vez, sem duplicar nenhuma `compra_parcelada`).

**Residual risks:** `delta.atualizar` não revalida `compraParceladaId` em correções de valor (ver deferred-work.md, baixa probabilidade); sem cobertura de teste automatizado (gap pré-existente de todo o projeto); dependência de que o formato real do Itaú mantenha valor/total consistentes entre parcelas -- verificado empiricamente nos dados reais disponíveis, mas não é uma garantia formal do banco.

Follow-up review recommended: true -- story que introduz uma tabela nova central para o restante do Epic 5 (Stories 5.2/5.3 vão depender diretamente de `compra_parcelada`), envolveu uma migration de schema em produção, um backfill de dado real do casal, e um achado de severidade média sobre dados já existentes -- justifica uma segunda revisão independente antes de mais lógica ser construída em cima desta fundação.
