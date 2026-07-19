---
title: 'Correção funcional: feedback de impacto ao mapear cartão + links de "Pendente" para /cartoes'
type: 'feature'
created: '2026-07-19'
status: 'done'
baseline_revision: '2e253ce52a1ff4d0a35b2efbdb76445b3e516de8'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/EXPERIENCE.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** O usuário reportou que, ao mapear um cartão a uma pessoa em `/cartoes`, "os totais não mudaram" -- investigação real (schema + código + consulta em produção, ver EXPERIENCE.md "Achados de Correção Funcional", achado 2) confirmou que a agregação (`resumo-gastos.ts`, `comprometimento-limite.ts`) já faz join ao vivo via `cartao.usuarioId`, sem coluna denormalizada e sem necessidade de backfill -- não há bug de agregação. A causa mais provável é que os lançamentos existentes do cartão mapeado estão numa competência diferente da que o usuário estava olhando em `/gastos`/`/parcelas`, e a resposta de sucesso de `mapearCartao` hoje é só "ok", sem indicar nada sobre o que mudou -- o usuário não tem como saber onde procurar o efeito. Separadamente, os itens "Pendente" em `/gastos` (motivo `titular_pendente`) e `/parcelas` não linkam para `/cartoes`, onde essa pendência específica se resolve.

**Approach:** (1) `mapearCartao` passa a contar, após o `UPDATE`, quantos lançamentos existentes daquele cartão existem por competência, e devolve isso como parte da mensagem de sucesso -- a UI mostra algo como "Cartão atribuído. 3 lançamentos existentes agora contam para essa pessoa (jun/2026: 1, jul/2026: 2)." em vez de só "sucesso". (2) Itens com motivo `titular_pendente` em `/gastos` e a linha "Pendente" em `/parcelas` ganham um link para `/cartoes`.

## Boundaries & Constraints

**Always:**
- A contagem de lançamentos afetados é feita DEPOIS do `UPDATE` já ter sido persistido, dentro da mesma função (não como uma segunda leitura especulativa antes de saber se a escrita teve sucesso).
- O link para `/cartoes` só aparece em itens `titular_pendente` (o único motivo que `/cartoes` resolve) -- nunca em `sem_categoria`/`categoria_removida` (que se resolvem em `/lancamentos`, fora do escopo desta mudança).
- Mensagens seguem o tom já estabelecido no projeto (direto, factual, nunca alarmista nem genérico "algo deu errado") -- mesmo padrão de `categoria-item.tsx`.

**Block If:**
- Nenhuma condição identificada que exija decisão humana.

**Never:**
- Não alterar `rejeitarCartaoTerceiro` -- fora do escopo desta mudança (achado do review anterior, "desfazer rejeição de cartão", é uma story separada, não parte desta).
- Não alterar a lógica de agregação em `server/visualizacao/resumo-gastos.ts` nem `server/parcelas/comprometimento-limite.ts` -- já confirmadas corretas pela investigação; esta mudança é só de feedback/apresentação.
- Não adicionar link de `/cartoes` para os motivos `sem_categoria`/`categoria_removida` em `/gastos` -- resolvem-se em `/lancamentos`, um link errado seria pior que nenhum link.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mapear um cartão com 3 lançamentos existentes em 2 competências diferentes | `cartaoId` com lançamentos em jun/2026 (1) e jul/2026 (2) | Mensagem de sucesso lista as competências e quantidades afetadas | — |
| Mapear um cartão sem nenhum lançamento existente (cartão novo, só apareceu no upload mais recente) | `cartaoId` sem lançamentos anteriores | Mensagem de sucesso indica que não há lançamento existente afetado (nunca lista competências vazias) | — |
| Item pendente em `/gastos` com motivo `sem_categoria` | `motivo: 'sem_categoria'` | Nenhum link para `/cartoes` (não é o motivo certo) | — |
| Item pendente em `/gastos` com motivo `titular_pendente` | `motivo: 'titular_pendente'` | Link para `/cartoes` visível junto ao item | — |
| `/parcelas` com `comprometimento.pendenteCentavos > 0` | Existe parcela projetada sem cartão mapeado | Linha "Pendente" ganha link para `/cartoes` | — |
| `/parcelas` com `comprometimento.pendenteCentavos === 0` | Nenhuma parcela pendente | Linha "Pendente" (e o link) não renderiza -- comportamento já existente, sem mudança | — |

</intent-contract>

## Code Map

- `server/ingestao/mapear-cartao.ts` -- `mapearCartao`: após o `UPDATE`, contar lançamentos existentes do cartão agrupados por competência (`competenciaAno`/`competenciaMes`), montar mensagem de resumo usando `NOME_MES` (`lib/competencia.ts`), incluir na resposta `{ ok: true, message }`
- `app/(app)/cartoes/_components/cartao-pendente-item.tsx` -- `handleAtribuir`: mostrar a mensagem de sucesso (não só erro), mesmo padrão visual de `categoria-item.tsx` (`role`/`aria-live`/`className` condicionais); ver Design Notes sobre o atraso do `router.refresh()`
- `server/visualizacao/resumo-gastos.ts` -- tipo `ItemPendente` já expõe `motivo`; nenhuma mudança de lógica, só consumido pela UI
- `app/(app)/gastos/page.tsx` -- item pendente com `motivo === 'titular_pendente'`: adicionar link para `/cartoes`
- `app/(app)/parcelas/page.tsx` -- linha "Pendente" (`comprometimento.pendenteCentavos > 0`): adicionar link para `/cartoes`

## Tasks & Acceptance

**Execution:**
- [x] `server/ingestao/mapear-cartao.ts` -- adicionar contagem de lançamentos existentes por competência após o `UPDATE` bem-sucedido em `mapearCartao`; montar `message` de sucesso com o resumo (ou mensagem "sem lançamento existente" quando a contagem for zero)
- [x] `app/(app)/cartoes/_components/cartao-pendente-item.tsx` -- exibir `resultado.message` também no caminho de sucesso (hoje só exibe erro), mesmo padrão de `categoria-item.tsx`; atraso do `router.refresh()` (ver Design Notes)
- [x] `app/(app)/gastos/page.tsx` -- adicionar `<Link href="/cartoes">` (ou texto de apoio) nos itens pendentes com `motivo === 'titular_pendente'`
- [x] `app/(app)/parcelas/page.tsx` -- adicionar `<Link href="/cartoes">` na linha "Pendente" de cada competência

**Acceptance Criteria:**
- Given um cartão com lançamentos existentes em uma ou mais competências, when ele é mapeado a uma pessoa via `/cartoes`, then a mensagem de sucesso lista quantos lançamentos e em quais competências foram afetados
- Given um cartão sem nenhum lançamento existente, when ele é mapeado, then a mensagem de sucesso não afirma um impacto que não existe (texto claro de "nenhum lançamento existente")
- Given um item pendente em `/gastos` com motivo `titular_pendente`, when a lista é renderizada, then há um link visível para `/cartoes`
- Given um item pendente em `/gastos` com motivo `sem_categoria` ou `categoria_removida`, when a lista é renderizada, then não há link para `/cartoes` nesse item
- Given `/parcelas` com `pendenteCentavos > 0` em alguma competência, when a página renderiza, then a linha "Pendente" daquela competência tem um link para `/cartoes`

## Spec Change Log

## Design Notes

Achado durante a própria implementação (não do review): um cartão mapeado com sucesso deixa de ser retornado por `listarCartoesPendentes()` -- então, com o `router.refresh()` imediato já existente, o item (e a mensagem de resumo de impacto que esta spec adiciona) seria desmontado da lista quase no mesmo instante em que aparece, tornando a mensagem ilegível na prática. Corrigido introduzindo um estado local `resolvido` (esconde os botões de ação assim que a atribuição é bem-sucedida, mostrando só a mensagem) e adiando o `router.refresh()` em `ATRASO_REFRESH_MS` (2500ms) via `setTimeout` com cleanup no unmount (`useEffect`). `rejeitarCartaoTerceiro` não foi alterado (fora do escopo desta spec, não ganha mensagem de impacto) -- continua com `router.refresh()` imediato, comportamento já testado e aceito.

## Review Triage Log

### 2026-07-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5 (medium 2, low 3)
- defer: 1 (low 1)
- reject: 6 (low 6)
- addressed_findings:
  - `[medium]` `[patch]` Blind Hunter + Edge Case Hunter converged independently: `resumirImpacto`'s DB query had no `try/catch` of its own -- if it threw after the `cartao` `UPDATE` had already committed, the whole action would throw, and the client's generic catch would report failure on a mutation that actually succeeded. Fixed: `resumirImpacto` now wraps its own query in `try/catch`, logs, and falls back to `'Cartão atribuído.'` on failure -- the mapping's success is never contingent on the summary query.
  - `[medium]` `[patch]` Blind Hunter + Edge Case Hunter converged independently: `handleRejeitar`'s success path never set `resolvido`, so the action buttons (including "Atribuir") stayed visible/clickable during the window before `router.refresh()` reconciled, allowing a stale re-click against an already-resolved cartão (harmless server-side due to the `PENDENTE` guard, but a real UX inconsistency next to the new `resolvido`-gated `handleAtribuir` path). Fixed: `handleRejeitar` now also sets `resolvido = true` on success, immediately (no delay, since there's no impact message to read on this path).
  - `[low]` `[patch]` Both reviewers flagged `resumirImpacto` enumerating every competência with no cap -- a cartão with many months of history would produce one long unreadable line, worse combined with the fixed 2.5s display delay. Fixed: caps detail to the first 5 competências (ordered oldest-first) plus an "e mais N competência(s)" suffix.
  - `[low]` `[patch]` Both reviewers flagged `NOME_MES[item.mes]` with no bounds guard -- a `competenciaMes` outside 1-12 (shouldn't happen, but no DB constraint enforces it) would render literal `undefined/<ano>` in a user-facing message. Fixed: `NOME_MES[item.mes] ?? \`mês ${item.mes}\`` fallback.
  - `[low]` `[patch]` Blind Hunter noted the two new `<Link>` additions in `gastos/page.tsx` and `parcelas/page.tsx` used inconsistent line-wrapping for the same pattern. Reformatted `gastos/page.tsx`'s to match the multi-line style already used in `parcelas/page.tsx`.
  - `[low]` `[defer]` Blind Hunter: the new "Resolver em Cartões" links always point to generic `/cartoes`, never deep-linked to the specific pending cartão behind that pendency line. Real, but `/cartoes` has no per-card anchor/highlight support today -- adding that is a larger UI change than this story's scope (closing the "no link exists at all" gap). Logged to `deferred-work.md`.
  - `[low]` `[reject]` "Client-side `resposta.message ?? 'Cartão atribuído.'` fallback is dead code since the server always returns a message now" (Blind Hunter) -- kept as defensive belt-and-suspenders, matching the same optional-fallback pattern already used for every error path in this codebase (`resposta.message ?? 'Falha ao...'`); harmless, and now less "dead" than claimed since `resumirImpacto`'s own new fallback path (added by the patch above) could in principle still return an empty-ish value in a future edit.
  - `[low]` `[reject]` "Freshly-mounted `aria-live` region with final text already inside may not be announced by all screen readers" (Blind Hunter) -- identical, already-accepted pattern in `categoria-item.tsx`/`lancamento-item.tsx` in production today; not a regression introduced by this diff, transversal to the app.
  - `[low]` `[reject]` "`ATRASO_REFRESH_MS = 2500` is an arbitrary fixed delay with no dismiss affordance" (Blind Hunter) -- reasonable default for this app's scale (2 people, infrequent mapping actions); no toast/snackbar infrastructure exists anywhere in the app to build a dismiss affordance on top of, and the length concern this same finding raised is addressed by the competência-cap patch above.
  - `[low]` `[reject]` "No automated test coverage for `resumirImpacto`/new client states" (Blind Hunter) -- already tracked project-wide (no test runner configured anywhere in the project, `deferred-work.md` spec-1-2 entry); not specific to this diff.
  - `[low]` `[reject]` "Message wording doesn't scale for singular vs. plural ('lançamento(s)')" (Blind Hunter) -- matches the exact phrasing convention already documented as an accepted "Do" example in `EXPERIENCE.md`'s Voice and Tone table ("3 lançamento(s) serão afetados."), not a new inconsistency.
  - `[low]` `[reject]` "Two nearly-identical `<Link>` additions could share a component" (implicit in the formatting finding) -- two call sites, two lines of JSX each; premature abstraction for this size, consistent with this codebase's established preference against introducing shared components for small, localized duplication.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção conclui sem erro

**Manual checks (if no CLI):**
- Script de leitura descartável contra o Supabase de produção real (removido após uso, nenhuma escrita): confirmar que a nova contagem por competência em `mapearCartao` bate com uma contagem manual (`SELECT competencia_ano, competencia_mes, count(*) FROM lancamento WHERE cartao_id = X GROUP BY ...`) para um cartão real já mapeado (sem re-mapear nada -- é só validar a query nova de leitura, não executar o UPDATE contra um cartão real do casal).

## Auto Run Result

Status: done

**Resumo:** Mapear um cartão a uma pessoa em `/cartoes` agora mostra quantos lançamentos existentes daquele cartão passam a contar para essa pessoa e em quais competências -- respondendo diretamente ao sintoma "mapeei e os totais não mudaram" ao tornar visível que o efeito pode estar num mês diferente do que está sendo olhado. Itens "Pendente" em `/gastos` (motivo `titular_pendente`) e `/parcelas` agora linkam para `/cartoes`, onde essa pendência se resolve.

**Arquivos alterados:**
- `server/ingestao/mapear-cartao.ts` -- `resumirImpacto` (nova função interna): conta lançamentos existentes por competência após o `UPDATE`, monta mensagem de resumo (com fallback seguro em caso de falha própria e corte em 5 competências); `mapearCartao` retorna essa mensagem no sucesso
- `app/(app)/cartoes/_components/cartao-pendente-item.tsx` -- exibe a mensagem de sucesso (antes só mostrava erro); estado `resolvido` esconde os botões de ação assim que uma atribuição/rejeição é bem-sucedida; `router.refresh()` do caminho de atribuição é adiado 2.5s para a mensagem ser lida antes do item sumir da lista de pendentes
- `app/(app)/gastos/page.tsx` -- item pendente com `motivo === 'titular_pendente'` ganha link para `/cartoes`
- `app/(app)/parcelas/page.tsx` -- linha "Pendente" de cada competência ganha link para `/cartoes`

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada):** 0 `bad_spec`, 5 `patch` aplicados (2 médios convergentes entre os dois revisores -- falta de `try/catch` isolando a query de resumo de uma escrita já bem-sucedida, e inconsistência do caminho de rejeição não fechar a janela de reclique; 3 baixos -- corte de competências, guard de mês fora de alcance, formatação inconsistente entre os 2 links novos). 1 `defer` (links genéricos para `/cartoes`, sem deep-link ao cartão específico). 6 `reject` (dead code defensivo aceitável, padrão de `aria-live` já aceito em produção, atraso fixo sem afordance de dispensa -- razoável para a escala do app, cobertura de teste já rastreada globalmente, tom de mensagem já documentado como convenção aceita, abstração prematura para 2 pontos de uso).

**Follow-up review recomendado:** false -- mudança contida (4 arquivos), 0 `bad_spec`, todos os patches mecânicos e já reverificados contra dado real.

**Verificação realizada:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos (antes e depois dos patches). Dois scripts de leitura descartáveis (removidos após uso, nenhuma escrita) contra o Supabase de produção real: o primeiro confirmou a contagem por competência para o cartão real id=4 (82 lançamentos, Junho/2026: 48 + Julho/2026: 34, batendo com o total já conhecido de investigação anterior); o segundo, após os patches, reconfirmou o mesmo cartão mais o cartão id=2 (114 lançamentos) e o caso de cartão inexistente (mensagem de fallback "nenhum lançamento existente").

**Riscos residuais:** nenhum bloqueante. Links "Resolver em Cartões" não são deep-linked ao cartão específico (deferido). Confirmação visual real em navegador do fluxo completo (mensagem aparecendo, aguardando 2.5s, item sumindo) não foi feita nesta sessão -- sem ferramenta de automação de navegador disponível; o comportamento foi verificado por leitura de código + dado real via script, não observação visual direta.
