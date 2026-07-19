---
title: 'UX: feedback visível e loading state em Server Actions hoje silenciosas'
type: 'bugfix'
created: '2026-07-18'
status: 'done'
baseline_revision: '683b1a2b2b244c8ef037e3be10c4bdafd1b1caea'
final_revision: 'ca41bb237e1fc13f712cd47e98a92cf48da932d5'
review_loop_iteration: 1
followup_review_recommended: true
context:
  - 'bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/EXPERIENCE.md'
  - 'bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/DESIGN.md'
warnings: ['multiple-goals']
---

<intent-contract>

## Intent

**Problem:** Em `/cartoes` (atribuir/rejeitar cartão), `/categorias` (criar/editar/remover) e `/lancamentos` (corrigir categoria), as Server Actions já retornam `{ ok, message? }` mas hoje só são consumidas com `console.error` — se a ação falhar no servidor, a tela não muda e o casal não tem como saber que falhou sem abrir o console do navegador. Nenhum desses formulários mostra estado de carregamento, então um clique duplo durante a latência de rede é possível. Adicionalmente, o botão "Não é do casal" (rejeitar cartão, destrutivo e permanente) é visualmente idêntico ao botão neutro "Cancelar".

**Approach:** Extrair a parte interativa de cada lista/formulário para um Client Component que chama a Server Action diretamente (via `await` num handler, não via `<form action={fn}>`) e usa `useState` local para `loading`/`resultado`, exibindo `.alert-error`/`.hint` (com `role="alert"`/`aria-live="polite"`) e desabilitando o botão com rótulo de progresso durante a chamada — exatamente o padrão já usado em `app/(app)/upload/page.tsx`. As Server Actions em si (`mapearCartao`, `rejeitarCartaoTerceiro`, `criarCategoria`, `editarCategoria`, `removerCategoria`, `corrigirCategoriaLancamento`) não mudam — já retornam o formato certo.

## Boundaries & Constraints

**Always:**
- Cada Server Action continua sendo chamada diretamente (`await funcao(...)`) a partir do Client Component, nunca via `<form action={funcao}>` — é o único jeito de capturar `{ ok, message }` no cliente sem introduzir `useActionState`/`useFormState`, mantendo o mesmo padrão já usado em upload/login/senha.
- Estado de loading/resultado é por item da lista (um cartão, uma categoria, um lançamento), nunca global da página — os demais itens continuam interativos enquanto um está em voo.
- `revalidatePath` já existe dentro de cada Server Action; não duplicar a invalidação de cache no client.
- Mensagem de sucesso e de erro seguem o tom já estabelecido (direto, factual, sem exclamação) — ver `EXPERIENCE.md` → Voice and Tone.
- Página "Remover categoria" (`app/(app)/categorias/[id]/remover/page.tsx`) fica fora do escopo — já é Server Component com confirmação dedicada e sem problema de feedback silencioso (usa `redirect()` em sucesso; falha cai em `console.error` sem UI, mas é uma tela de confirmação única, não uma lista repetida — se o self-review no Ready-for-Dev gate julgar que o mesmo problema de feedback silencioso se aplica a ela com o mesmo custo, tratar como extensão natural do mesmo bug, não como gap de intenção).

**Block If:**
- Nenhuma condição identificada que exija decisão humana — as Server Actions já têm o contrato de retorno certo; o trabalho é só de consumo no cliente.

**Never:**
- Não alterar a assinatura nem o corpo de `mapearCartao`, `rejeitarCartaoTerceiro`, `criarCategoria`, `editarCategoria`, `removerCategoria`, `corrigirCategoriaLancamento` — já corretas.
- Não introduzir modal de confirmação para "Não é do casal" — só destaque visual de cor de perigo (ver achado #5); a ação continua de um clique, é rara (caso de borda, não fluxo comum).
- Não mexer em `app/(app)/_components/nav.tsx`, na página inicial (`/`), nem nos seletores de mês/ano de `/gastos` e `/upload` — fora de escopo desta story (achados #6, #2, #1-dashboard, em stories seguintes).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Atribuir cartão com sucesso | Clique em "Atribuir a {email}" | Botão mostra "Atribuindo..." durante a chamada; ao concluir, item some da lista (revalidatePath já cuida disso) | — |
| Atribuir cartão falha (já resolvido por outra chamada concorrente) | `mapearCartao` retorna `{ ok: false, message: 'Cartão já foi resolvido ou não existe.' }` | Mensagem exibida em `.alert-error` `role="alert"` no item; item permanece na lista até o próximo `revalidatePath`/refresh | Botão volta a ficar habilitado |
| Rejeitar cartão ("Não é do casal") | Clique no botão com estilo de perigo | Mesmo padrão de loading/feedback do atribuir | — |
| Criar categoria com nome duplicado | `criarCategoria` retorna `{ ok: false, message: 'Já existe uma categoria ativa com esse nome.' }` | Mensagem exibida abaixo do formulário de criação, input mantém o valor digitado | Botão volta a ficar habilitado, input não é limpo |
| Criar categoria com sucesso | `criarCategoria` retorna `{ ok: true }` | Input de criação é limpo; nova categoria aparece na lista | — |
| Editar (renomear) categoria com sucesso | `editarCategoria` retorna `{ ok: true }` | Mensagem de sucesso breve (`.hint`, `aria-live="polite"`) no item | — |
| Corrigir categoria de lançamento falha (categoria removida entre carregar a lista e corrigir) | `corrigirCategoriaLancamento` retorna `{ ok: false, message: 'Categoria não existe ou foi removida.' }` | Mensagem exibida no card do lançamento; seleção do `<select>` não muda visualmente até sucesso real | Botão volta a ficar habilitado |

</intent-contract>

## Code Map

- `app/(app)/cartoes/page.tsx` -- Server Component; mantém `listarCartoesPendentes`/`listarContasCasal`, passa dados para o novo Client Component de lista, remove as Server Actions inline e os `<form action={...}>` atuais
- `app/(app)/cartoes/_components/cartao-pendente-item.tsx` (NOVO) -- Client Component: um item da lista, botões "Atribuir a {email}" por conta + "Não é do casal" (estilo de perigo), cada um com loading/resultado local, chama `mapearCartao`/`rejeitarCartaoTerceiro` diretamente, chama `router.refresh()` em sucesso
- `app/(app)/categorias/page.tsx` -- Server Component; mantém `listarCategorias`, passa dados para os novos Client Components, remove Server Actions inline e `<form action={...}>` de criar/editar
- `app/(app)/categorias/_components/criar-categoria-form.tsx` (NOVO) -- Client Component: formulário de criação com loading/resultado, chama `criarCategoria` diretamente, limpa o input e chama `router.refresh()` em sucesso, guarda de disparo concorrente via `useRef` (ver Design Notes)
- `app/(app)/categorias/_components/categoria-item.tsx` (NOVO) -- Client Component: formulário de renomear por item com loading/resultado, chama `editarCategoria` diretamente e `router.refresh()` em sucesso; link "Remover" continua `<a href>` inalterado
- `app/(app)/categorias/[id]/remover/page.tsx` -- **[ADICIONADO na re-derivação, achado do review]** hoje sua Server Action inline `confirmar` tem o MESMO bug desta story (`console.error` em falha, sem feedback visível) -- a spec original já previa tratar isso como extensão natural se encontrado (ver Boundaries). Extrair para Client Component seguindo o mesmo padrão.
- `app/(app)/categorias/_components/remover-categoria-form.tsx` (NOVO) -- Client Component: formulário de confirmação de remoção com loading/resultado, chama `removerCategoria` diretamente; em sucesso, navega para `/categorias` via `router.push('/categorias')` (substitui o `redirect()` que só existia no lado servidor); em falha, mostra `.alert-error`
- `app/(app)/lancamentos/page.tsx` -- Server Component; mantém `listarLancamentosParaCorrecao`/`listarCategorias` e o formulário GET de filtro (inalterado), passa cada lançamento para o novo Client Component, remove a Server Action inline e o `<form action={...}>` de correção
- `app/(app)/lancamentos/_components/lancamento-item.tsx` (NOVO) -- Client Component: card do lançamento com formulário de correção de categoria, loading/resultado local, chama `corrigirCategoriaLancamento` diretamente e `router.refresh()` em sucesso
- `app/globals.css` -- adiciona um modificador de botão de perigo (`.btn-danger-outline`, cor `var(--danger)` em texto/borda sobre fundo transparente) para o botão "Não é do casal", reaproveitando os demais estilos de `.btn-secondary`

## Tasks & Acceptance

**Execution:**
- [x] `app/globals.css` -- adicionar classe `.btn-danger-outline` (cor/borda `var(--danger)`, mesmo padding/radius dos demais botões) -- suporte visual ao achado #5, sem inventar um novo componente de botão
- [x] `app/(app)/cartoes/_components/cartao-pendente-item.tsx` -- criar Client Component com estado `loading`/`resultado` por ação (atribuir por conta, rejeitar), botões desabilitados durante a chamada com rótulo de progresso, mensagem de resultado em `.alert-error`/`.hint`, botão "Não é do casal" com `.btn-danger-outline`, **chamar `router.refresh()` (de `next/navigation`) logo após receber `{ ok: true }`** -- corrige achados #3/#4/#5 em Cartões + a lista fica visivelmente atualizada em sucesso
- [x] `app/(app)/cartoes/page.tsx` -- remover as Server Actions inline e os `<form>`, renderizar `<CartaoPendenteItem>` por item pendente, passando `item` e `contas` como props
- [x] `app/(app)/categorias/_components/criar-categoria-form.tsx` -- criar Client Component do formulário de criação com estado `loading`/`resultado`, limpando o input e chamando `router.refresh()` após sucesso; guarda de disparo concorrente via `useRef` checado/setado de forma síncrona antes de qualquer `await` (não só `useState`), já que `criarCategoria` não tem guarda de deduplicação no banco -- corrige achados #3/#4 na criação + fecha a janela de disparo duplo
- [x] `app/(app)/categorias/_components/categoria-item.tsx` -- criar Client Component do formulário de renomear por item com estado `loading`/`resultado`, chamando `router.refresh()` após sucesso -- corrige achados #3/#4 na edição
- [x] `app/(app)/categorias/page.tsx` -- remover Server Actions inline e `<form>`, usar `<CriarCategoriaForm>` e `<CategoriaItem>` por categoria
- [x] `app/(app)/categorias/_components/remover-categoria-form.tsx` -- **[novo nesta re-derivação]** criar Client Component para a página de confirmação de remoção: estado `loading`/`resultado`, chama `removerCategoria` diretamente, em sucesso navega para `/categorias` via `router.push`, em falha mostra `.alert-error` -- corrige o mesmo bug de falha silenciosa (achado #3), encontrado pelo review nesta 5ª tela que usa o mesmo padrão das outras quatro
- [x] `app/(app)/categorias/[id]/remover/page.tsx` -- remover a Server Action inline `confirmar` e o `<form action={...}>`, usar `<RemoverCategoriaForm>` passando `categoriaId` e `substitutasDisponiveis` como props; mantém toda a lógica de leitura (contagens, `notFound()`) no Server Component
- [x] `app/(app)/lancamentos/_components/lancamento-item.tsx` -- criar Client Component do card de lançamento com estado `loading`/`resultado` no formulário de correção, chamando `router.refresh()` após sucesso -- corrige achados #3/#4 em Lançamentos
- [x] `app/(app)/lancamentos/page.tsx` -- remover a Server Action inline e o `<form>` de correção, usar `<LancamentoItem>` por lançamento (formulário GET de filtro de mês/ano permanece inalterado, é navegação, não mutação)
- [x] Unit/integration: escrever um teste temporário de verificação end-to-end (script descartável, removido após uso, seguindo o padrão já estabelecido no projeto) exercitando ao menos um caso de sucesso e um de falha por tela (cartões, categorias, remover categoria, lançamentos) contra o Supabase de produção real, sem deixar dado sintético residual

**Acceptance Criteria:**
- Given uma ação de atribuir/rejeitar cartão, criar/editar/remover categoria ou corrigir categoria de lançamento falha no servidor, when o resultado retorna `{ ok: false, message }`, then a mensagem aparece visivelmente na tela (`role="alert"`) sem precisar abrir o console do navegador
- Given qualquer uma dessas ações está em voo, when o usuário olha para o botão daquele item, then o botão está desabilitado com um rótulo de progresso, e os demais itens da mesma lista continuam interativos
- Given o botão "Não é do casal" em Cartões, when renderizado, then usa a cor de perigo (`var(--danger)`) no texto/borda, visualmente distinto de um botão de cancelar neutro
- Given uma ação bem-sucedida em qualquer uma das telas (cartões, criar/editar/remover categoria, corrigir lançamento), when o resultado retorna `{ ok: true }`, then a lista/tela reflete o novo estado real (cartão sai de pendente, categoria nova aparece, categoria editada/removida reflete, lançamento mostra a categoria corrigida) **sem exigir reload manual da página** -- via `router.refresh()` explícito no client, não apenas confiando no `revalidatePath` do servidor
- Given dois cliques rápidos no botão "Criar" de uma categoria, when o primeiro clique ainda está em voo, then o segundo clique não dispara uma segunda chamada a `criarCategoria` (guarda síncrona via `useRef`, não só `useState`)

## Spec Change Log

### 2026-07-18 — bad_spec loopback (review pass 1)
- **Finding que disparou:** ver Review Triage Log acima (router.refresh ausente; remover-categoria com o mesmo bug de falha silenciosa).
- **O que foi emendado:** Code Map e Tasks & Acceptance (fora do `<intent-contract>`, que permanece intocado) passaram a exigir `router.refresh()` de `next/navigation` após todo `{ ok: true }` nos quatro componentes originais, mais um quinto componente novo (`remover-categoria-form.tsx`) e a extensão do escopo para `app/(app)/categorias/[id]/remover/page.tsx`. Acceptance Criteria ganhou um critério explícito de atualização visível sem reload e um para a guarda de disparo duplo em `criarCategoria`.
- **Estado ruim evitado:** implementação que passa em tsc/lint/build e no teste de contrato `{ok, message}` mas deixa a tela parecendo que nada aconteceu após um sucesso real -- o mesmo tipo de "sucesso invisível" que a story inteira existe para eliminar, só que deslocado do caminho de falha para o de sucesso.
- **KEEP (o que já funcionava e deve sobreviver à re-derivação):** o padrão geral de extração para Client Component por item, mirroring `upload/page.tsx` (`await` direto, nunca `<form action={fn}>`); a nomenclatura e estrutura dos 4 componentes originais; a classe `.btn-danger-outline`; as mensagens de erro/sucesso e o tom de voz já usados; nenhuma Server Action foi ou deve ser modificada.

## Review Triage Log

### 2026-07-18 — Review pass
- intent_gap: 0
- bad_spec: 1 (high 1, medium 0, low 0)
- patch: 1 (high 0, medium 1, low 0)
- defer: 2 (high 0, medium 0, low 2)
- reject: 11 (high 0, medium 0, low 11)
- addressed_findings:
  - `[high]` `[bad_spec]` Blind Hunter + Edge Case Hunter independently converged on the same root cause: the four new Client Components call the Server Actions directly (`await fn(...)`, not via `<form action={fn}>`), and Next.js only auto-refreshes the current route's Server Component tree when a Server Action is invoked through form binding — a direct call does not trigger that refresh. The spec's I/O matrix wrongly assumed "revalidatePath já cuida disso" was sufficient. Consequence: after a successful mapear/rejeitar/criar/editar/corrigir, the parent list does not visibly update (mapped cartão stays "pendente", new categoria invisible, corrected lançamento label stale) — the success path looks like nothing happened, undermining the story's whole purpose. Blind Hunter separately found `app/(app)/categorias/[id]/remover/page.tsx`'s `confirmar` action has the exact same silent-`console.error`-only failure bug this story targets — the spec's own Boundaries note anticipated this and said to treat it as in-scope if found. Both amended into the spec below; code reverted and will be re-derived.
  - `[medium]` `[patch]` (to apply on re-derivation) `criarCategoria` has no DB-level dedupe guard (unlike the cartão functions, which have a WHERE-clause guard), so a narrow double-submit race (two click events dispatched before React commits a `disabled` re-render) could create two identical categories. Add a synchronous `useRef` in-flight guard (checked/set before any `await`, independent of React's render cycle) to `CriarCategoriaForm` — cheap, removes the ambiguity regardless of how narrow the real-world race window is.

### 2026-07-18 — Review pass 2 (re-derivation)
- intent_gap: 0
- bad_spec: 0
- patch: 3 (high 0, medium 3, low 0)
- defer: 1 (low 1)
- reject: 8 (low 8)
- addressed_findings:
  - `[medium]` `[patch]` Blind Hunter + Edge Case Hunter both independently found `RemoverCategoriaForm` calls `router.push('/categorias')` on success without first calling `router.refresh()`, unlike the other four components fixed in the previous loopback -- the destination route could serve a stale Router Cache entry still listing the just-removed category. Fixed: `router.refresh()` now called immediately before `router.push`.
  - `[medium]` `[patch]` Both reviewers flagged the double-submit synchronous `useRef` guard as present only in `CartaoPendenteItem`/`CriarCategoriaForm` but absent from `CategoriaItem`/`RemoverCategoriaForm`/`LancamentoItem`, with no stated reason for the inconsistency. None of the three missing ones can cause data corruption (all three underlying actions are idempotent or DB-guarded against a repeat), but a rapid double-submit could still surface a confusing "already removed"/similar error to a user who only clicked once. Added the same guard to all three for consistency and to eliminate the confusing-error edge case.
  - `[medium]` `[patch]` Blind Hunter found `RemoverCategoriaForm`'s "Cancelar" link has no disabled state during an in-flight removal -- a user could click it believing they aborted the deletion while the (uncancellable) server transaction completes anyway. Fixed: link now no-ops via `preventDefault` while `loading` is true, with `aria-disabled`.
  - `[low]` `[reject]` Edge Case Hunter's CSS-specificity finding (`.btn-danger-outline`'s background allegedly overridden by `button:disabled`) does not hold -- verified against the actual `button:disabled` rule in `globals.css`, which only sets `opacity`/`cursor`, never `background`. No conflict exists.
  - `[low]` `[reject]` Blind Hunter's "danger-styling inverted" finding (remover-categoria's "Confirmar" isn't danger-styled but "Não é do casal" is) — deliberate per `EXPERIENCE.md` Component Patterns: remover-categoria's dedicated confirmation *page* is its safeguard (no color needed), whereas "Não é do casal" is a single click with no confirmation step, which is why it alone needed the color cue. Not a gap; the reviewer wasn't shown the UX spine's full rationale.
  - `[low]` `[reject]` No test coverage, duplicated per-component boilerplate instead of a shared hook, hand-redeclared prop types instead of imported ones, dead client-side validation in `LancamentoItem`, `router.refresh()` not awaited before re-enabling controls, `CriarCategoriaForm` success has no confirmation message — all either pre-existing project conventions (no test infra anywhere in this repo; `MESES` arrays already duplicated verbatim across 3 pages), already-accepted trade-offs from the previous review pass, or cosmetic issues with no realistic bad outcome given the server-side guards already in place.
  - `[low]` `[defer]` `CategoriaItem`'s uncontrolled `defaultValue={item.nome}` input can show untrimmed text that differs from what `editarCategoria` persists (server trims via `validarNome`), and the new "Categoria salva." success message never dismisses itself. Cosmetic, pre-existing input pattern, logged to `deferred-work.md`.



## Design Notes

Padrão de referência já em produção: `app/(app)/upload/page.tsx` (Client Component que importa a Server Action e chama via `await` em `handleSubmit`, com `useState` para `loading`/`result`). Os novos componentes replicam esse padrão por item de lista em vez de por página inteira — cada item tem seu próprio `useState` local, não um estado compartilhado da lista inteira, para não travar itens não relacionados durante uma chamada.

`upload/page.tsx` não precisa de `router.refresh()` porque não renderiza, na mesma página, a lista que a ação altera (o efeito aparece em `/gastos`/`/lancamentos`, uma navegação separada, onde o `revalidatePath` do servidor já garante dado fresco). Os quatro (agora cinco) componentes desta story são diferentes: mutam uma lista renderizada pelo Server Component pai *na mesma página*, e chamar a Server Action diretamente (fora de `<form action={fn}>`) não dispara o refresh automático do Router que o Next.js só concede a ações vinculadas via `action=`. Por isso, todo `useState`/`useEffect` de sucesso agora chama `router.refresh()` (import de `next/navigation`, `useRouter().refresh()`) antes ou junto de limpar o estado de loading -- isso invalida o cache do Server Component e refaz a leitura (`listarCartoesPendentes`, `listarCategorias`, `listarLancamentosParaCorrecao`), mantendo os `useState` locais de item que já não existem mais intactos até o re-render substituir a lista.

Guarda de disparo concorrente em `CriarCategoriaForm`: um `useRef<boolean>` (`emVooRef`) checado e setado como a primeira linha do handler, antes de qualquer `await` -- ao contrário de `useState`, a escrita numa ref é imediata e não depende de um ciclo de render, fechando a janela em que dois cliques rápidos poderiam ambos ler `loading === false` antes do primeiro `setLoading(true)` comitar. Os demais componentes (cartões, editar categoria, remover categoria, lançamentos) já têm proteção equivalente no banco (guard de estado no `WHERE`/transação) ou não têm o mesmo risco de duplicação prática (editar/corrigir são idempotentes por natureza -- reenviar o mesmo valor não cria um registro novo), então não precisam do mesmo reforço.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção conclui sem erro

**Manual checks (if no CLI):**
- Rodar `npm run dev` localmente e, no navegador, exercitar em `/cartoes`, `/categorias`, `/categorias/[id]/remover` e `/lancamentos` pelo menos um caminho de sucesso e um de falha por tela (ex: tentar criar categoria duplicada), confirmando visualmente o estado de loading, a mensagem de resultado, e que a lista/tela reflete o sucesso via `router.refresh()` sem reload manual -- este projeto não tem ferramenta de automação de navegador disponível nesta sessão, então esta verificação visual final fica registrada como pendente de confirmação manual pelo usuário.

## Auto Run Result

Status: done

**Resumo:** As cinco telas (`/cartoes`, `/categorias`, `/categorias/[id]/remover`, `/lancamentos`) que só logavam falhas no console e não davam feedback visível agora mostram erro/sucesso na tela, estado de carregamento por item, e atualizam a lista de verdade após sucesso (`router.refresh()`). O botão "Não é do casal" ganhou destaque visual de perigo. Nenhuma Server Action foi alterada -- só a forma como a UI consome o retorno `{ ok, message }` que elas já forneciam.

**Arquivos alterados:**
- `app/globals.css` -- nova classe `.btn-danger-outline`
- `app/(app)/cartoes/page.tsx`, `app/(app)/categorias/page.tsx`, `app/(app)/categorias/[id]/remover/page.tsx`, `app/(app)/lancamentos/page.tsx` -- viraram Server Components finos (só leitura + passagem de props), Server Actions inline e `<form action={fn}>` removidos
- `app/(app)/cartoes/_components/cartao-pendente-item.tsx`, `app/(app)/categorias/_components/criar-categoria-form.tsx`, `app/(app)/categorias/_components/categoria-item.tsx`, `app/(app)/categorias/_components/remover-categoria-form.tsx`, `app/(app)/lancamentos/_components/lancamento-item.tsx` -- novos Client Components, cada um com loading/resultado local, `router.refresh()` em sucesso, guarda `useRef` síncrona contra disparo duplo

**Achados do review (2 rodadas, Blind Hunter + Edge Case Hunter em paralelo cada uma):**
- Rodada 1: 1 `bad_spec` (alto) -- `router.refresh()` ausente em toda a story, silenciando o caminho de sucesso; spec corrigida, código revertido e re-derivado. 1 `patch` (médio) aplicado na re-derivação (guarda `useRef` em `criarCategoria`). 2 `defer`, 11 `reject`.
- Rodada 2 (sobre a re-derivação): 3 `patch` (médios) aplicados -- `router.refresh()` faltando em `RemoverCategoriaForm`, guarda `useRef` faltando em 3 dos 5 componentes, link "Cancelar" sem estado desabilitado durante envio. 1 `defer`, 8 `reject` (incluindo um falso alarme de especificidade CSS verificado e descartado contra o código real).

**Follow-up review recomendado:** true -- a primeira rodada exigiu um loopback `bad_spec` real (gap arquitetural que quase foi ao commit), e a segunda rodada ainda encontrou 3 patches médios; o volume e a natureza (comportamento de mutação de dado real em produção, 5 telas) justificam uma revisão independente de acompanhamento antes de considerar o padrão totalmente estabilizado para reuso nas próximas stories desta run.

**Verificação realizada:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos após cada rodada. Verificação end-to-end contra o Supabase de produção real via scripts temporários (removidos após uso, com varredura de limpeza independente confirmando zero resíduo) para as 6 Server Actions, casos de sucesso e falha, ambas as rodadas de implementação.

**Riscos residuais:** (1) `router.refresh()` não é aguardado antes de reabilitar os controles -- uma janela estreita em que um segundo clique rápido pode gerar um erro "já foi resolvido" confuso, mas nunca corrompe dado (aceito, ver Review Triage Log). (2) A confirmação visual de que a lista realmente atualiza após `router.refresh()` em um navegador real não foi verificada nesta sessão -- não há ferramenta de automação de navegador disponível; recomenda-se que o usuário abra as quatro telas localmente para confirmar visualmente antes de considerar o achado #3/#4/#5 da auditoria de UX totalmente resolvido na prática, não só no código. (3) Input não-controlado em `CategoriaItem` pode mostrar texto não-trimado por um instante (`deferred-work.md`).
