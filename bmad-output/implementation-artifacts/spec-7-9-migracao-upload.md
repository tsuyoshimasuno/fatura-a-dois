---
title: 'Story 7.9 — Migração de componentes: Upload'
type: 'refactor'
created: '2026-07-26'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '5e7ae1e'
---

<intent-contract>

## Intent

**Problem:** `/upload` é um form solto (`.page.page--narrow` + `.form`) com 2 `<select>` crus, `<input type="file">` cru, `<button>` cru e `.alert-error`/`.hint` -- nenhum componente shadcn.

**Approach:** Envolver o form inteiro num `Card` (mesmo padrão de `/login`/`/esqueci-senha`/`/redefinir-senha`, todas `.page--narrow` também). Migrar os 2 `<select>` para nativos estilizados (mesma `selectClassName` já usada em `remover-categoria-form.tsx`, Story 7.7) com `Label`. Migrar `<input type="file">` para `Input` (o componente já tem classes `file:*` prontas para esse caso). Migrar `<button>` para `Button`. Migrar a mensagem de resultado para o padrão já fixado (sucesso = `hint`, erro = `Alert` destructive). Link "Ver gastos" permanece `.link` (fora de escopo, padrão já estabelecido).

## Boundaries & Constraints

**Always:** Preservar toda a lógica existente (`processarUpload` Server Action, captura de `competenciaEnviada` antes do `form.reset()`, guard de loading, faixa de anos `anoAtual-1..anoAtual+1`). Rodar suite de QA e revisar visualmente antes de aceitar.

**Block If:** Nenhuma decisão de produto/UX pendente.

**Never:** `<select>` nunca vira Radix Select (mesma decisão já reconciliada). Não tocar em `/lancamentos` (última story, 7.10).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Upload com sucesso | mês+ano+arquivo válidos | `hint` de sucesso, form reseta, link "Ver gastos" aparece | N/A |
| Upload com falha | Server Action retorna `ok:false` | `Alert` destructive, form NÃO reseta (usuário pode corrigir e reenviar) | N/A |
| Falha inesperada (exceção) | `processarUpload` lança | `Alert` destructive com mensagem genérica | catch já existente |

</intent-contract>

## Code Map

- `app/(app)/upload/page.tsx` -- envolver form em `Card`/`CardContent`, `Label`+`<select>` nativo estilizado (mês, ano), `Label`+`Input type="file"` (arquivo), `Button`, resultado `hint`/`Alert`
- `e2e/visual/visual.spec.ts` -- adicionar `/upload` às rotas autenticadas (achado real: a rota tinha cobertura estrutural/axe desde a Story 7.1, mas nunca regressão visual), `dadoReal: false`

## Tasks & Acceptance

**Execution:**
- [x] `app/(app)/upload/page.tsx` -- migrar para Card/Label/select-estilizado/Input/Button/Alert, preservando toda a lógica de submit/reset/link pós-sucesso
- [x] Rodar `npm run test:e2e`, revisar diff visual de `/upload` antes de aceitar -- correção: a rota NUNCA teve cobertura visual (só estrutural/axe desde a Story 7.1), achado real do review; adicionada agora em `e2e/visual/visual.spec.ts`. Concluído pelo orquestrador, 72/72 verde em 2 execuções consecutivas, baseline novo revisado visualmente (claro/escuro) antes de aceitar.

**Acceptance Criteria:**
- Given mês+ano+arquivo válidos, when o usuário envia, then `hint` de sucesso aparece, form reseta, link "Ver gastos" aparece com a competência certa.
- Given uma falha no upload, when o usuário envia, then `Alert` destructive aparece e o form permanece preenchido (sem reset).
- Given a suite de QA, when rodada após a migração, then os testes estruturais/contraste passam e o diff visual de `/upload` é revisado antes de aceitar.

## Spec Change Log

## Review Triage Log

### 2026-07-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 1, medium 1, low 3)
- defer: 0
- reject: 8: (low 8)
- addressed_findings:
  - `[high]` `[patch]` `components/ui/alert.tsx`'s variant `destructive` aplicava `text-destructive/90` (90% de opacidade) no `AlertDescription` -- a cor `--danger` deste projeto já foi calibrada ao mínimo WCAG AA (4.5:1) contra `--surface`/`--background` (ver `app/globals.css`), e 90% de opacidade quebra essa calibração ao misturar com o fundo. Contraste real confirmado via cálculo manual (blend alpha) e depois via novo teste automatizado: caía para ~4,07:1 no modo escuro contra `--surface` (abaixo do mínimo) -- afeta TODO `Alert` destructive já migrado desde a Story 7.4 (login, esqueci-senha, redefinir-senha, categorias, cartões), não só `/upload`. Corrigido removendo o modificador `/90`. Retrofix registrado nos Spec Change Log das 4 specs afetadas (7.4/7.5/7.6/7.7).
  - `[medium]` `[patch]` Novo teste automatizado (`e2e/contrast/contrast.spec.ts`, "Alert destructive: texto sobre o próprio fundo") para prevenir regressão futura -- lê a cor real computada de um `Alert` destructive renderizado (via o fluxo de erro de `/login`), normaliza para `rgb()` via canvas (Tailwind v4 resolve `/N` de opacidade via `color-mix()`, que o Chromium reporta em `oklab()`, não `rgb()`/`rgba()`), mistura qualquer alpha residual contra o fundo real, e afirma >=4.5:1. Verificado que o teste REALMENTE pega a regressão: reintroduzido o bug temporariamente, confirmado que o teste falha com o valor exato (~4,07:1), depois restaurada a correção.
  - `[low]` `[patch]` (achado do Edge Case Hunter na 2ª rodada, sobre o teste novo) `blendAlphaSobreFundo` assumia fundo sempre opaco sem checar -- corrigido lançando erro claro se o fundo tiver alpha < 1 em vez de misturar errado em silêncio (premissa de fundo opaco já é verdadeira hoje para `Card`/`Alert`, mas falhar alto é mais seguro que assumir).
  - `[low]` `[patch]` (achado do Edge Case Hunter na 2ª rodada) `paraRgb` não verificava se `ctx.fillStyle` aceitou a cor -- navegador ignora silenciosamente valor inválido e mantém preto opaco por padrão, mascarando um erro real como resultado plausível. Corrigido com `CSS.supports('color', cor)` antes de desenhar no canvas.
  - `[low]` `[patch]` Conditional de mensagem de resultado usava 2 blocos `{result && result.ok && ...}`/`{result && !result.ok && ...}` independentes em vez do ternário único já estabelecido (`{result && (result.ok ? ... : ...)}`, usado em `criar-categoria-form.tsx`/`cartao-pendente-item.tsx`) -- corrigido para mutual-exclusividade por construção, eliminando o risco (apontado pelo Blind Hunter) de um 3º estado futuro renderizar os dois blocos ao mesmo tempo.
  - `[reject]` `/upload` nunca teve cobertura de regressão visual (só estrutural/axe desde a Story 1.1) -- achado real, mas já resolvido nesta própria story (adicionado a `e2e/visual/visual.spec.ts`), não uma lacuna restante.
  - `[reject]` `selectClassName` duplicado num 2º arquivo sem módulo compartilhado -- mesma decisão já reconciliada na Story 7.7 (não abstrair para 2 usos); ainda são só 2 arquivos, não atingiu o limiar de reavaliação.
  - `[reject]` Citação de precedente ("mesma razão do 2º card sem título de `/parcelas`, Story 7.6") não bate com o código real de `/parcelas` -- verificado que essa frase só existia no prompt de dispatch do subagente de implementação (efêmero), nunca foi persistida na spec em si; nenhuma correção de documentação necessária.
  - `[reject]` `e2e/visual/visual.spec.ts` não estava listado no Code Map original da spec -- lacuna de documentação real, corrigida diretamente no Code Map (não é um problema de código).
  - `[reject]` `aria-invalid:*` no `selectClassName` é código morto nesta página (nada seta `aria-invalid` nos selects) -- mesmo padrão já aceito na Story 7.7 (paridade de classe com `Input`, não uso ativo).
  - `[reject]` Novos `id`/`htmlFor` não têm asserção dedicada -- mesma profundidade de teste já estabelecida em toda a run (nenhuma página tem asserção de id específico).
  - `[reject]` `review_loop_iteration: 0`/status `in-progress` no momento do review -- estado de processo normal, não um achado de código.
  - `[reject]` "Nenhum teste verificado antes desta review" -- momento do review coincidiu com o checkbox ainda não marcado (esquecimento do orquestrador em marcar antes de dispatchar, não um problema real -- suite já tinha rodado 2x e passado antes do dispatch); corrigido marcando o checkbox retroativamente.

## Design Notes

Mesmo padrão de `<select>` nativo estilizado já usado em `remover-categoria-form.tsx` (Story 7.7) -- reusar a mesma constante de classe (copiada, não importada -- cada arquivo já tinha sua própria cópia por não haver um módulo compartilhado de estilos ainda, mesma decisão da Story 7.7 de não criar abstração nova para 2 usos). `Input type="file"` já tem classes `file:*` prontas no componente vendorizado, sem ajuste necessário.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção limpo
- `npm run test:e2e` -- expected: suite verde; diff visual de `/upload` revisado antes de aceitar

## Auto Run Result

**Resumo:** `/upload` migrada para shadcn/ui (Card, Label, select nativo estilizado, Input type="file", Button, Alert). Adicionada cobertura de regressão visual pela primeira vez (nunca existia desde a Story 1.1). Review adversarial encontrou 1 bug real de severidade ALTA e cross-cutting: `Alert` destructive tinha opacidade reduzida (`/90`) quebrando o contraste WCAG AA já calibrado deste projeto -- afeta TODOS os `Alert` destructive já migrados desde a Story 7.4, corrigido no componente compartilhado, com novo teste automatizado para prevenir regressão futura (verificado que o teste realmente pega o bug, não só passa por coincidência).

**Arquivos alterados:**
- `app/(app)/upload/page.tsx` -- migrado para Card/Label/select-estilizado/Input/Button/Alert; conditional de resultado reescrito como ternário único (mutual-exclusividade por construção).
- `components/ui/alert.tsx` -- removido `text-destructive/90` do variant `destructive` (bug cross-cutting, afeta todo o app).
- `e2e/contrast/contrast.spec.ts` -- novo teste "Alert destructive: texto sobre o próprio fundo", com normalização de cor via canvas (Tailwind v4 + `oklab()`) e blend manual de alpha, verificado empiricamente que detecta a regressão.
- `e2e/visual/visual.spec.ts` -- `/upload` adicionada às rotas autenticadas (`dadoReal: false`), primeira cobertura visual desta rota.
- `spec-7-4/7-5/7-6/7-7-*.md` -- retrofix do bug de contraste registrado no Spec Change Log de cada uma (append-only).

**Achados do review (Blind Hunter 1ª rodada + Edge Case Hunter 2ª rodada de confirmação):** Blind Hunter -- 12 achados, 3 corrigidos (1 high, 1 medium, 1 low), 0 deferidos, 9 rejeitados com justificativa. Edge Case Hunter (2ª rodada, já contra o código corrigido) -- 2 achados novos, ambos sobre robustez do próprio teste novo, ambos corrigidos (low). Total: 5 patches, 0 deferidos, 8 rejeitados (ver Review Triage Log acima).

**Verificação realizada:**
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos antes e depois de todos os patches.
- Bug de contraste confirmado por cálculo manual (blend alpha) E por teste automatizado real -- inclusive verificado que o teste novo FALHA corretamente quando o bug é reintroduzido temporariamente (não é um teste que só passa por coincidência).
- Suite de QA (`npm run test:e2e`) rodada 4x ao longo da story -- 72/72 verde nas últimas 2 execuções consecutivas (68 anteriores + 2 novos de `/upload` + 2 novos de contraste do `Alert`). Baseline visual de `/upload` revisado visualmente (claro/escuro) antes de aceitar.

**Riscos residuais:** nenhum novo. O bug de contraste do `Alert` estava presente em produção desde a Story 7.4 (login) -- agora corrigido e coberto por teste automatizado, mas vale registrar que ficou sem detecção por 5 stories antes de ser encontrado, um lembrete de que testes de contraste baseados em variáveis CSS cruas (`PARES` em `contrast.spec.ts`) não pegam problemas introduzidos por modificadores de opacidade Tailwind aplicados no DOM.
