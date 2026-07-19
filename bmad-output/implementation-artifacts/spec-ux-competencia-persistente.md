---
title: 'UX: competência (mês/ano) persiste ao navegar entre Gastos e Lançamentos'
type: 'feature'
created: '2026-07-18'
status: 'done'
baseline_revision: 'a0cfe52dffcbcfdfae62e00c690dac766d653f96'
final_revision: 'fdec5bcd1ef7837a9335c75f8c053752a8748630'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - 'bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/EXPERIENCE.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** `/gastos` e `/lancamentos` são as duas telas que revisam a mesma competência (mês/ano) sob ângulos diferentes (totais por pessoa/categoria vs. correção item a item) -- mas hoje cada uma tem seu próprio seletor de mês/ano independente (`searchParams` próprio, default = mês calendário atual via `competenciaValida`). Ir de uma para a outra pela nav principal reseta a seleção: o casal revisa "julho" em Gastos, clica em "Lançamentos" no menu, e cai de volta em "mês atual" em vez de continuar em julho -- tendo que reescolher o mês manualmente para continuar o mesmo fluxo de revisão.

**Approach:** Cada uma das duas telas ganha um link de atalho para a outra, carregando a competência atualmente selecionada como parâmetro de URL (`?mes=X&ano=Y`) -- em vez de tornar o componente de navegação principal (`nav.tsx`, compartilhado por todas as 7 telas, muitas sem noção de competência) ciente de estado específico de página. Isso entrega o resultado que o usuário sente (a competência viaja junto ao trocar de tela) sem acoplar o nav global a um conceito que só existe em duas das sete telas.

## Boundaries & Constraints

**Always:**
- O link de atalho usa a MESMA competência (`mes`/`ano`) já resolvida na página atual via `competenciaValida` -- nunca o mês calendário atual, nunca um valor diferente do que está sendo exibido.
- `/upload` continua com seu próprio seletor independente (sempre parte do mês calendário atual) -- não faz parte deste fluxo de continuidade (upload é "a fatura que acabou de fechar", não uma competência já em revisão).
- `/parcelas` não tem seletor de mês/ano (mostra todos os meses futuros com parcela pendente) -- fora de escopo, não recebe link de atalho.

**Block If:**
- Nenhuma condição identificada que exija decisão humana.

**Never:**
- Não modificar `app/(app)/_components/nav.tsx` -- o componente de nav global não deve carregar estado de competência específico de página (fora de escopo desta story, tratado no achado #6 já concluído).
- Não introduzir um Context/Provider global de competência -- o escopo é só um link direto entre as duas telas, com a competência na própria URL de destino (sem estado compartilhado em memória).
- Não mudar a lógica de resolução de competência (`competenciaValida`, em `lib/competencia.ts`) nem o comportamento de `/upload` ou `/parcelas`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Em `/gastos?mes=7&ano=2026`, usuário clica no link de atalho | Competência julho/2026 selecionada | Navega para `/lancamentos?mes=7&ano=2026` -- mesma competência já pré-selecionada nos seletores da tela de destino | — |
| Em `/lancamentos?mes=3&ano=2025`, usuário clica no link de atalho | Competência março/2025 selecionada | Navega para `/gastos?mes=3&ano=2025` -- mesma competência já pré-selecionada | — |
| Em `/gastos` sem parâmetros de URL (competência = mês calendário atual, via default) | Nenhum `mes`/`ano` na URL | Link de atalho ainda usa o mês/ano resolvido (o calendário atual), não um valor vazio -- consistente com o que a própria tela está mostrando | — |

</intent-contract>

## Code Map

- `app/(app)/gastos/page.tsx` -- adicionar um link "Ver lançamentos desta competência" apontando para `/lancamentos?mes=${mes}&ano=${ano}` (valores já resolvidos por `competenciaValida`, existentes no componente)
- `app/(app)/lancamentos/page.tsx` -- adicionar um link "Ver gastos desta competência" apontando para `/gastos?mes=${mes}&ano=${ano}` (mesmo princípio)

## Tasks & Acceptance

**Execution:**
- [x] `app/(app)/gastos/page.tsx` -- adicionar link (`next/link`, classe `.link` já existente em `globals.css`) para `/lancamentos?mes=${mes}&ano=${ano}`, posicionado próximo ao formulário de filtro de competência (antes ou depois do form, não dentro de um `<section className="card">` de dados)
- [x] `app/(app)/lancamentos/page.tsx` -- adicionar link equivalente para `/gastos?mes=${mes}&ano=${ano}`

**Acceptance Criteria:**
- Given o usuário está em `/gastos` com uma competência qualquer selecionada, when ele segue o link de atalho para Lançamentos, then a tela de destino já mostra a mesma competência pré-selecionada nos seletores de mês/ano, sem precisar escolher de novo
- Given o usuário está em `/lancamentos` com uma competência qualquer selecionada, when ele segue o link de atalho para Gastos, then o mesmo vale na direção inversa
- Given nenhum parâmetro de competência foi passado na URL original (default = mês calendário atual), when o link de atalho é seguido, then a competência de destino é a mesma resolvida pela tela de origem (nunca vazia, nunca divergente)

## Spec Change Log

## Review Triage Log

### 2026-07-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1 (medium 1, low 0)
- defer: 1 (low 1)
- reject: 11 (low 11)
- addressed_findings:
  - `[medium]` `[patch]` Both reviewers independently found that the cross-links only forward `mes`/`ano`, not `visao` (individual/combinada) — a user on `/gastos?visao=combinada` who follows the link to `/lancamentos` and back via the new reverse link silently loses the "combinada" selection, since `/lancamentos` had no way to receive or re-emit a param it doesn't otherwise use. Fixed: `/gastos`'s outbound link now includes `visao`; `/lancamentos` accepts it as an optional pass-through param (not used for its own logic), forwards it in a hidden field on its own filter form (so clicking "Filtrar" there doesn't drop it either) and in its own outbound link back to `/gastos`.
  - `[low]` `[defer]` No skip-link/landmark around the new cross-link, so keyboard/screen-reader users must tab past it before reaching page content — real, but this app has no skip-links anywhere today; app-wide, not specific to this story. Logged to `deferred-work.md`.
  - `[low]` `[reject]` Links reflect the last-submitted `mes`/`ano`/`visao`, not an unsaved in-progress `<select>` change — matches the pre-existing submit-then-reflect pattern of every filter form in this app (uncontrolled `<select defaultValue>`, GET form), not a regression introduced here.
  - `[low]` `[reject]` Hardcoded route strings instead of shared constants/typed routes, duplicated `<Link className="link">` boilerplate instead of a shared component, no automated test coverage — premature abstraction for two string literals / two JSX lines, and no test infra exists anywhere in this project (established convention).
  - `[low]` `[reject]` No "came from X" breadcrumb indicator, `/upload` not part of the cross-link set — the former is polish beyond what was asked; the latter is explicitly out of scope per the spec's own Boundaries (`/upload` always starts from the current calendar month by design, not a competência already under review).
  - `[low]` `[reject]` Propagating an `ano` outside the `[anoAtual-1, anoAtual+1]` window could show a `<select>` with no matching option — a pre-existing limitation of the whole three-year `<select>` pattern (identical in `/upload`), reachable via manual URL editing before this diff existed; not introduced or meaningfully worsened by these two links.

## Design Notes

Alternativa considerada e descartada: fazer o `nav.tsx` global ler `useSearchParams()` e reescrever os hrefs de "Lançamentos"/"Gastos" dinamicamente com a competência atual. Rejeitada porque (a) `nav.tsx` é renderizado em TODAS as 7 telas, a maioria sem nenhum conceito de competência (Cartões, Categorias, Upload, Parcelas), então ele precisaria de lógica condicional para saber quando aplicar isso; (b) a competência "atual" do ponto de vista do nav só faz sentido quando se está EM `/gastos` ou `/lancamentos` -- em qualquer outra tela não há um valor certo para propagar. Um link direto na própria tela de origem, para a tela de destino, é mais simples, mais localizado, e não exige o nav global saber nada sobre competência.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção conclui sem erro

**Manual checks (if no CLI):**
- Rodar `npm run dev`, navegar para `/gastos?mes=3&ano=2025`, seguir o link de atalho, confirmar que `/lancamentos` abre com mês=Março/ano=2025 pré-selecionado nos seletores -- e o mesmo no sentido inverso. Este projeto não tem ferramenta de automação de navegador disponível nesta sessão; verificação visual final fica pendente de confirmação manual pelo usuário.

## Auto Run Result

Status: done

**Resumo:** `/gastos` e `/lancamentos` agora têm um link de atalho um para o outro, carregando `mes`/`ano` (e `visao`, adicionado no review) como parâmetros de URL -- a competência selecionada não reseta mais ao trocar de tela entre as duas.

**Arquivos alterados:**
- `app/(app)/gastos/page.tsx` -- link para `/lancamentos?mes=${mes}&ano=${ano}&visao=${visao}`
- `app/(app)/lancamentos/page.tsx` -- aceita `visao` como parâmetro opcional de passagem (sem uso próprio), repassa via campo oculto no próprio formulário de filtro e no link de volta para `/gastos?mes=${mes}&ano=${ano}${visao ? '&visao=' + visao : ''}`

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada):** 0 `bad_spec`, 1 `patch` (médio) aplicado -- ambos os revisores convergiram independentemente no mesmo achado: o ida-e-volta Gastos→Lançamentos→Gastos perdia a visão "combinada" selecionada, já que `/lancamentos` não tinha como receber/reemitir um parâmetro que não usa para sua própria lógica. Corrigido com passagem opcional do parâmetro. 1 `defer` (falta de skip-link, transversal ao app). 11 `reject` (padrões pré-existentes do app, fora do escopo declarado na spec, ou hipotéticos sem evidência).

**Follow-up review recomendado:** false -- mudança pequena e contida (2 arquivos, sem Server Action/dado envolvido), 0 `bad_spec`, 1 patch pequeno e mecânico.

**Verificação realizada:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos. Sem Server Action envolvida -- nenhum script de verificação contra o Supabase foi necessário; `mes`/`ano`/`visao` usados nos links são os mesmos valores já resolvidos e exibidos nos seletores da própria tela (garantia estrutural, não uma leitura de URL não-validada).

**Riscos residuais:** confirmação visual de que a competência realmente aparece pré-selecionada na tela de destino não foi feita em um navegador real nesta sessão -- sem ferramenta de automação disponível. Limitação pré-existente (não introduzida aqui): um `ano` fora da janela `[anoAtual-1, anoAtual+1]` que os seletores de mês/ano oferecem (ex: link antigo/bookmark atravessando um ano) deixaria o `<select>` de destino sem opção correspondente -- mesmo comportamento já presente em `/upload` hoje.
