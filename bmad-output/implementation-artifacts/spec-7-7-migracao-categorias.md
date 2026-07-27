---
title: 'Story 7.7 — Migração de componentes: Categorias'
type: 'refactor'
created: '2026-07-26'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '176dc42'
---

<intent-contract>

## Intent

**Problem:** `/categorias` e `/categorias/[id]/remover` ainda usam CSS artesanal (`.card`, `<button>`/`<input>` crus, `.alert-error`/`.hint`, `.btn.btn-secondary`) em vez de `Card`/`Button`/`Input`/`Label`/`Alert`. O input de nome da categoria (`categoria-item.tsx`) é um achado de acessibilidade já registrado em `deferred-work.md` (Story 7.1) explicitamente candidato a esta story.

**Approach:** Migrar `categoria-item.tsx` (`<li className="card">` → `<li><Card>`, input nome → `Input`+`Label`, botão → `Button`, mensagem → `Alert`/`hint`), `criar-categoria-form.tsx` (mesmo padrão, sem `Card` -- é um form solto no topo da página, não um item de lista), `remover-categoria-form.tsx` (native `<select>` estilizado com as mesmas classes visuais do `Input` -- decisão já reconciliada na rodada 13 de nunca virar Radix Select; `Label`, `Input` para o campo de texto, `Button` para Confirmar/Cancelar). `icone-picker.tsx` **não muda** -- widget customizado com sua própria acessibilidade já revisada (fieldset/legend/radio nativos), sem equivalente shadcn, fora do escopo desta migração de componentes genéricos.

## Boundaries & Constraints

**Always:** Preservar toda a lógica existente (Server Actions `criarCategoria`/`editarCategoria`/`removerCategoria`, guard de disparo duplo via `useRef` síncrono, fallback de ícone obsoleto em `categoria-item.tsx`, `router.refresh()`/`router.push()`, `aria-disabled` no link Cancelar durante loading). Resolver o achado deferido da Story 7.1 (`deferred-work.md`): input de nome sem label acessível -- vira `Label`+`Input` real. `<select>` nativo permanece `<select>` (nunca Radix Select, decisão já reconciliada), só ganha classes Tailwind equivalentes ao `Input` para paridade visual. Sucesso = texto simples (`hint`), erro = `Alert` destructive (mesmo padrão fixado na Story 7.6). Rodar suite de QA e revisar visualmente antes de aceitar.

**Block If:** Nenhuma decisão de produto/UX pendente.

**Never:** Não tocar em `icone-picker.tsx` (widget customizado, fora de escopo). Não introduzir Radix Select. Não tocar em `/lancamentos`, `/` (Início) ou `/upload` (stories futuras).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Criar categoria com sucesso | nome+ícone válidos | form reseta, lista atualiza via refresh | N/A |
| Editar categoria -- ícone obsoleto preservado | `formData.get('icone') === null` | valor atual de `item.icone` preservado (fallback já existente) | N/A |
| Remover categoria sem substituta | nenhuma opção selecionada | categoria marcada como removida, lançamentos ficam sem categoria | N/A |
| Remover categoria com nova substituta | campo texto preenchido | tem prioridade sobre o `<select>` (lógica já existente) | N/A |
| Ação em voo -- Cancelar clicado | `loading === true` | navegação para `/categorias` bloqueada (`aria-disabled` + `preventDefault`) | N/A |

</intent-contract>

## Code Map

- `app/(app)/categorias/_components/categoria-item.tsx` -- `<li className="card">` → `<li><Card>`, `Label`+`Input` para nome, `Button` para Salvar, `Alert`/`hint` para resultado
- `app/(app)/categorias/_components/criar-categoria-form.tsx` -- `Label`+`Input` para nome, `Button` para Criar, `Alert` para erro
- `app/(app)/categorias/_components/remover-categoria-form.tsx` -- `Label` para os 2 campos, `<select>` nativo estilizado (classes do `Input`), `Input` para novaCategoria, `Button` (default) para Confirmar, `Button variant="secondary" asChild` para Cancelar, `Alert` para erro
- `app/(app)/categorias/[id]/remover/page.tsx` -- sem mudança de lógica; hints de contagem continuam `<p className="hint">` (fora de escopo, não são `.card`)
- `app/(app)/categorias/_components/icone-picker.tsx` -- **sem mudança**

## Tasks & Acceptance

**Execution:**
- [x] `app/(app)/categorias/_components/categoria-item.tsx` -- migrar para Card/Label/Input/Button/Alert, preservando o fallback de ícone obsoleto e o link "Remover" (`.link`, fora de escopo)
- [x] `app/(app)/categorias/_components/criar-categoria-form.tsx` -- migrar para Label/Input/Button/Alert
- [x] `app/(app)/categorias/_components/remover-categoria-form.tsx` -- migrar para Label/Input/Button, `<select>` nativo com classes visuais equivalentes ao `Input` (mesma altura/borda/radius/foco), Cancelar como `Button variant="secondary" asChild`
- [x] Rodar `npm run test:e2e`, revisar diff visual de `/categorias` antes de aceitar -- concluído pelo orquestrador, 68/68 verde em 2 execuções consecutivas. Confirmado empiricamente removendo o filtro `label`/`name="nome"` de `e2e/structural/app.spec.ts` e rodando o teste estrutural de `/categorias` sozinho -- passou sem o filtro, prova real (não só leitura de código) de que a violação axe-core foi corrigida.

**Acceptance Criteria:**
- Given o input de nome da categoria, when um leitor de tela o anuncia, then ele tem um label acessível real (resolve o achado deferido da Story 7.1).
- Given o formulário de remover categoria, when renderizado, then o `<select>` continua sendo um elemento `<select>` nativo (não Radix), com aparência visual equivalente ao `Input`.
- Given a suite de QA, when rodada após a migração, then os testes estruturais/contraste passam (idealmente sem a violação axe-core `label` já documentada em deferred-work.md) e o diff visual de `/categorias` é revisado antes de aceitar.

## Spec Change Log

## Review Triage Log

### 2026-07-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 1, medium 2, low 1)
- defer: 0
- reject: 5: (low 5)
- addressed_findings:
  - `[high]` `[patch]` Ao corrigir os 2 casos de input sem label em `/categorias`, o filtro compartilhado `{ ruleId: 'label', htmlIncludes: 'name="nome"' }` em `e2e/structural/app.spec.ts` foi removido por parecer resolvido -- mas o mesmo filtro (que casa por substring de HTML, não por arquivo) também cobria um TERCEIRO caso idêntico e não documentado em `lancamento-item.tsx` (`/lancamentos`, form inline "+ Nova categoria"), que continua sem label. Removê-lo reabriria um blind spot silencioso (achado real do Blind Hunter, confirmado por leitura direta do código). Corrigido restaurando um filtro mais específico (`name="nome" placeholder="Nome da categoria"`, string única deste terceiro caso) em vez de remover, e documentando esse gap pela primeira vez em `deferred-work.md` (antes viajava destravado dentro do filtro genérico, sem registro próprio).
  - `[medium]` `[patch]` `selectClassName` (paridade visual do `<select>` nativo com o `Input`) tinha excluído por engano `aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40` -- esses SIM se aplicam a um `<select>` (só `file:*`/`selection:*` não se aplicam). Corrigido incluindo os modificadores `aria-invalid:*` na constante.
  - `[medium]` `[patch]` Label sr-only do input de renomear categoria era idêntico e genérico ("Nome da categoria") em toda a lista -- um usuário de leitor de tela navegando por N categorias não conseguia diferenciar os campos pelo nome acessível sozinho. Corrigido incluindo `item.nome` no texto do label (`Nome da categoria: {item.nome}`), tornando cada campo da lista identificável.
  - `[low]` `[patch]` Link "Cancelar" (`Button variant="secondary" asChild` envolvendo `<a aria-disabled={loading}>`) não tinha nenhuma affordance visual durante `loading` -- as classes `disabled:*` do `buttonVariants` só disparam no pseudo-seletor `:disabled` nativo, que não existe em `<a>`. Bug pré-existente (mesmo problema já existia no `.btn-secondary` legado, `button:disabled` também não cobria `<a>`), mas como esta story já tocou exatamente este elemento e há um fix barato e já precedented (`aria-invalid:*` já usado no mesmo arquivo), corrigido adicionando `aria-disabled:pointer-events-none aria-disabled:opacity-50` à base compartilhada de `buttonVariants` em `components/ui/button.tsx` -- beneficia qualquer uso futuro de `asChild`+`aria-disabled` em um link, não só este.
  - `[reject]` `Card` de `categoria-item.tsx` agrupa visualmente o form de renomear e o link "Remover" (ação de navegação não relacionada) sem `CardFooter`/divisor -- verificado que o `<li className="card">` ORIGINAL também não tinha nenhum divisor entre o form e o link (mesmo empilhamento vertical plano); usar `CardFooter` aqui seria uma melhoria nova não pedida, não uma correção de regressão -- paridade visual exata com o original já é o objetivo desta migração.
  - `[reject]` Texto do `Label` de "novaCategoria" em `remover-categoria-form.tsx` é uma frase longa que vira o nome acessível inteiro do campo -- já era o texto visível do `<label className="field">` original; migração de estrutura não é o momento de redesenhar copy/hierarquia de informação sem pedido explícito.
  - `[reject]` Framing da spec cita `cartao-pendente-item.tsx` (Story 7.6) como precedente para a técnica de `Label` sr-only + `Input`, mas aquele arquivo nunca usou `Label`/`sr-only` -- crítica válida sobre a redação da spec (o padrão `<li><Card>` É reusado, a técnica de label é nova), não um bug de código; nenhuma ação de código necessária.
  - `[reject]` Nenhuma asserção dedicada, isolada, confirma que `/categorias` está livre da violação `label` -- na prática, já verificado de forma mais forte que uma asserção isolada teria dado: o filtro foi removido e o teste estrutural completo de `/categorias` (que roda axe-core real contra a página renderizada) passou sem ele, prova empírica direta.
  - `[reject]` `style={{...}}` inline ainda presente nos 3 arquivos -- mesmo padrão já estabelecido e aceito nas Stories 7.4-7.6, não é inconsistência nova.

## Design Notes

`<select>` nativo estilizado: reusar as mesmas classes visuais do `components/ui/input.tsx` (`h-9 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs ...`) diretamente no elemento `<select>`, sem criar um componente `Select` novo (decisão Sally, rodada 13 -- select nativo preserva o picker do SO em mobile, Radix Select perderia isso). "Cancelar" usa `Button variant="secondary" asChild` (variant já existe em `button.tsx`, mesmo padrão de `asChild` já usado para heading real em `CardTitle`).

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção limpo
- `npm run test:e2e` -- expected: suite verde; diff visual de `/categorias` revisado antes de aceitar

## Auto Run Result

**Resumo:** `/categorias` (3 componentes) migrada para shadcn/ui (Card, Label, Input, Button, Alert). Resolveu de fato o achado de acessibilidade deferido da Story 7.1 (input de renomear categoria sem label) -- confirmado empiricamente, não só por leitura de código. Review adversarial encontrou e corrigiu 1 achado real de severidade alta (remoção do filtro de gap conhecido reabriria um blind spot para um terceiro caso idêntico, não documentado, em `/lancamentos`) e 2 de severidade média (classes `aria-invalid` faltando no `<select>` estilizado; label sr-only genérico demais para uma lista).

**Arquivos alterados:**
- `app/(app)/categorias/_components/categoria-item.tsx` -- `<li><Card><CardContent>`, `Label`(sr-only, com `item.nome`)+`Input`, `Button`, sucesso=`hint`/erro=`Alert`.
- `app/(app)/categorias/_components/criar-categoria-form.tsx` -- mesmo padrão, sem `Card`.
- `app/(app)/categorias/_components/remover-categoria-form.tsx` -- `<select>` nativo estilizado (paridade visual com `Input`, incluindo `aria-invalid:*`), `Label`/`Input`, `Button` (Confirmar) + `Button variant="secondary" asChild` (Cancelar).
- `components/ui/button.tsx` -- `aria-disabled:pointer-events-none aria-disabled:opacity-50` adicionados à base compartilhada (fix genérico para qualquer `asChild`+`aria-disabled` futuro, não só este call site).
- `e2e/structural/app.spec.ts` -- filtro `label`/`name="nome"` restaurado com string mais específica (não removido), cobrindo o gap remanescente em `/lancamentos`.
- `bmad-output/implementation-artifacts/deferred-work.md` -- 1 entrada nova (gap de `lancamento-item.tsx` documentado individualmente pela primeira vez).

**Achados do review (Blind Hunter, 1a rodada; Edge Case Hunter, 2a rodada de confirmação após os patches):** Blind Hunter -- 9 achados, 4 corrigidos (1 high, 2 medium, 1 low), 0 deferidos, 5 rejeitados com justificativa (ver Review Triage Log acima). Edge Case Hunter, dispatchado numa 2a passada já contra o estado corrigido (double-submit guard, fallback de ícone obsoleto, prioridade novaCategoria/substitutaId, guard de loading no Cancelar, split sucesso/erro, efeito colateral da mudança compartilhada em `button.tsx`, string do filtro restaurado) -- 0 achados novos, confirma que os patches do Blind Hunter fecharam os gaps reais sem introduzir regressão.

**Verificação realizada:**
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos antes e depois dos patches de review.
- Gap de `lancamento-item.tsx` confirmado por leitura direta do arquivo (linha exata do input sem label), não apenas aceito por afirmação do revisor.
- Fix do filtro `label` verificado de forma empírica mais forte que uma simples leitura de código: removido o filtro inteiro, rodado o teste estrutural de `/categorias` sozinho (passou, prova real da correção), depois restaurado com string mais específica.
- Suite de QA (`npm run test:e2e`) rodada 4x ao longo da story -- 68/68 verde nas últimas 2 execuções consecutivas.

**Riscos residuais:** gap de `lancamento-item.tsx` (mesmo padrão de input sem label) permanece aberto, agora corretamente documentado e filtrado, candidato à Story 7.10.
