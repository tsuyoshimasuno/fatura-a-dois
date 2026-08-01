---
title: 'Débitos técnicos do bugfix anterior: verificação Safari + componente Select nativo compartilhado'
type: 'refactor'
created: '2026-08-01'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '39c1eab6bdaa8d90f9cb7c13ace8bc5657751cfc'
final_revision: 'd00c8c1158c2ab12c1c9922f57b6df8d4ff70da1'
---

<intent-contract>

## Intent

**Problem:** O bugfix anterior (spec-fix-select-upload-sidebar-bullet.md, commits ed06bd4/39c1eab) deixou 2 débitos técnicos registrados em `deferred-work.md`: (1) suporte cross-browser do `::file-selector-button` (usado para estilizar o botão "Escolher arquivo") nunca verificado além do Chromium; (2) 4 arquivos (`app/(app)/upload/page.tsx`, `app/(app)/categorias/_components/remover-categoria-form.tsx`, `app/(app)/lancamentos/_components/lancamento-item.tsx`, `app/(app)/lancamentos/_components/lancamentos-view.tsx`) mantêm cópias byte-idênticas de uma constante local `selectClassName`, copiada de `components/ui/input.tsx` por falta de componente compartilhado -- risco de drift silencioso já reconhecido nos próprios comentários do código.

**Approach:** Item (1) já foi investigado e resolvido nesta etapa de planejamento (sem necessidade de subagente): `::file-selector-button` tem suporte total no Safari/WebKit desde a versão 14.1 (2021, ~96.9% de adoção global hoje), Tailwind v4 compila `file:*` exclusivamente para esse pseudo-elemento padrão (confirmado lendo o CSS gerado em `.next/static/chunks/*.css`) -- não há gap real, nenhuma mudança de código necessária, só documentar a confirmação e fechar o item em `deferred-work.md`. Item (2): extrair um componente `SelectNative` em `components/ui/select-native.tsx` espelhando a implementação de `Input` (mesma classe visual, `cn()` para merge), e trocar os 4 usos duplicados para importá-lo, removendo as constantes locais. Refactor puro -- sem mudança de comportamento ou visual pretendida.

## Boundaries & Constraints

**Always:** `SelectNative` deve renderizar um `<select>` HTML nativo (nunca Radix/shadcn Select) -- decisão já registrada e reafirmada em múltiplos comentários do código-fonte (preserva o picker do SO no mobile). A classe base do `SelectNative` deve ser byte-idêntica à constante `selectClassName` atual (mesmo texto exato, incluindo ordem das classes) para garantir zero mudança visual. Cada um dos 4 call sites deve continuar passando exatamente os mesmos atributos que já passa hoje (`id`, `name`, `value`/`defaultValue`, `onChange`, `required`, `disabled`, `children` `<option>`) -- só troca o elemento/import, não o comportamento.

**Block If:** Nenhuma decisão de produto está em aberto -- ambos os itens são follow-up mecânico de um bugfix já aprovado.

**Never:** Não migrar `<select>` para Radix Select. Não alterar a lógica de nenhum dos 4 formulários (validação, estado, submit) -- só a origem da classe CSS. Não reintroduzir a duplicação em nenhum novo local futuro sem necessidade.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Renderização de cada um dos 4 selects migrados | Página carregada normalmente (upload, categorias, lançamentos x2) | Aparência pixel-idêntica à anterior (mesma classe CSS resolvida) | N/A |
| `aria-invalid`/`disabled` em qualquer select migrado | Atributo presente via props do call site | `SelectNative` aplica os mesmos modificadores `aria-invalid:*`/`disabled:*` que a classe já tinha | N/A |
| `className` adicional passado a `SelectNative` (se algum call site precisar) | Prop `className` extra | Mesclado via `cn()` sem sobrescrever a base, mesmo padrão de `Input` | N/A |

</intent-contract>

## Code Map

- `components/ui/select-native.tsx` -- NOVO. Componente `SelectNative`, espelha `components/ui/input.tsx` (mesma classe base, `cn()`, `data-slot`).
- `components/ui/input.tsx` -- referência de padrão (não precisa mudar), fonte da classe base a copiar para o novo componente.
- `app/(app)/upload/page.tsx` -- remove `selectClassName` local, usa `SelectNative` nos 2 selects (Mês/Ano).
- `app/(app)/categorias/_components/remover-categoria-form.tsx` -- remove `selectClassName` local, usa `SelectNative` no select de substituta.
- `app/(app)/lancamentos/_components/lancamento-item.tsx` -- remove `selectClassName` local, usa `SelectNative` no select de correção de categoria.
- `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- remove `selectClassName` local, usa `SelectNative` nos 4 selects (mês, ano, pessoa, categoria).
- `bmad-output/implementation-artifacts/deferred-work.md` -- as 2 entradas mais recentes (source_spec spec-fix-select-upload-sidebar-bullet.md) devem ser marcadas como resolvidas nesta passada.

## Tasks & Acceptance

**Execution:**
- [x] `components/ui/select-native.tsx` -- criar componente `SelectNative` (`React.ComponentProps<"select">`), classe base idêntica à `selectClassName` atual (copiar o texto exato de qualquer um dos 4 arquivos, todos são byte-idênticos hoje), merge via `cn(base, className)`, `data-slot="select-native"`, export nomeado -- espelha exatamente a estrutura de `components/ui/input.tsx`.
- [x] `app/(app)/upload/page.tsx` -- importar `SelectNative` de `@/components/ui/select-native`, remover a constante `selectClassName` e seu comentário, trocar os 2 `<select className={selectClassName} ...>` por `<SelectNative ...>` preservando todos os outros atributos e os `<option>` filhos.
- [x] `app/(app)/categorias/_components/remover-categoria-form.tsx` -- mesma troca para o único `<select>`.
- [x] `app/(app)/lancamentos/_components/lancamento-item.tsx` -- mesma troca para o único `<select>`.
- [x] `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- mesma troca para os 4 `<select>`.
- [x] `bmad-output/implementation-artifacts/deferred-work.md` -- não remover as 2 entradas (append-only por convenção do arquivo), mas confirmar que a investigação/o refactor desta spec as resolve (registrar isso no Auto Run Result, não editando o arquivo).

**Acceptance Criteria:**
- Given qualquer uma das 4 telas com `<select>` nativo, when renderizada antes e depois do refactor, then a suíte de snapshot visual (`e2e/visual/visual.spec.ts`) não detecta nenhuma diferença de pixel (mesmos baselines já commitados, sem re-geração).
- Given o código-fonte após o refactor, when buscado por `selectClassName`, then nenhuma ocorrência remanescente existe nos 4 arquivos consumidores (só, no máximo, dentro do novo `SelectNative` como nome de variável interna, se usado).
- Given o suporte do `::file-selector-button` no Safari, when investigado, then a confirmação (versão mínima suportada, fonte) está documentada no Auto Run Result -- sem necessidade de mudança de código, já que o suporte é universal desde 2021.

## Spec Change Log

## Review Triage Log

### 2026-08-01 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4 (medium 1, low 3)
- defer: 1
- reject: 4
- addressed_findings:
  - `[medium]` `[patch]` A consolidação removeu os únicos comentários de código que documentavam o "porquê" (select nunca vira Radix, `file:*`/`selection:*` não se aplicam, `aria-invalid:*` se aplica) -- essa razão de ser agora só existia num spec em `bmad-output/`, fora do alcance de quem lê só o código. Adicionado um comentário consolidado em `components/ui/select-native.tsx` (Blind Hunter).
  - `[low]` `[patch]` Comentário em `lancamentos-view.tsx` (reconciliação de categoria removida) e em `upload/page.tsx` (`form.reset()`) ainda citavam a tag `<select>` sem mencionar `SelectNative` -- ainda tecnicamente corretos (o DOM real continua sendo um `<select>`), mas ambíguos para quem procura `<select>` no JSX e não encontra. Reescritos para citar `SelectNative` explicitamente (Blind Hunter).
  - `[low]` `[patch]` Tag `<SelectNative>` em `remover-categoria-form.tsx` ficou espalhada em 5 linhas para 4 props curtas, resíduo do find/replace mecânico -- colapsado para uma linha (Blind Hunter).
  - `[low]` `[patch]` Gate de verificação do próprio spec (suíte e2e completa, zero regeração de snapshot) ainda não tinha rodado no momento da revisão -- rodada agora de verdade: 78/78 testes verdes, nenhum dos 24 snapshots visuais regenerado (confirma zero mudança visual/comportamental) (Blind Hunter).
  - `[low]` `[defer]` Nenhum mecanismo de tooling (lint/import restrito) impede que um contribuidor futuro use um Select Radix por engano em vez de `SelectNative` -- a decisão "sempre nativo" só é documentação, não é imposta. Débito pré-existente (já era só comentário antes desta consolidação também), registrado em `deferred-work.md` (Blind Hunter).
  - `[low]` `[reject]` "Ref forwarding ausente/regressão" -- falso alarme, confirmado pelo Edge Case Hunter: `SelectNative` espelha `Input` (sem `forwardRef`), e React 19 encaminha `ref` como prop normal via o próprio `{...props}` spread para o `<select>` real; nenhum call site usa ref hoje.
  - `[low]` `[reject]` Cenário de `className` extra no I/O Matrix do spec não é exercitado por nenhum dos 4 call sites reais -- nitpick de redação do spec, não defeito de implementação; o merge via `cn()` está correto e segue o mesmo padrão do `Input`.
  - `[low]` `[reject]` `data-slot="select-native"` como "mudança de superfície DOM não testada" -- verificado empiricamente: suíte estrutural/axe-core (que roda em todas as 4 telas afetadas) e suíte visual completa passaram 78/78 sem nenhuma diferença.
  - `[low]` `[reject]` Redação literal do AC sobre "nome de variável interna" no grep de `selectClassName` -- a implementação real inlina a string direto no `cn()`, sem variável; diferença de redação do spec, sem risco real.

## Design Notes

Item (1) (Safari) foi resolvido nesta etapa de planejamento, não delegado ao subagente de implementação: `::file-selector-button` é suportado desde Safari 14.1 (iOS Safari 14.5), Chrome/Edge 89, Firefox 82 -- cobertura global ~96,9% hoje (fonte: caniuse.com/mdn-css_selectors_file-selector-button, consultado nesta sessão). O CSS de produção gerado por este projeto (`.next/static/chunks/*.css`) confirma que Tailwind v4 compila cada classe `file:*` exclusivamente para `::file-selector-button` (sem fallback `-webkit-file-upload-button`, mas também sem necessidade dele). Nenhuma tarefa de código foi criada para este item -- só a documentação da confirmação abaixo, no Auto Run Result.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros novos
- `npm run lint` -- expected: sem erros novos
- `npm run build` -- expected: build limpo
- `npx playwright test e2e/visual` -- expected: 24/24 passam SEM re-geração de nenhum snapshot (refactor puro, zero mudança visual pretendida)
- `npx playwright test e2e/contrast e2e/structural` -- expected: 54/54 passam (nenhuma mudança de comportamento/acessibilidade esperada)

**Manual checks (if no CLI):**
- `grep -rn "selectClassName" app/` deve retornar vazio após o refactor.

## Auto Run Result

**Resumo:** Os 2 débitos técnicos deixados pelo bugfix anterior (spec-fix-select-upload-sidebar-bullet.md) foram resolvidos: (1) suporte cross-browser do `::file-selector-button` investigado e confirmado universal (Safari 14.1+, ~96.9% de adoção global) -- nenhuma mudança de código necessária; (2) as 4 cópias duplicadas da classe visual de `<select>` foram consolidadas num componente `SelectNative` compartilhado.

**Arquivos alterados:**
- `components/ui/select-native.tsx` -- NOVO. Componente `SelectNative`, mesma classe visual do `Input` (byte-idêntica às 4 cópias removidas), com comentário de rationale consolidado (select nativo, nunca Radix).
- `app/(app)/upload/page.tsx`, `app/(app)/categorias/_components/remover-categoria-form.tsx`, `app/(app)/lancamentos/_components/lancamento-item.tsx`, `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- removida a constante local `selectClassName` e seu comentário; `<select className={selectClassName} ...>` trocado por `<SelectNative ...>`, mesmos demais atributos preservados.

**Investigação Safari/`::file-selector-button`:** confirmado suporte desde Safari 14.1 / iOS Safari 14.5 (2021), Chrome/Edge 89, Firefox 82 -- cobertura global ~96,9% hoje (fonte: caniuse.com/mdn-css_selectors_file-selector-button). O CSS de produção deste projeto (`.next/static/chunks/*.css`) confirma que Tailwind v4 compila `file:*` exclusivamente para esse pseudo-elemento padrão. Não há gap real -- item fechado sem alteração de código.

**Review findings:** 4 patches aplicados (1 medium: comentário de rationale re-adicionado em `select-native.tsx`, perdido na consolidação; 3 low: 2 comentários desatualizados citando `<select>` em vez de `SelectNative`, formatação JSX resídua de find/replace), 1 deferido (`deferred-work.md`: nenhum lint/import restrito impede uso futuro de Select Radix por engano -- débito pré-existente, não introduzido aqui), 4 rejeitados (ref forwarding -- falso alarme, React 19 já encaminha via spread; cenário de `className` do I/O Matrix não exercitado por nenhum call site real -- nitpick de spec, não defeito; `data-slot` como "superfície não testada" -- verificado empiricamente; redação literal do AC sobre variável interna).

**Verificação:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos. `grep -rn "selectClassName" app/ components/` sem ocorrências. Suíte e2e completa (`npx playwright test`, 78 testes) rodada de verdade (não só planejada) -- 78/78 verde, **nenhum dos 24 snapshots visuais foi regenerado** (rodado sem `--update-snapshots`), confirmando empiricamente que o refactor é pixel-idêntico ao estado anterior em todas as 6 telas afetadas, claro e escuro.

**Riscos residuais:** o item deferido acima (ausência de enforcement de tooling para a decisão "select sempre nativo"). Nenhum impacto em dado/segurança/API/comportamento -- refactor puro de consolidação de CSS/componentes.
