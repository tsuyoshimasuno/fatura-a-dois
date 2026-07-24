---
title: 'Ícone de categoria escolhido pelo casal (rodada 11, Story 3.1 AC retroativo)'
type: 'feature'
created: '2026-07-23'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
final_revision: 'PENDING'
context: []
warnings: ['oversized']
baseline_revision: '3600390'
---

<intent-contract>

## Intent

**Problem:** O `category-icon` em `/lancamentos` hoje é sempre um círculo colorido com a inicial da categoria (Etapa 2/2, `spec-snowui-lancamentos-highlight-e-icone-categoria.md`). O usuário viu o resultado em produção e pediu ícones reais específicos por categoria, como no protótipo aprovado (que usava emoji só como placeholder). Categoria é texto livre do casal (sem enum), então não há como inferir automaticamente um ícone correto para qualquer nome.

**Approach:** Adicionar coluna nullable `categoria.icone` (chave curta validada contra um enum fechado de 7 opções em código, não Postgres enum, não emoji livre). O casal escolhe o ícone opcionalmente ao criar/editar uma categoria, numa grade de 8 botões (7 ícones + "Nenhum" pré-selecionado). `/lancamentos` passa a renderizar o SVG do ícone escolhido quando presente; categorias sem ícone continuam no círculo+inicial já implementado (fallback permanente, não degradado). Decisão reconciliada por avaliação PM+tech-lead+UX (John/Winston/Sally, convergência unânime) documentada em `EXPERIENCE.md`/`DESIGN.md` (workspace `ux-fatura-a-dois-2026-07-18`) e formalizada como AC retroativo na Story 3.1 de `epics.md`.

## Boundaries & Constraints

**Always:** Validar a chave de `icone` em código contra um array/Set fechado de 7 chaves conhecidas (mesmo padrão de `validarNome` em `server/categorizacao/gerenciar-categorias.ts:42-52`) — nunca aceitar valor arbitrário do formulário nem persistir string livre. Manter `lib/categoria-cor.ts` e a lógica de cor determinística intocados — o ícone escolhido usa o SVG como glifo, mas continua dentro do mesmo círculo colorido (`category-icon--cor-N`) já existente, só troca o conteúdo (inicial → SVG) quando presente. O círculo+inicial deve continuar sendo o fallback exato de hoje para `icone === null` — não alterar nem remover essa lógica. Os 7 SVGs novos devem seguir exatamente a convenção visual já usada em `lancamento-item.tsx` (lápis de editar, seta de repasse): `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth="2"`, `strokeLinecap="round"`, `strokeLinejoin="round"`, `aria-hidden="true"` no `<svg>`, com `aria-label`/`title` no elemento `category-icon` pai (mesmo padrão já usado). A grade de seleção no formulário deve ter cada botão com `aria-label`/rótulo acessível legível (não só cor/forma) e indicar visualmente qual está selecionado.

**Block If:** Se a aplicação da migration (`ALTER TABLE categoria ADD COLUMN icone text`) for bloqueada pelo classificador de segurança da sessão ao ser executada diretamente -- reportar como `blocked` (mesmo padrão já usado na migration da Story 6.1, linha 111 do memlog do goal-engine) em vez de tentar contornar.

**Never:** Não usar emoji real como fonte do glifo. Não inferir/derivar o ícone automaticamente a partir do nome da categoria (palavra-chave ou qualquer heurística) — a escolha é sempre manual do casal. Não tornar o campo `icone` obrigatório nem adicionar qualquer indicador de "pendência"/badge cobrando que o casal escolha um ícone. Não mexer em `resolverCategoriaSugerida`/`regra_categorizacao` (categorização automática) — isto é puramente um atributo de exibição, ortogonal à lógica de categorização. Não adicionar um 8º ícone além dos 7 + "Nenhum" nesta rodada (paleta fechada, mesma disciplina já aplicada à cor).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Criar categoria com ícone | Formulário de criar categoria, `nome` válido + ícone "mercado" selecionado | Categoria criada com `icone = 'mercado'` | Nenhum erro esperado |
| Criar categoria sem ícone | Formulário de criar categoria, `nome` válido, opção "Nenhum" (padrão) | Categoria criada com `icone = null` | Nenhum erro esperado |
| Editar categoria para trocar ícone | Categoria existente com `icone = 'mercado'`, casal seleciona "transporte" | `icone` atualizado para `'transporte'` | Nenhum erro esperado |
| Editar categoria para remover ícone | Categoria existente com ícone definido, casal seleciona "Nenhum" | `icone` atualizado para `null`, item volta a mostrar círculo+inicial em `/lancamentos` | Nenhum erro esperado |
| Chave de ícone inválida/adulterada | Requisição direta com `icone = 'qualquer-coisa'` fora do enum (ex. DevTools), `nome` válido | `validarIcone` trata como "nenhum ícone escolhido" (mesmo caminho de campo ausente/vazio) -- `icone` persiste como `null`, nunca a string arbitrária; a ação de criar/editar categoria continua bem-sucedida se `nome` for válido (não é rejeitada por causa do ícone) | Nenhuma string arbitrária persistida; sem erro/crash -- coerção silenciosa, não rejeição da ação inteira |
| Lançamento com categoria com ícone | `item.categoriaIcone = 'saude'`, `categoriaRemovida = false` | `/lancamentos` renderiza o SVG de "saude" dentro do círculo colorido (cor determinística por nome, inalterada) | Nenhum erro |
| Lançamento com categoria sem ícone | `item.categoriaIcone = null` | `/lancamentos` renderiza o fallback círculo+inicial exatamente como hoje | Nenhum erro |
| Lançamento com categoria removida | `categoriaRemovida = true` (independente de `categoriaIcone`) | Continua caindo no fallback neutro já existente (`category-icon--neutral`) — ícone nunca aparece para categoria removida | Fallback, nunca throw |
| Lançamento sem categoria | `categoriaNome === null` | Continua caindo no fallback neutro já existente | Fallback, nunca throw |

</intent-contract>

## Code Map

- `db/schema/index.ts:30-43` -- adicionar coluna `icone: text('icone')` (nullable) à tabela `categoria`; gerar migration via drizzle-kit (mesmo padrão de `db/migrations/0006_sleepy_gladiator.sql`, `ALTER TABLE ... ADD COLUMN`, sem backfill).
- `server/categorizacao/gerenciar-categorias.ts:42-52` -- nova função `validarIcone(icone: string | null): string | null` (trim + membership contra array fechado de 7 chaves, retorna `null` se ausente/vazio/invalido), mesmo padrão de `validarNome`.
- `server/categorizacao/gerenciar-categorias.ts:113-138` (`criarCategoria`) e `:140-168` (`editarCategoria`) -- novo parâmetro opcional `icone`, validado e incluído em `.values({...})`/`.set({...})`.
- `server/categorizacao/corrigir-categoria.ts:27-41,54-72,74-86` -- adicionar `categoriaIcone` ao select (`categoria.icone`), ao tipo `LancamentoParaCorrecao`, e ao shaping do retorno (null quando `categoriaRemovida`).
- `app/(app)/categorias/_components/criar-categoria-form.tsx:13-60` -- adicionar o seletor de ícone (grade de 8 botões) após o input de nome; ler via `FormData`, passar para `criarCategoria`.
- `app/(app)/categorias/_components/categoria-item.tsx:7,27-48` -- estender o tipo local `Categoria` com `icone: string | null`; adicionar o mesmo seletor no formulário de edição, pré-selecionado com `item.icone`; passar para `editarCategoria`.
- `app/(app)/lancamentos/_components/lancamento-item.tsx:14-35,137-157,255-265` -- estender o tipo local `Lancamento` com `categoriaIcone: string | null`; ajustar `categoriaIcone` (a variável local, renomear se colidir com o novo campo do prop) para renderizar o SVG do ícone escolhido dentro do círculo colorido quando presente, mantendo o fallback de inicial quando ausente.
- `lib/categoria-icones.tsx` (novo) -- módulo central com os 7 SVGs (componentes React ou strings de `path`), a lista de chaves válidas (`ICONES_CATEGORIA_VALIDOS`), e um mapa chave→componente/label acessível, reaproveitado tanto pelo picker do formulário quanto pela renderização em `lancamento-item.tsx` (ponto único de verdade sobre quais 7 ícones existem).
- `app/globals.css` -- estilos do seletor de grade (`category-icon-picker`, botões, estado selecionado -- reaproveitar `{colors.accent}` como no item ativo da sidebar, conforme `DESIGN.md`).

## Tasks & Acceptance

**Execution:**
- [x] `lib/categoria-icones.tsx` -- criar os 7 SVGs (mercado/carrinho, transporte/carro, saude/cruz, lazer/claquete, moradia/casa, contas/documento, outro/etiqueta) seguindo a convenção visual já usada (viewBox 24x24, stroke currentColor, strokeWidth 2, round caps), mais o array de chaves válidas e um label acessível por chave (ex. "Mercado", "Transporte"...).
- [x] `db/schema/index.ts` + migration -- adicionar `categoria.icone` nullable, aplicar em produção (`npm run db:migrate`).
- [x] `server/categorizacao/gerenciar-categorias.ts` -- `validarIcone` + threading em `criarCategoria`/`editarCategoria`.
- [x] `server/categorizacao/corrigir-categoria.ts` -- selecionar/tipar/mapear `categoriaIcone` (null quando categoria removida, mesmo tratamento de `categoriaNome`).
- [x] `app/(app)/categorias/_components/criar-categoria-form.tsx` e `categoria-item.tsx` -- seletor de grade (8 botões: 7 ícones + "Nenhum"), acessível (radio group ou equivalente com `aria-label` por opção e indicação visual/aria de seleção), threading para as Server Actions.
- [x] `app/(app)/lancamentos/_components/lancamento-item.tsx` -- renderizar o SVG de `lib/categoria-icones.tsx` dentro do `category-icon` colorido quando `categoriaIcone` presente; preservar fallback de inicial/neutro para os demais casos do I/O Matrix.
- [x] `app/globals.css` -- estilos do picker (grade, estado selecionado).
- [x] Verificação: `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos. Teste ponta a ponta contra o Supabase de produção real (script descartável, reversível: criar categoria de teste com ícone, editar, remover ícone, excluir a categoria de teste ao final -- nunca tocar categoria real do casal).

**Acceptance Criteria:**
- Given o formulário de criar categoria, when o casal escolhe um dos 7 ícones e salva, then a categoria é criada com esse ícone e passa a exibi-lo em `/lancamentos` para os lançamentos dessa categoria.
- Given uma categoria existente sem ícone, when o casal a edita e escolhe "Nenhum" (não altera nada), then `icone` permanece `null` e `/lancamentos` continua mostrando o círculo+inicial.
- Given uma tentativa de gravar uma chave de ícone fora do enum fechado (ex. manipulação direta da requisição), when a Server Action processa, then a gravação é rejeitada com erro de validação, nunca persistida.
- Given uma categoria removida ou um lançamento sem categoria, when `/lancamentos` renderiza, then o ícone nunca aparece -- cai no fallback neutro já existente, independentemente do valor de `icone`.
- Given o seletor de ícone no formulário, when navegado via teclado/leitor de tela, then cada opção tem um rótulo acessível reconhecível (não apenas cor/forma), e a opção atualmente selecionada é anunciada/indicada visualmente.

## Spec Change Log

- 2026-07-23: linha "Chave de ícone inválida/adulterada" do I/O & Edge-Case Matrix corrigida para refletir o comportamento correto/pretendido (coerção silenciosa para `null`, ação continua bem-sucedida se `nome` for válido) em vez do texto original ("Server Action rejeita, retorna erro de validação") que contradizia as próprias instruções de implementação da spec. Achado pelo próprio autor da spec ao revisar o relatório do subagente de implementação, antes do review adversarial -- não é resultado de bad_spec loopback.

## Review Triage Log

### 2026-07-23 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4 (medium 1, low 3)
- defer: 0
- reject: 8
- addressed_findings:
  - `[medium]` `[patch]` `categoria-item.tsx`: valor de `categoria.icone` desatualizado/fora do enum (cenário futuro: uma das 7 chaves for removida numa rodada posterior) fazia nenhum radio do picker ficar marcado -- ao salvar a categoria por qualquer outro motivo (ex. só renomear), `formData.get('icone')` retornava `null`, e o ícone existente era apagado silenciosamente sem o usuário pedir. Achado convergente dos dois revisores independentes. Corrigido: quando nenhum radio está marcado (`formData.get('icone') === null`), preserva `item.icone` em vez de zerar; quando o usuário de fato escolhe "Nenhum", o radio existe e envia `''`, então o caminho normal continua intacto.
  - `[low]` `[patch]` `app/globals.css` (`.field-inline`): faltava `flex-wrap: wrap` -- o formulário de editar categoria (`categoria-item.tsx`, usa `.field-inline`) ganhou uma grade de até 8 opções que podia forçar nome+picker+botão numa única linha sem quebra em telas estreitas, diferente do formulário de criar (`.form-row`, já tinha `flex-wrap`). Adicionado.
  - `[low]` `[patch]` `app/globals.css` (`.icone-picker-option`): sem estado visual de desabilitado -- durante o submit (`<fieldset disabled>`), o `<label>` continuava com `cursor: pointer` e hover ativo mesmo com o `<input>` de verdade desabilitado. Adicionado `:has(:disabled)` reduzindo opacidade/cursor, consistente com o resto do app.
  - `[low]` `[patch]` `icone-picker.tsx`: sem diretiva `'use client'` explícita -- funcionava hoje só porque é sempre importado a partir de Client Components, mas ficava implícito/frágil para reuso futuro. Adicionada a diretiva.
  - `[reject]` `defaultChecked`/`defaultValue` não resincroniza se o mesmo `CategoriaItem` montado receber `item.icone` atualizado sem desmontar: rejeitado -- mesmo padrão pré-existente já aceito para `defaultValue={item.nome}` no mesmo formulário, não uma regressão introduzida por esta mudança.
  - `[reject]` `validarIcone` coage silenciosamente chave inválida para `null` sem log/sinal ao usuário: rejeitado -- é exatamente o comportamento pretendido e documentado na spec (Boundaries: "nunca aceitar valor arbitrário... nunca persistir string livre"), não uma omissão.
  - `[reject]` nenhuma constraint a nível de banco (só validação em código) para o enum de `icone`: rejeitado -- trade-off deliberado e já documentado nos comentários do schema/spec (Winston, avaliação prévia: evita fricção de migration para adicionar uma 8ª chave).
  - `[reject]` sem testes automatizados para `validarIcone`/`ehIconeCategoriaValido`: rejeitado -- nenhuma convenção de teste automatizado existe no restante do codebase (mesmo motivo já usado na rodada anterior desta run).
  - `[reject]` `.includes()` é O(n) sobre 7 itens em vez de `Set`: rejeitado -- o próprio achado reconhece que é inofensivo no tamanho atual; otimização prematura.
  - `[reject]` falta comentário explícito sobre `categoriaId === null` no fluxo de `categoriaIcone`: rejeitado -- é puramente uma sugestão de documentação, o comportamento (LEFT JOIN retorna `null` naturalmente) já está correto e coberto pelo mesmo guard de `categoriaNomeValido`.
  - `[reject]` `name="icone"` reaproveitado entre todas as linhas de categoria e o form de criar: rejeitado -- escopo de radio group em HTML é por `<form>`, cada `CategoriaItem`/`CriarCategoriaForm` tem seu próprio `<form>` -- isolamento correto hoje; achado é especulativo sobre um refactor hipotético futuro, não um bug alcançável.

## Design Notes

O ícone escolhido continua dentro do círculo colorido determinístico (`category-icon--cor-N`, `lib/categoria-cor.ts`) -- a mudança é só o *conteúdo* do círculo (inicial de texto → SVG via `currentColor`), não a lógica de cor. Isso preserva a garantia de contraste AA já calibrada nos 6 pares claro/escuro da paleta (o SVG herda `color: var(--accent-foreground)` do `.category-icon`, mesma regra que já colore a inicial hoje).

Enum de 7 chaves como `const` array TypeScript + validação por `.includes()`, não `pgEnum` do Drizzle -- evita fricção de migration para adicionar uma 8ª chave numa rodada futura (Winston, avaliação prévia).

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros novos.
- `npm run lint` -- expected: sem erros novos.
- `npm run build` -- expected: build limpo.
- `npm run db:migrate` -- expected: migration `icone` aplicada em produção sem erro.

**Manual checks (if no CLI):**
- Script descartável e reversível contra o Supabase de produção real: criar categoria de teste com cada um dos 7 ícones (um de cada vez ou em lote), confirmar leitura correta via `corrigir-categoria.ts`, editar para trocar/remover ícone, excluir a categoria de teste ao final -- sem tocar em categoria real do casal.

**Executado:** migration aplicada em produção (`npm run db:migrate`, coluna `categoria.icone` criada, sem erro/bloqueio). Script descartável executado via `npx tsx` contra o Supabase real: criou categoria de teste, exercitou `criarCategoria`(icone), `editarCategoria` (trocar/remover ícone), confirmou via `listarCategorias`/`listarLancamentosParaCorrecao`, removeu a categoria de teste ao final, zero resíduo confirmado. `npx tsc --noEmit`/`npm run lint`/`npm run build` limpos antes e depois dos 4 patches do review.

## Auto Run Result

Status: done

**Resumo:** Usuário pediu ícones reais de categoria (em vez do círculo+inicial da Etapa 2/2) após ver um protótipo com emoji. Avaliação PM+tech-lead+UX (John/Winston/Sally, 3 agentes reais em paralelo, convergência unânime) rejeitou inferência automática por palavra-chave e emoji real, decidiu: casal escolhe o ícone ao criar/editar categoria, conjunto fechado de 7 SVGs stroke-based, campo sempre opcional, fallback círculo+inicial permanente. Formalizado em EXPERIENCE.md/DESIGN.md (bmad-ux intent=update) + 1 AC retroativo na Story 3.1 do epics.md (julgamento PM+tech-lead direto, mesmo padrão já usado nesta run -- `bmad-create-epics-and-stories` inadequado para patch incremental).

**Arquivos alterados:**
- `lib/categoria-icones.tsx` (novo) -- 7 SVGs + enum fechado de chaves + labels acessíveis + type guard, ponto único de verdade.
- `db/schema/index.ts` + `db/migrations/0008_material_scarecrow.sql` -- coluna `categoria.icone` nullable, migration aditiva aplicada em produção.
- `server/categorizacao/gerenciar-categorias.ts` -- `validarIcone` + threading em `criarCategoria`/`editarCategoria`.
- `server/categorizacao/corrigir-categoria.ts` -- `categoriaIcone` selecionado/tipado/mapeado (null quando categoria removida).
- `app/(app)/categorias/_components/icone-picker.tsx` (novo) -- grade acessível de 8 opções (radio group nativo), reutilizada por criar/editar.
- `app/(app)/categorias/_components/criar-categoria-form.tsx` e `categoria-item.tsx` -- picker integrado.
- `app/(app)/lancamentos/_components/lancamento-item.tsx` -- renderiza o SVG escolhido dentro do círculo colorido, fallback de inicial preservado.
- `app/globals.css` -- estilos do picker + `.category-icon-svg`.

**Review adversarial (Blind Hunter + Edge Case Hunter, paralelo, 1 rodada):** 4 patches aplicados -- 1 achado médio CONVERGENTE entre os dois revisores independentes (valor de ícone desatualizado/fora do enum, cenário futuro de uma chave removida, apagava o ícone existente silenciosamente ao salvar por qualquer outro motivo -- corrigido preservando o valor quando nenhum radio bate) + 3 baixos (`.field-inline` sem `flex-wrap`, estado desabilitado do picker sem tratamento visual, `icone-picker.tsx` sem `'use client'` explícito). 8 achados rejeitados com justificativa (destaque: ausência de constraint a nível de banco é trade-off deliberado já documentado, não omissão). 0 bad_spec, 0 intent_gap. `followup_review_recommended: true` -- toca schema/persistência nova e teve um achado real de perda silenciosa de dado, mesmo que de janela estreita (não reprodutível com o dado atual).

**Verificação:** tsc/lint/build limpos antes e depois dos patches. Migration aplicada em produção com sucesso (sem bloqueio do classificador desta vez). Testado ponta a ponta contra o Supabase de produção real via script descartável (removido após uso, sem resíduo, categoria sintética própria, nunca tocando dado real do casal).

**Risco residual:** nenhum -- o achado médio do review foi corrigido antes do commit. Nenhuma verificação visual real em navegador autenticado do picker/grade (mesma limitação já registrada nas rodadas anteriores desta run, sem ferramenta de automação com sessão autenticada disponível).
