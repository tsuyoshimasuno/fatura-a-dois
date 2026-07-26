---
title: 'Story 7.6 — Migração de componentes: telas de conteúdo simples (Parcelas, Cartões)'
type: 'refactor'
created: '2026-07-26'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'db3814d'
final_revision: 'b9f373a'
---

<intent-contract>

## Intent

**Problem:** `/parcelas` e `/cartoes` ainda usam `.card`/`.card-list`/`<button>` cru/`.alert-error`/`.btn-danger-outline` (CSS artesanal) em vez dos componentes shadcn/ui já vendorizados e corrigidos (`Card`, `Button`, `Alert`).

**Approach:** Migrar as seções/itens `.card` para `Card`, os `<button>` crus para `Button` (variant `default`/`outline`+`text-destructive` para "Não é do casal"), e as mensagens de resultado (`.hint`/`.alert-error`) para `Alert`. `/parcelas` tem `<section className="card">` (não está numa lista `<ul>`) — migra direto para `<Card>`. `/cartoes` tem `<li className="card">` dentro de `<ul className="card-list">` (`CartaoPendenteItem`/`CartaoRejeitadoItem`) — preserva o `<li>` como wrapper semântico de lista e coloca `<Card>` dentro dele (não remove a semântica de lista). O `<h1>`/subtítulo de topo de cada página (`.page-header`/`.page-title`/`.page-subtitle`, fora de qualquer Card) **não muda** — não é um padrão shadcn (Button/Card/Alert/etc.), é a convenção de cabeçalho de página já usada em todo o app, fora do escopo desta migração de componentes.

## Boundaries & Constraints

**Always:** Preservar toda a lógica existente (Server Actions `mapearCartao`/`rejeitarCartaoTerceiro`/`desfazerRejeicaoCartao`, delay de 2500ms antes do `router.refresh()`, guard de "em voo" por ação, `role="alert"`/`aria-live="polite"` nas mensagens de resultado). Atualizar o mask de privacidade do teste visual (`e2e/visual/visual.spec.ts`) para cobrir `[data-slot="card"]` além de `.card` -- achado já registrado em `deferred-work.md` (Story 7.4): esta é a primeira story que põe dado financeiro real (valores de parcela, comprometimento por pessoa, titular/número mascarado de cartão) dentro do `Card` novo. Rodar a suite de QA (`npm run test:e2e`) e revisar visualmente antes de aceitar.

**Block If:** Nenhuma decisão de produto/UX pendente — escopo estrutural.

**Never:** Não tocar no cabeçalho de topo (`page-header`/`page-title`/`page-subtitle`) de nenhuma das duas páginas. Não tocar em `/lancamentos`, `/` (Início) ou `/upload` (stories futuras). Não introduzir `Toast`/`AlertDialog` (deferidos).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Parcelas sem compras em andamento | `competencias.length === 0` | `.empty-state` inalterado (fora do escopo desta migração) | N/A |
| Parcelas com comprometimento pendente | `pendenteCentavos > 0` | link "Resolver em Cartões" preservado dentro do `Card` | N/A |
| Cartão pendente -- atribuir com sucesso | clique em "Atribuir a X" | `Alert` (não-destrutivo, `aria-live=polite`) com mensagem de sucesso, botões somem, refresh após 2500ms | N/A |
| Cartão pendente -- atribuir falha | Server Action retorna `ok:false` | `Alert` destrutivo com a mensagem de erro, botões continuam visíveis/habilitados | erro de servidor tratado, sem refresh |
| Cartão rejeitado -- desfazer | clique em "Desfazer rejeição" | mesmo padrão de `Alert` de sucesso/erro do cartão pendente | N/A |

</intent-contract>

## Code Map

- `app/(app)/parcelas/page.tsx` -- migrar `<section className="card">` para `<Card>`/`<CardHeader>`/`<CardTitle asChild><h2>` (mantém `<h2>`, não é o h1 da página)/`<CardContent>`
- `app/(app)/cartoes/_components/cartao-pendente-item.tsx` -- migrar `<li className="card">` para `<li><Card>...</Card></li>`, botões para `Button`, mensagem de resultado para `Alert`
- `app/(app)/cartoes/_components/cartao-rejeitado-item.tsx` -- mesmo padrão
- `e2e/visual/visual.spec.ts` -- mask `.card` → `.card, [data-slot="card"]` nas rotas autenticadas (achado deferido da Story 7.4, agora com consequência real)

## Tasks & Acceptance

**Execution:**
- [x] `app/(app)/parcelas/page.tsx` -- migrar cada seção de competência para `Card`, preservando toda a lógica de leitura/agregação (nenhuma mudança de dado, só markup)
- [x] `app/(app)/cartoes/_components/cartao-pendente-item.tsx` -- migrar `<li className="card">` para `<li><Card>...</Card></li>`, `<button>` para `Button`, mensagem de resultado para `Alert`
- [x] `app/(app)/cartoes/_components/cartao-rejeitado-item.tsx` -- mesmo padrão
- [x] `e2e/visual/visual.spec.ts` -- atualizar mask de privacidade para `[page.locator('.card'), page.locator('[data-slot="card"]')]` nas rotas autenticadas
- [x] Rodar `npm run test:e2e`, revisar diff visual de `/lancamentos`, `/categorias`, `/` e `/parcelas`/`/cartoes` (rotas novas) antes de aceitar -- concluído pelo orquestrador, 68/68 verde em 2 execuções consecutivas, mask de privacidade revisado visualmente (parcelas/cartoes com dado real totalmente mascarado, redefinir-senha preservado sem mask por não ter dado financeiro)

**Acceptance Criteria:**
- Given uma competência com parcelas, when `/parcelas` renderiza, then os dados (mês/ano, total, comprometimento por pessoa, itens) aparecem idênticos dentro do `Card`.
- Given um cartão pendente, when o usuário atribui a uma conta, then o mesmo fluxo de sucesso/erro/refresh de antes ocorre, agora com `Button`/`Alert`.
- Given a suite de QA, when rodada após a migração, then os testes estruturais/contraste passam e nenhum screenshot com dado financeiro real fica sem mascaramento (mask cobre `Card` novo).

## Spec Change Log

## Review Triage Log

### 2026-07-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 4: (high 1, medium 2, low 1)
- defer: 1: (medium 1)
- reject: 5: (low 5)
- addressed_findings:
  - `[high]` `[patch]` Botão "Não é do casal" (`variant="outline"` + override `border-destructive`/`hover:bg-destructive/10`) perdia a cor destrutiva em dark mode -- confirmado empiricamente via `getComputedStyle` (borda caía para `rgb(146,146,146)`, a cor neutra de `dark:border-input` do variant `outline`, em vez de vermelho). Causa raiz: Tailwind ordena `dark:border-input` DEPOIS de `dark:border-destructive` no CSS gerado independente da ordem no `className`, então a simples adição de `dark:border-destructive` sem `!important` não bastava (confirmado também empiricamente -- só mudou de fato após adicionar o modificador `!`). Corrigido com `border-destructive! dark:border-destructive! dark:hover:bg-destructive/10!`, reverificado via `getComputedStyle` (agora `rgb(255,153,153)` em dark, igual ao texto). Achado convergente de Blind Hunter e Edge Case Hunter.
  - `[medium]` `[patch]` `CardTitle` aplica `text-[15px]` (calibrado na Story 7.5 para o caso `<h1>` de página standalone) ao `<h2>` de cada competência em `/parcelas` -- `.section-title` original deixava esse `<h2>` DELIBERADAMENTE no tamanho padrão do navegador (~22.5px, ver comentário em `app/globals.css`), então a migração encolhia o título real. Corrigido com override `className="text-[22.5px]"` na instância específica (via `cn()`/`twMerge`, que já dedupe corretamente contra o `text-[15px]` base) -- reverificado via `getComputedStyle` contra a conta real (`fontSize: "22.5px"`, `fontWeight: "600"`, igual ao original).
  - `[medium]` `[patch]` Mensagem de sucesso (`resultado.ok`) foi migrada para dentro de `Alert` (caixa com borda) em ambos os itens de cartão -- o comportamento ORIGINAL (`className={resultado.ok ? 'hint' : 'alert-error'}`) só usava caixa/borda para o caso de ERRO; sucesso sempre foi texto inline simples. Corrigido revertendo o caso de sucesso para `<p className="hint" aria-live="polite">`, mantendo `Alert` (variant destructive, `role="alert"` nativo do componente) só para o caso de erro -- restaura paridade exata com o comportamento pré-migração. Como efeito colateral positivo, elimina também o "contrato implícito frágil" apontado por um dos revisores (override de `role`/`aria-live` via prop spread) -- não é mais necessário, `Alert` sempre usa seu `role="alert"` padrão agora.
  - `[low]` `[patch]` Remoção de `className="btn-danger-outline"` órfã em `app/globals.css` (regra e `:hover` associado) -- confirmado por grep que não há mais nenhum uso no código.
  - `[defer]` `CartaoPendenteItem`/`CartaoRejeitadoItem` migrados para Card/Button/Alert, mas a conta real do casal usada pela suite de QA não tem nenhum cartão pendente/rejeitado no momento -- `/cartoes` só amostra o estado vazio, sem cobertura visual/interação real desses componentes. Registrado em `deferred-work.md`: limitação de infraestrutura de teste (suite nunca autentica sozinha nem cria dado sintético no banco real do casal), não um bug. Compensado parcialmente nesta review por verificação manual via script Playwright descartável (className isolada + `getComputedStyle`, sem depender de dado real da conta), que já confirmou e corrigiu o bug do botão acima.
  - `[reject]` `dadoReal` (boolean por rota no teste visual) é tudo-ou-nada -- não expressa uma rota com conteúdo misto (alguns Cards com dado real, outros sem). Nenhuma rota atual precisa disso; nota prospectiva para quando surgir, não bloqueante agora.
  - `[reject]` `style={{...}}` inline ainda misturado com Tailwind/shadcn nos itens de cartão -- mesmo padrão já usado e aceito nas Stories 7.4/7.5 (pequenos ajustes de `marginTop`/`marginBottom`), não é inconsistência nova desta story.
  - `[reject]` Padding do `Card` (20px→24px) aplicado pela primeira vez a um padrão de lista repetida (itens de cartão, seções de parcela) sem checagem explícita de viewport estreito -- já revisado visualmente via screenshot completo (claro/escuro) de `/parcelas`/`/cartoes`, sem overflow ou quebra observada.
  - `[reject]` Múltiplos `<h2>` irmãos via `CardTitle asChild` dentro de um `.map()` -- semanticamente válido (heading outline de múltiplas seções irmãs do mesmo nível), não é violação de acessibilidade.
  - `[reject]` `Alert`'s "role override" contract sendo frágil -- resolvido como efeito colateral do patch medium acima (Alert agora só é usado com seu `role="alert"` padrão, nunca mais com override), finding não se aplica mais ao código atual.

## Design Notes

`<li className="card">` (Cartões) preserva o `<li>` como wrapper semântico de lista -- `Card` (uma `<div>`) fica DENTRO do `<li>`, não o substitui, para não perder a semântica de lista já existente (`<ul className="card-list">`). Botão "Não é do casal" usa `variant="outline"` + `className="text-destructive border-destructive hover:bg-destructive/10"` (não existe variant "destructive-outline" pronta em `button.tsx`, e criar uma variant nova pra um único botão neste ponto da migração é abstração prematura -- só 1 uso).

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção limpo
- `npm run test:e2e` -- expected: suite verde; diff visual revisado (incluindo mask atualizado) antes de aceitar

## Auto Run Result

**Resumo:** `/parcelas` e `/cartoes` migradas de CSS artesanal para shadcn/ui (Card, Button, Alert). Primeira story a colocar dado financeiro real dentro do `Card` novo -- mask de privacidade do teste visual estendido (`[data-slot="card"]`), escopado por rota (`dadoReal`) para não mascarar cegamente o `Card` de `/redefinir-senha` (sem dado real). Review adversarial encontrou e corrigiu 1 bug real de severidade alta (botão destrutivo perdia cor em dark mode por cascata do Tailwind) e 2 de severidade média (título de seção encolhido; mensagem de sucesso ganhou caixa que nunca teve).

**Arquivos alterados:**
- `app/(app)/parcelas/page.tsx` -- seções migradas para `Card`/`CardHeader`/`CardTitle asChild`(`<h2>`, `text-[22.5px]`)/`CardContent`.
- `app/(app)/cartoes/_components/cartao-pendente-item.tsx`, `cartao-rejeitado-item.tsx` -- `<li>` preservado como wrapper semântico, `Card` dentro; botões migrados para `Button`; mensagem de erro para `Alert` (destructive), sucesso mantido como `<p className="hint">` (paridade com o original).
- `e2e/visual/visual.spec.ts` -- `/parcelas`/`/cartoes` adicionadas às rotas autenticadas; mask de privacidade escopado por `dadoReal` (true para lancamentos/categorias/inicio/parcelas/cartoes, false para redefinir-senha).
- `app/globals.css` -- `.btn-danger-outline` (órfã) removida.
- `bmad-output/implementation-artifacts/deferred-work.md` -- 1 entrada nova (cobertura visual ausente para os itens de cartão, conta real sem cartão pendente/rejeitado no momento).

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada):** 10 achados -- 4 corrigidos (1 high, 2 medium, 1 low), 1 deferido, 5 rejeitados com justificativa (ver Review Triage Log acima).

**Verificação realizada:**
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos antes e depois dos patches de review.
- Bug do botão dark mode e do tamanho do `<h2>` confirmados via `getComputedStyle` real (script Playwright descartável, removido) -- contra elemento isolado (botão) e contra a conta real autenticada (`/parcelas`, título de competência real).
- Suite de QA (`npm run test:e2e`) rodada 4x ao longo da story -- 68/68 verde nas últimas 2 execuções consecutivas. Baseline de `/parcelas`/`/cartoes` capturado, revisado visualmente (mask cobrindo 100% do dado financeiro real -- 12 competências/cartões mascarados, chrome/layout visível) e aceito. 2 rodadas de falha transitória (flakiness já documentada nesta run: contraste WCAG e smoke de `/redefinir-senha`) desapareceram em reruns isolados, confirmando não serem causadas por esta story.

**Riscos residuais:** cobertura visual/interação zero para o conteúdo real de `CartaoPendenteItem`/`CartaoRejeitadoItem` (conta real sem cartão pendente/rejeitado agora) -- mitigado parcialmente por verificação manual via `getComputedStyle`, registrado em deferred-work.md.
