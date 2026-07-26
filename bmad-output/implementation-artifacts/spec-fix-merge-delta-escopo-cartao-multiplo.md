---
title: 'Corrigir escopo do merge por delta: upload de um cartão não pode apagar lançamentos de outro cartão'
type: 'bugfix'
created: '2026-07-26'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'e86cab56c5bbc3017121f1003e1206d358392c9a'
final_revision: '6ba0d3a8b0f4fb7385614ff652775a0f6859df17'
---

<intent-contract>

## Intent

**Problem:** `processarUpload` (server/ingestao/upload.ts) busca os lançamentos "existentes" para o merge por delta filtrando só por competência (mês/ano), sem escopar por cartão. Quando o arquivo enviado contém lançamentos de um cartão/família de cartões diferente do que já está salvo no banco para aquele mês, nenhuma chave de matching bate, e `calcularMergeDelta` interpreta TODOS os lançamentos existentes do mês — inclusive os de cartões ausentes do arquivo atual — como "sumiram no reenvio", apagando-os. Isso viola o próprio FR5/Story 2.4 (epics.md), que escopa o merge por delta a reenvio da MESMA planilha/fatura, não à competência inteira entre cartões distintos.

**Approach:** Escopar a query de "existentes" dentro da transação de `processarUpload` para incluir também `inArray(lancamento.cartaoId, cartaoIdsDoUploadAtual)`, onde `cartaoIdsDoUploadAtual` é o conjunto de IDs de cartão resolvidos/criados a partir dos lançamentos do arquivo atual (já disponível via `cartoesCache`, construído antes dessa query). Lançamentos de cartões ausentes do arquivo nunca mais entram no cálculo de `delta.remover`/`delta.atualizar`.

## Boundaries & Constraints

**Always:** A query de "existentes" usada por `calcularMergeDelta` deve ser restrita à competência (ano/mês) E aos `cartaoId` presentes em `cartoesCache` desta chamada. Lançamentos de cartões fora desse conjunto, na mesma competência, nunca são lidos/atualizados/removidos por este upload. `calcularMergeDelta` (server/lancamento-matching/index.ts) não muda — a chave de matching já inclui `cartaoId`; o bug é exclusivamente no escopo da query de entrada em upload.ts.

**Block If:** Nenhuma decisão de produto pendente — é correção de escopo de query, comportamento já especificado.

**Never:** Não alterar a lógica de `calcularMergeDelta`. Não alterar o comportamento de reenvio da MESMA fatura/cartão (deve continuar idêntico a antes: duplicatas por chave posicional, atualização de valor, remoção de lançamentos que sumiram dentro do MESMO conjunto de cartões). Não tocar dado real do casal durante a verificação — usar cartão/lançamento sintéticos descartáveis.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reenvio mesmo cartão (regressão) | Já existem lançamentos do cartão X na competência; upload novo contém só cartão X, com 1 lançamento removido e 1 valor alterado | Comportamento idêntico a antes do fix: o lançamento ausente é removido, o de valor alterado é atualizado | No error expected |
| Upload de cartão diferente no mesmo mês | Já existem lançamentos do cartão X na competência; upload novo contém só lançamentos do cartão Y (novo ou já existente) | Lançamentos de X permanecem intocados (nenhum é removido/atualizado); lançamentos de Y são inseridos/atualizados normalmente | No error expected |
| Upload misto (cartões X e Y no mesmo arquivo) | Já existem lançamentos de X e Y na competência; upload novo contém lançamentos de ambos, com um de X removido | Delta considera X e Y juntos (ambos presentes no arquivo) — remoção do lançamento ausente de X ainda ocorre normalmente, pois X está no conjunto do upload atual | No error expected |

</intent-contract>

## Code Map

- `server/ingestao/upload.ts` -- contém a query de "existentes" (linha ~138-142) a ser escopada por `cartaoId`; `cartoesCache` (construído no loop anterior, linha ~93-121) já tem os IDs necessários.
- `server/lancamento-matching/index.ts` -- `calcularMergeDelta`, não precisa mudar (referência para confirmar que a chave já inclui `cartaoId`).
- `bmad-output/planning-artifacts/epics.md` -- FR5 / Story 2.4, spec de referência do comportamento correto (merge escopado à mesma fatura/cartão, não à competência entre cartões distintos).

## Tasks & Acceptance

**Execution:**
- [x] `server/ingestao/upload.ts` -- adicionar `inArray(lancamento.cartaoId, [...cartoesCache.values()])` à condição `where` da query de `existentesBrutos` -- fecha o vazamento de dados entre cartões distintos na mesma competência.

**Acceptance Criteria:**
- Given lançamentos já salvos de um cartão X numa competência, when um upload contendo apenas lançamentos de um cartão Y diferente é processado para a mesma competência, then os lançamentos de X permanecem inalterados (nenhum removido, nenhum atualizado).
- Given lançamentos já salvos de um cartão X numa competência, when a mesma fatura de X é reenviada com um lançamento a menos, then esse lançamento é removido normalmente (comportamento de Story 2.4 preservado).
- Given um upload contendo lançamentos de dois cartões X e Y na mesma competência, when um lançamento de X que só existia antes some do arquivo, then ele é removido normalmente (X está no conjunto do upload atual).

## Spec Change Log

## Review Triage Log

### 2026-07-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1 (low)
- defer: 0
- reject: 10
- addressed_findings:
  - `[low]` `[patch]` Comentário de declaração de `cartoesCache` não documentava que seus valores agora também definem o escopo de cartões que o merge por delta tem permissão de tocar (era descrito só como otimização de performance) -- comentário estendido para deixar essa segunda responsabilidade explícita, prevenindo que uma limpeza futura do cache reintroduza o bug silenciosamente.

Achados rejeitados (10, com justificativa): (1) ausência de teste automatizado que sobrevive ao fix -- consistente com o padrão já estabelecido em toda a run (verificação sempre via script descartável contra produção real, nunca suíte de testes commitada); (2) estado não commitado no momento da revisão -- resolvido no commit ao final deste pass; (3) comportamento de `inArray` com array vazio dependendo de especial-caso do drizzle-orm -- inalcançável na prática, `parsePlanilhaItau` já rejeita upload com `lancamentos.length === 0` antes de chegar na transação (confirmado por Edge Case Hunter); (4) "raio de explosão" em outros módulos que filtram `lancamento` só por competência -- verificado diretamente por grep: `corrigir-categoria.ts`, `gerenciar-categorias.ts` e `repasse-lancamento.ts` só fazem update/delete escopados por `lancamento.id` ou `categoriaId`, nunca bulk-delete por competência; só `upload.ts` tinha esse padrão, já corrigido; (5) interleaving de comentário/variável dificultando refactor futuro -- nitpick de formatação, sem risco funcional; (6) fix não distingue cartão novo vs. já existente no escopo -- inclusão de cartões novos é inofensiva por construção (nunca têm lançamento prévio); (7) comentário "nunca deve tocar cartões que não contém" superclama garantia sob concorrência -- nuance de wording, não é regressão funcional introduzida por este diff; (8) ausência de teste unitário para `calcularMergeDelta` -- gap pré-existente em todo o projeto (zero arquivos de teste no repo), não causado por esta mudança; (9) mensagem de sucesso ao usuário não permite confirmar visualmente que outros cartões ficaram intocados -- melhoria de produto fora do escopo desta correção de bug; (10) achado do Edge Case Hunter sobre "lançamentos com cartaoId já errado ficando permanentemente fora de alcance" -- não corresponde a um mecanismo real neste schema (FK NOT NULL sempre resolvida corretamente via nome mascarado ou `mapear-cartao`); descreve o comportamento novo pretendido (cartão sem lançamento neste upload não é tocado), não um dado órfão real.

## Auto Run Result

Status: done

**Resumo:** Corrigido bug real de perda de dados no upload de fatura: a query de "existentes" usada pelo merge por delta em `processarUpload` filtrava só por competência (mês/ano), então enviar uma fatura de um cartão diferente do já carregado no mesmo mês apagava TODOS os lançamentos dos outros cartões (nenhuma chave de matching batia). Fix: escopar também por `cartaoId` (usando os IDs já resolvidos em `cartoesCache` para o upload atual). Múltiplos cartões, incluindo tipos "Virtual recorrente"/"Wallet"/"Físico" (já texto livre no schema), já eram suportados pelo parser/schema -- não era capacidade nova, era correção de escopo.

**Arquivos alterados:**
- `server/ingestao/upload.ts` -- query de `existentesBrutos` ganhou `inArray(lancamento.cartaoId, cartaoIdsDoUpload)`; comentário de `cartoesCache` estendido para documentar a segunda responsabilidade (escopo de segurança, não só cache de performance).

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada):** 0 `bad_spec`, 1 `patch` aplicado (baixo -- comentário de `cartoesCache` não documentava seu papel de escopo de segurança). 0 `defer`. 10 `reject` (destaque: "raio de explosão" em outros módulos verificado diretamente por grep -- nenhum outro ponto do código faz bulk-delete/update de `lancamento` escopado só por competência; comportamento de `inArray([])` confirmado inalcançável, `parsePlanilhaItau` já rejeita upload vazio antes da transação; achado do Edge Case Hunter sobre "dados órfãos com cartaoId errado" na verdade descreve o comportamento novo pretendido, não um dado órfão real neste schema).

**Follow-up review recomendado:** false -- mudança contida (1 arquivo, ~15 linhas), 0 `bad_spec`, verificação ponta a ponta cobriu os 3 cenários do I/O Matrix contra o Supabase de produção real com dado sintético descartável, raio de explosão auditado e confirmado limpo.

**Verificação realizada:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos (antes e depois do patch). Script de teste ponta a ponta descartável (`scripts/_teste-temporario-merge-cartao.ts`, removido após uso, sem resíduo) contra o Supabase de produção real, com cartões/lançamentos sintéticos próprios (competência 01/2099, nunca dado real do casal): (a) reenvio do mesmo cartão com 1 lançamento a menos e 1 valor alterado -- comportamento idêntico a antes do fix, confirmado (atualizar 1, remover 1); (b) upload contendo só um cartão Y diferente no mesmo mês em que já existem lançamentos do cartão X -- os 2 lançamentos de X permanecem intocados no banco após o upload, confirmado por leitura direta; (c) upload misto com X e Y juntos, faltando 1 lançamento de X no arquivo -- removido normalmente, já que X estava no conjunto do upload atual. Todos os 3 cenários passaram; limpeza confirmou zero resíduo no banco.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build limpo

**Manual checks (if no CLI):**
- Script descartável (sem residuo, dado sintético) contra o Supabase de produção real: criar cartão sintético A com lançamentos numa competência de teste, cartão sintético B, fazer upload simulado (chamando a lógica de merge diretamente ou via helper) só com lançamentos de B na mesma competência, confirmar que os lançamentos de A continuam presentes e inalterados. Repetir o cenário de reenvio do mesmo cartão para confirmar zero regressão. Remover todo dado sintético ao final.
