---
title: 'Unificar /lancamentos e /gastos numa única visão'
type: 'feature'
created: '2026-07-19'
status: 'in-review'
baseline_revision: '6f17f07726df041eccf85a2a5db2048325ac96d1'
review_loop_iteration: 1
followup_review_recommended: true
context: []
warnings: ['oversized']
---

<intent-contract>

## Intent

**Problem:** `/lancamentos` (revisão/correção de categoria por lançamento) e `/gastos` (totais agregados por pessoa/categoria) mostram o mesmo recorte de dados da competência em duas telas separadas, com seletor de mês/ano duplicado, link cruzado entre elas, e nenhuma das duas mostra de quem (qual titular do casal) é cada lançamento individual.

**Approach:** Fundir as duas telas em `/lancamentos` (rota canônica única): filtro (mês/ano/pessoa) no topo, resumo por pessoa abaixo, lista de lançamentos com badge de titular por item, bloco "Pendente de revisão" ao final. `/gastos` passa a redirecionar para `/lancamentos` preservando querystring. Ver `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/EXPERIENCE.md`, seção "Unificação de Lançamentos e Gastos numa Única Visão", para o desenho completo já decidido — este spec só traduz essa decisão em tarefas de código.

## Boundaries & Constraints

**Always:**
- `/gastos?mes=X&ano=Y&visao=Z` (qualquer querystring) continua resolvendo — redireciona para `/lancamentos` com a mesma querystring, sem 404 para bookmarks antigos.
- Nome de titular exibido (badge do lançamento, título do resumo por pessoa, opções do filtro de pessoa) é sempre o primeiro nome derivado do prefixo do e-mail antes do primeiro `.` (capitalizado) — nunca o e-mail completo. Usar um único helper compartilhado (`lib/pessoa.ts`, função nova) para essa derivação, não duplicar a lógica.
- Filtro de Pessoa só aceita um `usuarioId` que exista em `listarContasCasal()` — valor ausente/inválido/malformado cai em "Todos" (mesmo princípio defensivo de `competenciaValida`/`visaoValida` já usado nesta tela).
- Quando Pessoa = uma conta específica: o toggle Individual/Combinada não é renderizado (não só desabilitado); resumo mostra um único `summary-card` dessa pessoa; lista de lançamentos mostra só os dela.
- "Pendente de revisão" só lista itens com motivo `titular_pendente` (titular desconhecido) — sempre aparecem, independente do filtro de Pessoa (titular desconhecido não pode ser filtrado). Itens com motivo `sem_categoria`/`categoria_removida` **não** entram nesse bloco: eles já têm o dropdown "Corrigir categoria" inline na lista principal (mesmo lançamento, mesma tela) — duplicar a linha num segundo bloco sem ação equivalente é redundante e confuso, exatamente o tipo de poluição que a fusão deveria eliminar *(amendment — review pass 1: `obterResumoGastos` continua computando os 3 motivos internamente para o total agregado, mas a page filtra a lista de exibição de `pendentes.itens` para só `titular_pendente` antes de renderizar)*.
- `contas` (`listarContasCasal()`) é buscado **uma única vez** por requisição — a page busca `contas` e repassa para `obterResumoGastos`, que ganha um parâmetro opcional `contasPreCarregadas` em vez de chamar `listarContasCasal()` internamente de novo; os outros dois call sites existentes (`layout.tsx`, dashboard `page.tsx`) continuam chamando sem esse parâmetro, comportamento inalterado *(amendment — review pass 1: duas chamadas independentes à mesma Admin API no mesmo request criavam risco de inconsistência entre o dropdown de Pessoa e o resumo/pendentes, além de custo dobrado sem necessidade)*.
- Quando Pessoa = uma conta específica (toggle Individual/Combinada oculto), o valor de `visao` ainda viaja como campo oculto (`<input type="hidden" name="visao" value={visao} />`) no formulário, para não se perder caso o usuário volte a selecionar "Todos" depois *(amendment — review pass 1: sem o hidden field, trocar Pessoa->Todos resetava silenciosamente "Combinada" para "Individual" — mesma classe de bug de round-trip que a competência persistente já corrigiu numa rodada anterior)*.
- O redirect de `/gastos` usa `permanentRedirect()` (não `redirect()`) de `next/navigation` — a rota foi deliberadamente aposentada da navegação, não é um desvio temporário *(amendment — review pass 1)*.
- Nenhum token novo em `DESIGN.md` — `titular-badge` usa apenas `var(--muted-foreground)`, `var(--surface)`, `var(--border)`, `border-radius: 9999px`, já existentes em `app/globals.css`.
- `nav.tsx`: remover a entrada `{ href: '/gastos', label: 'Gastos' }` de `LINKS`; badge de pendência em "Lançamentos" continua vindo da mesma fonte (`layout.tsx`, inalterado).
- Toda mutação (`corrigirCategoriaLancamento`) continua exatamente como está — esta mudança é só de leitura/apresentação, não de escrita.

**Block If:** nenhuma decisão pendente identificada — o desenho já foi resolvido na etapa de UX anterior (EXPERIENCE.md).

**Never:**
- Não introduzir Context/estado global para o filtro — continua formulário GET server-rendered, mesmo padrão das duas telas hoje.
- Não adicionar coluna denormalizada de titular em `lancamento` — continua join ao vivo via `cartao.usuarioId` (arquitetura já confirmada correta em auditoria anterior).
- Não remover fisicamente o arquivo de rota `/gastos` — ele precisa continuar existindo como redirect, não sumir (senão vira 404 em vez de redirect).
- Não tocar em `server/parcelas/*` nem na tela `/parcelas` — fora de escopo, unidade de dado diferente.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bookmark antigo de Gastos | `GET /gastos?mes=7&ano=2026&visao=combinada` | Redireciona para `/lancamentos?mes=7&ano=2026&visao=combinada` | — |
| Filtro por pessoa válido | `pessoa=<uuid-da-Milena>` | Resumo mostra só o card da Milena; lista mostra só lançamentos dela; toggle Individual/Combinada não aparece | — |
| Filtro por pessoa inválido/inexistente | `pessoa=abc-nao-existe` | Tratado como "Todos" (mesmo comportamento de nenhum filtro) | — |
| Pendente com titular desconhecido, filtro por pessoa ativo | Item com `motivo=titular_pendente`, `pessoa=<uuid-do-Tsuyoshi>` | Item continua aparecendo no bloco "Pendente de revisão" mesmo filtrado para o Tsuyoshi | — |
| Pendente com titular conhecido, filtro por outra pessoa | Item com `motivo=sem_categoria`, `usuarioId` = Milena, `pessoa=<uuid-do-Tsuyoshi>` | Item some do bloco "Pendente de revisão" (não é da pessoa filtrada) | — |
| `listarContasCasal()` falha (degradação já existente) | Erro de rede/Supabase | Filtro de pessoa fica só com a opção "Todos"; badge de titular não aparece em nenhum item (mesmo comportamento hoje de `pessoas: []` em `obterResumoGastos`) | Já tratado — `listarContasCasal` retorna `[]`, não lança |

</intent-contract>

## Code Map

- `app/(app)/gastos/page.tsx` -- vira redirect puro (preserva querystring) para `/lancamentos`, todo o resto do conteúdo atual migra para `app/(app)/lancamentos/page.tsx`
- `app/(app)/lancamentos/page.tsx` -- absorve o layout de `/gastos` (resumo por pessoa, toggle Individual/Combinada, pendentes) acima da lista de lançamentos já existente; adiciona filtro de Pessoa; remove o link cruzado "Ver gastos desta competência"
- `app/(app)/lancamentos/_components/lancamento-item.tsx` -- adiciona `titular-badge` na linha de cada item, recebendo `titularNome: string | null` já resolvido pela page
- `server/categorizacao/corrigir-categoria.ts` -- `listarLancamentosParaCorrecao` ganha join com `cartao` (mesmo padrão de `resumo-gastos.ts`) e retorna `titularUsuarioId: string | null` por lançamento
- `server/visualizacao/resumo-gastos.ts` -- `ItemPendente` ganha `usuarioId: string | null`; `obterResumoGastos` ganha parâmetro opcional `contasPreCarregadas?: { id: string; email: string }[]` (usa se fornecido, senão chama `listarContasCasal()` como hoje)
- `app/(app)/upload/page.tsx` -- corrige comentário obsoleto acima do `useState` de `competenciaEnviada` (ainda cita `/gastos`; o link já foi trocado para `/lancamentos` pela task original)
- `lib/pessoa.ts` -- **novo arquivo**: `primeiroNome(email: string): string`, helper único de derivação de nome de exibição
- `app/globals.css` -- adiciona classe `.titular-badge`
- `app/(app)/_components/nav.tsx` -- remove entrada `/gastos` de `LINKS`
- `app/(app)/page.tsx` -- link do dashboard (`Ver gastos →`) muda `href` de `/gastos?...` para `/lancamentos?...`
- `app/(app)/upload/page.tsx` -- link pós-sucesso (`Ver gastos de {mês} de {ano} →`) muda `href` de `/gastos?...` para `/lancamentos?...`

## Tasks & Acceptance

**Execution:**
- [x] `lib/pessoa.ts` -- criar `primeiroNome(email: string): string` (substring antes do primeiro `.` do local-part, capitalizada; fallback para o local-part inteiro se não houver `.`; fallback para o e-mail inteiro se não houver `@`) -- helper único evita duplicar a derivação em 3 lugares diferentes
- [x] `server/categorizacao/corrigir-categoria.ts` -- estender a query de `listarLancamentosParaCorrecao` com `leftJoin(cartao, eq(lancamento.cartaoId, cartao.id))`, selecionar `cartaoUsuarioId: cartao.usuarioId`, adicionar `titularUsuarioId` ao tipo `LancamentoParaCorrecao` e ao retorno -- fonte de dado para o badge de titular
- [x] `server/visualizacao/resumo-gastos.ts` -- adicionar `usuarioId: string | null` ao tipo `ItemPendente` e ao objeto empurrado em `itensPendentes.push(...)` (usar `linha.cartaoUsuarioId`, já selecionado na query) -- fonte de dado para o filtro de pessoa nos itens pendentes
- [x] `server/visualizacao/resumo-gastos.ts` -- `obterResumoGastos(ano, mes, contasPreCarregadas?)`: se `contasPreCarregadas` for passado, usar em vez de chamar `listarContasCasal()` internamente -- elimina a segunda chamada à Admin API na mesma requisição *(review pass 1)*
- [x] `app/globals.css` -- adicionar `.titular-badge` (inline-flex, padding `0.1rem 0.5rem`, `border: 1px solid var(--border)`, `border-radius: 9999px`, `background: var(--surface)`, `color: var(--muted-foreground)`, `font-size: 0.75rem`, `font-weight: 500`), próximo de `.badge-pending`
- [x] `app/(app)/lancamentos/_components/lancamento-item.tsx` -- adicionar `titularNome: string | null` ao tipo `Lancamento` e às props; renderizar `<span className="titular-badge">{item.titularNome}</span>` na linha do card quando `titularNome` não for `null` (posição: logo após o valor, mesma linha de data/estabelecimento/valor/parcela)
- [x] `app/(app)/lancamentos/page.tsx` -- reescrever incorporando os 4 ajustes desta rodada de review: (1) passar `contas` já buscada para `obterResumoGastos(ano, mes, contas)` em vez de deixá-la buscar de novo; (2) filtrar `resumo.pendentes.itens` para **só** `motivo === 'titular_pendente'` antes de renderizar o bloco "Pendente de revisão" (não mais `sem_categoria`/`categoria_removida`, que já têm ação inline na lista principal); (3) quando `pessoaSelecionada` está ativo, incluir `<input type="hidden" name="visao" value={visao} />` no formulário para não perder a preferência Individual/Combinada ao voltar para "Todos"; (4) manter o resto como já implementado (filtro de pessoa, `titular-badge`, `summary-card` por pessoa) *(review pass 1)*
- [x] `app/(app)/lancamentos/page.tsx` -- adicionar `<p className="hint">` no bloco "Pendente de revisão" quando `pessoaSelecionada` está ativo, avisando que o bloco independe do filtro de pessoa (achado real: nenhuma pista visual distinguia "bloco ignora o filtro de propósito" de "bug do filtro") *(review pass 2)*
- [x] `app/(app)/gastos/page.tsx` -- trocar `redirect` por `permanentRedirect` (import de `next/navigation`) -- rota aposentada permanentemente, não um desvio temporário *(review pass 1)*
- [x] `app/(app)/_components/nav.tsx` -- remover `{ href: '/gastos', label: 'Gastos' }` do array `LINKS`
- [x] `app/(app)/page.tsx` -- trocar `href={\`/gastos?mes=${mesAtual}&ano=${anoAtual}\`}` por `href={\`/lancamentos?mes=${mesAtual}&ano=${anoAtual}\`}` (mesmo label "Ver gastos →")
- [x] `app/(app)/upload/page.tsx` -- trocar `href={\`/gastos?mes=${competenciaEnviada.mes}&ano=${competenciaEnviada.ano}\`}` por `href={\`/lancamentos?mes=${competenciaEnviada.mes}&ano=${competenciaEnviada.ano}\`}` (mesmo label)
- [x] `app/(app)/upload/page.tsx` -- corrigir o comentário acima do `useState` de `competenciaEnviada` que ainda cita "link pós-sucesso para /gastos" (stale desde a task acima) *(review pass 1)*
- [x] Testar ponta a ponta contra o Supabase de produção real (script descartável somente leitura, removido após uso): confirmar que a query estendida de `listarLancamentosParaCorrecao` retorna o `titularUsuarioId` correto para lançamentos reais de cartões já mapeados, e que `/gastos?mes=X&ano=Y` de fato redireciona preservando querystring

**Acceptance Criteria:**
- Given um lançamento cujo cartão está mapeado para a Milena, when `/lancamentos` é carregada para a competência daquele lançamento, then o card do lançamento mostra um badge "Milena" (não o e-mail completo)
- Given a tela `/lancamentos` sem filtro de pessoa, when o usuário seleciona "Tsuyoshi" no filtro e clica em Filtrar, then a URL recarrega com `?pessoa=<id-do-Tsuyoshi>`, o resumo mostra só o card do Tsuyoshi, a lista mostra só lançamentos dele, e o toggle Individual/Combinada não aparece
- Given um lançamento pendente com motivo `titular_pendente`, when o filtro de pessoa está ativo para qualquer uma das duas contas, then esse item continua visível no bloco "Pendente de revisão"
- Given um lançamento com motivo `sem_categoria` ou `categoria_removida`, when `/lancamentos` é carregada, then ele aparece **só uma vez** na tela (na lista principal, com o dropdown de correção) — não também no bloco "Pendente de revisão"
- Given um link salvo `/gastos?mes=6&ano=2026&visao=combinada`, when acessado, then o navegador é redirecionado (permanentemente) para `/lancamentos?mes=6&ano=2026&visao=combinada` e a tela renderiza com essa competência e visão já selecionadas
- Given a tela com Pessoa=Todos e Visão=Combinada, when o usuário seleciona uma pessoa específica e depois volta a selecionar "Todos", then a Visão volta a mostrar "Combinada" (não reseta silenciosamente para "Individual")
- Given a nav em qualquer tela do app, when renderizada, then não existe mais item "Gastos" (6 links no total, não 7) e o item "Lançamentos" mantém o badge de pendência

## Design Notes

O helper `primeiroNome` precisa ser puro e defensivo (nunca lançar, mesmo com e-mail malformado) porque alimenta 3 superfícies (badge do lançamento, título do resumo por pessoa, opções do filtro) — um erro nele não pode derrubar a tela inteira. Exemplo de comportamento esperado:

```
primeiroNome('tsuyoshi.masuno@gmail.com') // 'Tsuyoshi'
primeiroNome('milena@gmail.com')          // 'Milena'  (sem '.', usa o local-part inteiro)
primeiroNome('(sem e-mail)')              // '(sem e-mail)' (sem '@', devolve a string original)
```

*(atualizado — review pass 1)* "Pendente de revisão" filtra por `item.motivo === 'titular_pendente'`, não mais por `usuarioId`: desde que o bloco passou a listar só titular_pendente (ver Boundaries), o predicado por `usuarioId` ficou redundante — todo item nesse bloco já tem `usuarioId: null` por construção (é exatamente a condição que gera o motivo `titular_pendente`), então filtrar pelo próprio `motivo` é mais direto e não depende de `pessoaSelecionada` para o resultado ser sempre "aparece independente do filtro". Um `<p className="hint">` na seção avisa isso explicitamente quando um filtro de pessoa está ativo, para não parecer que o bloco ignorou o filtro por engano *(review pass 2)*.

## Spec Change Log

### 2026-07-19 — Review pass 1 (bad_spec)

- **Trigger:** Blind Hunter + Edge Case Hunter (parallel, no shared context) both independently flagged that "Pendente de revisão" duplicates lançamentos already shown in the main list — any `sem_categoria`/`categoria_removida` item now renders twice on the same screen (once with a working "Corrigir categoria" action, once as flat informational text), directly undermining the "UX moderna, fácil de usar" goal that motivated the merge.
- **Amended:** Boundaries & Constraints ("Pendente de revisão" rule narrowed to `titular_pendente` only) + Code Map + Tasks (`app/(app)/lancamentos/page.tsx` filter added) + Acceptance Criteria (new AC for no-duplication).
- **Known-bad state avoided:** every miscategorized or category-removed lançamento appearing twice per screen load, with inconsistent affordances between the two appearances (one has a working correction dropdown, the other doesn't).
- **KEEP:** the overall architecture — canonical `/lancamentos` route, `titular-badge` component/CSS, `primeiroNome` helper, pessoa-filter mechanics (validation against `listarContasCasal()`, hiding the Individual/Combinada toggle when a person is selected), the `usuarioId === pessoaSelecionada || usuarioId === null` predicate for filtering `titular_pendente` items — all verified sound by both reviewers and by the real-Supabase check in the first implementation pass. None of that is being redone from scratch; only the "Pendente de revisão" content scope and 3 smaller loose ends (duplicate `listarContasCasal()` call, `visao` round-trip loss, stale comment, redirect permanence) are being patched into the same re-derivation pass rather than deferred to a second review cycle.
- **Process note:** the workflow's default bad_spec protocol calls for a full `git checkout` revert of the code before re-deriving via a fresh implementation subagent pass. That revert command was blocked by this session's safety classifier (discard-uncommitted-work guard). Given the fix set was fully diagnosed and scoped, the equivalent outcome was achieved via targeted `Edit` calls directly against the existing (95% correct) implementation instead of a full revert + re-derivation, preserving the same coherence guarantee the protocol is meant to protect without an extra full rewrite.

## Review Triage Log

### 2026-07-19 — Review pass 1

- intent_gap: 0
- bad_spec: 1 (high 1, medium 0, low 0)
- patch: 3 (high 1, medium 1, low 1)
- defer: 2 (medium 1, low 1)
- reject: 3 (low 3)
- addressed_findings:
  - `[high]` `[bad_spec]` Pendente de revisão duplica lançamentos já corrigíveis na lista principal (sem_categoria/categoria_removida) -- bloco narrowed para só titular_pendente, spec e tasks amendadas, código sendo re-derivado nesta mesma passada
  - `[high]` `[patch]` Selecionar Pessoa e depois voltar para "Todos" perdia a preferência Visão=Combinada (toggle oculto sem hidden field) -- hidden input `visao` adicionado quando pessoa está selecionada
  - `[medium]` `[patch]` Duas chamadas independentes a `listarContasCasal()` (Admin API) na mesma requisição -- `obterResumoGastos` ganhou parâmetro opcional `contasPreCarregadas`, page busca uma vez só
  - `[low]` `[patch]` Comentário stale em `upload/page.tsx` ainda citando `/gastos` após o link já ter sido trocado para `/lancamentos`
  - defer (registrados em deferred-work.md): `[medium]` lançamentos de cartão `terceiro` nunca foram filtrados em `listarLancamentosParaCorrecao` (pré-existente, não introduzido por este diff); `[low]` visão "Casal" combinada não distingue "sem contas do casal" de "sem gasto resolvido" (pré-existente de `/gastos`, herdado pela tela unificada)
  - reject: `primeiroNome()` sem guard de colisão de nome (as 2 contas reais do casal têm prefixos de e-mail completamente distintos, sem cenário real de colisão neste sistema fechado de 2 usuários); redirect de `/gastos` repassa querystring sem whitelist (inofensivo, mesmo padrão de formulário GET usado em todo o app); ausência de estado de loading no fetch mais pesado (padrão já deliberadamente aceito no projeto para esta escala, ver EXPERIENCE.md State Patterns)

### 2026-07-19 — Review pass 2

- intent_gap: 0
- bad_spec: 0
- patch: 2 (medium 0, low 2)
- defer: 0 (achado 6 já coberto pela entrada de deferred-work.md registrada na rodada 1, não duplicado)
- reject: 3 (low 3)
- addressed_findings:
  - `[low]` `[patch]` Documentação da spec (Design Notes) dessincronizada do código real após a correção da rodada 1 (ainda descrevia o predicado antigo por `usuarioId`, código já filtra por `motivo === 'titular_pendente'`) -- Design Notes reescrita para descrever a lógica atual
  - `[low]` `[patch]` "Pendente de revisão" não avisava visualmente que ignora o filtro de pessoa acima dele -- `<p className="hint">` adicionado quando `pessoaSelecionada` está ativo
  - reject: query duplicada não consolidada entre `listarLancamentosParaCorrecao` e `obterResumoGastos` (mesmo padrão de duplicação de leitura já aceito explicitamente em `layout.tsx` para esta escala de app -- "app de baixo tráfego, não introduzir cache/memoização só para eliminar essa duplicação"); waterfall de `contas` antes de `obterResumoGastos` (poucos ms num app de uso mensal, mesmo princípio de não otimizar latência sem sinal real de que incomoda); `/gastos` redirect não preserva chave de querystring duplicada (`?mes=1&mes=2`) -- nenhum link do próprio app jamais gera isso, zero alcance real neste app fechado de 2 usuários
  - (achado 6, cartão terceiro sem distinção visual de titular_pendente): já registrado em deferred-work.md na rodada 1, mesma causa raiz -- não duplicado aqui

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros de tipo
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build limpo, `/gastos` continua existindo como rota (redirect) no output

**Manual checks (if no CLI):**
- Script descartável (somente leitura) contra o Supabase de produção real confirmando `titularUsuarioId` correto em `listarLancamentosParaCorrecao` para pelo menos 1 lançamento de cada pessoa real do casal

## Auto Run Result

**Resumo:** `/lancamentos` e `/gastos` unificadas numa única visão em `/lancamentos` — resumo por pessoa (Individual/Combinada) + filtro por pessoa + lista de lançamentos com badge de titular + bloco "Pendente de revisão" (só titular desconhecido, para não duplicar itens já corrigíveis na lista principal). `/gastos` passa a ser um `permanentRedirect` preservando querystring.

**Arquivos alterados:**
- `lib/pessoa.ts` (novo) — `primeiroNome(email)`, helper de nome de exibição
- `server/categorizacao/corrigir-categoria.ts` — `listarLancamentosParaCorrecao` ganha join com `cartao` e `titularUsuarioId`
- `server/visualizacao/resumo-gastos.ts` — `ItemPendente.usuarioId`; `obterResumoGastos` ganha parâmetro opcional `contasPreCarregadas`
- `app/(app)/lancamentos/page.tsx` — reescrita: filtro de pessoa, resumo por pessoa (migrado de `/gastos`), pendentes narrowed a `titular_pendente`, hidden `visao` quando pessoa selecionada
- `app/(app)/lancamentos/_components/lancamento-item.tsx` — `titular-badge`
- `app/(app)/gastos/page.tsx` — vira `permanentRedirect` para `/lancamentos`
- `app/(app)/_components/nav.tsx` — remove item "Gastos" (7→6 links)
- `app/(app)/page.tsx`, `app/(app)/upload/page.tsx` — links atualizados para `/lancamentos`
- `app/globals.css` — `.titular-badge` (reaproveita tokens existentes, nenhum novo em DESIGN.md)
- `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/EXPERIENCE.md` — seção de desenho da unificação
- `bmad-output/planning-artifacts/epics.md` — 2 ACs retroativos na Story 4.1 (avaliação PM+tech-lead) + correção da linha stale "sem UX spec"

**Review findings:** pass 1 (Blind Hunter + Edge Case Hunter, paralelo): 1 bad_spec alto (duplicação de lançamentos pendentes na tela — corrigido narrowing o bloco), 3 patches (2 médio/alto: round-trip de `visao` perdido, chamada dupla a `listarContasCasal()`; 1 baixo: comentário stale), 2 defers (cartão terceiro sem filtro em `/lancamentos`, pré-existente; empty-state combinado não distingue motivo, pré-existente), 3 rejects (colisão de `primeiroNome`, querystring sem whitelist no redirect, sem loading state — todos sem alcance real ou já aceitos por precedente do projeto). Pass 2 (Blind Hunter, diff final): confirmou os 5 fixes corretos, achou 2 patches baixos adicionais (doc da spec dessincronizada, falta de aviso visual no bloco pendentes) — ambos corrigidos — e 3 rejects (duplicação de query não consolidada, waterfall de poucos ms, chave de querystring duplicada — todos de baixíssimo/zero impacto real neste app de 2 usuários).

**Verificação:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos após cada rodada. Testado ponta a ponta contra o Supabase de produção real (script descartável, somente leitura, removido após uso) confirmando `titularUsuarioId` correto para lançamentos reais das duas contas. Middleware de autenticação confirmado ainda protegendo `/gastos` (curl sem sessão → 307 para `/login?next=%2Fgastos`, comportamento herdado inalterado).

**Risco residual:** 3 itens de baixo/médio risco deferidos em `deferred-work.md` (cartão terceiro sem filtro/distinção visual em `/lancamentos`, empty-state combinado não distingue motivo — ambos pré-existentes, não introduzidos por esta mudança).

**Nota de processo:** o revert padrão via `git checkout` (protocolo bad_spec) foi bloqueado pelo classificador de segurança da sessão; a correção foi aplicada via edições diretas e cirúrgicas no código já 95% correto, com o mesmo resultado de coerência que o revert+re-derivação buscaria, registrado no Spec Change Log.
