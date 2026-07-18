---
title: 'Story 5.3: Comprometimento do limite mensal'
type: 'feature'
created: '2026-07-18'
status: 'done'
baseline_revision: '9cc01650b99cabf7715a8d318b46551959fc8b4d'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** A tela `/parcelas` (Story 5.2) já mostra o total projetado por mês futuro, mas não separa quanto disso é de cada pessoa do casal -- sem essa quebra, não dá pra saber o quanto do próprio limite mensal já está comprometido antes de decidir uma compra maior.

**Approach:** Nova função `server/parcelas/comprometimento-limite.ts` que reaproveita `projetarParcelasFuturas()` (Story 5.2), atribui cada parcela projetada a uma pessoa via `cartao.usuarioId` (mesmo princípio de `server/visualizacao/resumo-gastos.ts`, Story 4.1: titular pendente de mapeamento vai para um grupo à parte, nunca é somado a uma pessoa nem fica ausente do total do casal), e soma por pessoa + total do casal, por mês. A tela `/parcelas` existente passa a mostrar essa quebra dentro de cada seção de mês -- sem rota nova.

## Boundaries & Constraints

**Always:**
- Reaproveitar `projetarParcelasFuturas()` (Story 5.2) como fonte -- não duplicar a lógica de projeção nem a leitura de `compra_parcelada`/`lancamento`.
- Atribuição de pessoa via `cartao.usuarioId` do lançamento real mais recente que ancorou aquela projeção -- mesma fonte de verdade de titular usada em `/gastos` (Story 4.1).
- Parcela projetada cujo cartão ainda não tem titular mapeado (`cartao.usuarioId` nulo) entra num total "pendente" à parte -- nunca é somada a uma pessoa específica, mas **sempre** entra no total do casal daquele mês (o comprometimento do casal não pode subestimar por causa de um cartão ainda não mapeado).
- As duas contas do casal (`listarContasCasal()`) aparecem sempre em cada mês com comprometimento, mesmo com total zerado -- mesmo princípio de `/gastos`.
- Valores em centavos (inteiro) -- nunca float.
- Mudança aditiva em `projetar-parcelas-futuras.ts` (Story 5.2): adicionar `cartaoId` ao item projetado é compatível com o consumidor existente (`/parcelas/page.tsx` de Story 5.2 simplesmente ignora o campo novo que não usa).

**Block If:** Nenhuma decisão identificada que exija input humano.

**Never:**
- Não criar rota nova -- a quebra por pessoa é exibida dentro da `/parcelas` já existente (Story 5.2), dentro de cada seção de mês.
- Não adicionar nenhuma mutação -- tela continua somente leitura.
- Não reimplementar a lógica de projeção nem a leitura de `compra_parcelada` -- só a atribuição de pessoa e a soma por pessoa/mês são novas nesta story.
- Não usar `cartao.terceiro` como filtro -- estruturalmente nenhum lançamento (e portanto nenhuma `compra_parcelada`) de um cartão marcado `terceiro` chega a existir (`upload.ts` rejeita o upload inteiro nesse caso, Story 2.3/4.1), então essa condição nunca ocorre aqui.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Parcelas projetadas de cartões das duas pessoas no mesmo mês | 2 compras em andamento, uma por cartão de cada pessoa, mesmo mês futuro | Mês mostra total do casal + total de cada pessoa somando corretamente | Nenhum erro esperado |
| Parcela projetada de cartão com titular pendente de mapeamento | Compra em andamento num cartão ainda sem `usuarioId` | Não entra no total de nenhuma pessoa; entra no total "pendente"; o total do casal do mês inclui esse valor | Nenhum erro esperado |
| Mês futuro sem nenhuma parcela de uma das duas pessoas | Só uma pessoa tem compra em andamento naquele mês | A outra pessoa aparece com total R$ 0,00 nesse mês, nunca ausente | Nenhum erro esperado |
| Nenhuma compra parcelada em andamento | `projetarParcelasFuturas()` retorna lista vazia | Tela mostra o mesmo estado vazio já existente da Story 5.2 | Nenhum erro esperado |
| `listarContasCasal()` falha (Admin API indisponível) | Erro de rede/credencial | Nenhuma pessoa pode ser confirmada -- todo o comprometimento do mês cai no total "pendente", total do casal permanece correto (mesma degradação graciosa de `/gastos`, Story 4.1) | Erro logado via `console.error`, nunca propaga para quebrar a página |

</intent-contract>

## Code Map

- `server/parcelas/projetar-parcelas-futuras.ts` (Story 5.2) -- fonte de dados; precisa carregar `cartaoId` no item projetado (hoje não carrega).
- `server/visualizacao/resumo-gastos.ts` (Story 4.1) -- referência direta de padrão: atribuição de pessoa via `cartao.usuarioId` + `listarContasCasal()`, grupo "pendente" para titular não confirmado, pessoas sempre presentes com total zerado.
- `server/ingestao/mapear-cartao.ts` -- `listarContasCasal()` reaproveitada.
- `app/(app)/parcelas/page.tsx` (Story 5.2) -- tela existente a estender, não substituir.

## Tasks & Acceptance

**Execution:**
- [x] `server/parcelas/projetar-parcelas-futuras.ts` -- ATUALIZAR: adicionar `cartaoId` ao `select`, a `UltimaParcelaReal` e a `ItemParcelaProjetada` -- necessário para atribuir pessoa nesta story, mudança aditiva (consumidor existente da Story 5.2 não quebra)
- [x] `server/parcelas/comprometimento-limite.ts` -- NOVO: `obterComprometimentoLimiteMensal(): Promise<{ competenciaAno, competenciaMes, totalCasalCentavos, pendenteCentavos, pessoas: { usuarioId, email, totalCentavos }[] }[]>` -- chama `projetarParcelasFuturas()`, cruza `cartaoId` de cada item com `cartao.usuarioId` (consulta os cartões distintos envolvidos) e `listarContasCasal()`, soma por pessoa/pendente/mês -- núcleo da story
- [x] `app/(app)/parcelas/page.tsx` -- ATUALIZAR: chamar também `obterComprometimentoLimiteMensal()`, e dentro de cada seção de mês já existente (Story 5.2) adicionar a quebra por pessoa (+ linha "pendente" quando `pendenteCentavos > 0`) ao lado do total do casal já exibido
- [x] Testar com um script temporário contra o Supabase de produção real: comprometimento correto por pessoa e por casal num mês com compras das duas contas reais; cartão com titular pendente contribuindo pro total do casal sem contribuir pro total de nenhuma pessoa -- dados sintéticos, removidos após o uso, sem tocar dado real do casal

**Acceptance Criteria:**
- Given parcelas projetadas para um mês futuro específico (Story 5.2), when acesso esse mês na tela de parcelas, then vejo a soma de todas as parcelas projetadas para aquele mês, separadas por pessoa e agregada no total do casal

## Spec Change Log

(vazio -- nenhum loopback de bad_spec disparado; os achados do review foram endereçados como patches diretos, ver Review Triage Log.)

## Review Triage Log

### 2026-07-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3 (0: high 0, medium 2, low 1)
- defer: 1 (0: high 0, medium 0, low 1)
- reject: 9 (0: high 0, medium 0, low 9)
- addressed_findings:
  - `[medium]` `[patch]` A spec afirmava que nenhum lançamento de cartão `terceiro` chegaria a existir aqui -- afirmação errada, mesmo engano já corrigido na Story 4.1: `rejeitarCartaoTerceiro` só bloqueia uploads futuros, então parcelas de um cartão rejeitado *depois* de já ter lançamentos reais continuavam contaminando `totalCasalCentavos` e o comprometimento de uma pessoa/pendente. Corrigido na fonte (`projetar-parcelas-futuras.ts`, Story 5.2): `INNER JOIN` com `cartao`, linhas com `terceiro=true` excluídas antes de qualquer agregação -- corrige tanto a Story 5.2 (total do mês) quanto esta story (quebra por pessoa) na mesma mudança.
  - `[medium]` `[patch]` `page.tsx` e `obterComprometimentoLimiteMensal()` chamavam `projetarParcelasFuturas()` cada um por conta própria -- duas leituras independentes do mesmo estado, round-trip duplicado, e uma janela real (embora estreita) para o total do cabeçalho (Story 5.2) divergir da quebra por pessoa (esta story) se algo mudasse entre as duas consultas. `obterComprometimentoLimiteMensal` agora recebe `competencias` já calculado como parâmetro; `totalCasalCentavos` removido de `ComprometimentoCompetencia` (redundante -- `page.tsx` já mostra `competencia.totalCentavos`, e as duas fontes agora são garantidamente a mesma).
  - `[low]` `[patch]` A lista de comprometimento por pessoa era visualmente indistinguível da lista de compras logo abaixo (mesmo `<ul className="card-list">`, sem rótulo) -- fácil de ler como mais itens em vez de um resumo. Adicionado um rótulo "Comprometido por pessoa:" antes da lista.
- deferred:
  - `[low]` O item "Pendente" na tela não explica o que significa nem linka para `/cartoes` (onde o titular pendente seria de fato mapeado) -- melhoria de UX razoável, não exigida pelo AC.
- Rejeitados (com razão): falta de `try/catch` ao redor da consulta de `cartao` em `obterComprometimentoLimiteMensal` -- reject, consultas diretas ao banco não são envolvidas em `try/catch` em nenhum outro lugar do app (só chamadas à Admin API do Supabase, como `listarContasCasal`, têm essa proteção) -- não é uma regressão desta story, é o padrão já estabelecido; nome "comprometimento-limite" sugerir comparação contra um limite de crédito real que não existe no schema -- reject, é exatamente a definição do próprio AC/PRD ("valor da fatura projetada, não o limite de crédito total do cartão"), documentado desde a Story 5.1/epics.md, não uma confusão introduzida aqui; round-trip extra para resolver `cartaoId -> usuarioId` em vez de um único JOIN como em `resumo-gastos.ts` -- reject, separação de camada intencional (a projeção da Story 5.2 não precisa saber de atribuição de pessoa), custo desprezível para o volume real de cartões distintos; chave de competência `${ano}-${mes}` montada em 3 lugares em vez de um helper -- reject, trivial demais pra justificar uma abstração nova, baixo risco real de drift dado que os 3 usos estão próximos e já revisados juntos; `usuarioId as string` sem checagem adicional pelo TypeScript -- reject, mesmo padrão já aceito em `resumo-gastos.ts` (Story 4.1), não um risco novo; falta de teste automatizado -- reject, gap pré-existente de todo o projeto; duplicação da checagem de titular pendente entre `resumo-gastos.ts` e este arquivo em vez de um helper compartilhado -- reject, mesma razão da chave de competência, abstração prematura para 2 usos com semânticas ligeiramente diferentes (um lida com categoria, outro com parcela).

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem violações
- `npm run build` -- expected: build de produção limpo

**Manual checks (if no CLI):**
- Script temporário (removido após o uso) criando compras parceladas sintéticas em cartões das duas contas reais + um cartão pendente, chamando `obterComprometimentoLimiteMensal()` diretamente e conferindo os totais por pessoa/pendente/casal.

## Auto Run Result

Status: done

**Summary:** Fecha o Epic 5. Nova função `server/parcelas/comprometimento-limite.ts` atribui cada parcela projetada (Story 5.2) a uma pessoa via `cartao.usuarioId`, somando por pessoa + total "pendente" (titular não mapeado) por mês -- mesmo princípio de `resumo-gastos.ts` (Story 4.1). A tela `/parcelas` existente (Story 5.2) passa a mostrar essa quebra dentro de cada seção de mês, sem rota nova.

**Files changed:**
- `server/parcelas/comprometimento-limite.ts` (novo) -- `obterComprometimentoLimiteMensal(competencias)`
- `server/parcelas/projetar-parcelas-futuras.ts` (Story 5.2) -- `cartaoId` adicionado ao item projetado (aditivo); após o review, também exclui lançamentos de cartão `terceiro`
- `app/(app)/parcelas/page.tsx` (Story 5.2) -- estendida com a quebra por pessoa dentro de cada seção de mês

**Review findings breakdown:** 3 patches aplicados (2 médios: exclusão de cartão `terceiro` corrigida na fonte -- mesmo engano já cometido e corrigido na Story 4.1, desta vez pego no review antes do commit; consulta duplicada de `projetarParcelasFuturas()` eliminada, `obterComprometimentoLimiteMensal` agora recebe o resultado já calculado como parâmetro, removendo uma janela real de inconsistência entre o total do cabeçalho e a quebra por pessoa; 1 baixo: rótulo visual adicionado para distinguir a lista de comprometimento por pessoa da lista de compras). 1 deferido (item "Pendente" sem explicação/link para `/cartoes`). 9 rejeitados -- destaque para a confirmação de que "comprometimento-limite" é exatamente a definição do AC/PRD (valor projetado, não limite de crédito real), não uma confusão de nome.

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos. Testado de ponta a ponta com um script temporário (removido após o uso) contra o Supabase de produção real: comprometimento correto por pessoa e por casal com compras das duas contas reais + um cartão pendente (6 cenários, todos passaram). Reverificado após os patches do review com um cenário focado em cartão `terceiro` com lançamento histórico: confirmado que a projeção (Story 5.2) e o comprometimento por pessoa (esta story) agora concordam entre si e nenhum dos dois inclui o valor do cartão rejeitado (5 cenários, todos passaram).

**Residual risks:** Item "Pendente" sem explicação/link de resolução (ver deferred-work.md); risco teórico de colisão de identidade em `compra_parcelada` (herdado da Story 5.1/AD-4, não observado em dado real); sem cobertura de teste automatizado (gap pré-existente de todo o projeto).

Follow-up review recommended: false -- lógica de atribuição por pessoa é uma extensão direta e já testada de um padrão estabelecido (Story 4.1); os 2 patches médios do review foram corrigidos e reverificados ponta a ponta no mesmo pass, sem ficar pendente para depois; fecha o Epic 5 sem nenhuma dependência nova para stories futuras.
