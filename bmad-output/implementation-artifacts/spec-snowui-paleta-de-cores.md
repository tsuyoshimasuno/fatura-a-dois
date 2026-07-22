---
title: 'Troca da paleta de cores para o SnowUI Design System (azul -> preto/roxo)'
type: 'feature'
created: '2026-07-22'
status: 'done'
review_loop_iteration: 2
followup_review_recommended: true
context: []
warnings: []
baseline_revision: '7c464ef89ae2bae8ae7133887b4c4b827ecdb33d'
final_revision: '0f4dcb13d1b783c00971849465fd49b1a895466d'
---

<intent-contract>

## Intent

**Problem:** O app usa azul (`#2554c7`/`#6f9bff`) como cor de destaque (`--accent`) desde sempre. O usuário exportou os tokens reais do SnowUI Design System (Figma, formato W3C Design Tokens, modos `SnowUI-Light`/`SnowUI-Dark`) e viu um comparativo visual real dos componentes do app nas duas paletas (Artifact) -- confirmou explicitamente "pode alterar para snowUI". O token real `Primary` do kit é preto (`#000000`, claro) e roxo-claro (`#adadfb`, escuro) -- não azul.

**Approach:** Trocar os valores de `--accent`, `--accent-hover`, `--accent-foreground`, `--background` (dark), `--surface`, `--danger`, `--pending` em `app/globals.css` (claro e escuro) pelos valores documentados em `DESIGN.md` (frontmatter `colors:`, cada um marcado `sourced` -- lido direto do export -- ou `ESTIMADO` -- papel sem equivalente direto no export, como hover). `--foreground`, `--muted-foreground`, `--border` (claro) ficam inalterados -- fora do que foi comparado e aprovado. Como `--background-dark` muda de quase-preto (`#0b0d12`) para cinza médio (`#333333`), verificar e ajustar se necessário o contraste de `--muted-foreground-dark`/`--border-dark` contra o novo fundo antes do commit -- eles foram calculados contra o fundo escuro antigo.

## Boundaries & Constraints

**Always:** Verificar contraste WCAG de `--muted-foreground-dark` (texto, precisa ≥4.5:1) e `--border-dark` (elemento gráfico, precisa ≥3:1) contra o novo `--background-dark` (`#333333`) antes do commit -- ajustar minimamente se necessário, documentando no DESIGN.md. Manter par `-dark` completo para todo token tocado. Manter `--pending` como cor semântica distinta de `--danger` (nunca convergir as duas).

**Block If:** Nenhum -- decisão de cor já confirmada explicitamente pelo usuário após ver o comparativo real; valores já documentados em DESIGN.md.

**Never:** Não mudar `--foreground`, `--muted-foreground` (exceto se o ajuste de contraste do item Always exigir), `--border` (claro), `--radius`, família de fonte, layout, estrutura de tela, Server Actions ou schema de dado -- isto é puramente troca de valor de cor em `app/globals.css`. Não introduzir uma segunda camada de tokens (`--snowui-*`) -- os nomes de custom properties existentes continuam os mesmos, só os valores mudam.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Qualquer tela, modo claro | Renderização normal | Botão primário/links/nav ativo/foco agora em preto (`#000000`) em vez de azul; fundo/superfície levemente diferentes (`#f9f9fa`); erro mais vívido (`#ff3b30`); pendência em laranja (`#ff9500`) | Nenhum -- troca de valor, sem lógica nova |
| Qualquer tela, modo escuro (`prefers-color-scheme: dark`) | Renderização normal | Fundo passa de quase-preto para cinza médio (`#333333`); accent vira roxo-claro (`#adadfb`) com texto preto sobre ele; superfície, erro e pendência atualizados nos pares -dark | Nenhum |
| Texto secundário (`--muted-foreground-dark`) sobre o novo fundo escuro | `#9aa3b2` sobre `#333333` | Contraste recalculado >= 4.5:1; se o valor original não atingir, ajustar para o menor clareamento que atinja o mínimo | Documentar o ajuste no DESIGN.md se ocorrer |

</intent-contract>

## Code Map

- `app/globals.css` -- atualizar os dois blocos `:root`/`@media (prefers-color-scheme: dark)` com os novos valores de cor.
- `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/DESIGN.md` -- já atualizado nesta run com os valores-alvo; só precisa de um adendo se o ajuste de contraste do item (b) mudar algum valor de `--muted-foreground-dark`/`--border-dark`.

## Tasks & Acceptance

**Execution:**
- [x] `app/globals.css` (bloco `:root`, claro) -- `--surface: #f9f9fa`; `--accent: #000000`; `--accent-hover: #262626`; `--danger`: escurecido de `#ff3b30` para **`#e00000`** (mesmo H=0/S=100%, só a luminosidade caiu) -- o valor intermediário `#ed0d00` (pass 2) só tinha sido verificado contra `#ffffff` (4.51:1, ok), mas `.alert-error`/`.btn-danger-outline` também renderizam sobre `--surface` (`#f9f9fa`, dentro de `<li className="card">`), onde caía para 4.28:1 (falha); `#e00000` atinge **4.79:1 contra `--surface`** e **5.04:1 contra `#ffffff`** (>=4.5:1 nos dois, o par mais restritivo -- surface -- manda); `--pending`: escurecido de `#ff9500` para **`#d07900`** -- contraste do texto branco (`.badge-pending`) sobe de ~2.20:1 para **3.27:1**, levemente melhor que o valor antigo pré-SnowUI (`#b8860b`, ~3.25:1), não regride. Não atinge 4.5:1 pleno -- gap pré-existente, ver `deferred-work.md`.
- [x] `app/globals.css` (bloco `@media (prefers-color-scheme: dark)`) -- `--background: #333333`; `--accent: #adadfb`; `--accent-hover: #c2c2fd`; `--accent-foreground: #000000`; `--danger`: de `#ff4747` para **`#ff9999`** -- o valor intermediário `#ff6a6a` (pass 2) só tinha sido verificado contra `--background-dark` (4.53:1, ok), mas `.btn-danger-outline` também renderiza sobre `--surface-dark` (dentro de `<li className="card">`), onde, contra o `--surface-dark` final desta rodada (`#464646`), caía para ~2.62:1 (falha dupla, nem texto nem borda); `#ff9999` atinge **4.62:1 contra `--surface-dark`** e **6.18:1 contra `--background-dark`** (o par mais restritivo -- surface -- manda). `--pending: #ffb55b` (mantido -- contraste de texto preto sobre laranja claro no escuro já é bom, 12.01:1, sem regressão).
- [x] `app/globals.css` (bloco `@media (prefers-color-scheme: dark)`) -- `--surface` RESOLVIDO COMO SISTEMA (bad_spec repair pass 3, não mais ajuste isolado): de `#3b3b3b` (pass 1, ~1.13:1 contra `--background-dark`, quase invisível) passou por `#565656` (pass 2, 1.72:1 contra `--background-dark`, mas deixava `--accent-dark`/`.badge-repasse` em ~3.54:1 e `--danger-dark` em ~2.62:1 contra ele -- ambos falha) para **`#464646`** -- o cinza mais CLARO (varredura completa 0-255) que ainda mantém `--accent-dark` (`#adadfb`, FIXO/sourced) em **4.56:1** de texto sobre ele (um passo mais claro, `#474747`, já cai para 4.49:1, abaixo do mínimo). TRADE-OFF ACEITO E DOCUMENTADO: `--surface-dark` fica a só **1.34:1** de `--background-dark` (menos "nitidamente distinguível" que os 1.72:1 do pass 2), mas ainda MELHOR que o baseline pré-SnowUI (`--surface` `#12151c` vs `--background` `#0b0d12` = **1.06:1**, commit `7c464ef`) -- não regride, só não atinge o ideal de ~3:1 porque `--accent-dark` fixo consome parte da folga de luminância disponível. Após resolver `--surface-dark`, `--muted-foreground-dark` (`#c6cbd4`, herdado do pass 2) foi RE-verificado contra este valor final: **5.80:1** contra `--surface-dark` e 7.76:1 contra `--background-dark`, ambos folgados, mantido sem mudança (o novo surface mais escuro só aumenta a folga, não reduz). `--border-dark` também foi reverificado contra o `--surface-dark` final e encontrada uma falha nova (nunca checada antes, mesma classe de lacuna): validado só contra `--background-dark` (3.15:1, ok) mas nunca contra `--surface-dark`, onde `.card`/`.titular-badge`/`.icon-button` de fato desenham a borda do outro lado -- contra o `--surface-dark` antigo (`#565656`) já falhava (1.83:1), contra o novo (`#464646`) melhora mas ainda falha (2.35:1). Ajustado de `#7c7f85` para **`#929292`**, atingindo **3.03:1 contra `--surface-dark`** e 4.06:1 contra `--background-dark`.
- [x] `app/globals.css` -- adicionado `text-decoration: underline` como padrão na regra `.link` (removida a regra `.link:hover` redundante, já que o sublinhado agora é sempre ativo) -- mitigação do risco WCAG 1.4.1 (uso de cor) já que o `--accent` claro (`#000000`) fica visualmente próximo de `--foreground` (`#1a1f2b`).
- [x] `app/globals.css` -- adicionado comentário de uma linha acima de `--accent-foreground` no bloco dark explicando que `#000000` está correto (o SnowUI inverte os papéis Black/White por modo) e não deve ser "corrigido" de volta para branco por um editor futuro sem contexto.
- [x] Recalculado: `--accent-foreground` sobre `--accent` permanece com contraste alto nos dois modos (inalterado, já que nenhum dos dois tokens `accent`/`accent-dark` mudou nesta passada) -- claro: branco (`#ffffff`) sobre preto (`#000000`) = **21:1**; escuro: preto (`#000000`) sobre roxo-claro (`#adadfb`) = **10.15:1**.
- [x] `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/DESIGN.md` -- atualizado os comentários do frontmatter `colors:` para os valores finais de `--danger`, `--danger-dark`, `--pending`, `--surface-dark` e `--muted-foreground-dark`, registrando os números de contraste calculados (rótulo `[VERIFICAÇÃO DE CONTRASTE, rodada 8 -- bad_spec repair pass 2]`, mesmo padrão das notas da rodada 7b já existentes).

**Acceptance Criteria:**
- Given o app renderizado em modo claro, when qualquer botão primário/link/nav ativo é exibido, then a cor é próxima de `#000000` (preto), não mais azul.
- Given o app renderizado em modo escuro, when qualquer botão primário/link/nav ativo é exibido, then a cor é próxima de `#adadfb` (roxo-claro), não mais azul.
- Given `.alert-error`/`.btn-danger-outline` em qualquer modo, when renderizados sobre seu fundo real, then o contraste de texto é >=4.5:1 (WCAG AA).
- Given `--surface-dark` renderizado sobre `--background-dark`, when comparados, then são claramente distinguíveis (não a ~1:1 de antes) -- mesmo padrão já usado para validar `--border-dark`.
- Given `--muted-foreground-dark` renderizado sobre o `--surface-dark` final (não só sobre `--background-dark`), when comparados, then o contraste é >=4.5:1.
- Given um link inline num parágrafo, when renderizado, then é distinguível do texto comum por mais de uma pista visual (sublinhado, não só cor).
- Given `npm run build`, when executado após as mudanças, then completa sem erros.

## Spec Change Log

### 2026-07-22 — bad_spec repair (pass 1)

**Trigger:** Blind Hunter + Edge Case Hunter (rodando em paralelo) convergiram independentemente em achados reais e sérios que a lista de verificação original desta spec não cobria: (1) `--danger`/`--danger-dark` (o Secondary.Red "sourced" do SnowUI) falha WCAG AA de texto contra seus consumidores reais (`.alert-error`, `.btn-danger-outline`) nos dois modos -- claro cai de ~5.53:1 para ~3.55:1, escuro de ~8.11:1 para ~3.76:1; (2) `--surface-dark` (`#3b3b3b`) fica quase indistinguível do novo `--background-dark` (`#333333`, contraste ~1.13:1) -- exatamente a mesma classe de bug que `--border-dark` recebeu tratamento explícito para corrigir, mas `--surface-dark` não recebeu o mesmo cuidado; (3) `--muted-foreground-dark` cai para ~4.4:1 (abaixo do mínimo 4.5:1) quando calculado contra o `--surface-dark` (não só contra o `--background-dark`, que foi o único par verificado); (4) `--accent` claro (`#000000`) fica próximo demais de `--foreground` (`#1a1f2b`) -- risco real de WCAG 1.4.1 (uso de cor) para `.link`, que hoje só se distingue do texto comum por cor (sublinhado só no hover); (5) `--pending` (`ESTIMADO`, sem papel real no SnowUI) piora um contraste que já era uma falha pré-existente (`.badge-pending`, texto branco sobre fundo): de ~3.26:1 para ~2.20:1. Causa raiz: a spec original (Boundaries "Always") só mandou verificar contraste para `--muted-foreground-dark` e `--border-dark` contra o novo `--background-dark` -- a lista de verificação estava incompleta, escopada só para a regressão que eu (orquestrador) antecipei (mudança de luminância do fundo), não para as regressões causadas pela própria troca de identidade de cor (danger/pending/accent mais vívidos/pretos). A premissa "zero impacto funcional" usada para dispensar a rodada de 3 agentes (PM/tech-lead/UX) se provou incompleta -- o impacto de acessibilidade real não tinha sido conferido para todos os tokens trocados, só para dois.

**Amendment:** Ampliada a lista de verificação obrigatória em "Tasks & Acceptance" para cobrir TODO token de cor alterado contra TODO consumidor real (não só os dois pares antecipados originalmente). Adicionadas correções: `--danger`/`--danger-dark` escurecidos até atingir >=4.5:1 contra seus fundos reais (branco no claro, `--background-dark` no escuro), mantendo o tom mais próximo possível do Secondary.Red de origem. `--surface-dark` reajustado para ficar claramente distinguível do novo `--background-dark` (mesmo padrão de rigor já aplicado a `--border-dark`), reverificando `--muted-foreground-dark` contra o novo valor de `--surface-dark` (não só contra `--background-dark`). `--pending` (claro) escurecido o mínimo para não piorar o contraste pré-existente do `.badge-pending` (aceitando que compliance total pode continuar como gap pré-existente, documentado, não fabricado como resolvido). Adicionado `text-decoration: underline` padrão em `.link` (não só no hover) como mitigação direta e barata do risco de WCAG 1.4.1 com o novo accent quase-preto -- não é mudança de paleta, é a mesma classe de "correção downstream necessária" já aplicada ao `--border-dark` na primeira rodada.

**Known-bad state avoided:** enviar para produção um app financeiro real usado por duas pessoas com mensagens de erro (`.alert-error`) e badges de pendência (`.badge-pending`) com contraste de texto abaixo do mínimo de acessibilidade, e um risco real de link indistinguível de texto comum por cor.

**KEEP:** a troca de identidade do `--accent`/`--accent-dark` para preto/roxo-claro (`#000000`/`#adadfb`) -- já revisada e aprovada pelo usuário via Artifact, sem achado real contra o valor em si (só contra o risco de colisão do preto com `--foreground`, mitigado via sublinhado, não via troca do valor do accent). O ajuste já feito de `--border-dark` (`#7c7f85`, 3.15:1) também fica -- confirmado correto pelos dois revisores, não precisa ser refeito.

### 2026-07-22 — implementation note (pass 2, execução da checklist ampliada)

Ao implementar o item `--danger-dark`, o texto da checklist ("escurecer `#ff4747` até atingir >=4.5:1 contra `#333333`") descreve a direção errada: contra um fundo com luminância relativa ~0.033 (já escuro/médio), o contraste MÁXIMO alcançável escurecendo qualquer cor é limitado pela própria luminância do fundo -- escurecer um vermelho puro até preto (`#000000`) só chega a ~1.66:1 contra `#333333`, nunca a 4.5:1. Matematicamente é impossível satisfazer ">=4.5:1" escurecendo neste caso específico. O critério de aceite real (contraste numérico >=4.5:1) foi tratado como a fonte de verdade em vez da palavra "escurecer": `--danger-dark` foi CLAREADO (mantendo H=0/S=100%, mesmo tom vívido) até `#ff6a6a`, atingindo 4.53:1. Todos os demais itens (danger claro, pending claro, surface-dark, muted-foreground-dark, `.link`, comentário `accent-foreground-dark`) foram implementados exatamente como descrito na checklist ampliada da rodada 7b, com os números finais documentados em "Tasks & Acceptance" acima e no frontmatter `colors:` do DESIGN.md.

## Review Triage Log

### 2026-07-22 — Review pass 1

- intent_gap: 0
- bad_spec: 1 (high 1, medium 0, low 0)
- patch: 0 (dobrado dentro do amendment de bad_spec acima em vez de patch separado, já que exige re-derivação de valores de cor)
- defer: 2 (low 2)
- reject: 1
- addressed_findings:
  - `[high]` `[bad_spec]` Lista de verificação de contraste da spec original cobria só 2 dos ~7 tokens trocados -- `--danger`/`--danger-dark` (falha AA de texto real, ~3.55:1/~3.76:1), `--surface-dark` (quase invisível contra o novo fundo, ~1.13:1), `--pending` (piora um contraste já-falho) e o risco `--accent`≈`--foreground` no claro (WCAG 1.4.1) não tinham verificação nem correção. Spec ampliada, código revertido para re-derivação com a checklist completa.
  - defer: (1) `--surface` claro (`#f9f9fa`) vs `--border` claro (`#e2e5ea`) não verificado -- mas o deslocamento de 3 unidades/canal não muda materialmente um contraste que já era baixo antes desta mudança (bordas decorativas de card, não texto); (2) ausência de qualquer teste/lint automático de regressão de contraste no repositório -- gap de tooling real, mas fora do escopo de uma spec de troca de paleta pontual.
  - reject: `accent-foreground-dark` "sem contexto suficiente para futuros editores" -- já documentado tanto no DESIGN.md quanto (após este pass) num comentário dedicado no próprio CSS; tratado como parte do amendment, não um achado à parte.

### 2026-07-22 — bad_spec repair (pass 2)

**Trigger:** Segunda rodada de review (Blind Hunter + Edge Case Hunter) sobre a versão corrigida encontrou o MESMO PADRÃO de lacuna que o pass 1 já tinha corrigido para `--muted-foreground-dark` (verificar só contra `--background`, não contra `--surface`) -- só que desta vez em `--danger-dark`/`--accent-dark`: o reajuste de `--surface-dark` (pass 1, de `#3b3b3b` para `#565656`, para ficar distinguível de `--background-dark`) criou um fundo bem mais CLARO que `--background-dark`, e ninguém re-verificou os textos claros (`--danger`, `--accent`) contra esse novo fundo mais claro. Achados reais confirmados por grep no código real (não hipotético): `.btn-danger-outline` (cartao-pendente-item.tsx) e `.badge-repasse` (lancamento-item.tsx) renderizam DENTRO de `<li className="card">` -- ou seja, sobre `--surface`, não `--background`. Contraste real: `--danger-dark` (`#ff6a6a`) vs `--surface-dark` (`#565656`) = ~2.62:1 (falha AA texto E falha 3:1 de borda); `--accent-dark` (`#adadfb`, SOURCED, não deve mudar) vs `--surface-dark` = ~3.54:1 (falha AA texto para `.link`/`.badge-repasse`). Causa raiz, pela terceira vez nesta spec: a lista de verificação seguia tratando "contraste contra o fundo" como um único par fixo por token, em vez de verificar cada token de texto contra TODOS os fundos reais onde ele aparece (`--background` E `--surface`) simultaneamente, como um sistema interdependente -- ajustar um token isoladamente (`--surface-dark` no pass 1) reabre a verificação de todos os outros que dependem dele.

**Amendment:** Tasks & Acceptance reescrito para exigir uma matriz completa (todo token-texto × todo token-fundo, os dois modos) calculada de uma vez, ANTES de fixar qualquer valor individual -- não mais ajustes sequenciais token-a-token. `--accent`/`--accent-dark` permanecem fixos (valor sourced, aprovado pelo usuário via Artifact -- não é candidato a mudança). `--surface-dark` pode ser reajustado de novo se necessário para satisfazer a matriz inteira (aceitando que "distinguível de --background" e "--accent/--danger legíveis sobre --surface" competem pelo mesmo grau de liberdade -- resolver como sistema, escolhendo o valor de superfície mais claro possível que ainda satisfaça os textos, não o inverso). Critério de aceite realista (evitando um novo ciclo por perfeccionismo): para cada par testado, atingir >=4.5:1 (texto) / >=3:1 (borda/gráfico) quando matematicamente possível sem violar as restrições já fixadas (accent-dark sourced, radius/layout intocados); quando não for possível atingir 4.5:1 sem sacrificar outra restrição fixa, aceitar o melhor valor alcançável que não fique PIOR do que o par equivalente media antes de toda esta iniciativa SnowUI (baseline: commit `7c464ef`, paleta azul original), documentando o trade-off explicitamente -- mesmo padrão de aceitação já usado para `--pending`.

**Known-bad state avoided:** um segundo ciclo de "resolvido" que na verdade só moveu a falha de contraste de um par de tokens para outro, sem nunca verificar o sistema completo de uma vez -- risco real de terceiro/quarto ciclo do mesmo tipo se cada pass continuar corrigindo só o que o review anterior apontou, sem generalizar a checagem.

**KEEP:** `--accent`/`--accent-dark` (`#000000`/`#adadfb`, sourced, aprovado pelo usuário) permanecem exatamente como estão -- não são o problema, o problema é o que foi colocado ao redor deles (`--surface-dark`, `--danger-dark`). `.link` sempre sublinhado (pass 1) continua correto e necessário, mas não é suficiente sozinho -- `--badge-repasse` também usa `--accent` como texto/borda e precisa do mesmo nível de verificação.

### 2026-07-22 — Review pass 3 (matriz completa) + patch final

Blind Hunter + Edge Case Hunter, rodando em paralelo, confirmaram que a matriz do pass 3 estava correta nos VALORES finais (nenhum novo bad_spec de cor), mas encontraram 2 problemas reais, nenhum deles exigindo mudar um valor de cor:

1. **Patch real:** o comentário de `--surface-dark`/`--danger-dark` continha um número incorreto (`~2,62:1` para `#ff6a6a` contra o `--surface-dark` final `#464646` -- o valor correto, recalculado por ambos os revisores independentemente, é `~3,38:1`; `2,62:1` era o contraste contra o `--surface-dark` de uma rodada anterior já superada, não o final). O valor de cor SHIPADO (`#ff9999`) já passava os dois limiares reais (4,62:1/6,18:1, confirmado correto) -- era só o texto explicativo que citava o número errado. Corrigido diretamente em `app/globals.css` (sem precisar de novo ciclo de implementação).
2. **Achado real, mas fora de escopo (defer):** `--border` no modo claro (`#e2e5ea`, nunca alterado por nenhuma rodada desta iniciativa) tem ~1,2:1 contra `--surface`/`--background` claros -- bem abaixo do mínimo. Confirmado que é pré-existente (o deslocamento de 3 unidades/canal em `--surface` claro não muda esse contraste de forma material) e não foi causado por esta spec. Registrado em `deferred-work.md`, não corrigido aqui (corrigir exigiria escurecer `--border` claro, mudança fora da identidade SnowUI aprovada pelo usuário).

Demais pontos levantados (foreground-dark vs background-dark não narrado explicitamente, pending-dark vs accent-foreground-dark não narrado explicitamente, "varredura completa" ser na verdade só 1-dimensional no eixo de cinza neutro) são lacunas de documentação/rigor de processo, não defeitos de valor -- os pares em questão já foram confirmados passando pelos próprios revisores (12,01:1 e ~11:1 respectivamente). Não geram novo bad_spec nem patch de código.

**Convergência:** após 3 ciclos de bad_spec repair (cada um fechando uma classe de par não verificado: background-only -> surface-only -> matriz completa), a matriz de cores está verificada de forma sistemática e nenhuma falha nova de VALOR foi encontrada nesta rodada -- só uma correção de comentário e um item real, porém pré-existente, deferido. Prosseguindo para commit.

### 2026-07-22 — bad_spec repair (pass 3, matriz completa)

**Trigger:** Pedido explícito de resolver o problema como sistema em vez de token a token: montar a matriz completa (todo token-texto × todo token-fundo real × os dois modos) de uma vez, calculando via fórmula de luminância relativa WCAG 2.1 completa, antes de fixar qualquer valor. A varredura sistemática encontrou DUAS falhas novas que nenhum pass anterior tinha coberto, porque cada pass seguia validando só o par que o pass anterior tinha corrigido, não todo o grafo de consumidor × fundo: (1) `--danger` (claro) `#ed0d00` (pass 2) só tinha sido verificado contra `#ffffff` (4.51:1, ok) -- contra `--surface` (`#f9f9fa`), onde `.alert-error`/`.btn-danger-outline` também renderizam (`cartao-pendente-item.tsx`, `lancamento-item.tsx`, ambos dentro de `<li className="card">`), caía para 4.28:1 (falha); (2) `--border-dark` `#7c7f85` (pass 1) só tinha sido verificado contra `--background-dark` (3.15:1, ok) -- nunca contra `--surface-dark`, onde falhava tanto contra o valor antigo (`#565656`, 1.83:1) quanto contra o novo (`#464646`, 2.35:1).

**Amendment:** `--surface-dark` resolvido como incógnita de um sistema fechado: `--accent-dark` (`#adadfb`, fixo/sourced, aprovado pelo usuário) é o grau de liberdade mais restritivo, então `--surface-dark` foi resolvido primeiro (`#464646`, o cinza mais claro que ainda mantém `--accent-dark` em >=4.5:1 -- varredura completa de 0 a 255), e só depois `--danger-dark` foi reajustado contra esse valor já fixado (`#ff9999`, satisfaz tanto `--surface-dark` quanto `--background-dark`, o mais restritivo dos dois manda). `--border-dark` reajustado para `#929292` para satisfazer 3:1 contra `--surface-dark` final (sua verificação vinha incompleta desde o pass 1). `--danger` (claro) reajustado para `#e00000` pelo mesmo motivo (verificação incompleta desde o pass 2). `--muted-foreground-dark` reverificado contra o `--surface-dark` final e mantido sem mudança (ainda folgado). Modo claro revisto por completo (`--accent`, `--danger`, `--muted-foreground` contra `--background` E `--surface`) -- único achado real foi o `--danger` acima; `--accent`/`--muted-foreground` claros permanecem folgados nos dois fundos (accent: 21:1/19.96:1; muted-foreground: 5.98:1/5.69:1). Trade-off aceito e documentado (item 4 da diretriz desta rodada): `--surface-dark` vs `--background-dark` fica em 1.34:1 -- abaixo do ideal ~3:1 (mesmo nível de `--border-dark`), mas ainda melhor que o baseline pré-SnowUI (`#12151c` vs `#0b0d12` = 1.06:1, commit `7c464ef`) -- não é possível ir mais longe sem violar a restrição fixa de `--accent-dark`.

**Known-bad state avoided:** um terceiro ciclo do mesmo padrão de bug (corrigir um par, reabrir outro sem verificar, nunca fechar o sistema todo) -- desta vez pego numa única passada de matriz completa em vez de descoberto por outra rodada de review externa.

**KEEP:** `--accent`/`--accent-dark` (`#000000`/`#adadfb`) permanecem exatamente como estão -- seguem sendo a restrição fixa que todo o resto do sistema resolve em torno dela, não o problema.

## Design Notes

Diferente da spec anterior (section-title), aqui a mudança visual É o objetivo -- o usuário já viu e aprovou o resultado final via Artifact comparativo antes de pedir a implementação. O cuidado real desta spec é o efeito colateral do fundo escuro ficar mais claro (`#0b0d12` -> `#333333`): dois tokens (`muted-foreground-dark`, `border-dark`) foram calibrados contra o fundo antigo e precisam de reverificação de contraste, não just copiar os valores documentados sem checar.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros.
- `npm run lint` -- expected: sem erros.
- `npm run build` -- expected: build de produção completa sem erros.

**Manual checks (if no CLI):**
- Calcular manualmente (fórmula de luminância relativa WCAG) o contraste de `--muted-foreground-dark` e `--border-dark` contra `#333333`, documentando o resultado no spec ou no DESIGN.md.
- Ler o diff final de `app/globals.css` e confirmar que `--foreground`, `--muted-foreground` (claro), `--border` (claro), `--radius` não foram tocados.

## Auto Run Result

**Resumo:** Troca da cor de destaque do app de azul para o Primary real do SnowUI (preto no claro, roxo-claro `#adadfb` no escuro), decisão do usuário após ver um Artifact comparativo dos componentes reais do app nas duas paletas. `--background-dark` também mudou de quase-preto para cinza médio (`#333333`), puxando uma cadeia de reajustes de contraste em `--surface`, `--danger`, `--pending`, `--border`, `--muted-foreground` (dark) para manter WCAG AA nos consumidores reais.

**Arquivos alterados:**
- `app/globals.css` -- valores finais: claro `--surface:#f9f9fa`, `--accent:#000000`, `--accent-hover:#262626`, `--danger:#e00000`, `--pending:#d07900`; escuro `--background:#333333`, `--surface:#464646`, `--border:#929292`, `--accent:#adadfb`, `--accent-hover:#c2c2fd`, `--accent-foreground:#000000`, `--danger:#ff9999`, `--pending:#ffb55b`, `--muted-foreground:#c6cbd4`. `.link` ganhou sublinhado permanente (mitigação WCAG 1.4.1).
- `bmad-output/planning-artifacts/ux-designs/ux-fatura-a-dois-2026-07-18/DESIGN.md` -- frontmatter `colors:` e notas de verificação de contraste atualizadas (rodadas 7/7b/8/9).
- `bmad-output/implementation-artifacts/deferred-work.md` -- 3 novos itens: ausência de lint de contraste automático; `.badge-pending` continua abaixo de AA pleno (gap pré-existente, mitigado não resolvido); `--border` claro (~1.2:1 contra surface/background, pré-existente, não causado por esta spec).

**Achados de review:** 3 ciclos de bad_spec repair, cada um fechando uma classe de par de contraste não verificado -- pass 1 corrigiu tokens calculados só contra o `--background` antigo; pass 2 achou que ajustar `--surface-dark` isoladamente quebrava `--accent-dark`/`--danger-dark` (nunca verificados contra `--surface`); pass 3 resolveu a matriz completa (todo token-texto × `--background` E `--surface`, dois modos) como sistema único, com `--accent`/`--accent-dark` fixos (sourced, aprovados pelo usuário) e os demais resolvidos ao redor deles. Review final (pass 3) não achou mais nenhuma falha de valor -- só um número de comentário desatualizado (corrigido) e um item pré-existente fora de escopo (deferido).

**Verificação:** `npx tsc --noEmit`, `npm run lint`, `npm run build` limpos em todas as passadas. Contraste calculado via fórmula WCAG 2.1 completa (não aproximada) para cada par relevante, com números registrados inline no CSS e no DESIGN.md. Não foi possível verificar visualmente no navegador nesta sessão (sem ferramenta de automação disponível) -- risco residual: as cores foram validadas matematicamente, não visualmente confirmadas como esteticamente coerentes lado a lado.

**Riscos residuais:** (1) `--surface-dark` vs `--background-dark` fica a só 1,34:1 -- menos "nitidamente distinguível" que o ideal (~3:1), trade-off aceito e documentado porque `--accent-dark` (fixo) consome a folga de luminância disponível; (2) `.badge-pending` no claro continua abaixo de AA pleno (~3,27:1, mitigado mas não resolvido); (3) `--border` claro continua com contraste muito baixo (pré-existente, não causado por esta spec); (4) nenhuma verificação visual real em navegador foi feita. `followup_review_recommended: true` dado o volume e a complexidade das mudanças interdependentes de cor (10+ valores, 3 ciclos de correção).
