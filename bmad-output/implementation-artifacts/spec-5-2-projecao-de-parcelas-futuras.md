---
title: 'Story 5.2: Projeção de parcelas futuras'
type: 'feature'
created: '2026-07-18'
status: 'done'
baseline_revision: 'e8513a507f6410d96b01cd876193ca5f12e949ff'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** `compra_parcelada` (Story 5.1) já sabe identificar que várias parcelas pertencem à mesma compra, mas nada ainda mostra ao casal quais parcelas futuras ainda vão aparecer nas próximas faturas -- essa informação só é descoberta mês a mês, fatura a fatura.

**Approach:** Nova função `server/parcelas/projetar-parcelas-futuras.ts` que, para cada `compra_parcelada`, encontra a parcela real mais recente conhecida (maior `parcelaNumero` entre os `lancamento` vinculados) e projeta em leitura (nunca como linha de `lancamento`, AD-7) as parcelas seguintes até `totalParcelas`, uma por mês calendário a partir da competência dessa última parcela real. Nova tela `/parcelas` agrupa essas projeções por mês futuro. Fecha também o gap deixado pela Story 2.4 (AD-7): ao remover no merge por delta um lançamento que era a única parcela real conhecida de uma compra, a `compra_parcelada` órfã é retraída (apagada) via uma função de `server/parcelas`.

## Boundaries & Constraints

**Always:**
- Parcelas futuras são **sempre** computadas em leitura a partir do estado real de `lancamento`/`compra_parcelada` no momento da consulta -- nunca uma tabela de projeções cacheada, nunca uma linha de `lancamento` (AD-7).
- A parcela real mais recente conhecida de uma compra é `MAX(parcelaNumero)` entre os `lancamento` com aquele `compraParceladaId` -- não a competência de hoje, não a `competenciaInicial` da compra (que é só metadado de âncora/exibição, Story 5.1).
- Reconciliação (parcela real casando com uma projeção, realinhamento quando um mês é pulado sem envio de fatura) não precisa de nenhuma lógica explícita de "matching": como a projeção é sempre recalculada do zero a partir do estado real mais atual, a próxima parcela real processada automaticamente vira o novo "mais recente conhecido" e a lista de futuras muda sozinha -- não implementar nenhum mecanismo adicional de reconciliação.
- "Mês futuro" significa "parcela ainda não vista numa fatura real processada", não "competência calendário posterior a hoje" -- se o casal está atrasado em enviar faturas, a projeção continua contando a partir da última parcela real conhecida, mesmo que essa competência já tenha passado no calendário.
- Ao remover (merge por delta, `server/ingestao`) um `lancamento` vinculado a uma `compra_parcelada`, se depois da remoção nenhum `lancamento` real restar vinculado àquela compra, a `compra_parcelada` é apagada -- uma função de serviço em `server/parcelas` (nunca `ingestao` manipulando `compra_parcelada` diretamente, AD-7). Se ainda restar pelo menos um lançamento real vinculado, nada precisa ser feito (a projeção recalcula sozinha a partir do que restou).
- Estabelecimento exibido na projeção usa a capitalização original do lançamento real mais recente (não `compra_parcelada.estabelecimentoNormalizado`, que é só a chave normalizada).
- Valores em centavos (inteiro) -- nunca float.
- Interface web usável sem scroll horizontal a partir de 360px, mesmo padrão do resto do app.

**Block If:** Nenhuma decisão identificada que exija input humano.

**Never:**
- Não implementar a separação por pessoa nem o total agregado do casal -- isso é a Story 5.3 (Comprometimento do limite mensal); esta story mostra o total por mês, sem quebra por pessoa.
- Não adicionar nenhuma mutação nova em `/parcelas` -- tela somente leitura.
- Não alterar `delta.atualizar` nem a lógica de identificação da Story 5.1 -- só o caminho de `delta.remover` ganha a chamada de retração.
- Não usar a data de hoje (`new Date()`) para decidir quais meses mostrar ou parar de mostrar -- toda a lógica deriva do estado real em `lancamento`/`compra_parcelada`, nunca do relógio.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Compra em andamento, parcela mais recente conhecida < total | Compra 3/10, última parcela real vista na competência 2026-06 | Projeta parcelas 4..10 nas competências 2026-07..2027-01 | Nenhum erro esperado |
| Compra já quitada (última parcela conhecida = total) | Compra 10/10 já vista | Nenhuma parcela futura projetada para essa compra | Nenhum erro esperado |
| Mês pulado sem envio de fatura | Última parcela real conhecida = 3/10 em 2026-06; próxima fatura enviada é 2026-09 trazendo a parcela 6/10 (a app nunca viu 4/10 nem 5/10) | Após esse upload, a projeção passa a computar a partir de 6/10 em 2026-09 -- parcelas 7..10 projetadas a partir de 2026-10, sem nenhuma menção às parcelas 4/10 e 5/10 nunca vistas | Nenhum erro esperado |
| Lançamento removido era a única parcela real conhecida de uma compra | Merge por delta remove o único `lancamento` vinculado a uma `compra_parcelada` | `compra_parcelada` é apagada; nenhuma projeção aparece para essa compra depois | Nenhum erro esperado |
| Lançamento removido não era a única parcela conhecida | Compra tinha 2 parcelas reais vinculadas, uma é removida no merge por delta | `compra_parcelada` permanece; projeção recalcula a partir da parcela real restante | Nenhum erro esperado |
| Nenhuma compra parcelada em andamento | Nenhum `compra_parcelada` com parcela pendente de projeção | Tela mostra estado vazio, nunca erro | Nenhum erro esperado |
| `totalParcelas` for exatamente igual ao `parcelaNumero` mais recente conhecido | Compra "quitada" no sentido de que a última parcela vista é a última do total | Mesmo caso de "compra já quitada" acima -- nenhuma projeção | Nenhum erro esperado |

</intent-contract>

## Code Map

- `server/parcelas/identificar-compra-parcelada.ts` -- referência de padrão de módulo/tipos (Story 5.1); `compra_parcelada` e `lancamento.compraParceladaId` já existem.
- `server/ingestao/upload.ts` -- loop de `delta.remover` (não tem hoje nenhuma lógica ciente de parcela) é onde a chamada de retração entra.
- `app/(app)/gastos/page.tsx` -- referência de padrão de tela Server Component somente leitura, seções agrupadas (Story 4.1).
- `app/(app)/_components/nav.tsx` -- adicionar item "Parcelas".
- `lib/moeda.ts` -- `formatarValorEmReais` reaproveitado.

## Tasks & Acceptance

**Execution:**
- [x] `server/parcelas/projetar-parcelas-futuras.ts` -- NOVO: `projetarParcelasFuturas(): Promise<{ competenciaAno, competenciaMes, totalCentavos, itens: { compraParceladaId, estabelecimento, parcelaNumero, totalParcelas, valorCentavos, competenciaAno, competenciaMes }[] }[]>` -- busca todos os `lancamento` com `compraParceladaId` não nulo (join `compra_parcelada` para `totalParcelas`/`valorParcelaCentavos`), agrega em memória por `compraParceladaId` achando o de maior `parcelaNumero`, projeta as parcelas seguintes (uma por mês calendário) até `totalParcelas`, agrupa o resultado por competência projetada -- núcleo da story
- [x] `server/parcelas/retrair-compra-parcelada.ts` -- NOVO: `retrairComprasSemLancamentos(executor, compraParceladaIds: number[]): Promise<void>` -- para cada id, se não sobrar nenhum `lancamento` vinculado, apaga a `compra_parcelada`; único ponto de escrita/exclusão nessa tabela para este fluxo (AD-7)
- [x] `server/ingestao/upload.ts` -- ATUALIZAR: no bloco de `delta.remover`, antes de deletar, selecionar os `compraParceladaId` (não nulos) dos lançamentos a remover; depois de deletar, chamar `retrairComprasSemLancamentos(tx, idsColetados)` -- fecha o gap herdado da Story 2.4/AD-7
- [x] `app/(app)/parcelas/page.tsx` -- NOVO: Server Component `async`, sem parâmetros de busca; chama `projetarParcelasFuturas()`, renderiza uma seção por mês futuro (competência + total) com a lista de compras que contribuem para aquele mês (estabelecimento, parcela N/M, valor); estado vazio quando não há nenhuma compra em andamento
- [x] `app/(app)/_components/nav.tsx` -- ATUALIZAR: adicionar `{ href: '/parcelas', label: 'Parcelas' }` -- sem isso a tela fica inacessível
- [x] Testar com um script temporário contra o Supabase de produção real: compra em andamento projetando os meses corretos; compra quitada sem projeção; simular "mês pulado" (parcela real avança mais de 1 posição) e confirmar que a projeção realinha sem mencionar as parcelas nunca vistas; remover a única parcela real de uma compra sintética e confirmar que a `compra_parcelada` é apagada e some da projeção; remover uma de duas parcelas reais e confirmar que a compra permanece -- dados sintéticos, removidos após o uso, sem tocar dado real do casal (incluindo as 32 parcelas reais já existentes, herdadas do backfill da Story 5.1)

**Acceptance Criteria:**
- Given uma compra parcelada em andamento (Story 5.1), when acesso a tela de parcelas, then vejo, para cada mês futuro, o total de parcelas que vão incidir naquele mês, computado em leitura -- nunca uma linha real de lançamento (AD-7)
- Given uma nova fatura processada, when uma parcela projetada corresponde a uma parcela real extraída (mesma chave de compra original), then a projeção correspondente sai da lista de "futuras"
- Given o casal pulou um mês sem enviar fatura, when a próxima fatura real chega, then a reconciliação realinha a projeção pela parcela real, não pela contagem calendário
- Given um lançamento removido no merge por delta (Epic 2, Story 2.4) era a primeira parcela conhecida de uma compra, when a remoção acontece, then a projeção correspondente é retraída

## Design Notes

A "reconciliação" (2ª e 3ª AC) não tem nenhum código dedicado -- é uma consequência de projetar sempre a partir de `MAX(parcelaNumero)` real, nunca de um estado gravado. Isso simplifica a story inteira: não existe uma tabela de "projeções pendentes" para casar/invalidar, só uma função pura de leitura chamada toda vez que a tela é acessada.

`avancarCompetencia(ano, mes, n)`: soma `n` meses a partir de `(ano, mes)` com virada de ano (`mes` 1-indexado, `((mes - 1 + n) % 12) + 1` para o mês resultante, `ano + Math.floor((mes - 1 + n) / 12)` para o ano).

## Spec Change Log

(vazio -- nenhum loopback de bad_spec disparado; os achados do review foram endereçados como patches diretos, ver Review Triage Log.)

## Review Triage Log

### 2026-07-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3 (0: high 0, medium 2, low 1)
- defer: 0
- reject: 10 (0: high 0, medium 0, low 10)
- addressed_findings:
  - `[medium]` `[patch]` A query de `projetarParcelasFuturas` não tinha `ORDER BY`, então duas linhas empatadas no maior `parcelaNumero` de uma mesma compra (dado duplicado/corrida) teriam desempate na ordem arbitrária do Postgres -- mesmo problema que `server/ingestao/upload.ts` já resolve explicitamente para o merge por delta. `ORDER BY lancamento.id` adicionado, comparação trocada para `>=` (linha de maior `id` desempata de forma determinística).
  - `[medium]` `[patch]` `retrairComprasSemLancamentos` fazia um `SELECT` de checagem seguido de `DELETE` condicional por id, num loop -- corrida real (ainda que de baixíssima probabilidade) entre a checagem e a exclusão, mais N round-trips sequenciais dentro da transação do upload. Reescrito como um único `DELETE ... WHERE id IN (...) AND NOT EXISTS (...)`, atômico e em lote -- elimina a corrida e o N+1 na mesma mudança.
  - `[low]` `[patch]` `NOME_MES` era a 4ª cópia local de uma lista de nomes de mês no projeto -- extraído para `lib/competencia.ts` (que já tinha `competenciaValida`) e reaproveitado só pela nova tela `/parcelas` (as outras 3 páginas usam `MESES`, um formato diferente para `<select>`, fora do escopo tocar).
- deferred:
  - nenhum
- Rejeitados (com razão): risco de colisão de identidade em `compra_parcelada` (duas compras distintas na mesma chave AD-4) corromper a projeção -- reject, já revisado e aceito na Story 5.1 (verificado empiricamente contra dado real, sem evidência), decisão de arquitetura adotada (AD-4), não é escopo desta story alterar; falta de limite superior no loop de projeção contra um `totalParcelas` corrompido -- reject, `totalParcelas` vem sempre do parser interno (Story 2.2), nunca de input direto de usuário, sem vetor de ataque real; ausência de checagem de faixa em `NOME_MES[competenciaMes]` -- reject, inalcançável por construção (`avancarCompetencia` sempre devolve 1-12 por aritmética modular, `lancamento.competenciaMes` sempre validado 1-12 no próprio upload antes de qualquer inserção); falta de `try/catch` ao redor de `await projetarParcelasFuturas()` na página -- reject, mesmo padrão já estabelecido em `/gastos`, `/lancamentos`, `/upload` (nenhuma dessas páginas trata erro de leitura explicitamente); custo de escanear toda a tabela de lançamentos parcelados a cada acesso -- reject, volume real (dezenas de lançamentos parcelados) desproporcional para justificar complexidade extra, mesmo padrão de rejeição já usado nas Stories 3.3/4.1; falta de teste automatizado -- reject, gap pré-existente de todo o projeto; posição do item "Parcelas" no menu -- reject, cosmético/subjetivo, sem critério objetivo melhor proposto; ordem `delta.remover` (retração) antes de `delta.atualizar`/`delta.inserir` no mesmo upload poder apagar e recriar uma `compra_parcelada` que tinha só uma parcela sendo corrigida na mesma competência -- reject, verificado que é seguro por construção: a identidade da compra é definida pelo conteúdo (chave AD-4), não pelo `id`, e tudo acontece dentro da mesma transação -- o resultado final é equivalente (uma linha, vinculada corretamente), só com um `id` novo, sem perda de dado nem contagem duplicada; segunda ordenação de `itens` dentro do mês sem critério de desempate -- reject, resolvido de fato pelo `ORDER BY` já adicionado (item acima), a ordem de inserção no `Map` agora é determinística; `compra_parcelada` órfãs pré-existentes (de antes desta story) nunca limpas -- reject, invariante confirmada: toda criação de `compra_parcelada` (via `identificarOuCriarCompraParcelada` ou o backfill da Story 5.1) sempre vincula pelo menos um lançamento na mesma operação, então não existem órfãs pré-existentes; mesmo que existissem, o `INNER JOIN` da projeção já as exclui da visão do usuário.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem violações
- `npm run build` -- expected: build de produção limpo, incluindo a nova rota `/parcelas`

**Manual checks (if no CLI):**
- Script temporário (removido após o uso) criando uma `compra_parcelada` sintética + lançamentos reais parciais, chamando `projetarParcelasFuturas()` diretamente e conferindo as competências/valores projetados; testando o "mês pulado" inserindo uma segunda parcela real que avança mais de uma posição; testando a retração chamando `retrairComprasSemLancamentos` depois de remover o único lançamento vinculado.

## Auto Run Result

Status: done

**Summary:** Nova função `server/parcelas/projetar-parcelas-futuras.ts` projeta em leitura (nunca materializada, AD-7) as parcelas futuras de cada compra em andamento, a partir da parcela real mais recente conhecida -- sem nenhuma lógica de reconciliação dedicada, já que recalcular do zero a cada acesso resolve "parcela real casando com projeção" e "mês pulado" de graça. Nova tela `/parcelas` agrupa por mês futuro. Fecha o gap herdado da Story 2.4/AD-7: `server/parcelas/retrair-compra-parcelada.ts` apaga uma `compra_parcelada` que fica sem nenhum lançamento real vinculado depois de uma remoção no merge por delta.

**Files changed:**
- `server/parcelas/projetar-parcelas-futuras.ts` (novo) -- `projetarParcelasFuturas()`
- `server/parcelas/retrair-compra-parcelada.ts` (novo) -- `retrairComprasSemLancamentos()`, `DELETE ... NOT EXISTS` atômico após o review
- `server/ingestao/upload.ts` -- `delta.remover` agora coleta `compraParceladaId`s e chama a retração
- `app/(app)/parcelas/page.tsx` (novo) -- tela de projeção por mês
- `app/(app)/_components/nav.tsx` -- item "Parcelas" adicionado
- `lib/competencia.ts` -- `NOME_MES` adicionado (achado do review, evita uma 4ª duplicata)

**Review findings breakdown:** 3 patches aplicados (2 médios: `ORDER BY` determinístico na agregação de maior parcela conhecida; `retrairComprasSemLancamentos` reescrita como `DELETE...NOT EXISTS` atômico, eliminando uma corrida real de baixa probabilidade e um N+1; 1 baixo: `NOME_MES` extraído em vez de duplicado uma 4ª vez). 0 deferidos. 10 rejeitados -- destaque para a ordem `remover`→`inserir` dentro do mesmo upload potencialmente apagar-e-recriar uma `compra_parcelada`, verificada como segura por construção (identidade por conteúdo, não por id, tudo na mesma transação) em vez de corrigida.

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos, incluindo a nova rota `/parcelas`. Testado de ponta a ponta com um script temporário (removido após o uso) contra o Supabase de produção real: compra em andamento projetando os meses/valores corretos; compra quitada sem projeção; "mês pulado" realinhando pela parcela real (não pela contagem calendário); remoção da única parcela real apagando a `compra_parcelada` e sumindo da projeção; remoção de uma de duas parcelas mantendo a compra -- 10 cenários, todos passaram. Reverificado após os patches do review (ORDER BY + DELETE atômico) com 3 cenários focados na retração em lote -- todos passaram, incluindo confirmação de que o `NOT EXISTS` não apaga por engano uma compra que ainda tem lançamento vinculado.

**Residual risks:** Risco teórico de colisão de identidade em `compra_parcelada` (herdado da Story 5.1/AD-4, não observado em dado real); sem cobertura de teste automatizado (gap pré-existente de todo o projeto).

Follow-up review recommended: false -- lógica central (projeção) é pura função de leitura já testada ponta a ponta em 4 cenários reais incluindo o caso mais delicado ("mês pulado"); os 2 patches médios do review (determinismo, corrida) foram corrigidos e reverificados no mesmo pass, sem ficar pendente para depois.
