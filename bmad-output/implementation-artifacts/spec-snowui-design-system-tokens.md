---
title: 'Adoção seletiva do SnowUI Design System -- section-title real + escala tipográfica'
type: 'refactor'
created: '2026-07-22'
status: 'done'
review_loop_iteration: 1
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '5c4d2e80a5a2a6f36a934cd86fe0ae1c27d80d9e'
---

<intent-contract>

## Intent

**Problem:** DESIGN.md (rodada 6, decisão já reconciliada por PM/tech-lead/UX) autorizou a adoção seletiva de tokens do SnowUI Design System (Figma), mas a amostragem de valores exatos ficou para a implementação. Investigação real via API do Figma nesta sessão confirmou que cores e corner-radius do kit são resolvidos como `VARIABLE_ALIAS` (Figma Variables), não como valores literais -- o token de acesso disponível não tem escopo `file_variables:read` (403 confirmado em `/variables/local` e também nas fills de swatches individuais). Não há como amostrar esses valores com segurança nesta rodada. Os únicos dados literais e confiáveis extraídos foram: (1) a escala tipográfica do kit (Inter, 12/14/16/18/24/32/48/64px, pesos 400/600, regra de proporção documentada no próprio arquivo: line-height ≈1.5× para tamanhos ≤18px e ≈1.2× para ≥24px) e (2) a escala de espaçamento (0/4/8/12/16/20/24/28/32/40/48/80px). Cruzando essa escala de espaçamento com o código real, achamos uma inconsistência real e independente já apontada em DESIGN.md (Do's and Don'ts): o token `section-title` (1.1rem/700, já especificado em DESIGN.md) não tem nenhuma classe CSS -- `<h2>` depende do tamanho padrão do navegador (sem `font-size` explícito), e o espaçamento abaixo dele é repetido como `style={{ marginBottom: '0.75rem' }}` inline em 10 ocorrências (`0.75rem` = 12px, que cai exatamente na escala de espaçamento confirmada do SnowUI).

**Approach:** Adotar apenas os dois fatos confirmados (escala de espaçamento + regra de proporção tipográfica), sem tocar cor/radius/família de fonte. Criar a classe `.section-title` em `app/globals.css` implementando o token já especificado em DESIGN.md (mas nunca implementado), com `line-height` explícito seguindo a regra de proporção do kit. Substituir as 10 ocorrências de `<h2 style={{ marginBottom: '0.75rem' }}>` pela nova classe. Adicionar `line-height` explícito também a `.page-title` e `.page-subtitle`/`.hint` (mesma regra de proporção), hoje sem essa propriedade. Documentar em DESIGN.md a limitação real de amostragem (para não ser re-investigada em rodadas futuras).

## Boundaries & Constraints

**Always:** Manter os valores de cor, corner-radius (`--radius`) e família de fonte (`Geist Sans`) inalterados -- não há fonte de valor confiável do SnowUI para eles nesta rodada. Manter todo par `-dark` existente intacto (nenhum token novo de cor é criado, então não há par dark novo a considerar). Preservar layout/estrutura de toda tela (nenhuma mudança de estrutura, só CSS de tipografia/espaçamento de heading).

**Block If:** Nenhum -- escopo já delimitado pela decisão reconciliada (rodada 6) e pela limitação de API confirmada empiricamente nesta própria sessão. Nada aqui exige decisão humana nova.

**Never:** Não introduzir uma segunda camada de tokens (`--snowui-*`). Não mudar cor de nenhum elemento. Não mudar `--radius` nem qualquer `border-radius` numérico existente. Não trocar a família tipográfica (`Geist Sans` permanece; decisão de trocar por Inter fica em aberto, não tomada nesta rodada). Não tocar `app/(app)/lancamentos/_components/lancamentos-view.tsx` na parte de grid/layout de colunas (só o `<h2>`/CSS de heading). Não mexer nos `<p>`/`<form>` que também têm `marginBottom` inline mas não são heading `section-title` (ex.: `page.tsx:127,140`, `categorias/_components/categoria-item.tsx:47,58`, `lancamentos-view.tsx:346`, `parcelas/page.tsx:44,47`) -- fora do escopo desta spec, são paddings de feedback/form, não o gap documentado como `section-title`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| `<h2>` de section-title em qualquer tela | Renderização de `/`, `/cartoes`, `/parcelas`, `/lancamentos` | `<h2 className="section-title">` com `font-size:1.1rem`, `font-weight:700`, `letter-spacing:-0.01em`, `line-height` explícito, `margin-bottom:0.75rem` -- idêntico visualmente ao que já era renderizado hoje (o valor numérico de `margin-bottom` não muda, só passa a vir de classe) | Nenhum -- é troca de inline style por classe com o mesmo valor numérico, sem mudança de comportamento |
| Dark mode | `prefers-color-scheme: dark` | Nenhuma mudança de cor introduzida por esta spec -- `.section-title` não define `color`, herda do `h2`/contexto como já fazia | N/A |

</intent-contract>

## Code Map

- `app/globals.css` -- adicionar classe `.section-title`; adicionar `line-height` explícito a `.page-title` e `.page-subtitle`/`.hint`.
- `app/(app)/page.tsx` -- 3 ocorrências de `<h2 style={{ marginBottom: '0.75rem' }}>` → `className="section-title"`.
- `app/(app)/cartoes/page.tsx` -- 1 ocorrência.
- `app/(app)/parcelas/page.tsx` -- 1 ocorrência.
- `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- 5 ocorrências.
- `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/DESIGN.md` -- registrar a classe `.section-title` como `[IMPLEMENTADO]` e documentar a limitação de amostragem de cor/radius confirmada nesta sessão.

## Tasks & Acceptance

**Execution:**
- [x] `app/globals.css` -- adicionar após a regra `.page-subtitle`: classe `.section-title { margin-bottom: 0.75rem; }` **apenas** -- NÃO adicionar `font-size`/`font-weight`/`letter-spacing` (esses já vêm do `h1, h2, h3 { font-weight: 700; letter-spacing: -0.01em; }` pré-existente; adicionar de novo mudaria o tamanho renderizado do `<h2>`, hoje sem `font-size` explícito -- ver bad_spec repair acima). Adicionar comentário de uma linha explicando que `0.75rem` = 12px, valor confirmado na escala de espaçamento do SnowUI amostrada nesta sessão (não um valor arbitrário).
- [x] `app/globals.css` -- adicionar `line-height: 1.2;` a `.page-title` (24px, regra ≥24px do SnowUI). **NÃO** adicionar `line-height` a `.page-subtitle` -- confirmado no repair acima que é um no-op (já herda `1.5` de `body`).
- [x] `app/(app)/page.tsx` -- substituir as 3 ocorrências de `<h2 style={{ marginBottom: '0.75rem' }}>` por `<h2 className="section-title">`.
- [x] `app/(app)/cartoes/page.tsx` -- substituir a ocorrência (linha 33) por `<h2 className="section-title">`.
- [x] `app/(app)/parcelas/page.tsx` -- substituir a ocorrência (linha 38) por `<h2 className="section-title">`.
- [x] `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- substituir as 5 ocorrências (linhas 277, 284, 302, 320, 342) por `<h2 className="section-title">`.
- [x] `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/DESIGN.md` -- no bloco `[DECISÃO 2026-07-22, rodada 6]` de Brand & Style ou em nova nota `[IMPLEMENTADO 2026-07-22]`, registrar: (a) `.section-title` implementado como classe CSS real (só `margin-bottom` -- o `font-size` de 1.1rem do token DESIGN.md continua **não implementado**, deferido, pois mudaria o tamanho renderizado hoje e merece sua própria decisão explícita, não um side effect desta limpeza); (b) cor/corner-radius do SnowUI não puderam ser amostrados nesta rodada -- confirmado empiricamente (swatches resolvem como `VARIABLE_ALIAS`, `/variables/local` retorna 403) -- não re-tentar sem um token de API com escopo `file_variables:read`.

**Acceptance Criteria:**
- Given qualquer tela com um heading de bloco (`/`, `/cartoes`, `/parcelas`, `/lancamentos`), when a página renderiza, then o `<h2>` usa `className="section-title"` (sem `style` inline de `marginBottom`) e o espaçamento/tamanho/peso visual é **idêntico byte-a-byte em CSS computado** ao estado anterior (`.section-title` não define `font-size`/`font-weight`/`letter-spacing`, só `margin-bottom`).
- Given o modo escuro do sistema operacional ativo, when qualquer tela acima é aberta, then nenhuma cor muda em relação ao estado anterior a esta spec (esta spec não introduz nem altera nenhum token de cor).
- Given o build de produção (`npm run build`), when executado após as mudanças, then completa sem erros de tipo/lint.

## Spec Change Log

### 2026-07-22 — bad_spec repair (pass 1)

**Trigger:** Blind Hunter found that `.section-title { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.01em; ... }` does NOT preserve the pre-existing rendered `<h2>` size, contradicting the I/O Matrix / Acceptance Criteria claim of "idêntico visualmente ao estado anterior". Root cause: `<h2>` today has no explicit `font-size` in `app/globals.css`, so it renders at the browser UA default (~1.5em against `body`'s 15px ≈ 22.5px) -- NOT the DESIGN.md `section-title` token value (1.1rem, which resolves against the root `html` default of 16px ≈ 17.6px, since no element in this codebase sets `html { font-size }`). Implementing the literal DESIGN.md token value in this pass was scope creep beyond the actually-evidenced problem (the repeated inline `marginBottom: '0.75rem'`, confirmed against the sampled SnowUI spacing scale) and silently changed rendered heading size by ~22%, invisible to the stated tsc/lint/build verification.

**Amendment:** `.section-title` in Tasks & Acceptance no longer sets `font-size`, `font-weight`, or `letter-spacing` -- only `margin-bottom: 0.75rem` (the actual evidenced problem) plus `line-height` scoped to what the class *does* set. `font-weight`/`letter-spacing` continue to come from the pre-existing `h1, h2, h3 { font-weight: 700; letter-spacing: -0.01em; }` rule (globals.css:72-77) -- `.section-title` must not repeat them (avoids the duplicate-rule maintenance trap Blind Hunter also flagged). Adopting the DESIGN.md `section-title` font-size (1.1rem) as an actual rendered value is deferred out of this spec entirely -- it is a real, deliberate visual change (establishing heading hierarchy) that deserves its own AC and explicit sign-off, not a side effect of an inline-style cleanup. Also dropped the `.page-subtitle { line-height: 1.5 }` task -- confirmed a no-op (already inherits `1.5` from `body`, globals.css:50) that added nothing and could misread as intentional. `.page-title { line-height: 1.2 }` is KEPT -- it is a real, previously-unset value, not contradicted by any AC (the "idêntico visualmente" claim was scoped to the h2/section-title row only), and matches the confirmed SnowUI ratio rule for ≥24px. Added a task to comment the `.section-title` block's `margin-bottom` source (matches sampled spacing scale value, not arbitrary).

**Known-bad state avoided:** shipping a silent ~22% heading-size shrink across 4 screens (10 `<h2>` occurrences) with no test able to catch it, under an AC that explicitly (and incorrectly) claimed no visual change.

**KEEP:** the `<h2 style={{marginBottom:'0.75rem'}}>` → `<h2 className="section-title">` migration mechanics across all 10 occurrences in the 4 files (mechanically correct, confirmed complete by both reviewers) -- do not re-derive that part, only the CSS declarations inside `.section-title`/`.page-subtitle`.

## Review Triage Log

### 2026-07-22 — Review pass
- intent_gap: 0
- bad_spec: 1 (high 1, medium 0, low 0)
- patch: 0 (folded into the bad_spec amendment below instead of a separate patch pass)
- defer: 1 (low 1)
- reject: 0
- addressed_findings:
  - `[high]` `[bad_spec]` `.section-title` font-size (1.1rem) silently shrinks rendered `<h2>` size ~22% vs. the pre-existing browser-default render, contradicting the spec's own "idêntico visualmente" AC; also fixes the related low-severity finding that `.section-title` duplicated the pre-existing `h1,h2,h3` rule's `font-weight`/`letter-spacing`, and drops the no-op `.page-subtitle { line-height: 1.5 }` (already inherited from `body`) -- spec amended, code reverted for re-derivation.

### 2026-07-22 — Review pass 2 (post bad_spec repair)

- intent_gap: 0
- bad_spec: 0
- patch: 2 (low 2)
- defer: 0
- reject: 9 (already-scoped/hypothetical/pre-existing points raised by Blind Hunter: partial migration of the other ~7 non-h2 inline-style sites out of scope by design, no visual-regression tooling in this project, cross-rule dependency undocumented at the other site, `.page-title` line-height framing, generic class-name guard, pre-existing rem/px mismatch already in deferred-work.md, comment cross-reference, triage-log wording, cross-browser UA convergence)
- addressed_findings:
  - `[low]` `[patch]` Both reviewers independently converged on the same real defect: the `.section-title` CSS comment incorrectly claimed `font-size` came from the `h1,h2,h3` rule (that rule only sets `font-weight`/`letter-spacing`; `font-size` is intentionally left at the browser default). Comment corrected in `app/globals.css` to state this precisely, with a cross-reference to this spec and DESIGN.md.
  - `[low]` `[patch]` `DESIGN.md`'s `typography.section-title.fontSize: 1.1rem` frontmatter field had no inline warning that it is unimplemented -- a future reader could copy it verbatim and reintroduce the exact regression pass 1 caught. Added an inline comment on the frontmatter field itself (not just prose further down the doc).
  - Verified by direct grep: `categorias/[id]/remover` (named in DESIGN.md's older Do's-and-Don'ts note as an inline-style example) has no `<h2>`/`marginBottom` at all -- confirms this spec's scope boundary was already correct, no action needed.

## Design Notes

Esta spec é deliberadamente pequena: a decisão de adoção seletiva do SnowUI (tokens+átomos, layout preservado) já foi tomada e reconciliada por John/Winston/Sally e registrada em DESIGN.md/EXPERIENCE.md antes desta etapa -- não é reaberta aqui. O escopo real desta implementação ficou menor do que o inicialmente cogitado porque a amostragem de cor/corner-radius via API do Figma se mostrou inviável nesta sessão (Figma Variables sem escopo de leitura no token disponível). O que sobrou como fato confiável e acionável (escala de espaçamento + regra de proporção tipográfica) foi cruzado com uma inconsistência real e independente já documentada em DESIGN.md (Do's and Don'ts: `section-title` sem classe CSS, `marginBottom` inline repetido) -- corrigir essa inconsistência usando exatamente os fatos que a amostragem conseguiu confirmar é o approach mais honesto disponível, em vez de inventar valores de cor/radius ou forçar uma adoção maior sem lastro real.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros novos.
- `npm run lint` -- expected: sem erros novos.
- `npm run build` -- expected: build de produção completa sem erros.

**Manual checks (if no CLI):**
- Ler o diff final de `app/globals.css` e confirmar que nenhum valor de cor (`--accent`, `--surface`, `--border`, etc.) ou `--radius` foi alterado -- só `.section-title` (nova) e `line-height` em `.page-title`/`.page-subtitle` foram tocados.
- Grep por `marginBottom: '0.75rem'` em `<h2` no diretório `app/` após a mudança -- deve retornar zero ocorrências nos 4 arquivos listados no Code Map.

## Auto Run Result

**Resumo:** Adoção seletiva do SnowUI Design System (Figma) restrita ao que a API do Figma conseguiu confirmar de forma confiável (escala de espaçamento + regra de proporção tipográfica) -- cor e corner-radius não puderam ser amostrados (Figma Variables sem escopo de leitura no token disponível, 403 confirmado empiricamente). Escopo real de implementação: consolidar 10 ocorrências de `<h2 style={{ marginBottom: '0.75rem' }}>` numa classe `.section-title` real, e adicionar `line-height` explícito a `.page-title` -- ambos fatos evidenciados (12px cai na escala de espaçamento do SnowUI; regra de proporção do SnowUI justifica o `line-height`).

**Arquivos alterados:**
- `app/globals.css` -- nova classe `.section-title { margin-bottom: 0.75rem; }` (só essa propriedade, com comentário explicando a fonte do valor e por que `font-size` não é definido); `line-height: 1.2` adicionado a `.page-title`.
- `app/(app)/page.tsx`, `app/(app)/cartoes/page.tsx`, `app/(app)/parcelas/page.tsx`, `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- 10 ocorrências de `<h2 style={{...}}>` migradas para `<h2 className="section-title">`.
- `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/DESIGN.md` -- nota `[IMPLEMENTADO 2026-07-22]` registrando o que foi de fato implementado (só `margin-bottom`) e a limitação de amostragem de cor/radius; frontmatter `section-title.fontSize` anotado como não-implementado.

**Achados de review:** Pass 1 (Blind Hunter + Edge Case Hunter em paralelo) encontrou 1 `bad_spec` real de severidade alta: a primeira versão de `.section-title` incluía `font-size: 1.1rem` (o valor do token DESIGN.md nunca antes implementado), o que reduzia o tamanho renderizado do `<h2>` em ~22% (de ~22.5px, padrão do navegador sem `font-size` explícito, para ~17.6px) -- contradizendo a própria AC da spec de preservação visual. Spec corrigida (retirado `font-size`/`font-weight`/`letter-spacing` de `.section-title`, removido `line-height` no-op de `.page-subtitle`), código revertido e re-derivado. Pass 2 sobre a versão corrigida: 0 bad_spec, 2 patches baixos (comentário de `.section-title` continha uma alegação incorreta sobre de onde vem `font-size`, corrigido; frontmatter do DESIGN.md sem aviso inline de não-implementado, adicionado), 9 rejeitados (a maioria apontando escopo já deliberadamente delimitado ou risco hipotético/pré-existente). 1 achado real e independente logado em `deferred-work.md` (descompasso `rem`/16px vs `body` 15px, pré-existente, não causado por esta spec).

**Verificação:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos em ambas as passadas (antes e depois do repair). Verificação manual: grep confirmou zero ocorrências residuais de `marginBottom: '0.75rem'` em `<h2` no diretório `app/`; diff de `app/globals.css` confirmado sem nenhuma alteração de cor/`--radius`. Não foi possível verificar visualmente no navegador nesta sessão (sem ferramenta de automação de navegador disponível) -- risco residual baixo dado que a AC final é sustentada por leitura direta do CSS computado esperado (UA default preservado, sem regressão).

**Riscos residuais:** (1) cor/corner-radius do SnowUI continuam não adotados -- fica para uma rodada futura com um token de API com escopo `file_variables:read`, ou amostragem manual na UI do Figma; (2) o token DESIGN.md `section-title.fontSize` (1.1rem) continua deliberadamente não implementado -- se o casal quiser esse tamanho real, é uma decisão explícita nova, não uma continuação automática desta spec; (3) descompasso `rem`/16px vs `body` 15px pré-existente permanece (logado em `deferred-work.md`, fora do escopo desta spec).
