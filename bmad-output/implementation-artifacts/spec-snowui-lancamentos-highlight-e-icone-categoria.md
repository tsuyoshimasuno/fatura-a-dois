---
title: 'SnowUI redesign — Etapa 2/2: card-highlight em /lancamentos + ícone de categoria'
type: 'feature'
created: '2026-07-22'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
final_revision: 'PENDING'
context: []
warnings: ['oversized']
baseline_revision: 'e4a2d54'
---

<intent-contract>

## Intent

**Problem:** `/lancamentos` já herda automaticamente a sidebar e o `.card` branco+sombra da Etapa 1 (está dentro do route group `(app)`, sem `layout.tsx` próprio, e todas as suas seções já usam `className="card"`) — confirmado por leitura de código e pelo próprio `spec-snowui-sidebar-shell.md` (`npm run build` já validou que a rota renderiza com o shell novo. Isso NUNCA foi testado visualmente/funcionalmente com o shell novo, e falta o tratamento de destaque do card "Total combinado" e o ícone colorido por categoria, ambos adiados de propósito para esta etapa.

**Approach:** (1) Adicionar variante `.card-highlight` (tokens `--highlight` já existem em `globals.css`, ainda não consumidos) e aplicá-la SÓ ao card "Casal" existente em `lancamentos-view.tsx` quando `visao === 'combinada'` (reestilização, não card novo). (2) Criar `lib/categoria-cor.ts` com uma função determinística nome→índice sobre uma paleta pequena e fechada de pares claro/escuro (mesma convenção de token do arquivo: um nome de propriedade, redefinido no media query dark), e um componente `category-icon` (círculo com a inicial maiúscula da categoria) inserido em `lancamento-item.tsx` à esquerda da linha data/estabelecimento/valor. (3) Testar manualmente (via `npm run dev` + leitura visual, já que não há ferramenta de browser automatizada disponível nesta sessão) o grid de 2 colunas em desktop/mobile/claro/escuro dentro do shell novo, confirmando ausência de regressão.

## Boundaries & Constraints

**Always:** Reaproveitar o componente de sidebar e os tokens de cor já implementados na Etapa 1 — não recriar nada em `nav.tsx`/`layout.tsx`. `.card-highlight` deve ser aditiva (mesma borda/radius/padding/sombra do `.card` base, só troca `background`). A paleta de cor do `category-icon` deve ser pequena, fechada, com par claro/escuro pré-verificado para contraste AA (texto da inicial sobre o fundo do círculo), seguindo a mesma convenção de nomeação de token já usada no arquivo (uma variável, redefinida dentro do media query dark). O círculo deve funcionar para QUALQUER nome de categoria (texto livre do casal, sem enum fixo) — nunca lançar erro nem ficar sem cor para um nome não previsto. Preservar o toggle Individual/Combinada existente e o card "Casal" como está estruturalmente (só a variante de fundo muda). Preservar `--lancamentos-coluna-altura` e o grid `grid-template-areas` exatamente como estão — não são o alvo desta mudança.

**Block If:** Se o grid de 2 colunas apresentar qualquer quebra visual real (sobreposição, altura incorreta, scroll duplicado) dentro do shell da sidebar que não seja corrigível dentro do escopo desta spec sem tocar `--lancamentos-coluna-altura`/breakpoints já calibrados — reportar como achado, não fazer engenharia reversa do cálculo de altura sem understanding completo do porquê (Regra dos Três / risco já sinalizado pelo Winston).

**Never:** Não adicionar um terceiro card "Total combinado" sempre visível — é reestilização do card "Casal" já existente. Não usar emoji nem biblioteca de ícones SVG para o `category-icon` — círculo + inicial + cor determinística, conforme já decidido em `DESIGN.md`/`EXPERIENCE.md` (rodada 10) e pelo goal-engine (linha 130 do memlog do run). Não tornar o `category-icon` interativo/clicável — é puramente identificador visual, não substitui o `<select>` de correção de categoria já existente. Não adicionar Upload à sidebar. Não dar nenhuma funcionalidade ao seletor de conta do casal (permanece só visual). Não escolher hex por categoria "a olho" — a cor tem que vir de uma regra determinística (hash/índice) sobre uma paleta fechada, não arbitrária.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Card destaque, visão combinada | `pessoaSelecionada` vazio, `categoriaSelecionada === 'todas'`, `visao === 'combinada'` | Card "Casal" renderiza com `card-highlight` (fundo `--highlight`) em vez de `.card` puro | Nenhum erro esperado |
| Card destaque, outras visões | `visao === 'individual'`, ou `pessoaSelecionada` definido, ou `categoriaSelecionada !== 'todas'` | Cards correspondentes continuam `.card` puro, sem `card-highlight` | Nenhum erro esperado |
| Categoria normal | `item.categoriaNome = "Mercado"` | Círculo com "M" maiúsculo, cor determinística estável (mesmo nome → mesma cor sempre) | Nenhum erro |
| Categoria removida | `item.categoriaRemovida === true` | Círculo usa fallback visual neutro (sem inicial de categoria excluída, ou inicial de um rótulo neutro) — não pode quebrar nem mostrar `undefined` | Fallback, nunca throw |
| Sem categoria | `item.categoriaNome === null` | Círculo usa o mesmo fallback neutro do caso "categoria removida" | Fallback, nunca throw |
| Nome de categoria com acento/case incomum | `item.categoriaNome = "álcool e afins"` | Inicial exibida em maiúsculo (Á), cor determinística baseada no nome completo, não só na inicial | Nenhum erro |
| Mobile `<768px` | Qualquer estado acima, viewport estreita | `.lancamentos-columns` continua empilhando em coluna única (comportamento pré-existente, inalterado); círculo de categoria e card-highlight renderizam normalmente dentro do fluxo empilhado | Nenhum erro |

</intent-contract>

## Code Map

- `app/globals.css` -- adicionar `.card-highlight` (variante de `.card`) + paleta fechada de cores para `category-icon` (tokens seguindo a convenção existente).
- `app/(app)/lancamentos/_components/lancamentos-view.tsx:300-314` -- aplicar `card-highlight` condicionalmente no card "Casal" (branch `visao === 'combinada'`, `pessoaSelecionada` vazio, `categoriaSelecionada === 'todas'`).
- `app/(app)/lancamentos/_components/lancamento-item.tsx:229-233` -- inserir o `category-icon` (círculo com inicial) antes de `<strong>{formatarData(item.data)}</strong>`.
- `lib/categoria-cor.ts` (novo) -- função determinística `corDaCategoria(nome: string | null): { corIndice: number }` ou equivalente, mais o mapeamento de índice → classe/token CSS. Espelhar o padrão de `lib/pessoa.ts` (já existe uma função de derivação parecida ali, `primeiroNome`).
- `db/schema/index.ts:30-43` -- só leitura, para confirmar que `categoria.nome` é texto livre sem enum (já confirmado na investigação, sem mudança de schema nesta spec).

## Tasks & Acceptance

**Execution:**
- [x] `lib/categoria-cor.ts` -- criar função pura de hash determinístico (nome de categoria → índice 0..N-1 sobre uma paleta fechada de N cores, N pequeno tipo 6-8) -- evita qualquer escolha manual de hex por categoria, funciona para texto livre.
- [x] `app/globals.css` -- adicionar tokens de cor da paleta de `category-icon` (N pares claro/escuro, mesma convenção de token do arquivo, contraste AA texto-sobre-fundo verificado) + classe `.category-icon` (círculo, tamanho consistente com o layout da linha) + classe `.card-highlight` (mesma sombra/borda/padding/radius de `.card`, `background: var(--highlight)`).
- [x] `app/(app)/lancamentos/_components/lancamento-item.tsx` -- renderizar `category-icon` com a inicial maiúscula de `item.categoriaNome` (fallback neutro quando `categoriaRemovida` ou `categoriaNome === null`), usando `corDaCategoria`.
- [x] `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- aplicar `card-highlight` ao card "Casal" (visão combinada, sem filtro de pessoa/categoria ativo).
- [x] Verificação manual: `npm run dev`, inspecionar `/lancamentos` em desktop e mobile (`<768px`), claro e escuro -- grid de 2 colunas, card destacado, ícones de categoria, sem regressão em nenhum dos quatro cruzamentos.

**Acceptance Criteria:**
- Given a visão "Combinada" sem filtro de pessoa nem categoria específica, when `/lancamentos` renderiza, then o card "Casal" aparece com fundo `--highlight` (lilás claro/roxo escuro conforme o modo) em vez do `.card` branco/superfície padrão.
- Given qualquer outra combinação de filtro (pessoa específica, categoria específica, ou visão "Individual"), when `/lancamentos` renderiza, then nenhum card ganha `card-highlight` -- só o card "Casal" na visão combinada sem filtro.
- Given um lançamento com categoria "Mercado", when a lista renderiza, then aparece um círculo com "M" e uma cor de fundo fixa para "Mercado" em toda a tela (mesma cor em cada ocorrência).
- Given um lançamento sem categoria ou com categoria removida, when a lista renderiza, then o círculo aparece com um estado neutro (não quebra, não mostra "null"/"undefined").
- Given a tela `/lancamentos` em `<768px` (mobile), when renderizada dentro do shell da sidebar (barra fina + hambúrguer), then o layout de coluna única pré-existente continua funcionando sem sobreposição com a barra mobile fixa.
- Given o modo escuro, when `/lancamentos` renderiza, then `card-highlight` e `category-icon` usam as variantes dark dos tokens, com contraste de texto legível.

## Spec Change Log

## Review Triage Log

### 2026-07-22 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3 (low 2, medium 1)
- defer: 0
- reject: 10
- addressed_findings:
  - `[medium]` `[patch]` `lancamento-item.tsx`: `charAt(0)` cortava um par substituto ao meio para nomes de categoria começando com caractere fora do BMP (emoji) -- achado convergente dos dois revisores independentes; trocado para `Array.from(nome)[0]`.
  - `[low]` `[patch]` `app/globals.css`: `.category-icon` não tinha tratamento `forced-colors` (Windows High Contrast) -- todo o sinal do ícone é a cor de fundo, que o navegador ignora nesse modo, colapsando todas as variantes (incluindo a neutra) no mesmo círculo -- achado convergente dos dois revisores; adicionado bloco `@media (forced-colors: active)` espelhando o já existente em `.card`/`.card-highlight`.
  - `[low]` `[patch]` `app/globals.css` + `lancamentos-view.tsx`: `.card-highlight` duplicava borda/sombra/radius/padding de `.card` byte a byte em vez de compor com ele -- risco de as duas classes divergirem se `.card` mudar no futuro; simplificado para `.card-highlight { background: var(--highlight); }` usado sempre junto de `.card` (`className="card card-highlight"`), herdando o resto (incluindo o próprio fallback `forced-colors`) direto de `.card`.
  - `[reject]` cor do ícone derivada do nome da categoria, não do id: rejeitado -- é exatamente a abordagem especificada no `<intent-contract>` ("função determinística nome→índice"), não uma escolha aberta do implementador; rename causar mudança de cor é um trade-off aceito para um app de 2 pessoas, sem colisão real possível entre categorias ativas (índice único por nome via `existeCategoriaAtivaComNome`).
  - `[reject]` ícone e rótulo "Categoria atual" divergindo para nome só de espaços em branco: rejeitado -- inalcançável na prática, `validarNome` em `server/categorizacao/gerenciar-categorias.ts:40-52` já garante trim() + rejeição de nome vazio/só-espaço antes de qualquer persistência; todo `categoria.nome` no banco já chega trimado.
  - `[reject]` caracteres de largura zero (`​` etc.) não removidos pelo `.trim()`: rejeitado -- exotismo sem cenário real plausível num app de categorização financeira de casal; nenhum caminho do produto incentiva ou testa esse input.
  - `[reject]` sem testes automatizados para `lib/categoria-cor.ts`: rejeitado -- nenhuma convenção de teste automatizado existe no restante do codebase (`lib/pessoa.ts` e equivalentes também não têm), não é um padrão desta mudança introduzir sozinha.
  - `[reject]` acoplamento entre `PALETA_TAMANHO` e o número de tokens `--category-color-N` não é reforçado por tipo/teste: rejeitado -- documentado via comentário nos dois lados, mesmo padrão de acoplamento implícito já presente em outras constantes do arquivo (ex. breakpoints).
  - `[reject]` `title` + `aria-label` redundantes no círculo: rejeitado -- não é defeito, `title` é só uma dica extra ao passar o mouse, não introduz nenhuma interação nova além do que um elemento decorativo já tem nativamente.
  - `[reject]` círculo neutro com `aria-hidden` não anuncia nada a leitor de tela: rejeitado -- a informação ("Sem categoria"/"Categoria removida") já está disponível no texto adjacent "Categoria atual: ..." na mesma linha visual, sem perda real de informação.
  - `[reject]` números de contraste nos comentários do CSS não são verificados por CI: rejeitado -- mesmo padrão (comentário com contraste calculado à mão) já usado em todo o resto do arquivo para `--danger`/`--pending`/`--highlight`, nenhuma ferramenta de CI de contraste existe no projeto.
  - `[reject]` ordem do novo import quebra convenção de agrupamento por caminho: rejeitado -- `npm run lint` limpo, nenhuma regra `import/order` configurada no projeto.

## Design Notes

`--highlight`/`--highlight-dark` já existem em `globals.css` (linhas ~42/110) desde a Etapa 1 mas nunca foram consumidos — esta spec é o primeiro consumidor. A convenção do arquivo é UMA variável de propriedade por papel semântico, redefinida dentro do bloco `@media (prefers-color-scheme: dark)` (não duas variáveis com sufixo `-dark` reais) — a paleta nova de `category-icon` deve seguir o mesmo padrão (ex.: `--category-color-1` .. `--category-color-N`, cada uma redefinida no dark block), para não introduzir uma segunda convenção de nomenclatura no mesmo arquivo.

O card "Casal" já existe e já é renderizado condicionalmente (linhas 300-314 de `lancamentos-view.tsx`) -- a mudança é só decorativa (uma classe CSS a mais quando a condição bate), sem tocar a lógica de dados/agregação.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros novos.
- `npm run lint` -- expected: sem erros novos.
- `npm run build` -- expected: build limpo, `/lancamentos` continua compilando como rota dinâmica.

**Manual checks (if no CLI):**
- `npm run dev`, abrir `/lancamentos` autenticado, alternar Combinada/Individual, filtro de pessoa e categoria, breakpoint mobile (`<768px`) e modo escuro do SO -- confirmar visualmente card-highlight só na visão combinada sem filtro, ícones de categoria com cor estável por nome, sem regressão no grid de 2 colunas nem no painel off-canvas mobile já existente.

**Executado nesta sessão:** `npm run dev` iniciado, `/lancamentos` confirmado respondendo (redirect de auth normal, sem crash de servidor); bundle CSS compilado inspecionado diretamente confirmando que `.category-icon`, `.category-icon--cor-1..6`, `.category-icon--neutral`, `.card-highlight` e os 6 tokens `--category-color-N` (claro e escuro) estão presentes e sintaticamente corretos no CSS servido. **Não executado nesta sessão:** login real + inspeção visual de pixels (sem ferramenta de automação de navegador com sessão autenticada disponível nesta sessão, mesma limitação já registrada em rodadas anteriores desta run -- ex. nav mobile responsiva, dashboard inicial). Risco residual: nenhuma confirmação visual real de que o card-highlight/ícones renderizam corretamente lado a lado com o grid de 2 colunas em produção -- recomendado um passe visual humano rápido (mesmo escopo do checklist acima) antes ou logo após o deploy.

## Auto Run Result

Status: done

**Resumo:** Etapa 2/2 do redesign SnowUI. `/lancamentos` já herdava a sidebar e o `.card` branco+sombra automaticamente desde a Etapa 1 (route group `(app)`, sem `layout.tsx` próprio) -- confirmado por leitura de código antes de implementar, escopo real ficou menor do que o inicialmente cogitado. Implementado: (1) `.card-highlight` (consome `--highlight`, já definido mas não usado desde a Etapa 1) aplicado ao card "Casal" existente na visão combinada sem filtro; (2) `category-icon` -- círculo com a inicial da categoria, cor determinística via hash sobre uma paleta fechada de 6 pares claro/escuro (`lib/categoria-cor.ts`), com fallback neutro para categoria removida/ausente.

**Arquivos alterados:**
- `lib/categoria-cor.ts` (novo) -- hash determinístico nome de categoria -> classe de cor.
- `app/globals.css` -- paleta `--category-color-1..6` (claro/escuro), `.category-icon` (+ variantes de cor, neutra, `forced-colors`), `.card-highlight` (composto com `.card`).
- `app/(app)/lancamentos/_components/lancamento-item.tsx` -- renderiza o `category-icon` antes da linha data/estabelecimento/valor.
- `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- card "Casal" ganha `card-highlight` condicionalmente.

**Review adversarial (Blind Hunter + Edge Case Hunter, paralelo, 1 rodada):** 3 patches aplicados -- 2 achados convergentes entre os dois revisores independentes (glifo quebrado em `charAt(0)` para categoria com emoji, corrigido para `Array.from(...)[0]`; `.category-icon` sem tratamento `forced-colors`, adicionado espelhando `.card`) mais 1 achado de simplificação (`.card-highlight` duplicava `.card` byte a byte, agora composto). 10 achados rejeitados com justificativa registrada no Review Triage Log (destaque: mismatch ícone/rótulo para nome só de espaços é inalcançável na prática -- `validarNome` no servidor já garante trim()+não-vazio antes de qualquer persistência). 0 bad_spec, 0 intent_gap.

**Verificação:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos antes e depois dos patches. `/lancamentos` continua compilando como rota dinâmica. Verificação funcional real limitada a smoke-test de servidor + inspeção do bundle CSS compilado (sem ferramenta de automação de navegador autenticada nesta sessão) -- ver nota de risco residual na seção Verification acima.

**Risco residual:** nenhuma confirmação visual real (pixels) em navegador autenticado do card-highlight/ícones dentro do grid de 2 colunas, em desktop/mobile/claro/escuro -- recomendado passe visual humano rápido. Nenhum outro risco de dado/segurança/comportamento identificado (mudança puramente decorativa/CSS, sem Server Action nova nem alteração de schema).
