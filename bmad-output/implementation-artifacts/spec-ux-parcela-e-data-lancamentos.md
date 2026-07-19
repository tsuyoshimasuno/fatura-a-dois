---
title: 'Correção funcional: número de parcela visível em /lancamentos + datas em formato DD-MM-AAAA'
type: 'bugfix'
created: '2026-07-19'
status: 'done'
baseline_revision: '052277f76acf8f185d9f27072a6197154898172b'
final_revision: 'aaa11637be2918ac95aa704514525df42e51154e'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/EXPERIENCE.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** Dois bugs reportados pelo usuário e confirmados por leitura de código (ver EXPERIENCE.md, seção "Achados de Correção Funcional (auditoria 2026-07-19)", achados 1 e 3). (1) `/lancamentos` não indica que um lançamento é parcela de uma compra parcelada nem qual número (ex. "3/12"), embora `lancamento.parcelaNumero`/`parcelaTotal` já sejam gravados desde o Epic 5 -- a tela só nunca os lê nem exibe. (2) Datas de lançamento em `/lancamentos` e nos itens "Pendente de revisão" de `/gastos` são renderizadas cruas como `AAAA-MM-DD` (formato da coluna `date` do Postgres via Drizzle) em vez de `DD-MM-AAAA` (padrão brasileiro, `communication_language: Portuguese (Brazil)`).

**Approach:** (1) Propagar `parcelaNumero`/`parcelaTotal` da query existente (`listarLancamentosParaCorrecao`) até a UI (`LancamentoItem`), exibindo "N/M" ao lado do lançamento só quando `parcelaTotal` > 1 -- mesmo padrão visual já usado em `/parcelas`. (2) Criar um helper puro de formatação de string (`lib/data.ts`) e usá-lo nos 2 pontos confirmados que renderizam `item.data` cru.

## Boundaries & Constraints

**Always:**
- A formatação de data é manipulação de string pura (fatiar `'YYYY-MM-DD'` em partes) -- nunca construir um objeto `Date` a partir da string, para não haver risco de reinterpretação de fuso horário deslocando o dia exibido.
- O indicador de parcela só aparece quando `parcelaTotal !== null && parcelaTotal > 1` -- lançamento avulso (`parcelaTotal` null ou 1) não ganha nenhum elemento visual novo.
- Nenhuma Server Action existente (`corrigirCategoriaLancamento`) muda de assinatura ou comportamento de escrita -- esta mudança é estritamente de leitura + apresentação.

**Block If:**
- Nenhuma condição identificada que exija decisão humana.

**Never:**
- Não alterar o schema (`db/schema/index.ts`) -- os campos já existem.
- Não tocar `app/(app)/parcelas/page.tsx` (já correto, é a referência a espelhar).
- Não introduzir biblioteca de datas (`date-fns`, `dayjs` etc.) -- string parsing direto é suficiente e consistente com o resto do projeto (sem dependências de data hoje).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lançamento é parcela 3 de 12 | `parcelaNumero=3, parcelaTotal=12` | Item mostra "3/12" junto à linha do lançamento | — |
| Lançamento avulso | `parcelaNumero=null, parcelaTotal=null` | Nenhum indicador de parcela exibido | — |
| `formatarData('2026-07-19')` | string `'YYYY-MM-DD'` válida | Retorna `'19-07-2026'` | — |
| `formatarData` em item de `/gastos` pendente | mesma coluna `data`, mesmo formato de origem | Mesma saída `DD-MM-AAAA` | — |

</intent-contract>

## Code Map

- `server/categorizacao/corrigir-categoria.ts` -- `listarLancamentosParaCorrecao`: adicionar `parcelaNumero`/`parcelaTotal` ao `select` e ao tipo `LancamentoParaCorrecao`/mapper de retorno
- `app/(app)/lancamentos/_components/lancamento-item.tsx` -- tipo `Lancamento` + JSX: exibir "N/M" quando aplicável; usar `formatarData` em vez de `item.data` cru
- `app/(app)/gastos/page.tsx` -- usar `formatarData` no item de "Pendente de revisão" (linha que hoje renderiza `{item.data}`)
- `lib/data.ts` (novo) -- `formatarData(dataIso: string): string`, mesmo estilo de `lib/moeda.ts` (função pura, um único helper exportado)

## Tasks & Acceptance

**Execution:**
- [x] `lib/data.ts` -- criar `formatarData('YYYY-MM-DD') -> 'DD-MM-YYYY'` via split de string -- evita bug de fuso horário de `new Date(string)`
- [x] `server/categorizacao/corrigir-categoria.ts` -- incluir `parcelaNumero`/`parcelaTotal` no select de `listarLancamentosParaCorrecao`, no tipo `LancamentoParaCorrecao` e no mapper
- [x] `app/(app)/lancamentos/_components/lancamento-item.tsx` -- estender tipo `Lancamento` com os 2 campos; renderizar "N/M" quando `parcelaTotal > 1`; trocar `{item.data}` por `{formatarData(item.data)}`
- [x] `app/(app)/gastos/page.tsx` -- trocar `{item.data}` (bloco de pendentes) por `{formatarData(item.data)}`

**Acceptance Criteria:**
- Given um lançamento com `parcelaTotal > 1` em `/lancamentos`, when a lista é renderizada, then o item mostra "N/M" (parcelaNumero/parcelaTotal) visível junto à linha
- Given um lançamento avulso (`parcelaTotal` null ou 1), when a lista é renderizada, then nenhum indicador de parcela aparece
- Given qualquer data de lançamento exibida em `/lancamentos` ou nos itens "Pendente de revisão" de `/gastos`, when a página renderiza, then a data aparece como `DD-MM-AAAA`, nunca `AAAA-MM-DD`

## Spec Change Log

## Review Triage Log

### 2026-07-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3 (medium 2, low 1)
- defer: 1 (low 1)
- reject: 7 (low 7)
- addressed_findings:
  - `[medium]` `[patch]` Blind Hunter + Edge Case Hunter converged independently: `formatarData` did no validation on input shape -- an empty or malformed string would silently produce output with literal `undefined` segments instead of failing safely. Fixed: `formatarData` now matches against a strict `YYYY-MM-DD` regex and returns the original string unchanged if it doesn't match, instead of guessing.
  - `[medium]` `[patch]` Blind Hunter + Edge Case Hunter converged independently: the parcela suffix in `lancamento-item.tsx` only null-checked `parcelaTotal`, not `parcelaNumero` -- an inconsistent record (`parcelaTotal` set, `parcelaNumero` null) would render the literal string "-- /3" with a missing numerator. Fixed: both fields are now null-checked before rendering.
  - `[low]` `[patch]` `lib/data.ts`'s comment overclaimed the hyphenated `DD-MM-YYYY` output as "o formato brasileiro" (Blind Hunter correctly noted Brazil's actual convention, ABNT NBR 5892, uses slashes). Reworded to describe it as the format explicitly requested by the user, not "the" Brazilian standard -- behavior unchanged (the user's bug report literally asked for `DD-MM-YYYY` with hyphens).
  - `[low]` `[defer]` `/gastos`'s "Pendente de revisão" list now shows the formatted date but not the parcela-number indicator that `/lancamentos` gained in this same story -- a pending item that's also an installment doesn't show "N/M". Real paridade gap, out of this spec's declared scope (achado 1 only covered `/lancamentos`); logged to `deferred-work.md`.
  - `[low]` `[reject]` "Module name `lib/data.ts` is ambiguous" (Blind Hunter) -- `data` is the correct Portuguese word for "date"; every other `lib/` module in this codebase is named in Portuguese (`moeda.ts`, `competencia.ts`), so this is consistent with established convention, not a naming defect.
  - `[low]` `[reject]` "Inconsistent localization idiom: manual string split vs. `Intl.DateTimeFormat`" (Blind Hunter) -- the spec's own `Boundaries & Constraints > Always` explicitly mandates pure string manipulation and forbids constructing a `Date` object, precisely to avoid timezone reinterpretation risk; `Intl.DateTimeFormat` on a raw string would require exactly that.
  - `[low]` `[reject]` "Type duplication between `Lancamento` and `LancamentoParaCorrecao`" (Blind Hunter) -- pre-existing pattern already present for every other field (`id`, `estabelecimento`, `categoriaId`, etc.) before this diff added 2 more; not introduced by this story, matches the established convention of not introducing a shared-types layer for this small app.
  - `[low]` `[reject]` "No `aria-label`/accessibility affordance for the parcela suffix" (Blind Hunter) -- it's a plain text node appended inside the existing `<div>`, not a decorative icon or interactive control; plain text is inherently exposed to assistive tech without extra ARIA markup, so there's no real gap here.
  - `[low]` `[reject]` "Zero automated test coverage for `formatarData`" (Blind Hunter) -- already tracked project-wide (`deferred-work.md`, spec-1-2 entry: no test runner configured anywhere in the project); not specific to this diff.
  - `[low]` `[reject]` "Drizzle's `date()` column might return a `Date` object upstream (via `mapFromDriverValue`'s fallback `.toISOString().slice()`), reintroducing the exact timezone risk this diff claims to avoid, one layer earlier" (Blind Hunter) -- verified false by reading `node_modules/drizzle-orm/pg-core/columns/date.cjs`: `db/schema/index.ts`'s `date('data')` call (no `{ mode: 'date' }`) resolves to `PgDateStringBuilder`/`PgDateString`, whose `mapFromDriverValue` returns the driver's string unchanged (`if (typeof value === 'string') return value`); the Date-object fallback only triggers if the driver itself hands back a `Date`, which postgres-js does not for `date` columns by default. Also confirmed empirically: a disposable read-only script queried real production lançamentos and every `data` value arrived as a clean `'YYYY-MM-DD'` string.
  - `[low]` `[reject]` "`formatarData` silently drops hyphen segments beyond the first three / no numeric validation" (Edge Case Hunter) -- superseded by the regex-validation patch above, which now rejects (returns unchanged) any string not exactly matching `YYYY-MM-DD`.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção conclui sem erro

**Manual checks (if no CLI):**
- Script de leitura descartável contra o Supabase de produção real (removido após uso, nenhuma escrita): buscar via `listarLancamentosParaCorrecao` um lançamento real conhecido com `parcelaTotal > 1` e confirmar que os campos chegam corretos; aplicar `formatarData` a algumas datas reais e conferir a saída manualmente.

## Auto Run Result

Status: done

**Resumo:** `/lancamentos` agora mostra o indicador de parcela ("N/M") ao lado de qualquer lançamento que seja parte de uma compra parcelada; datas em `/lancamentos` e no bloco "Pendente de revisão" de `/gastos` agora renderizam como `DD-MM-YYYY` em vez de `YYYY-MM-DD`.

**Arquivos alterados:**
- `lib/data.ts` (novo) -- `formatarData('YYYY-MM-DD') -> 'DD-MM-YYYY'`, validado por regex, devolve a string original se não bater com o formato esperado
- `server/categorizacao/corrigir-categoria.ts` -- `listarLancamentosParaCorrecao` agora seleciona e retorna `parcelaNumero`/`parcelaTotal`
- `app/(app)/lancamentos/_components/lancamento-item.tsx` -- exibe "N/M" quando `parcelaNumero`/`parcelaTotal` estão presentes e `parcelaTotal > 1`; usa `formatarData` para a data
- `app/(app)/gastos/page.tsx` -- usa `formatarData` no item de "Pendente de revisão"

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada):** 0 `bad_spec`, 3 `patch` aplicados (2 médios -- validação de entrada de `formatarData` convergente entre os dois revisores, e guard de `parcelaNumero` ausente no indicador de parcela, também convergente; 1 baixo -- comentário corrigido para não superclamar "formato brasileiro" quando o pedido do usuário foi literalmente `DD-MM-YYYY` com hífen). 1 `defer` (baixo -- `/gastos` não ganhou o indicador de parcela nos itens pendentes, fora do escopo declarado desta spec, registrado em `deferred-work.md`). 7 `reject` (nomeação do módulo, escolha de idioma de formatação -- contradiz a própria spec --, duplicação de tipo pré-existente, falso alarme de acessibilidade, cobertura de teste já rastreada globalmente, e uma alegação sobre `mapFromDriverValue` do Drizzle verificada como falsa por leitura direta do código-fonte da lib + confirmação empírica contra dado real de produção).

**Follow-up review recomendado:** false -- mudança pequena e contida (4 arquivos, 1 novo helper puro sem estado, nenhuma Server Action alterada), 0 `bad_spec`, patches mecânicos e já verificados.

**Verificação realizada:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos (antes e depois dos patches). Script de leitura descartável (removido após uso, nenhuma escrita) contra o Supabase de produção real: confirmou 15 lançamentos-parcela reais na competência 6/2026 e 17 na competência 7/2026, todos com `parcelaNumero`/`parcelaTotal` corretos via `listarLancamentosParaCorrecao`, e `formatarData` aplicada a datas reais produziu `DD-MM-YYYY` correto em todos os casos. Segundo script descartável validou os novos casos de borda do patch (string vazia, string malformada, string com componente de horário) -- todos devolvem a entrada original sem erro, conforme o novo comportamento defensivo.

**Riscos residuais:** nenhum identificado. `/gastos` não ganhou o indicador de parcela nos itens pendentes (deferido, ver acima) -- não afeta a correção dos 2 bugs que motivaram esta story.
