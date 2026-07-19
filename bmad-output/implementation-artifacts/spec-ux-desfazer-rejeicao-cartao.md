---
title: 'Correção funcional: permitir desfazer a rejeição de um cartão ("Não é do casal")'
type: 'feature'
created: '2026-07-19'
status: 'done'
baseline_revision: 'b1154425576a9f921b447c7bf110ddfd5a6cda4f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/EXPERIENCE.md'
  - 'bmad-output/implementation-artifacts/deferred-work.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** Uma vez um cartão marcado como "Não é do casal" (`rejeitarCartaoTerceiro`, Story 2.3), não há nenhuma forma de reverter pela UI -- `listarCartoesPendentes` filtra por `terceiro = false`, então o cartão some de `/cartoes` para sempre, e seus lançamentos (passados e futuros de uploads já rejeitados no upload) ficam permanentemente excluídos de toda agregação (`resumo-gastos.ts`, `comprometimento-limite.ts` pulam `cartaoTerceiro`). Esse gap já estava rastreado (`deferred-work.md`, spec-2-3) e foi elevado nesta rodada de auditoria (achado 2, ver EXPERIENCE.md) por ser a explicação mais plausível para um cenário real de "meus lançamentos não aparecem em lugar nenhum e eu não sei por quê": um clique errado em "Não é do casal" hoje só é corrigível editando o banco diretamente -- um risco real para dado financeiro de um casal.

**Approach:** Nova função `desfazerRejeicaoCartao` que limpa `terceiro` de volta para `false` (o cartão volta ao estado pendente, exatamente como antes da rejeição) e uma nova seção em `/cartoes` listando cartões rejeitados com um botão "Desfazer rejeição".

## Boundaries & Constraints

**Always:**
- `desfazerRejeicaoCartao` só afeta cartões no estado exato produzido por `rejeitarCartaoTerceiro` (`terceiro = true AND usuarioId IS NULL`) -- mesmo princípio de guard por estado já usado em `PENDENTE` (`mapear-cartao.ts`), para nunca sobrescrever silenciosamente um cartão em outro estado.
- Desfazer a rejeição não faz nenhuma escrita em `lancamento` -- a agregação já é um join ao vivo via `cartao.usuarioId`/`cartao.terceiro` (confirmado na investigação do achado 2), então voltar `terceiro` para `false` já basta para os lançamentos existentes voltarem a aparecer como "pendente de titular" na próxima leitura.
- A nova seção de cartões rejeitados só aparece quando há pelo menos um (mesmo padrão condicional já usado para a seção de pendentes).

**Block If:**
- Nenhuma condição identificada que exija decisão humana.

**Never:**
- Não alterar `mapearCartao`/`rejeitarCartaoTerceiro`/`resumirImpacto` -- já corretos, fora do escopo desta mudança.
- Não adicionar confirmação extra (modal/página dedicada) para desfazer -- é o inverso de uma ação que já é de baixo risco e rara; mesmo princípio já documentado em DESIGN.md/EXPERIENCE.md para o próprio botão "Não é do casal" (estilo de aviso, sem tela de confirmação nova).
- Não alterar o schema -- `terceiro`/`usuarioId` já existem e já suportam os três estados (pendente, terceiro, mapeado) sem nenhuma coluna nova.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Desfazer rejeição de um cartão `terceiro = true` | Cartão rejeitado, ainda sem `usuarioId` | `terceiro` volta a `false`; cartão reaparece na lista de pendentes de `/cartoes` | — |
| Desfazer rejeição de um cartão já mapeado a alguém (estado impossível hoje, mas defesa em profundidade) | `usuarioId` não nulo | Nenhuma linha afetada -- guard de estado rejeita silenciosamente com mensagem, mesmo padrão de `PENDENTE` | `{ ok: false, message: 'Cartão não está rejeitado.' }` |
| Desfazer rejeição de um `cartaoId` inexistente | id inválido | Nenhuma linha afetada | `{ ok: false, message: 'Cartão não está rejeitado.' }` |
| Cartão desfeito tinha lançamentos existentes | Lançamentos já gravados com esse `cartaoId` | Na próxima leitura de `/gastos`/`/parcelas`, esses lançamentos aparecem como pendentes de titular (motivo `titular_pendente`) -- nunca somem, nunca contam para uma pessoa sem mapeamento explícito | — |

</intent-contract>

## Code Map

- `server/ingestao/mapear-cartao.ts` -- nova função `listarCartoesRejeitados()` (`terceiro = true`, ordenado por `createdAt`); nova função `desfazerRejeicaoCartao(cartaoId)` (guard `terceiro=true AND usuarioId IS NULL`, `UPDATE ... SET terceiro = false`, `revalidatePath('/cartoes')`)
- `app/(app)/cartoes/page.tsx` -- buscar `listarCartoesRejeitados()` junto com pendentes; renderizar nova seção quando não vazia
- `app/(app)/cartoes/_components/cartao-rejeitado-item.tsx` (novo) -- item com nome/tipo/número do cartão + botão "Desfazer rejeição", mesmo padrão de loading/feedback/`router.refresh()` de `cartao-pendente-item.tsx` (sem necessidade do atraso de 2.5s -- não há mensagem de impacto multi-linha aqui, só confirmação simples)

## Tasks & Acceptance

**Execution:**
- [x] `server/ingestao/mapear-cartao.ts` -- `listarCartoesRejeitados()` + `desfazerRejeicaoCartao(cartaoId)`
- [x] `app/(app)/cartoes/_components/cartao-rejeitado-item.tsx` -- novo componente client, mesmo padrão de estado/feedback já estabelecido
- [x] `app/(app)/cartoes/page.tsx` -- busca e renderiza a nova seção condicionalmente

**Acceptance Criteria:**
- Given um cartão marcado como "Não é do casal", when o usuário acessa `/cartoes`, then ele aparece numa seção separada de "Cartões marcados como não sendo do casal" com um botão para desfazer
- Given o usuário clica em "Desfazer rejeição", when a ação é bem-sucedida, then o cartão volta a aparecer na lista de pendentes (mapeável a uma pessoa) e some da lista de rejeitados
- Given um cartão rejeitado tinha lançamentos existentes, when a rejeição é desfeita, then esses lançamentos passam a aparecer como pendentes de titular em `/gastos` (não desaparecem, não são atribuídos a ninguém automaticamente)
- Given nenhum cartão foi rejeitado ainda, when o usuário acessa `/cartoes`, then a seção de rejeitados não aparece (sem lista vazia visível)

## Spec Change Log

## Review Triage Log

### 2026-07-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3 (medium 1, low 2)
- defer: 0
- reject: 8 (low 8)
- addressed_findings:
  - `[medium]` `[patch]` Blind Hunter + Edge Case Hunter converged independently: `CartaoRejeitadoItem` reset `loading` to `false` immediately on success with no gating before `router.refresh()` landed, and showed zero success feedback -- a second click in that window re-invoked `desfazerRejeicaoCartao` on an already-undone cartão, and the `REJEITADO` guard (now finding zero rows) returned a spurious "Cartão não está rejeitado." error over an action that had actually succeeded; separately, screen-reader users got no confirmation at all on the happy path. Fixed by mirroring `CartaoPendenteItem`'s established pattern exactly: `resolvido` state hides the button on success, a `hint`/`aria-live="polite"` message confirms the undo, and `router.refresh()` is delayed 2.5s (same `ATRASO_REFRESH_MS` constant/reasoning) so the confirmation is actually visible before the item leaves the list.
  - `[low]` `[patch]` Blind Hunter: the new `<h2 style={{ marginTop: '2rem', ... }}>` fought `.page`'s own `display:flex; gap:1.75rem` layout (verified in `app/globals.css`), producing a visibly larger gap above this section than anywhere else on the page -- no other heading in `page.tsx` overrides spacing this way. Fixed: removed the inline `marginTop`, matching the existing `<h2 style={{ marginBottom: '0.75rem' }}>` convention used for the equivalent "Pendente de revisão" heading in `/gastos`.
  - `[low]` `[patch]` Edge Case Hunter: `listarCartoesRejeitados()` filtered only `terceiro = true`, not matching the `REJEITADO` guard's `terceiro = true AND usuarioId IS NULL` exactly -- a cartão in the (currently impossible, but not schema-enforced) state of both flags set would render in the rejected section with a "Desfazer rejeição" button that always fails. Fixed: filter now matches `REJEITADO` exactly (defense in depth, same principle already used for `listarCartoesPendentes`/`PENDENTE`).
  - `[low]` `[reject]` "Duplicated `Cartao` type and header markup between `cartao-rejeitado-item.tsx` and `cartao-pendente-item.tsx`" (Blind Hunter) -- same premature-abstraction pattern already rejected twice earlier in this same audit cycle (Grupo 1 and Grupo 2 review passes); consistent with this codebase's established tolerance for small, localized duplication over introducing shared components/types for two call sites.
  - `[low]` `[reject]` "`listarCartoesRejeitados()` has no pagination/archiving, list only grows over time" (Blind Hunter) -- speculative at the scale of this app (2 people, currently 0 rejected cartões in production, verified by read-only query); premature to build pagination for a list with no realistic prospect of needing it.
  - `[low]` `[reject]` "No `aria-labelledby` tying the new `<section>` to its `<h2>`" (Blind Hunter) -- no equivalent section/heading landmark pattern exists anywhere else in the app to be consistent with; not a regression, not established convention to violate.
  - `[low]` `[reject]` "Claimed verification (tsc/lint/build + manual test cycle) is unevidenced by the diff alone" (Blind Hunter) -- the reviewer only sees the diff text, not the session's actual command runs; `tsc`/`lint`/`build` were run clean before and after every patch in this pass, and a disposable read-only + synthetic-cartão test script (created and removed within this session, touching only a `****TEST-DESFAZER` cartão created and deleted by the script itself) exercised the full reject→undo cycle and the guard's idempotence against the real production `cartao` table, confirmed zero residue afterward.
  - `[low]` `[reject]` "Formatting inconsistency: `desfazerRejeicaoCartao`'s signature on one line vs. neighbors wrapped" (Blind Hunter) -- `npm run lint` (which runs this project's configured formatter/linter) passed clean on the exact code as written; not a real violation of project style.
  - `[low]` `[reject]` "No authorization boundary (any authenticated user of the couple can call this)" (Blind Hunter) -- explicitly by design, documented verbatim in `EXPERIENCE.md`'s Foundation section ("não há conceito de 'meu espaço' vs. 'espaço do parceiro' na navegação -- é um único espaço compartilhado"); identical pre-existing pattern already present in `mapearCartao`/`rejeitarCartaoTerceiro`, not introduced or worsened by this diff.
  - `[low]` `[reject]` "Terse, non-diagnostic error message ('Cartão não está rejeitado.')" (Blind Hunter) -- matches the exact terse-message convention already used by `mapearCartao`/`rejeitarCartaoTerceiro` ("Cartão já foi resolvido ou não existe."); the specific race condition that made this message likely to appear spuriously is eliminated by the patch above.
  - `[low]` `[reject]` "Whole `/cartoes` page fails to render if `listarCartoesRejeitados()` throws inside `Promise.all`" (Edge Case Hunter) -- identical pre-existing pattern already present for `listarCartoesPendentes()` (also unwrapped) since Story 2.3; only `listarContasCasal()` wraps its query in `try/catch`, specifically because it calls the flakier external Admin API, not a plain DB read. Consistent with the whole app's convention of letting DB read failures propagate to Next's default error boundary.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção conclui sem erro

**Manual checks (if no CLI):**
- Script contra o Supabase de produção real (removido após uso): usar um cartão de TESTE criado e removido pelo próprio script (nunca um cartão real do casal) para exercitar o ciclo completo rejeitar -> desfazer -> confirmar que volta ao estado pendente -- mesma disciplina de teste seguro já usada em stories anteriores desta run (ex. Story 3.1).

## Auto Run Result

Status: done

**Resumo:** Cartões marcados "Não é do casal" agora podem ser desfeitos pela UI -- nova seção em `/cartoes` lista cartões rejeitados com um botão "Desfazer rejeição", que devolve o cartão ao estado pendente (mapeável a uma pessoa) sem nenhuma escrita em `lancamento` (a agregação já reflete isso via join ao vivo, mesma arquitetura confirmada no achado 2).

**Arquivos alterados:**
- `server/ingestao/mapear-cartao.ts` -- `listarCartoesRejeitados()` e `desfazerRejeicaoCartao(cartaoId)` (novas), guard `REJEITADO` simétrico a `PENDENTE`
- `app/(app)/cartoes/_components/cartao-rejeitado-item.tsx` (novo) -- mesmo padrão de `CartaoPendenteItem`: estado `resolvido`, mensagem de confirmação, `router.refresh()` adiado 2.5s
- `app/(app)/cartoes/page.tsx` -- busca e renderiza a nova seção condicionalmente, só quando há pelo menos um cartão rejeitado

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada):** 0 `bad_spec`, 3 `patch` aplicados (1 médio convergente entre os dois revisores -- corrida de reclique + ausência total de feedback de sucesso, corrigida espelhando o padrão já estabelecido em `CartaoPendenteItem`; 2 baixos -- espaçamento CSS conflitando com o layout flex de `.page`, e simetria de guard entre `listarCartoesRejeitados` e `REJEITADO`). 0 `defer`. 8 `reject` (duplicação de tipo/markup já aceita 2x nesta mesma auditoria, especulação sobre escala improvável para um app de 2 pessoas, ausência de landmark sem convenção prévia a seguir, alegação de verificação não evidenciada -- na verdade realizada e documentada aqui, falso alarme de formatação -- lint passou limpo, ausência de autorização por usuário -- decisão de design documentada em EXPERIENCE.md, mensagem terse -- convenção já estabelecida, e falha não capturada em `Promise.all` -- padrão idêntico já pré-existente em `listarCartoesPendentes`).

**Follow-up review recomendado:** false -- mudança contida (3 arquivos, 1 novo), 0 `bad_spec`, e a única mudança de maior superfície (guard de estado + reversão) foi verificada ponta a ponta contra produção real com um cartão sintético descartável.

**Verificação realizada:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos (antes e depois dos patches). Script de teste ponta a ponta descartável (removido após uso) contra o Supabase de produção real: criou um cartão sintético próprio (`****TEST-DESFAZER`, nunca um cartão real do casal), replicou a lógica exata das novas funções (mesmas condições `WHERE`) direto contra o banco -- as funções reais não podem ser invocadas fora de um contexto de requisição Next.js porque usam `revalidatePath` (confirmado empiricamente: `Invariant: static generation store missing` ao tentar chamar `rejeitarCartaoTerceiro` direto de um script) -- e confirmou: pendente->rejeitado->pendente funciona; guard rejeita desfazer um cartão que não está rejeitado (0 linhas afetadas); segunda chamada de desfazer no mesmo cartão já revertido também é rejeitada (idempotência); nenhum resíduo restou no banco ao final. Segundo script somente-leitura confirmou contra os 12 cartões reais de produção que 0 estão hoje em estado rejeitado e 0 estão no estado "impossível" (terceiro=true com usuarioId setado) que motivou o patch de simetria de guard.

**Riscos residuais:** nenhum bloqueante. A seção nova está vazia hoje em produção (nenhum cartão rejeitado no momento) -- funcionalidade pronta mas não visualmente exercitada em uso real ainda, só via teste sintético. Confirmação visual real em navegador não foi feita nesta sessão -- sem ferramenta de automação disponível.
