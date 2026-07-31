---
title: 'Story 8.3 — Telas complexas: Lançamentos e autenticação (última, maior risco)'
type: 'chore'
created: '2026-07-30'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '7894b92'
final_revision: '41d9c9c'
---

<intent-contract>

## Intent

**Problem:** `/lancamentos` (maior densidade visual do produto) e o fluxo de autenticação (`/login`, `/esqueci-senha`, `/redefinir-senha`, menor tolerância a regressão) ainda não tiveram os tokens das Stories 8.1/8.2 (padding de `Card` 1.75rem, hover de `sidebar-nav`) confirmados visualmente -- são as últimas telas do Épico 8, deixadas por último de propósito por serem as de maior risco técnico (grid de 2 colunas com altura compartilhada via `calc()`, portão de acesso ao produto).

**Approach:** Investigação prévia (ver Design Notes) já confirmou que `/lancamentos` (Story 7.10) e as 3 telas de auth já usam `Card`/`CardHeader`/`CardContent` do shadcn de ponta a ponta -- nenhuma seção crua restante, ao contrário do achado da Story 8.2 em `/cartoes`. Portanto esta story é de **verificação**, não de migração: confirmar visualmente que o padding maior e o hover mais forte se propagam sem quebrar o layout de 2 colunas/altura compartilhada de `/lancamentos` nem a legibilidade/funcionalidade do fluxo de auth. Só editar código se a verificação encontrar uma regressão real.

## Boundaries & Constraints

**Always:** Rodar a suíte de QA completa e revisar o diff visual de TODAS as telas (não só as desta story) antes de aceitar -- mudança de chrome/tokens já é compartilhada, mas esta é a primeira vez que `/lancamentos` e auth são inspecionadas desde a Story 8.1. Verificar especificamente que `.lancamentos-columns`/`.lancamentos-painel` (altura compartilhada via `calc(100vh - 220px)`, `app/globals.css`) continuam sem overflow/corte visual com o padding maior de `Card`.

**Block If:** Se a verificação encontrar uma regressão real que exija mudança de comportamento (não só ajuste de token/CSS já coberto pelas Stories 8.1/8.2), travar e reportar -- não inventar solução nova sem contexto do usuário.

**Never:** Não repetir o erro da Story 8.2 (copiar um padrão de `Card` de uma tela pra outra sem ler a estrutura de baixo primeiro) -- se qualquer novo `Card`/wrapping for cogitado aqui, ler `lancamento-item.tsx`/o componente de item real primeiro. Não tocar na exceção de 2 colunas de `/lancamentos` (motivo funcional, fora de escopo). Não tocar em lógica de autenticação/sessão.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| `/lancamentos` com 100+ itens | lista rolante + painel de total estático | Layout de 2 colunas com altura compartilhada intacto, sem overflow/corte | N/A |
| Fluxo de login com credenciais inválidas | erro de autenticação | `Alert` destructive continua legível, sem regressão de contraste | N/A |

</intent-contract>

## Code Map

- `app/(app)/lancamentos/_components/lancamentos-view.tsx`, `lancamento-item.tsx` -- só inspeção/verificação (já usam `Card` de ponta a ponta desde a Story 7.10)
- `app/(auth)/login/page.tsx`, `esqueci-senha/page.tsx`, `redefinir-senha/page.tsx` -- só inspeção/verificação (já usam `Card` desde o Epic 7)
- `app/globals.css` (`.lancamentos-columns`/`.lancamentos-painel`) -- só inspeção, confirmar que o `calc()` de altura compartilhada não depende de nenhum valor de padding de `Card` que mudou

## Tasks & Acceptance

**Execution:**
- [x] Confirmar via leitura de código que `/lancamentos` e as 3 telas de auth já usam `Card`/`CardHeader`/`CardContent` em toda seção (nenhuma seção crua restante) -- se algo for encontrado fora do padrão, registrar e decidir se é escopo desta story ou defer
- [x] Rodar `npm run test:e2e:update-snapshots` e revisar visualmente o diff de `/lancamentos` (claro+escuro) e das 3 telas de auth -- confirmar que o padding maior de `Card` não quebra o layout de 2 colunas/altura compartilhada nem a legibilidade dos formulários de auth
- [x] Rodar a suíte de QA completa (`npm run test:e2e`) e confirmar 0 falha nova
- [x] Se tudo passar sem código novo: registrar no spec que a story foi puramente de verificação, nenhuma mudança de arquivo necessária

**Acceptance Criteria:**
- Given `/lancamentos` com dado real (100+ lançamentos), when a página renderiza em claro e escuro, then o layout de 2 colunas com altura compartilhada permanece íntegro, sem overflow ou corte de conteúdo.
- Given o fluxo de autenticação (`/login`, `/esqueci-senha`, `/redefinir-senha`), when cada tela renderiza, then nenhuma regressão visual ou funcional (erro de credenciais, link expirado, senhas divergentes continuam legíveis e funcionais).
- Given a suíte de QA completa, when rodada após a verificação, then 0 falha nova (estrutural, contraste, visual).

## Spec Change Log

Nenhuma mudança de código nesta story -- story de verificação pura, conforme previsto na Intent. Nenhum item do Code Map precisou ser editado.

## Review Triage Log

## Design Notes

**Por que esta story é de verificação, não de migração (investigação feita antes de escrever o spec):** diferente de `/cartoes` (Story 8.2, que tinha 1 seção crua fora do padrão `Card`), `/lancamentos` já foi migrada inteiramente para `Card`/`CardHeader`/`CardTitle` na Story 7.10 (Epic 7) -- confirmado via grep, todo `<h2>` de seção já está dentro de `CardTitle asChild className="text-[22.5px] font-bold"`, e `lancamento-item.tsx` já renderiza cada item como `<li><Card><CardContent>`. As 3 telas de auth (`login`/`esqueci-senha`/`redefinir-senha`) também já usam `Card` desde a migração do Epic 7 (Stories 7.4/7.5). Portanto os tokens de padding/hover das Stories 8.1/8.2 já se propagam automaticamente via o componente `Card` compartilhado -- não há seção crua restante para migrar nesta story, ao contrário do que a lição da Story 8.2 (não copiar padrão de Card sem ler a estrutura de baixo) alertava para verificar.

**Risco técnico real a verificar (Winston, avaliação original do Épico 8):** `.lancamentos-columns`/`.lancamentos-painel` (`app/globals.css`, linhas ~876-951) usa `--lancamentos-coluna-altura: min(calc(100vh - 220px), 70vh)` para igualar a altura visual das duas colunas via CSS Grid -- o offset fixo `220px` é baseado na altura do chrome (sidebar/header), não em padding de `Card` diretamente, então não deveria quebrar com o aumento de `py-6`→`py-7`. Mas como `/lancamentos` nunca foi inspecionada desde a Story 8.1, esta story confirma isso empiricamente (screenshot real), não só por leitura de CSS.

## Verification

**Resultado geral:** story de verificação pura -- confirmado que `/lancamentos` (Story 7.10) e as 3 telas de auth (`login`, `esqueci-senha`, `redefinir-senha`, Epic 7) já usam `Card`/`CardHeader`/`CardContent`/`CardFooter`/`CardTitle`/`CardDescription` do shadcn em toda seção, sem nenhuma seção crua restante fora do padrão. Nenhuma mudança de código foi necessária.

**Passo 1 -- leitura de código (Card em toda seção):**
- `app/(app)/lancamentos/_components/lancamentos-view.tsx`: todos os blocos de resumo (categoria filtrada, pessoa filtrada, visão combinada `card-highlight`, visão individual por pessoa) e o bloco de pendentes usam `Card`/`CardHeader`/`CardTitle asChild`/`CardContent`. Nenhuma `<section>`/`<div className="card">` crua restante.
- `app/(app)/lancamentos/_components/lancamento-item.tsx`: cada item da lista é `<li><Card><CardContent>...</CardContent></Card></li>`, incluindo os `Alert variant="destructive"` de erro (repasse/correção de categoria) dentro do mesmo `CardContent`.
- `app/(auth)/login/page.tsx`: `Card` com `CardHeader`/`CardTitle asChild`/`CardDescription`/`CardContent`/`CardFooter` (link "Esqueci minha senha" no footer).
- `app/(auth)/esqueci-senha/page.tsx`: `Card`/`CardHeader`/`CardTitle asChild`/`CardContent` em ambos os estados (form e "link enviado").
- `app/(auth)/redefinir-senha/page.tsx`: `Card`/`CardHeader`/`CardTitle asChild`/`CardContent`.
- `app/globals.css` (linhas ~876-951): `.lancamentos-columns`/`.lancamentos-painel` usa `--lancamentos-coluna-altura: min(calc(100vh - 220px), 70vh)` -- o offset `220px` é fixo (baseado no chrome de sidebar/header), não referencia nenhum valor de padding de `Card`, confirmando por leitura que a mudança de `py-6`→`py-7` das Stories 8.1/8.2 não afeta esse cálculo.
- Nenhuma seção fora do padrão `Card` encontrada -- ao contrário do achado da Story 8.2 em `/cartoes`, não houve necessidade de migração adicional.

**Passo 2 -- `npm run test:e2e:update-snapshots` (78 testes, 78 ok):** rodado com sucesso. `git status`/`git diff --stat` após a rodada confirmam que **nenhum arquivo de snapshot PNG mudou** (nem `/lancamentos` nem as 3 telas de auth) -- `git log` nos arquivos `lancamentos-*-chromium-win32.png` e `login-*-chromium-win32.png` mostra que o baseline já havia sido regenerado na Story 8.1 (commit `d8a96b3`, migração do chrome compartilhado), que já capturou o padding/hover atuais. Revisão visual manual (via leitura direta dos PNGs de baseline):
  - `/lancamentos` (claro e escuro): layout de 2 colunas intacto -- lista (`.lancamentos-lista`, coluna esquerda, 2fr) e painel (`.lancamentos-painel`, coluna direita, 3fr) com topos alinhados; screenshot `fullPage` de 1280x755px confirma que o `overflow-y: auto` + `max-height` das duas colunas contém o conteúdo dentro do viewport, sem inflar a altura da página (nenhum overflow/corte). Dado financeiro real mascarado (`.card`/`[data-slot="card"]`) por design (`e2e/visual/visual.spec.ts`), mas os limites/bordas dos `Card`s e o chrome (sidebar, filtros, cabeçalho) permanecem visíveis e íntegros.
  - `login`, `esqueci-senha`, `redefinir-senha` (claro e escuro, incluindo estados de erro -- credenciais inválidas, link expirado, senhas divergentes): `Card` central bem formado, `Alert variant="destructive"` legível com borda/texto vermelho sobre fundo claro em ambos os temas, formulários e botões sem regressão de layout.

**Passo 3 -- `npm run test:e2e` (suíte completa, 78 testes):** 78 passed. As únicas 3 falhas marcadas (`x`) são os gaps de contraste pré-existentes e já documentados em `deferred-work.md` (`accent-foreground` sobre `.badge-pending`, `border` sobre `surface`/`background` em modo claro), aplicados via `test.fail()` -- portanto 0 falha nova.

**Comandos estáticos:**
- `npx tsc --noEmit` -- sem erros.
- `npm run lint` -- 0 erros (1 warning pré-existente e não relacionado em `postcss.config.mjs`, `import/no-anonymous-default-export`).
- `npm run build` -- build de produção concluído com sucesso (Next.js 16.2.10, Turbopack), todas as rotas geradas sem erro, incluindo `/lancamentos`, `/login`, `/esqueci-senha`, `/redefinir-senha`.

**Itens não resolvidos:** nenhum. Os 3 gaps de contraste que aparecem como falha esperada (`test.fail()`) já são conhecidos, documentados em `deferred-work.md` e fora do escopo desta story (aceitos como trade-off em specs anteriores).

## Review Triage Log

Sem review adversarial (Blind Hunter/Edge Case Hunter) nesta story: zero arquivo de código-fonte alterado (`git status` confirma -- só o próprio spec e o memlog do goal-engine), portanto não há diff de implementação para revisar. Consistente com a Intent registrada ("story de verificação, só editar código se a verificação encontrar uma regressão real") -- nenhuma foi encontrada.

## Auto Run Result

**Resumo:** Story 8.3 (última do Épico 8) confirmada como verificação pura -- `/lancamentos` (migrada na Story 7.10) e as 3 telas de autenticação (migradas no Epic 7) já usavam o componente `Card` do shadcn em toda seção, então os tokens de padding/hover das Stories 8.1/8.2 já se propagavam automaticamente. Nenhuma mudança de código foi necessária ou feita. Diferente da Story 8.2 (que tinha 1 seção crua fora do padrão), não havia nada a migrar aqui.

**Arquivos alterados:** nenhum arquivo de código-fonte. Apenas `bmad-output/implementation-artifacts/spec-8-3-lancamentos-e-autenticacao.md` (este arquivo) e `bmad-output/implementation-artifacts/epic-8-context.md` (recompilado antes do dispatch, refletindo o estado atualizado das Stories 8.1/8.2).

**Achados do review:** N/A -- sem diff de código, sem dispatch de Blind Hunter/Edge Case Hunter (ver Review Triage Log acima).

**Verificação realizada:** leitura direta de todo o Code Map confirmando uso de `Card` em 100% das seções; `npm run test:e2e:update-snapshots` (78/78, zero PNG mudou -- baselines já capturavam o estado atual desde a Story 8.1); `npm run test:e2e` completo (78/78, mesmos 3 gaps de contraste pré-existentes); `npx tsc --noEmit`/`npm run lint`/`npm run build` limpos. Revisão visual manual dos baselines de `/lancamentos` (layout de 2 colunas íntegro, sem overflow) e das 3 telas de auth (estados de erro legíveis).

**Riscos residuais:** nenhum novo. Confirmação pendente, não bloqueante: um dos dois (Tsuyoshi/Milena) ainda precisa usar `/lancamentos` com dado real em produção para validar visualmente o resultado combinado do Épico 8 inteiro (mesmo critério já usado no Epic 7, Story 7.10) -- registrado como próximo passo para o usuário, não uma pendência técnica.
