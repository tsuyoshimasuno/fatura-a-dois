---
title: 'Story 2.4: Merge por delta em reenvio da mesma competência'
type: 'feature'
created: '2026-07-18'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'd5edb752d221584bafee5b1ef4a2863d00e04751'
---

<intent-contract>

## Intent

**Problem:** `processarUpload` hoje sempre insere lançamentos, sem nunca comparar com o que já existe para a mesma competência -- reenviar a mesma fatura (ex: exportação atualizada de uma fatura em aberto antes do fechamento) duplica todos os lançamentos, e qualquer categoria já corrigida manualmente seria perdida se a story tivesse implementado "apagar tudo e reinserir" em vez de um merge de verdade.

**Approach:** Extrair a lógica de chave/correspondência para um módulo único e compartilhado (`server/lancamento-matching`, AD-2) e uma normalização de estabelecimento compartilhada (`server/shared/normalizar-estabelecimento`, AD-9); `processarUpload` passa a buscar os lançamentos já existentes da mesma competência, calcular o delta (atualizar valor de quem já existe, inserir quem é novo, remover quem já não aparece mais) por chave `data + estabelecimento normalizado + cartão`, com correspondência posicional dentro de cada chave -- nunca tocando `categoria_id` no caminho de atualização.

## Boundaries & Constraints

**Always:** A chave de correspondência é `data + estabelecimento normalizado (via server/shared/normalizar-estabelecimento) + cartao_id` -- `valor` sempre fora da chave; dentro da mesma chave, lançamentos existentes e novos são pareados por posição (ordem de ocorrência), nunca por outro critério; um lançamento existente cujo par novo tem valor diferente tem só `valor_centavos` atualizado -- `categoria_id`, `compra_parcelada_id`, `parcela_numero`/`parcela_total` de um lançamento já existente nunca são sobrescritos pelo merge; um lançamento existente sem par no reenvio é removido; um lançamento novo sem par existente é inserido; a normalização e a chave de matching vivem exclusivamente em `server/lancamento-matching`/`server/shared/normalizar-estabelecimento` -- nenhum outro módulo reimplementa nenhuma das duas (AD-2, AD-9); o merge compara contra TODOS os lançamentos já salvos da mesma `competencia_ano`/`competencia_mes` (de qualquer cartão), já que uma única planilha de upload cobre a fatura inteira daquela competência.

**Block If:** nenhuma decisão de código aqui depende de informação exclusiva do usuário.

**Never:** Nunca reimplementar a chave de delta ou a normalização de estabelecimento fora dos módulos designados; nunca tocar `categoria_id` (ou qualquer coluna além de `valor_centavos`) num lançamento existente que já tinha correspondência; nunca chamar uma função de retração de parcelas projetadas (`server/parcelas`, Epic 5) -- esse módulo ainda não existe; a remoção de um lançamento que por acaso é uma parcela (`parcela_numero`/`parcela_total` setados) segue a mesma regra de remoção simples desta story, sem nenhuma lógica adicional -- a integração com a projeção de parcelas fica registrada como dependência futura (Epic 5), não implementada aqui.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reenvio idêntico | Mesma planilha da mesma competência reenviada sem mudança nenhuma | Nenhuma linha nova, nenhuma removida, nenhum valor atualizado | Nenhum erro |
| Reenvio com valor ajustado | Mesma chave (data+estabelecimento+cartão), valor diferente (ex: pré-autorização ajustada) | `valor_centavos` do lançamento existente é atualizado | Nenhum erro |
| Duas compras iguais no mesmo dia/estabelecimento | Duas linhas com a mesma chave no reenvio, batendo com duas linhas já existentes | Ambas preservadas, pareadas 1-para-1 por posição -- nenhuma descartada | Nenhum erro |
| Categoria corrigida manualmente | Lançamento existente com `categoria_id` setado, reenvio traz a mesma chave | `categoria_id` permanece intacto, só `valor_centavos` pode mudar | Nenhum erro |
| Lançamento que sumiu no reenvio | Lançamento existente sem nenhum par na nova planilha | Removido da competência | Nenhum erro |
| Lançamento genuinamente novo | Chave nova, sem correspondente existente | Inserido normalmente (mesmo comportamento da Story 2.2) | Nenhum erro |

</intent-contract>

## Code Map

- `server/shared/normalizar-estabelecimento.ts` -- NOVO: normalização compartilhada (trim + colapso de espaços + minúsculas)
- `server/lancamento-matching/index.ts` -- NOVO: cálculo puro do delta (atualizar/inserir/remover) dado o conjunto existente e o novo, por chave com correspondência posicional
- `server/ingestao/upload.ts` -- MODIFICAR: buscar lançamentos existentes da competência, calcular o delta via `lancamento-matching`, aplicar atualizar/inserir/remover na mesma transação (substitui o insert-only da Story 2.2)

## Tasks & Acceptance

**Execution:**
- [x] `server/shared/normalizar-estabelecimento.ts` -- `export function normalizarEstabelecimento(bruto: string): string` -- `bruto.trim().replace(/\s+/g, ' ').toLowerCase()`
- [x] `server/lancamento-matching/index.ts` -- exporta tipos `LancamentoExistente` (`{ id: number; data: string; estabelecimento: string; cartaoId: number; valorCentavos: number }`) e `LancamentoNovoParaMerge` (`{ data: string; estabelecimento: string; cartaoId: number; valorCentavos: number; parcelaNumero: number | null; parcelaTotal: number | null }`); exporta `calcularMergeDelta(existentes: LancamentoExistente[], novos: LancamentoNovoParaMerge[]): { atualizar: { id: number; valorCentavos: number }[]; inserir: LancamentoNovoParaMerge[]; remover: number[] }` -- agrupa ambas as listas por chave `` `${data}|${normalizarEstabelecimento(estabelecimento)}|${cartaoId}` ``, pareia item a item por posição dentro de cada grupo (índice 0 com índice 0, índice 1 com índice 1, etc.); pares onde o valor difere vão para `atualizar`; novos sem par (grupo novo mais longo) vão para `inserir`; existentes sem par (grupo existente mais longo) vão para `remover`
- [x] `server/ingestao/upload.ts` -- depois de resolver `cartaoId` para cada lançamento bruto (upsert de `cartao`, igual à Story 2.2) e antes de decidir o que persistir: buscar todos os `lancamento` existentes com `competencia_ano`/`competencia_mes` da requisição; montar a lista de novos já com `cartaoId` resolvido; chamar `calcularMergeDelta`; dentro da mesma transação, aplicar `remover` (delete por id), `atualizar` (update só de `valor_centavos` por id), `inserir` (insert normal, igual à Story 2.2, com `competencia_ano`/`competencia_mes`/`cartao_id`/demais campos); mensagem de sucesso passa a reportar as 3 contagens (ex: `N novos, M atualizados, K removidos para a competência mes/ano.`)

**Acceptance Criteria:**
- Given lançamentos já salvos para uma competência, when a mesma planilha (ou uma nova exportação da mesma fatura em aberto) é reenviada, then lançamentos já existentes (chave: data + estabelecimento normalizado + titular/cartão, sem considerar valor) não são duplicados, e um lançamento cuja chave já existe mas com valor diferente tem o valor atualizado
- Given duas compras iguais no mesmo estabelecimento e dia (mesma chave), when a planilha é reenviada, then ambas são preservadas por correspondência posicional -- nenhuma é descartada por engano
- Given categorias já corrigidas manualmente em lançamentos existentes, when um reenvio acontece, then essas categorias não são sobrescritas
- Given um lançamento previamente salvo que não aparece mais no reenvio, when o processamento roda, then ele é removido/desconsiderado da fatura

## Design Notes

Dependência futura conhecida e não implementada aqui (registrada em `deferred-work.md`): quando um lançamento removido por este merge for a primeira parcela conhecida de uma compra parcelada, a projeção de parcelas futuras (Epic 5, `compra_parcelada`) precisaria ser retraída. Como `server/parcelas`/`compra_parcelada` só existem a partir do Epic 5, essa integração não pode ser construída agora -- a Story 5.2 (ou a que criar `compra_parcelada`) precisa decidir como reagir a uma remoção já acontecida (reconciliação em leitura, já que parcelas futuras são sempre computadas e nunca materializadas, AD-7 -- é bem possível que nenhuma ação ativa seja necessária aqui, e a leitura futura simplesmente pare de ver o lançamento removido).

Correspondência posicional dentro da chave: se a ordem de leitura da planilha mudar entre reenvios (ex: Itaú reordena linhas), o pareamento index-a-index ainda associa a mesma contagem de lançamentos daquela chave, só potencialmente trocando qual "instância" física corresponde a qual -- indiferente aqui, já que nenhum campo além do valor é comparado/atualizado por instância.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

### 2026-07-18 — Review pass 1

- intent_gap: 0
- bad_spec: 0
- patch: 1 (high 1, medium 0, low 0)
- defer: 0
- reject: 11
- addressed_findings:
  - `[high]` `[patch]` A consulta dos lançamentos existentes da competência não tinha `ORDER BY` -- o Postgres não garante nenhuma ordem sem isso, e o pareamento posicional (usado exatamente para o caso de "duas compras iguais no mesmo dia/estabelecimento") dependia dessa ordem ser estável para associar o valor certo à linha certa. Adicionado `.orderBy(lancamento.id)`, dando uma ordem determinística e reprodutível entre execuções.
- Rejeitados (com razão): fragilidade inerente do pareamento posicional quando a ordem de duplicatas muda entre exportações -- reject, é exatamente o mecanismo especificado no AC/AD-2 ("correspondência posicional"), a correção de determinismo (patch acima) é o que estava de fato faltando, não o conceito; `parcela_numero`/`parcela_total` nunca propagados para linhas existentes casadas -- reject, comportamento explicitamente exigido pelo próprio "Never" do spec, verificado pelo Edge Case Hunter contra o próprio texto da spec antes de reportar; corrida (TOCTOU) na criação de `cartao` -- reject, já deferido na Story 2.2, mesma causa raiz, não duplicado; corrida entre a checagem de cartão-terceiro e a transação -- reject, já deferido na Story 2.3, mesma causa raiz; `nomeTitular`/`tipoCartao` nunca atualizados num cartão já existente -- reject, já rejeitado na Story 2.2 com a mesma justificativa (não muda na prática para o mesmo número mascarado); catch genérico colapsando todos os erros na mesma mensagem -- reject, consistente com o padrão já estabelecido em todas as stories deste épico; falta de checagem de auth dentro da Server Action -- reject, decisão arquitetural já estabelecida (AD-6); normalização de estabelecimento "ingênua" (sem acentos/códigos de referência) -- reject, as 2 planilhas reais inspecionadas não mostraram esse padrão, especulativo sem evidência; falta de teste automatizado para `calcularMergeDelta` -- reject, gap de todo o projeto já deferido, embora esta função pura seja a mais valiosa candidata a testar quando um test runner for introduzido; mensagem de sucesso só com contagens, sem detalhe de quais linhas mudaram -- reject, desproporcional para 2 usuários; upload parcial (não cobrindo todos os cartões da competência) removendo lançamentos de outro cartão -- reject, comportamento intencional e já documentado no Design Notes (uma única planilha cobre a fatura inteira da competência, verificado contra dado real).

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: sucesso

**Manual checks (if no CLI):**
- Reenviar a mesma planilha real já importada (Story 2.2/2.3) para a mesma competência -- confirmar 0 novos, 0 atualizados, 0 removidos na segunda chamada
- Editar manualmente a categoria de um lançamento existente (mesmo sem UI ainda, via update direto) e reenviar -- confirmar que a categoria permanece
- Construir uma planilha de teste com uma linha removida e outra com valor alterado em relação a um estado já salvo -- confirmar contagens corretas de remover/atualizar

## Auto Run Result

Status: done

**Summary:** `processarUpload` agora faz merge por delta de verdade em vez de sempre inserir: atualiza valor de lançamentos já existentes, insere os novos, remove os que sumiram, e nunca toca `categoria_id`. Chave e normalização extraídas para módulos únicos e compartilhados (`server/lancamento-matching`, `server/shared/normalizar-estabelecimento`), conforme AD-2/AD-9.

**Files changed:**
- `server/shared/normalizar-estabelecimento.ts` (novo)
- `server/lancamento-matching/index.ts` (novo) -- `calcularMergeDelta`, pura e testável
- `server/ingestao/upload.ts` -- transação reescrita para calcular e aplicar o delta

**Review findings breakdown:** 1 patch de severidade alta aplicado (consulta de lançamentos existentes sem `ORDER BY`, quebrando a garantia de determinismo do pareamento posicional -- corrigido com `.orderBy(lancamento.id)`); 11 rejeitados como comportamento explicitamente especificado pelo AC/spec, já deferido em stories anteriores com a mesma causa raiz, ou desproporcional/especulativo.

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos. Teste de ponta a ponta numa competência isolada cobrindo os 5 cenários do AC (inserção, reenvio idêntico, valor atualizado, categoria preservada após reenvio, remoção de linha sumida) -- todos corretos. Regressão contra as 2 planilhas reais já importadas (competências 6/2026 e 7/2026): reenviar sem nenhuma mudança deu "0 novos, 0 atualizados, 0 removidos" nas duas, confirmando o merge funciona de ponta a ponta com dado real.

**Nota de limpeza:** os testes das Stories 2.3/2.4 tinham deixado dados de teste incorretos no banco real (um cartão real do Tsuyoshi, `****5553`, marcado como terceiro por engano; dois cartões do Tsuyoshi mapeados para a conta da Milena; um cartão sintético de teste). Corrigido com autorização explícita do usuário antes de encerrar a sessão -- ver memlog do goal-engine.

**Residual risks:** Retração de projeção de parcelas ao remover a 1ª parcela conhecida de uma compra (Epic 5) ainda não implementada -- ver `deferred-work.md`. Pareamento posicional em si (não sua determinização, já corrigida) continua sensível à ordem de exportação do Itaú mudar entre reenvios -- aceito, é o mecanismo especificado.

Follow-up review recommended: false
