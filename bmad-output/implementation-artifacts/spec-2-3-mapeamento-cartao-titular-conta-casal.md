---
title: 'Story 2.3: Mapeamento de cartão/titular para conta do casal'
type: 'feature'
created: '2026-07-18'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'fd757a1b36bf8fc04bb168bc0b4516f17f0666fb'
---

<intent-contract>

## Intent

**Problem:** Todo `cartao` criado pela Story 2.2 fica com `usuario_id` nulo para sempre — não existe nenhuma tela para o casal associar um número de cartão mascarado a uma das duas contas, nem forma de marcar um cartão como não pertencente ao casal.

**Approach:** Página `/cartoes` lista os cartões pendentes (`usuario_id` nulo e ainda não marcados como terceiro) e permite atribuir cada um a uma das duas contas reais (via Supabase Auth Admin API) ou marcá-lo explicitamente como "não é do casal". Um cartão já marcado como terceiro faz `processarUpload` rejeitar de imediato qualquer upload futuro que o contenha, antes de tocar o banco.

## Boundaries & Constraints

**Always:** A atribuição de um cartão só aceita um dos dois `usuario_id` reais (validados contra `auth.admin.listUsers()`, nunca um id arbitrário vindo do formulário); uma vez atribuído, o cartão nunca mais aparece na lista de pendentes, e lançamentos futuros do mesmo `numero_mascarado` já chegam automaticamente sob aquele `cartao_id` (nenhuma pergunta de novo, já garantido pela Story 2.2 -- o cartão é resolvido por número, a atribuição fica em `cartao`, não por lançamento); marcar um cartão como "não é do casal" (`terceiro = true`) é permanente e faz qualquer upload futuro que contenha aquele número de cartão ser rejeitado por inteiro antes de qualquer escrita no banco.

**Block If:** nenhuma decisão de código aqui depende de informação exclusiva do usuário.

**Never:** Nunca aceitar um `usuario_id` que não seja um dos dois retornados por `auth.admin.listUsers()`; nunca permitir que um cartão fique simultaneamente atribuído a uma conta E marcado como terceiro (mutuamente exclusivos); nunca reprocessar/duplicar lançamentos já persistidos ao mapear um cartão (o mapeamento só atualiza `cartao.usuario_id`, nunca toca `lancamento`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cartão pendente é atribuído | Cartão sem dono, casal escolhe uma das 2 contas | `cartao.usuario_id` atualizado; cartão some da lista de pendentes | Nenhum erro |
| Cartão marcado como terceiro | Casal escolhe "não é do casal" para um cartão pendente | `cartao.terceiro = true`; cartão some da lista de pendentes | Nenhum erro |
| Upload contendo cartão já marcado como terceiro | Planilha nova traz lançamentos de um `numero_mascarado` com `terceiro = true` | Upload inteiro rejeitado antes de qualquer escrita | Mensagem específica citando o cartão |
| Upload contendo cartão já mapeado | Planilha traz lançamentos de um `numero_mascarado` já atribuído a uma conta | Processado normalmente (Story 2.2), sem pedir mapeamento de novo | Nenhum erro |
| Tentativa de atribuir a um `usuario_id` inválido | Requisição forjada com um id que não é um dos dois da conta do casal | Rejeitada, `cartao` não é alterado | Erro claro, sem escrita |

</intent-contract>

## Code Map

- `db/schema/index.ts` -- MODIFICAR: adicionar coluna `terceiro` (boolean, not null, default false) em `cartao`
- `server/ingestao/mapear-cartao.ts` -- NOVO: `listarCartoesPendentes`, `listarContasCasal`, `mapearCartao`, `rejeitarCartaoTerceiro`
- `server/ingestao/upload.ts` -- MODIFICAR: antes da transação, checar se algum `numero_mascarado` do upload já está marcado como terceiro
- `app/(app)/cartoes/page.tsx` -- NOVO: tela de mapeamento (Server Component, formulários por cartão pendente)

## Tasks & Acceptance

**Execution:**
- [x] `db/schema/index.ts` -- adicionar `terceiro: boolean('terceiro').notNull().default(false)` em `cartao`; gerar e aplicar migration (`npm run db:generate` + `npm run db:migrate`)
- [x] `server/ingestao/mapear-cartao.ts` -- `'use server'`; `listarContasCasal()` usa `createAdminClient().auth.admin.listUsers()` e retorna `{ id, email }[]` das (exatamente 2) contas; `listarCartoesPendentes()` retorna `cartao` onde `usuario_id is null and terceiro = false`, ordenado por `created_at`; `mapearCartao(cartaoId: number, usuarioId: string)` valida que `usuarioId` está entre os ids de `listarContasCasal()` (senão retorna erro sem alterar nada), então `update cartao set usuario_id = usuarioId where id = cartaoId`, e `revalidatePath('/cartoes')`; `rejeitarCartaoTerceiro(cartaoId: number)` faz `update cartao set terceiro = true where id = cartaoId` e `revalidatePath('/cartoes')`
- [x] `server/ingestao/upload.ts` -- logo após `parsePlanilhaItau` retornar sucesso e antes de abrir a transação: extrair o conjunto de `numeroMascarado` distintos dos lançamentos, buscar `cartao` existentes com esses números e `terceiro = true`; se houver algum, retornar `{ ok: false, message: 'Upload rejeitado: contém lançamentos do cartão <numero_mascarado>, marcado como não pertencente ao casal. Resolva na tela de mapeamento (/cartoes) antes de reenviar.' }` sem tocar a transação
- [x] `app/(app)/cartoes/page.tsx` -- Server Component `async`; chama `listarCartoesPendentes()` e `listarContasCasal()`; para cada cartão pendente, renderiza nome do titular/tipo/número mascarado e um `<form>` com um botão por conta mais um botão "Não é do casal"; se não houver pendentes, mostra uma mensagem simples ("Nenhum cartão pendente de mapeamento.")

**Acceptance Criteria:**
- Given um lançamento extraído (Story 2.2) com um titular/cartão ainda não mapeado, when o casal abre a tela de mapeamento (`/cartoes`), then pode associar aquele cartão a uma das duas contas, e a associação vale para lançamentos futuros do mesmo cartão sem pedir confirmação de novo
- Given um titular/cartão que já foi marcado como não pertencente a nenhuma das duas contas do casal, when um novo upload contendo aquele mesmo número de cartão é processado, then o upload inteiro é rejeitado com aviso específico, exigindo resolução manual antes de prosseguir

## Design Notes

Diferente de tentar detectar "cartão de terceiro" no primeiro encontro (o que exigiria pausar o upload no meio, guardar o arquivo parseado em algum lugar, e esperar uma decisão síncrona antes de confirmar a escrita -- um fluxo de duas fases desproporcional para este app), a rejeição de upload desta story é baseada em estado já conhecido: um cartão só é rejeitado numa reimportação se o casal já o marcou explicitamente como terceiro na tela de mapeamento, depois de vê-lo pela primeira vez. Na prática, isso é razoável para este produto: a fatura é de uma única conta contratual do casal (2 titulares), então um cartão verdadeiramente de terceiro é uma anomalia rara, não o caminho comum -- o primeiro upload que o traz é aceito como pendente (Story 2.2), e cabe ao casal reconhecê-lo e rejeitá-lo na tela de mapeamento antes do próximo reenvio.

Não existe ainda uma tabela `usuario` própria -- as duas contas são resolvidas diretamente do Supabase Auth (`auth.admin.listUsers()`) a cada carregamento da tela, sem cache. Para 2 contas fixas isso é desprezível em custo e evita manter uma tabela espelho desnecessária.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

### 2026-07-18 — Review pass 1

- intent_gap: 0
- bad_spec: 0
- patch: 5 (high 0, medium 1, low 4)
- defer: 2 (low 2)
- reject: 9
- addressed_findings:
  - `[medium]` `[patch]` `mapearCartao`/`rejeitarCartaoTerceiro` faziam `UPDATE` só filtrando por `id`, sem checar se o cartão ainda estava pendente -- uma chamada repetida/concorrente podia sobrescrever silenciosamente um cartão já mapeado ou já rejeitado, e um `cartaoId` inexistente retornava sucesso (0 linhas afetadas, sem checagem). Adicionado guard `PENDENTE` (`usuario_id is null and terceiro = false`) no `WHERE` das duas funções, com `.returning()` e retorno de erro explícito se nenhuma linha foi afetada; `mapearCartao` também passou a setar `terceiro: false` explicitamente (mutuamente exclusivo com `usuario_id`).
  - `[low]` `[patch]` Erro de `mapearCartao`/`rejeitarCartaoTerceiro` era descartado silenciosamente nas Server Actions inline de `cartoes/page.tsx` (nem log). Adicionado `console.error` quando `!resultado.ok`.
  - `[low]` `[patch]` Mensagem de rejeição de upload só citava o primeiro cartão-terceiro encontrado, mesmo havendo mais de um na mesma planilha. Agora lista todos, separados por vírgula.
  - `[low]` `[patch]` `listarContasCasal` não tratava falha de `listUsers()` -- uma exceção ali derrubaria a página `/cartoes` inteira com o erro genérico do Next. Envolvido em `try/catch`, retornando lista vazia e logando o erro.
  - `[low]` `[patch]` `user.email ?? ''` renderizaria um botão "Atribuir a " sem nada depois, caso uma conta não tivesse e-mail (não acontece hoje, mas defensivo e trivial). Fallback para `'(sem e-mail)'`.
- deferred:
  - `[low]` Corrida (TOCTOU) entre a consulta de cartões-terceiro e a abertura da transação em `upload.ts`: uma rejeição concorrente exatamente nesse intervalo poderia deixar passar lançamentos de um cartão que acabou de ser marcado como terceiro. Extremamente improvável para 2 pessoas operando manualmente; registrado em `deferred-work.md`.
  - `[low]` Sem forma de desfazer `rejeitarCartaoTerceiro` pela UI -- uma vez marcado, só reversível editando o banco diretamente. Fora do escopo desta story (AC não pede um fluxo de "desmarcar"); registrado em `deferred-work.md` como candidato a uma story de polimento futura.
- Rejeitados (com razão): falta de checagem de auth dentro das Server Actions -- reject, decisão arquitetural já estabelecida (AD-6): Server Actions são invocadas via POST à própria página que as renderiza, e o middleware intercepta por pathname igual a qualquer outra rota -- `/cartoes` não é rota pública; chamada redundante a `listarContasCasal()` dentro de `mapearCartao` para validar -- reject, nunca confiar só em dado do closure do cliente, custo desprezível para 2 contas; rejeição derruba o upload inteiro em vez de filtrar só as linhas do cartão-terceiro -- reject, é exatamente o texto literal do AC ("o upload inteiro é rejeitado"), não uma falha; risco de colisão de número mascarado amplificado -- reject, risco pré-existente da Story 2.2 e comportamento de rejeição também é o especificado no AC; invariante de "exatamente 2 contas" não reforçada em código -- reject, nenhum caminho do próprio app cria uma terceira conta (sem auto-cadastro, verificado desde a Story 1.1), fora do modelo de ameaça realista; falta de proteção contra duplo-clique -- reject, já mitigado pelo guard de estado do patch principal (segunda submissão simplesmente não afeta linha nenhuma); array vazio de números distintos alimentando `inArray` -- reject, impossível dado que a Story 2.2 já garante `lancamentos.length > 0` antes deste ponto; nenhuma migration visível -- reject, falso alarme, a migration `0002_perfect_triathlon.sql` foi gerada e aplicada; falta de cobertura de teste automatizado -- reject, gap de todo o projeto já deferido em stories anteriores, não duplicado aqui.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: sucesso
- `npm run db:generate` / `npm run db:migrate` -- expected: coluna `terceiro` criada em produção

**Manual checks (if no CLI):**
- Acessar `/cartoes` autenticado -- deve listar os cartões pendentes já existentes (da Story 2.2, ainda sem dono)
- Atribuir um cartão a uma conta -- deve sumir da lista; conferir no Supabase que `usuario_id` foi setado
- Marcar outro cartão como "não é do casal" -- deve sumir da lista; `terceiro = true` no banco
- Reenviar (ou simular via chamada direta) um upload contendo esse número de cartão marcado como terceiro -- deve rejeitar com a mensagem específica, sem novos lançamentos inseridos

## Auto Run Result

Status: done

**Summary:** Tela `/cartoes` lista cartões pendentes (sem dono, não marcados como terceiro) e permite atribuí-los a uma das 2 contas reais do casal ou marcá-los como "não é do casal". `processarUpload` agora rejeita de imediato qualquer upload contendo um cartão já marcado como terceiro, antes de tocar o banco.

**Files changed:**
- `db/schema/index.ts` -- coluna `terceiro` em `cartao`
- `db/migrations/0002_*.sql` -- aplicada em produção
- `server/ingestao/mapear-cartao.ts` (novo) -- `listarContasCasal`, `listarCartoesPendentes`, `mapearCartao`, `rejeitarCartaoTerceiro`
- `server/ingestao/upload.ts` -- checagem de cartão-terceiro antes da transação
- `app/(app)/cartoes/page.tsx` (novo) -- tela de mapeamento

**Review findings breakdown:** 5 patches aplicados (1 médio: guard de estado contra sobrescrita silenciosa/ids inexistentes nas duas mutações; 4 baixos: log de erro silencioso, mensagem listando todos os cartões-terceiro, tratamento de falha em `listUsers()`, fallback de e-mail ausente); 2 deferidos (corrida TOCTOU de baixa probabilidade, falta de UI para desfazer rejeição); 9 rejeitados como decisão arquitetural já tomada, comportamento explicitamente especificado no AC, ou fora do modelo de ameaça realista.

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos. Migration aplicada. Testado contra dados reais (cartões pendentes criados pela Story 2.2): mapeamento de cartão real para uma conta real confirmado; tentativa de resolver o mesmo cartão de novo corretamente bloqueada pelo guard de estado; `cartaoId` inexistente corretamente rejeitado; `usuarioId` inválido corretamente rejeitado; upload contendo um cartão marcado como terceiro corretamente rejeitado com a mensagem esperada, sem inserir lançamentos. Nota: o subagente de implementação original foi interrompido no meio por limite de sessão (schema + `mapear-cartao.ts` já haviam sido escritos); a implementação foi retomada e concluída diretamente por mim a partir do ponto exato em que parou, sem perda de trabalho.

**Residual risks:** Corrida TOCTOU de baixíssima probabilidade (ver deferred-work.md); nenhuma forma de desfazer uma rejeição de cartão pela UI.

Follow-up review recommended: false
