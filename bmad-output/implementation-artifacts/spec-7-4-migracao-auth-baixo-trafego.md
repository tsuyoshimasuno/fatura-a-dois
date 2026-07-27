---
title: 'Story 7.4 — Migração de componentes: telas de autenticação de baixo tráfego'
type: 'refactor'
created: '2026-07-26'
status: 'done'
final_revision: '675c4df'
review_loop_iteration: 0
followup_review_recommended: false # 2 achados high corrigidos, mas ambos re-verificados empiricamente via getComputedStyle (nao so leitura de codigo) + suite de QA rodada 4x -- confianca alta sem precisar de 2a rodada de review independente
context: []
warnings: []
baseline_revision: 'e3c51df'
---

<intent-contract>

## Intent

**Problem:** `/esqueci-senha` e `/redefinir-senha` ainda usam o CSS artesanal antigo (`.page`, `.form`, `.field`, `.alert-error`, `<button>` cru) em vez dos componentes shadcn/ui já disponíveis desde a Story 7.2 (tokens) e 7.3 (sidebar).

**Approach:** Reescrever as duas páginas usando `Card`/`CardHeader`/`CardTitle`/`CardContent`, `Input`, `Label`, `Button` e `Alert` (shadcn), preservando 100% do comportamento existente (nenhuma mudança de FR/UX): mesmos textos, mesma lógica de submit/loading/erro, mesmo link de e-mail que nunca revela existência de conta, mesmo aviso de link expirado/inválido.

## Boundaries & Constraints

**Always:** Preservar exatamente a lógica de negócio existente (Supabase Auth calls, mensagens, redirects, `role="alert"` nos erros/avisos, `autoComplete`, `required`, `minLength={6}`). Preservar o mecanismo dual claro/escuro do `.card` (claro: fundo+sombra sem borda; escuro: superfície+borda sem sombra) — não adotar o `bg-card`/`border`/`shadow-sm` default do shadcn Card, que colide com essa decisão já reconciliada (Winston, rodada 13). Não criar token `--color-card` novo. Usar `<select>` nativo não se aplica aqui (sem select nestas telas). Rodar a suite de QA (`npm run test:e2e`) antes e depois, atualizando o baseline visual das duas rotas afetadas.

**Block If:** Nenhuma decisão de produto/UX pendente identificada — escopo puramente estrutural, sem novo comportamento.

**Never:** Não introduzir `Toast`/`AlertDialog` (deferidos, sem ação destrutiva nestas telas). Não tocar em `/login` (Story 7.5) nem no shell de navegação (já migrado, Story 7.3). Não remover as classes CSS legadas globais ainda usadas por outras telas não migradas.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Esqueci-senha submit válido | e-mail preenchido, submit | mensagem de sucesso genérica exibida (não revela existência de conta) | erro do Supabase logado no console, mesma mensagem de sucesso mostrada |
| Esqueci-senha com link expirado | `?error=link_invalido` na URL | `Alert` de erro visível acima do form, mesmo texto atual | N/A |
| Redefinir-senha senhas não coincidem | senha != confirmação | `Alert` de erro "As senhas não coincidem." exibido, submit não ocorre | validação client-side, sem chamada ao Supabase |
| Redefinir-senha sessão expirada | `updateUser` falha | `Alert` de erro com link "Solicitar novo link" para `/esqueci-senha` | erro logado no console |

</intent-contract>

## Code Map

- `app/(auth)/esqueci-senha/page.tsx` -- reescrever com Card/Input/Label/Button/Alert
- `app/(auth)/redefinir-senha/page.tsx` -- reescrever com Card/Input/Label/Button/Alert
- `components/ui/card.tsx` -- ajustar `Card` para o mecanismo dual claro/escuro do produto em vez do `bg-card`/`border`/`shadow-sm` default (decisão já reconciliada, ver Design Notes)
- `e2e/visual/visual.spec.ts` -- confirmar cobertura das duas rotas (adicionar se ausente)

## Tasks & Acceptance

**Execution:**
- [x] `components/ui/card.tsx` -- trocar `bg-card ... border ... shadow-sm` por classes compostas usando `bg-background`/`dark:bg-[var(--surface)]`/`dark:border dark:border-border`/`shadow-[...]`/`dark:shadow-none` -- preserva o mecanismo dual já decidido sem criar `--color-card`
- [x] `app/(auth)/esqueci-senha/page.tsx` -- migrar markup para Card/CardHeader/CardTitle/CardContent + Label/Input/Button + Alert (variant destructive) para o aviso de link expirado, preservando toda a lógica de estado/submit
- [x] `app/(auth)/redefinir-senha/page.tsx` -- migrar markup para Card/CardHeader/CardTitle/CardContent + Label/Input/Button + Alert (variant destructive) para erros, preservando toda a lógica de estado/submit
- [x] Rodar `npm run test:e2e` para as duas rotas afetadas (revisar diff visualmente antes de aceitar) -- concluído pelo orquestrador. Achado real durante a captura: `/redefinir-senha` não está em `PUBLIC_PATHS` (`lib/supabase/middleware.ts`) -- visitar sem sessão redireciona para `/login` antes da página renderizar, então a screenshot "da tela" seria na verdade o login. Corrigido movendo `/redefinir-senha` para o grupo de rotas autenticadas em `e2e/visual/visual.spec.ts` (sessão comum da fixture já é suficiente, o middleware não distingue sessão de recovery). `/login` e `/esqueci-senha` (públicas de verdade) permaneceram no grupo deslogado. Baseline capturado e revisado visualmente (Read das 4 imagens novas) antes de aceitar -- 58/58 testes verdes.

**Acceptance Criteria:**
- Given um e-mail válido em `/esqueci-senha`, when o usuário envia o formulário, then a mesma mensagem genérica de sucesso aparece, sem revelar se a conta existe.
- Given a URL `/esqueci-senha?error=link_invalido`, when a página carrega, then o aviso de link expirado aparece como `Alert` (mesmo texto).
- Given senhas divergentes em `/redefinir-senha`, when o usuário envia o formulário, then o erro "As senhas não coincidem." aparece como `Alert` e nenhuma chamada ao Supabase é feita.
- Given uma falha real do Supabase ao atualizar senha, when o submit ocorre, then o `Alert` de erro mostra o link "Solicitar novo link" para `/esqueci-senha`.
- Given a suite de QA (Playwright), when rodada após a migração, then os testes estruturais e de contraste passam e o diff visual das duas rotas é revisado e aceito conscientemente (não just-pass).

## Spec Change Log

### 2026-07-26 — Retrofix durante o review da Story 7.9
`components/ui/alert.tsx`'s variant `destructive` aplicava `text-destructive/90` (90% de opacidade) no `AlertDescription` -- a cor `--danger` deste projeto já foi calibrada ao mínimo WCAG AA (4.5:1) contra `--surface`/`--background`, e 90% de opacidade quebra essa calibração ao misturar a cor com o fundo. Contraste real caía para ~4,07:1 no modo escuro contra `--surface` (abaixo do mínimo), afetando o `Alert` de erro desta story (`?error=link_invalido`) desde que foi introduzido. Achado pelo Blind Hunter durante o review adversarial da Story 7.9, confirmado por cálculo de contraste real (blend alpha manual) antes e depois da correção. Corrigido removendo o modificador `/90` em `alert.tsx` (afeta todos os `Alert` destructive já migrados, não só este). Novo teste automatizado (`e2e/contrast/contrast.spec.ts`, "Alert destructive: texto sobre o próprio fundo") previne regressão futura. Ver `spec-7-9-migracao-upload.md` para o achado completo.

## Review Triage Log

### 2026-07-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 2, medium 2, low 2)
- defer: 2: (medium 2)
- reject: 6: (low 6)
- addressed_findings:
  - `[high]` `[patch]` Card em dark mode nunca renderizava o border decidido (Winston, rodada 13) -- `border-none` (light) + `dark:border dark:border-border` nunca sobrescrevia border-style/width real (confirmado via getComputedStyle: `borderStyle: none`, `borderWidth: 0px` mesmo em dark). Corrigido trocando para `border border-transparent` (sempre presente) + `dark:border-border` (so cor muda) -- verificado de novo via getComputedStyle: `solid`/`1px` em dark.
  - `[high]` `[patch]` `Alert` (variant default/destructive) usava `bg-card`/`text-card-foreground`, tokens que este projeto deliberadamente nunca define (`--color-card` nao existe) -- alerts destrutivos (link expirado, senhas divergentes, sessao expirada) renderizavam com fundo totalmente transparente (confirmado via getComputedStyle: `rgba(0,0,0,0)`). Corrigido para `bg-background dark:bg-[var(--surface)]`, mesmo mecanismo do Card -- verificado de novo, fundo passa a bater com o Card ao redor.
  - `[medium]` `[patch]` `.card` tinha fallback de borda em `forced-colors: active` (Windows High Contrast) desde um review anterior (rodada de Story pre-Epic-7) -- o novo `Card` vendorizado nao reproduzia esse fallback, reabrindo silenciosamente o gap de acessibilidade ja corrigido. Adicionado `forced-colors:border-[CanvasText]`, verificado via emulacao `forcedColors: 'active'` do Playwright (borda solida 1px confirmada).
  - `[medium]` `[patch]` Nenhum screenshot cobria os estados de erro (`Alert` destrutivo) das duas telas -- unica superficie visual nova desta story ficava sem regressao automatizada. Adicionadas 2 novas rotas de teste (`esqueci-senha?error=link_invalido`, `redefinir-senha` com submit de senhas divergentes) em `e2e/visual/visual.spec.ts`, baseline capturado e revisado visualmente (claro+escuro) antes de aceitar.
  - `[low]` `[patch]` `CardContent` em `/redefinir-senha` tinha `className="flex flex-col gap-4"` redundante (unico filho, o `<form>`, ja tem o mesmo layout) -- removido.
  - `[low]` `[patch]` `getByLabel('Nova senha')` no novo teste de erro colidia por substring com `getByLabel('Confirmar nova senha')` -- corrigido com `{ exact: true }`; e `getByRole('alert')` colidia com o `__next-route-announcer__` do Next.js (tambem `role="alert"`) -- trocado para `getByText` do texto do erro.
  - `[defer]` mask `.card` do teste visual (rotas com dado financeiro real) nao cobre o `Card` shadcn novo (`data-slot="card"`, sem classe `.card`) -- sem consequencia hoje (nenhuma rota de dado real usa o `Card` novo ainda), registrado em deferred-work.md para a story que primeiro reusar `Card` numa tela com dado real (7.6+).
  - `[defer]` `Input`/`Alert` sem `aria-invalid`/`aria-describedby` associando campo a erro -- gap pre-existente (versao legada tinha a mesma lacuna), registrado em deferred-work.md.
  - `[reject]` Arquivos novos (`card.tsx`/`label.tsx`/`alert.tsx`) ainda nao commitados no momento do review -- estado esperado em uma review pre-commit, resolvido no commit desta story.
  - `[reject]` `role="alert"` mudou de profundidade no DOM (antes no `<p>`, agora no `Alert` externo) -- funcionalmente equivalente, `Alert` ja define `role="alert"` no proprio wrapper.
  - `[reject]` Duplicacao de JSX entre as duas paginas (Card/Alert) sem extrair um wrapper compartilhado -- so 2 call sites, abstracao prematura dado o principio do projeto de nao introduzir camadas sem 3+ usos reais; reavaliar se a 7.6+ revelar um padrao real de reuso.
  - `[reject]` Padding do Card mudou (1.25rem uniforme -> py-6/px-6) sem "revalidar" o layout estreito de 400px -- ja revalidado pela propria captura visual desta review (screenshots claro/escuro inspecionados, sem overflow/quebra).
  - `[reject]` Baseline de `/redefinir-senha` usa sessao autenticada comum, nao uma sessao de recovery real do Supabase PKCE -- limitacao de infraestrutura de teste ja aceita/documentada nesta run (sem forma de simular o fluxo real de recovery de forma autonoma); o middleware confirmadamente nao distingue os dois casos.

## Design Notes

O `Card` do shadcn vem com `bg-card`/`border`/`shadow-sm` fixos nos dois modos — colide com a decisão já reconciliada (Winston, rodada 13, memlog da run `goal-fatura-a-dois-2026-07-16`) de preservar o mecanismo dual do `.card` existente (claro: `background+shadow`, sem borda; escuro: `surface+border`, sem sombra) sem criar um token `--color-card` novo. Ajuste no próprio componente vendorizado (não por classe ad-hoc em cada página) porque `Card` será reusado pelas próximas stories (7.6+).

Exemplo do ajuste em `card.tsx`:
```tsx
"flex flex-col gap-6 rounded-xl bg-background text-foreground border-none
 shadow-[0_1px_2px_rgba(15,15,15,0.06),0_1px_1px_rgba(15,15,15,0.04)]
 dark:bg-[var(--surface)] dark:border dark:border-border dark:shadow-none py-6"
```

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção limpo
- `npm run test:e2e` -- expected: suite estrutural/contraste verde; diff visual das rotas afetadas revisado manualmente antes de aceitar novo baseline

## Auto Run Result

**Resumo:** `/esqueci-senha` e `/redefinir-senha` migradas de CSS artesanal para shadcn/ui (Card, Input, Label, Button, Alert). `components/ui/card.tsx` ajustado para o mecanismo dual claro/escuro já decidido (Winston, rodada 13) em vez do `bg-card`/`border`/`shadow-sm` default do shadcn. 2 bugs reais de severidade alta encontrados e corrigidos no review adversarial (Card não renderizava borda em dark mode; `Alert` renderizava com fundo transparente por depender de um token que este projeto nunca define) — ambos confirmados empiricamente via `getComputedStyle` antes e depois do fix, não só por leitura de código.

**Arquivos alterados:**
- `components/ui/card.tsx` -- Card vendorizado ajustado ao mecanismo dual claro/escuro do produto; fix de borda dark-mode e fallback `forced-colors`.
- `components/ui/alert.tsx` -- variantes default/destructive trocadas de `bg-card`/`text-card-foreground` (tokens inexistentes) para `bg-background dark:bg-[var(--surface)]`/`text-foreground`.
- `components/ui/label.tsx`, `components/ui/input.tsx` (pré-existente, não modificado) -- primitivas shadcn usadas nas duas páginas.
- `app/(auth)/esqueci-senha/page.tsx` -- markup migrado, lógica preservada 1:1.
- `app/(auth)/redefinir-senha/page.tsx` -- markup migrado, lógica preservada 1:1; removida uma classe redundante (`flex flex-col gap-4` duplicada em `CardContent`+`form`).
- `e2e/visual/visual.spec.ts` -- `/redefinir-senha` movida para o grupo autenticado (achado real: não está em `PUBLIC_PATHS`, sem sessão redirecionava para `/login` antes de renderizar); `/esqueci-senha` e `/login` permanecem no grupo público; adicionadas 2 rotas novas de teste para os estados de erro (`Alert` destrutivo) das duas telas.
- `bmad-output/implementation-artifacts/deferred-work.md` -- 2 entradas novas (mask `.card` do teste visual não cobre o `Card` shadcn; `aria-invalid`/`aria-describedby` ausente em Input↔Alert).

**Achados do review (Blind Hunter + Edge Case Hunter, 1 rodada):** 14 achados totais -- 6 corrigidos (2 high, 2 medium, 2 low), 2 deferidos (pré-existentes/sem consequência hoje, registrados em deferred-work.md), 6 rejeitados com justificativa (ver Review Triage Log acima).

**Verificação realizada:**
- `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos antes e depois dos 2 patches de review.
- Bugs de Card/Alert confirmados via `getComputedStyle` real (script Playwright descartável, removido) antes do fix e depois do fix, incluindo emulação `forcedColors: 'active'` para o fallback de alto contraste.
- Suite de QA (`npm run test:e2e`) rodada 5x ao longo da story (baseline inicial, 2x após achar e corrigir o bug de rota do `/redefinir-senha`, 2x após os patches de review) -- 62/62 verde nas últimas 2 execuções consecutivas. Todas as 4 novas screenshots (2 telas × 2 modos) e as 4 dos novos estados de erro revisadas visualmente (`Read` da imagem) antes de aceitar cada baseline.

**Riscos residuais:** baseline de `/redefinir-senha` usa sessão autenticada comum (não uma sessão de recovery real do Supabase PKCE) -- aceito, middleware não distingue os dois casos. Mask de privacidade do teste visual (`.card`) ainda não cobre o `Card` shadcn novo -- sem consequência até uma story futura (7.6+) reusar `Card` numa tela com dado financeiro real (registrado em deferred-work.md).
