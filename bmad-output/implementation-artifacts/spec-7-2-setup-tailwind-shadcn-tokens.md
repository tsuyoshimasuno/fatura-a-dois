---
title: 'Story 7.2: Setup do Tailwind + shadcn/ui e camada de tokens'
type: 'chore'
created: '2026-07-26'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/bmad-output/implementation-artifacts/epic-7-context.md'
warnings: []
baseline_revision: '450349fc0a2668ff1916c4f590536c20e5ce77b4'
final_revision: 'fe6ca5aaf3a0a4d3082e63ca334d1c276f018711'
---

<intent-contract>

## Intent

**Problem:** O produto hoje não tem Tailwind CSS nem nenhuma primitiva Radix instalada — todo o CSS é artesanal em `app/globals.css`. As próximas stories do Epic 7 (7.3+) vão vendorizar componentes reais do shadcn/ui (`npx shadcn add ...`), que dependem de Tailwind + `class-variance-authority` + `cn()` (clsx+tailwind-merge) + convenção de CSS variables (`--primary`, `--destructive`, etc.) para funcionar. Sem essa fundação, nenhuma story seguinte consegue vendorizar um componente.

**Approach:** Instalar Tailwind CSS v4 (via `@tailwindcss/postcss`, não o antigo `tailwind.config.js` de v3) **sem o Preflight** (reset de base do Tailwind) — o app já tem seu próprio reset artesanal (`* { box-sizing; padding: 0; margin: 0 }` em `app/globals.css`), e os dois reset coexistindo causariam conflito. Mapear os tokens de cor/radius já aprovados (rodadas 7/9/10) para dentro do namespace de tema do Tailwind (`@theme inline`) usando `var()` para apontar de volta às custom properties já existentes — nunca duplicando valor, só nome. Adicionar `components.json` (config do shadcn CLI) e `lib/utils.ts` (helper `cn()`) para que as Stories 7.3+ possam rodar `npx shadcn add <componente>` funcionando de primeira. Zero mudança visual: a suíte de QA (Story 7.1, `npm run test:e2e`) deve confirmar paridade de pixel no final.

## Boundaries & Constraints

**Always:** Excluir o Preflight do Tailwind (`@import "tailwindcss/theme.css" layer(theme); @import "tailwindcss/utilities.css" layer(utilities);` em vez do `@import "tailwindcss";` completo, que inclui `preflight.css`) — verificado na documentação oficial do Tailwind v4, é a forma suportada de usar utilities sem o reset de base. Mapear tokens via `@theme inline { --color-X: var(--Y); }` (a keyword `inline` é necessária para o valor resolver corretamente — sem ela a variável de tema não referencia o valor real, conforme documentação oficial). Não deixar Tailwind definir seu próprio dark mode — o comportamento **padrão** do `dark:` no Tailwind v4 já é via `prefers-color-scheme` (confirmado na documentação oficial: "By default this uses the prefers-color-scheme CSS media feature"), então nenhuma configuração adicional é necessária; **nunca** adicionar um `@custom-variant dark (&:is(.dark *))` ou qualquer override baseado em classe manual — isso reverteria o padrão correto para um mecanismo de toggle que o produto não tem.

**Block If:** Se depois de instalar e configurar, a suíte de QA (`npm run test:e2e`, especificamente `e2e/visual/visual.spec.ts` e `e2e/contrast/contrast.spec.ts`) apontar qualquer diferença visual ou de contraste não esperada (isto é, qualquer coisa além do que já está documentado como gap conhecido em `deferred-work.md`), NÃO prosseguir tentando "corrigir" ajustando valores às cegas — HALT com status `blocked`, blocking condition `regressão visual real detectada após setup do Tailwind`, e descreva exatamente o que mudou.

**Never:** Não rodar `npx shadcn init` interativo (ele faz perguntas e pode sobrescrever `app/globals.css`/criar `tailwind.config.ts` de v3 incompatível com v4) — construir `components.json` e os arquivos de setup manualmente, de forma determinística. Não adotar a escala derivada de radius do shadcn (`--radius-sm/md/lg/xl` calculados a partir de um valor base com offsets diferentes) — mapear TODOS os radius do Tailwind para o mesmo `var(--radius)` único já em uso, preservando a regra de uniformidade já documentada em `DESIGN.md` → Do's and Don'ts. Não definir `--color-card`/`--color-card-foreground` no tema do Tailwind — a Story 7.3+ decide separadamente como o `Card` real vai renderizar (mecanismo dual claro/escuro já documentado), não deve herdar de graça um valor `--card` genérico agora. Não instalar nenhum `@radix-ui/react-*` além de `@radix-ui/react-slot` (usado pelo padrão `asChild` do `Button`) — as demais primitivas (Dialog, Select, etc.) só entram quando um componente específico que precise delas for vendorizado, e `Select`/`AlertDialog` já foram explicitamente decididos como não-adotados nesta migração (ver `EXPERIENCE.md` → "Adoção real do shadcn/ui").

</intent-contract>

## Code Map

- `package.json` -- novas dependências: `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`.
- `postcss.config.mjs` -- novo, plugin `@tailwindcss/postcss`.
- `components.json` -- novo, config do shadcn CLI (aliases `@/components`, `@/lib`, `@/hooks`, css em `app/globals.css`, `cssVariables: true`, sem `tailwind.config` já que é v4).
- `lib/utils.ts` -- novo, helper `cn()` (clsx + tailwind-merge), convenção padrão consumida por todo componente shadcn.
- `app/globals.css` -- adicionar, no topo do arquivo (antes de `:root`): imports do Tailwind sem Preflight + bloco `@theme inline` mapeando os tokens de cor/radius já existentes para o namespace do Tailwind. Nenhuma regra existente é removida ou alterada.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- instalar as 8 dependências listadas no Code Map (`npm install tailwindcss @tailwindcss/postcss postcss class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-slot`).
- [x] `postcss.config.mjs` -- criar com o plugin `@tailwindcss/postcss`.
- [x] `components.json` -- criar com os aliases do projeto (`@/*` já existe em `tsconfig.json`).
- [x] `lib/utils.ts` -- criar a função `cn(...inputs: ClassValue[])`.
- [x] `app/globals.css` -- adicionar os imports do Tailwind (sem Preflight) e o bloco `@theme inline` no topo do arquivo, antes do `:root` existente. Mapear no mínimo: `--color-primary`/`--color-primary-foreground` (→ `--accent`/`--accent-foreground`), `--color-destructive`/`--color-destructive-foreground` (→ `--danger`/`--accent-foreground`, ver Design Notes), `--color-background`/`--color-foreground` (→ mesmos nomes), `--color-muted`/`--color-muted-foreground` (→ `--surface`/`--muted-foreground`), `--color-border`/`--color-input` (→ `--border`), `--color-ring` (→ `--accent`), e todo o namespace de radius do Tailwind (`--radius-sm/md/lg/xl`) para o mesmo `var(--radius)` único.
- [x] Rodar `npm run test:e2e` (suíte da Story 7.1) -- confirmar que a suíte visual/contraste não aponta nenhuma diferença além dos gaps já conhecidos em `deferred-work.md`.

**Acceptance Criteria:**
- Given o setup concluído, when `npx tsc --noEmit`/`npm run lint`/`npm run build` rodam, then completam sem erro novo.
- Given a suíte de QA (Story 7.1) rodando contra o app com o setup aplicado, when comparada ao baseline já capturado, then não aponta diferença visual nem de contraste além dos gaps pré-existentes já documentados.
- Given qualquer utilitário Tailwind com prefixo de cor (`bg-primary`, `text-destructive`, etc.) usado num teste manual isolado, when renderizado em claro e escuro, then resolve para o mesmo valor de cor já usado por `{colors.accent}`/`{colors.danger}` no modo correspondente -- sem duplicar hex, só referenciar via `var()`.
- Given `prefers-color-scheme: dark` no navegador, when qualquer classe `dark:` do Tailwind é usada (mesmo que nenhum componente use ainda nesta story), then dispara automaticamente sem nenhuma configuração adicional de dark mode (comportamento padrão do Tailwind v4, não `.dark` por classe).

## Design Notes

**Por que `--destructive-foreground` mapeia para `--accent-foreground`:** o produto não tem hoje um botão destrutivo *preenchido* (só `.btn-danger-outline`, texto/borda coloridos, fundo transparente) -- não existe um par "texto sobre fundo `--danger` sólido" calibrado. `--accent-foreground` já é o token "texto que troca de cor por modo para ficar legível sobre um preenchimento sólido" (branco no claro, preto no escuro) -- reaproveitado pelo mesmo motivo já documentado para `.badge-pending`/`.category-icon`. Se uma story futura vendorizar um `Button variant="destructive"` preenchido de verdade, o contraste desse par específico precisa ser reverificado antes de ir para produção (mesmo rigor já aplicado a todo token novo neste projeto) -- não é um problema desta story, que só estabelece o nome/referência, não usa o valor em nenhum componente ainda.

**Ordem dos imports em `app/globals.css`:** os imports do Tailwind (`@layer theme, base, components, utilities;` + os 2 imports individuais) e o bloco `@theme inline` devem vir **antes** do `:root` existente -- CSS custom properties em `:root` continuam funcionando independente da ordem, mas os imports do Tailwind precisam vir primeiro para as camadas (`@layer`) serem registradas na ordem certa.

**Todo o CSS artesanal pré-existente entra em `@layer base`** (achado real do review adversarial): sem isso, essas regras ficam descamadas ("unlayered"), e CSS descamado sempre vence sobre CSS em qualquer camada Tailwind (`base`/`components`/`utilities`), independente de especificidade -- uma classe utilitária aplicada num elemento ainda coberto por `.card`/`button`/`input` etc. perderia a cascata silenciosamente a partir da Story 7.3. `base` é a camada certa (mais fraca que `utilities`), coerente com o papel que esse CSS já cumpre.

**`components.json`: `"style": "new-york"`** -- escolhida por ser o preset mais compacto/denso dos dois oferecidos pelo shadcn CLI (a alternativa, "default", tem mais padding/whitespace interno por componente) -- mais alinhado à régua "recibo organizado, não app de consumo" já estabelecida em `DESIGN.md` do que o preset default, mais próximo de estética de dashboard SaaS. Não é uma escolha estética arbitrária sem critério, só não tinha sido registrada em prosa (JSON não comporta comentário).

**Tokens `secondary`/`popover`/`accent` (papel do shadcn, distinto do `--accent` do produto) adicionados** após o review adversarial apontar que a Story 7.3+ (`npx shadcn add`) provavelmente vendoriza componentes que referenciam esses papéis (ex.: item de menu com hover, painel flutuante) -- sem eles, a primeira utility `bg-accent`/`bg-secondary`/`bg-popover` usada resolveria para nada. Valores mapeados ao par semântico mais próximo já existente (ver comentário no próprio `@theme inline`), a revisar quando o primeiro componente real que os use for vendorizado.

**`tailwindcss`/`@tailwindcss/postcss`/`postcss` movidos para `devDependencies`** (achado do review adversarial) -- são ferramentas de build, sem import em tempo de execução, mesma convenção já usada para `drizzle-kit`/`eslint`/`typescript` neste projeto. Vercel instala `devDependencies` durante o build independente de `NODE_ENV`, então isso não quebra o deploy.

**Riscos encaminhados, não corrigidos nesta story** (achados reais do review, mas fora do escopo de "setup de tokens, zero componente"): `--color-ring` (shadcn, mecanismo `box-shadow`) vai coexistir com o `outline: 2px solid var(--accent)` já usado em `input:focus` -- dois mecanismos de foco visualmente diferentes quando a Story 7.3+ vendorizar o primeiro componente interativo; nenhum componente usa `--color-ring` ainda, então não é um bug ativo hoje. Detecção automática de conteúdo do Tailwind v4 (`@source`) não pôde ser exercitada de verdade (nenhuma classe utilitária existe em nenhum `.tsx` ainda) -- validação real fica para a Story 7.3, primeira a introduzir uma classe utilitária de verdade.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros novos
- `npm run lint` -- expected: sem erros novos
- `npm run build` -- expected: build de produção limpo (confirma que o setup do Tailwind não quebra o build, distinto do `next dev` usado pela suíte de QA)
- `npm run test:e2e` -- expected: mesmas 54 checagens da Story 7.1, sem diferença visual/contraste nova além dos gaps já documentados

**Manual checks (if no CLI):**
- Inspecionar visualmente (via screenshot da própria suíte, `e2e/__snapshots__` atualizado ou não) que nenhuma tela mudou de aparência.

## Review Triage Log

### 2026-07-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5 (high 1, medium 2, low 2)
- defer: 0
- reject: 9 (high 0, medium 0, low 9)
- addressed_findings:
  - `[high]` `[patch]` CSS artesanal pré-existente ficava descamado ("unlayered") -- CSS descamado sempre vence sobre CSS em `@layer` (Tailwind), independente de especificidade. A partir da Story 7.3, qualquer classe utilitária aplicada num elemento ainda coberto por `.card`/`button`/`input`/etc. perderia a cascata silenciosamente. Corrigido envolvendo todo o CSS existente (de `:root` até o fim do arquivo) em `@layer base`.
  - `[medium]` `[patch]` Tokens shadcn `secondary`/`popover`/`accent` (papel de hover/ênfase, distinto do `--accent` de marca do produto) estavam ausentes do `@theme inline` -- a primeira utility `bg-accent`/`bg-secondary`/`bg-popover` usada nas Stories 7.3+ resolveria para nada. Adicionados, mapeados ao papel semântico mais próximo já existente (`--surface`/`--background`/`--foreground`) ou a um valor novo derivado (`--color-accent` via `color-mix` sobre `--foreground`, nunca reaproveitando o `--accent` de marca do produto).
  - `[medium]` `[patch]` `tailwindcss`/`@tailwindcss/postcss`/`postcss` estavam em `dependencies` quando são ferramentas de build sem import em runtime -- movidos para `devDependencies`, mesma convenção já usada para `drizzle-kit`/`eslint`/`typescript`. `package-lock.json` resincronizado via `npm install`.
  - `[low]` `[patch]` `lucide-react: "^1.27.0"` -- verificado contra o registro npm (`npm view lucide-react dist-tags`): é de fato a versão `latest` publicada, não um erro de digitação/alucinação. Nenhuma mudança necessária, achado confirmado como falso.
  - `[low]` `[patch]` `"style": "new-york"` em `components.json` escolhido sem rationale registrado (achado do review sobre a cultura de documentação já estabelecida no projeto) -- justificativa adicionada nas Design Notes acima (preset mais compacto, mais alinhado à régua "recibo organizado" do que o preset default).

Achados rejeitados (9, todos com verificação/justificativa): "nenhuma evidência de que a verificação rodou" -- reexecutada de forma independente pelo orquestrador após os patches (tsc/lint/build/test:e2e, 2x consecutivas, 54/54); `components.json` nunca exercitado com `npx shadcn add` de verdade -- escopo correto é a Story 7.3 (primeira a vendorizar um componente real), não um defeito desta story; `--color-ring` (mecanismo box-shadow do shadcn) vai coexistir com `outline` já usado em `input:focus` -- nenhum componente usa `--color-ring` ainda, não é bug ativo, risco encaminhado nas Design Notes para a Story 7.3+; detecção automática de conteúdo do Tailwind v4 não exercitada -- não há nenhuma classe utilitária em nenhum `.tsx` ainda para detectar, validação real só é possível a partir da Story 7.3; `package-lock.json` não incluído no diff revisado pelos agentes -- confirmado independentemente via `git status`/build bem-sucedido que o lockfile foi de fato atualizado; tokens sem fallback explícito -- verificado que todos os `var()` referenciados (`--accent`, `--danger`, `--surface`, etc.) já existem no `:root` do mesmo arquivo; colapso da escala de radius (`sm/md/lg/xl` para o mesmo valor) -- comportamento INTENCIONAL, decisão explícita já registrada no Boundaries do spec, não uma omissão; `--destructive-foreground` reaproveitando `--accent-foreground` -- já tinha justificativa própria documentada nas Design Notes antes mesmo do review; warning de lint em `postcss.config.mjs` (`import/no-anonymous-default-export`) -- padrão comum e aceitável para arquivo de configuração, não seria mais claro atribuído a uma variável antes de exportar.

## Auto Run Result

Status: done
Follow-up review recommended: false -- o achado de maior severidade (camada CSS) foi corrigido na causa raiz (envolver o CSS existente em `@layer base`) e revalidado com 2 execuções completas e consecutivas da suíte de QA (54/54), incluindo build de produção limpo. Mudança estrutural real (afeta a cascata do CSS inteiro do app), mas sem nenhum componente novo renderizado ainda -- risco de regressão silenciosa fica concentrado nas Stories 7.3+ (primeiras a de fato usar classes utilitárias lado a lado com o CSS legado), não nesta story.

Tailwind CSS v4 + fundação do shadcn/ui instalados: `postcss.config.mjs`, `components.json`, `lib/utils.ts` (`cn()`), `app/globals.css` (imports do Tailwind sem Preflight + `@theme inline` mapeando cor/radius já aprovados + CSS legado envolvido em `@layer base`). Dependências: `tailwindcss`, `@tailwindcss/postcss`, `postcss` (devDependencies); `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot` (dependencies).

**Verificação:** `npx tsc --noEmit`, `npm run lint` (0 erros, 1 warning estilístico pré-existente ao padrão do arquivo), `npm run build` (produção, limpo) e `npm run test:e2e` -- rodados 2x depois dos patches do review, 54/54 consistente nas duas execuções, idêntico ao baseline da Story 7.1. Zero mudança visual confirmada.

**Risco residual:** nenhum bloqueante. `--color-ring` (duplo mecanismo de foco) e detecção de conteúdo do Tailwind ficam como pontos de atenção documentados para a Story 7.3, não lacunas silenciosas.
