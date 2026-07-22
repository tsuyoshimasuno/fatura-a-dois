---
title: 'Story 6.1: Repasse e desfazer repasse de lançamento'
type: 'feature'
created: '2026-07-21'
status: 'in-review'
review_loop_iteration: 1
followup_review_recommended: true
context: []
warnings: ['oversized']
baseline_revision: '5b5793636441b7a350b6617a1021e57d219ef75f'
---

<intent-contract>

## Intent

**Problem:** Hoje "de quem é um gasto" (para fins de total/lista, `/lancamentos`) é decidido 100% por `cartao.usuarioId` — não existe forma de dizer "esse gasto caiu no meu cartão, mas quem deve pagar é meu parceiro", sem perder o registro de quem de fato comprou.

**Approach:** Adicionar em `lancamento` três colunas nullable (`responsavelId`, `repassadoPor`, `repassadoEm`); `responsavelId` (quando presente) sobrepõe `cartao.usuarioId` só para fins de total/agregação/filtro por pessoa em `/lancamentos` e `/parcelas` — a exibição de titular (quem gastou) continua sempre vindo de `cartao.usuarioId`, intocada. Uma ação de toggle por lançamento (repassar/desfazer) grava/limpa essas colunas, com guard de concorrência no mesmo padrão de `mapearCartao`. Repasse em lançamento parcelado propaga automaticamente às parcelas futuras projetadas e ao lançamento real do mês seguinte quando ele chega via upload.

## Boundaries & Constraints

**Always:**
- Titular exibido (badge, "quem gastou") vem sempre de `cartao.usuarioId`, nunca de `responsavelId` — os dois conceitos nunca se misturam na UI nem no dado.
- "Dono efetivo" para fins de total/lista/filtro = `responsavelId ?? cartaoUsuarioId` — usado em `resumo-gastos.ts`, `comprometimento-limite.ts`/`projetar-parcelas-futuras.ts` e no filtro de Pessoa client-side de `lancamentos-view.tsx`.
- Repasse só é permitido quando `cartaoUsuarioId` não é nulo (titular já mapeado, Story 2.3); nunca em item de "pendente de revisão" por titular pendente.
- Repasse e desfazer são simétricos, reversíveis, ilimitadas vezes, por qualquer uma das duas contas sobre qualquer lançamento (mesma regra de `corrigirCategoriaLancamento`, sem restrição de dono).
- Mutação usa UPDATE com WHERE afirmando o estado esperado (`responsavelId IS NULL` para repassar, `IS NOT NULL` para desfazer) — 0 linhas afetadas é falha explícita (`{ok:false}`), nunca sucesso silencioso.
- Repasse em lançamento com `compraParceladaId` não nulo propaga: (a) para as parcelas futuras já projetadas da mesma compra (herdado junto com `estabelecimento`/`valorParcelaCentavos` em `projetar-parcelas-futuras.ts`); (b) para a próxima parcela real inserida via upload (`server/ingestao/upload.ts`, `delta.inserir`) da mesma `compraParceladaId` — copiada da parcela mais recente conhecida.
- Reenvio de competência (`server/ingestao/upload.ts`, `delta.atualizar`) nunca sobrescreve `responsavelId`/`repassadoPor`/`repassadoEm` de um lançamento já existente — o UPDATE de reenvio continua escopado só a `valorCentavos`, mesma garantia já existente para `categoriaId`.
- `repassadoPor`/`repassadoEm` são gravados a cada repasse OU desfeito (registram a última ação, não um histórico completo) — obtidos via `(await createClient()).auth.getUser()` de `lib/supabase/server.ts`, mesmo client usado em `app/auth/confirm/route.ts`.

**Block If:** Nenhuma decisão aqui exige informação que só o usuário tem — todas já reconciliadas na avaliação PM+tech-lead+UX (ver `.memlog.md` do goal-engine, 2026-07-21).

**Never:** Tabela de histórico separada (não pedida, não necessária — 1 ponteiro mutável basta). Repasse parcial/fracionado de um valor. Repasse para mais de duas pessoas (o casal é sempre exatamente 2 contas — toggle binário, não seletor). Alterar `cartao.usuarioId` ou qualquer lógica de mapeamento de cartão (Story 2.3) — repasse é ortogonal a titularidade de cartão.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Repasse simples | Lançamento com `cartaoUsuarioId` = A, `responsavelId` null | `repassarLancamento(id, B)` grava `responsavelId=B, repassadoPor=quem, repassadoEm=now` | — |
| Auto-repasse | `novoResponsavelId === cartaoUsuarioId` do lançamento | Rejeitado, `{ok:false}` — não-operação | Mensagem clara, sem UPDATE |
| Titular pendente | `cartaoUsuarioId` null | Ação bloqueada na Server Action (guard), nunca só na UI | `{ok:false, message:'Titular ainda não identificado.'}` |
| Concorrência (duplo clique) | Dois `repassarLancamento(id, B)` quase simultâneos | Primeiro aplica; segundo encontra `responsavelId` já não-nulo, 0 linhas afetadas | `{ok:false, message:'Lançamento já foi repassado ou não existe.'}` |
| Desfazer sem estar repassado | `responsavelId` já null | 0 linhas afetadas | `{ok:false, message:'Lançamento não está repassado.'}` |
| Parcela repassada, mês seguinte | Lançamento repassado com `compraParceladaId=X`; upload processa nova parcela real da mesma compra | Novo `lancamento` inserido já com `responsavelId` copiado da parcela mais recente conhecida de X | Nenhuma parcela sem `compraParceladaId` é afetada |
| Reenvio da mesma competência | Lançamento repassado corresponde por chave de delta num reenvio | `responsavelId`/`repassadoPor`/`repassadoEm` preservados — update de reenvio só toca `valorCentavos` | — |
| `novoResponsavelId` inválido | Id que não está em `listarContasCasal()` | Rejeitado antes de qualquer UPDATE | `{ok:false, message:'Conta inválida.'}` |

</intent-contract>

## Code Map

- `db/schema/index.ts` (linhas 95-119, tabela `lancamento`) -- adicionar `responsavelId`/`repassadoPor` (`uuid(...).references(() => authUsers.id)`, nullable) + `repassadoEm` (`timestamp(...)`, nullable), mesmo estilo de `cartao.usuarioId` (linha 21).
- `db/migrations/` -- rodar `npm run db:generate` após o schema change (gera SQL numerado, ex. `0006_*.sql`), revisar, `npm run db:migrate` contra produção real. Migration puramente aditiva, sem backfill.
- `server/visualizacao/repasse-lancamento.ts` (NOVO) -- `repassarLancamento(lancamentoId, novoResponsavelId)` e `desfazerRepasse(lancamentoId)`, mesmo padrão de `server/ingestao/mapear-cartao.ts` (guard `and(eq(lancamento.id, id), isNull(lancamento.responsavelId))` / `isNotNull`, validação de `novoResponsavelId` via `listarContasCasal()`, `(await createClient()).auth.getUser()` para `repassadoPor`, `revalidatePath('/lancamentos')`). **[amendado, review pass 1]** dentro de uma `db.transaction`, propaga o mesmo valor para toda parcela real já existente da mesma `compraParceladaId` com `parcelaNumero` maior/igual ao da parcela alvo -- nunca retroagindo a parcelas anteriores.
- `server/parcelas/identificar-compra-parcelada.ts` -- `obterResponsavelHerdadoDaCompra` **[amendado, review pass 1]** ganha tiebreaker determinístico (`orderBy(desc(parcelaNumero), desc(id))`).
- `server/visualizacao/resumo-gastos.ts` -- select (linhas 71-82) ganha `responsavelId: lancamento.responsavelId`; linha 107 (`const usuarioId = linha.cartaoUsuarioId`) vira `const usuarioId = linha.responsavelId ?? linha.cartaoUsuarioId`.
- `server/parcelas/projetar-parcelas-futuras.ts` -- `UltimaParcelaReal` (linhas 32-41), select (53-73) e `ItemParcelaProjetada` (5-14) ganham `responsavelId`; herdado no loop (91-103) e no `itens.push` (127-138) igual aos demais campos herdados.
- `server/parcelas/comprometimento-limite.ts` -- `usuarioIdPorCartao`/linha 66 (`usuarioIdPorCartao.get(item.cartaoId) ?? null`) vira `item.responsavelId ?? usuarioIdPorCartao.get(item.cartaoId) ?? null`, já que este arquivo não faz join com `lancamento` -- o dado chega via `ItemParcelaProjetada`.
- `server/ingestao/upload.ts` -- linhas 190-200 (resolução de `compraParceladaId`): antes do insert (linha 202-213), quando `compraParceladaId !== null`, buscar `responsavelId` da parcela de maior `parcelaNumero` já existente da mesma compra e incluir no `values(...)`. Linhas 173-177 (update de reenvio) permanecem escopadas só a `valorCentavos` -- não tocar, é o que já preserva `responsavelId`/`repassadoPor`/`repassadoEm` automaticamente.
- `server/categorizacao/corrigir-categoria.ts` -- `LancamentoParaCorrecao` (linhas 27-38) e `listarLancamentosParaCorrecao` (47-82) ganham `responsavelId: string | null` no select/type/map (mesmo padrão de `cartaoUsuarioId`).
- `app/(app)/lancamentos/_components/lancamentos-view.tsx` -- filtro de Pessoa (linha 98, `item.titularUsuarioId !== pessoaSelecionada`) muda para comparar contra `item.responsavelId ?? item.titularUsuarioId`; passar `responsavelId`/nome do destinatário (via `nomePorConta`) para `LancamentoItem`.
- `app/(app)/lancamentos/_components/lancamento-item.tsx` -- segundo `icon-button` ao lado do lápis de categoria (linhas 157-178) chamando `repassarLancamento`/`desfazerRepasse`; novo `badge-repasse` ao lado de `titular-badge` (linha 144-149) quando repassado; loading/erro no mesmo padrão do form de categoria; atraso antes do `router.refresh()` (`ATRASO_REFRESH_MS = 2500`, mesma constante de `cartao-pendente-item.tsx`/`cartao-rejeitado-item.tsx`) para não sumir da lista filtrada instantaneamente.
- `app/globals.css` -- classe `.badge-repasse` nova (token `DESIGN.md`, `{colors.accent}`, borda 1px, fundo transparente, `rounded.full`) -- distinta de `.titular-badge` e `.badge-pendente` já existentes.

## Tasks & Acceptance

**Execution:**
- [x] `db/schema/index.ts` -- adicionar `responsavelId`, `repassadoPor`, `repassadoEm` em `lancamento` -- base de dado para todo o resto da story
- [x] gerar e aplicar migration (`npm run db:generate` + `npm run db:migrate`) -- schema real em produção precisa da coluna antes de qualquer leitura/escrita nova (migration `0006_sleepy_gladiator.sql`, aplicada em produção)
- [x] `server/visualizacao/repasse-lancamento.ts` -- criar `repassarLancamento`/`desfazerRepasse` com guards de concorrência e validação de conta -- ação central da story (inclui `safeRevalidate`, achado real do próprio teste: `revalidatePath` fora de contexto de requisição não pode derrubar uma mutação já persistida, mesmo padrão de `corrigir-categoria.ts`)
- [x] `server/visualizacao/resumo-gastos.ts` -- trocar `usuarioId` para dono efetivo -- sem isso o total nunca reflete o repasse
- [x] `server/parcelas/projetar-parcelas-futuras.ts` + `comprometimento-limite.ts` -- propagar `responsavelId` às projeções -- sem isso o repasse "desaparece" na tela de parcelas
- [x] `server/ingestao/upload.ts` -- herdar `responsavelId` ao inserir nova parcela real da mesma compra -- sem isso o repasse "reseta" todo mês (via novo helper `obterResponsavelHerdadoDaCompra` em `server/parcelas/identificar-compra-parcelada.ts`)
- [x] `server/categorizacao/corrigir-categoria.ts` -- expor `responsavelId` em `listarLancamentosParaCorrecao` -- UI precisa do dado para renderizar o badge e decidir o filtro
- [x] `app/(app)/lancamentos/_components/{lancamentos-view,lancamento-item}.tsx` + `app/globals.css` -- UI de toggle, badge, filtro por dono efetivo -- superfície visível da story
- [x] testar ponta a ponta contra o Supabase de produção real via script descartável (removido após uso) cobrindo a I/O Matrix acima (repasse simples, auto-repasse rejeitado, titular pendente bloqueado, concorrência, desfazer sem estar repassado, propagação a parcela futura/mês seguinte, sobrevivência a reenvio, conta inválida) -- 15/15 cenários passaram, dados sintéticos limpos sem resíduo

**Acceptance Criteria:**
- Given um lançamento com titular mapeado, when repassado para o parceiro, then some do total/lista de quem gastou e aparece no total/lista do parceiro com badge de repasse distinto, titular original ainda visível
- Given um lançamento repassado, when desfeito, then volta ao total/lista original e a ação pode repetir-se qualquer número de vezes
- Given uma parcela repassada, when o mês seguinte processa a próxima parcela real da mesma compra, then ela já nasce com o mesmo repasse, sem ação manual repetida
- Given um lançamento repassado, when a mesma competência é reenviada e ele corresponde pela chave de delta, then o repasse sobrevive intacto

## Spec Change Log

### 2026-07-21 — Review pass 1 (bad_spec)

**Achado:** Blind Hunter + Edge Case Hunter (convergente): o mecanismo de herança de repasse (`obterResponsavelHerdadoDaCompra`, `projetar-parcelas-futuras.ts`) assume que a parcela repassada é sempre a de maior `parcelaNumero` já conhecida da compra. Se o usuário repassa uma parcela que NÃO é a mais recente (parcelas seguintes já reais, importadas de uploads anteriores a este repasse -- cenário real, não hipotético: acontece sempre que o repasse é decidido depois que mais de um mês da mesma compra já foi processado), a parcela real mais recente conhecida continua com `responsavelId` antigo/nulo, e tanto a projeção de parcelas futuras quanto a herança no próximo upload usam essa parcela desatualizada -- o repasse fica invisível para o resto da compra, uma inconsistência financeira silenciosa.

**Amendado:** `repassarLancamento`/`desfazerRepasse` (`server/visualizacao/repasse-lancamento.ts`) passam a propagar, na mesma transação da escrita principal, o novo `responsavelId` para toda parcela real JÁ EXISTENTE da mesma `compraParceladaId` com `parcelaNumero >= parcelaNumero` da parcela repassada -- nunca retroagindo a parcelas anteriores (competências já fechadas permanecem como estavam). Isso mantém "a parcela real mais recente conhecida" sempre correta por construção, sem exigir nenhuma mudança em `projetar-parcelas-futuras.ts` (que já lê corretamente essa parcela) nem alterar o significado de `obterResponsavelHerdadoDaCompra` (só ganha um tiebreaker determinístico: `orderBy(desc(parcelaNumero), desc(id))`, para o caso de duas parcelas empatarem no maior número, achado relacionado do Edge Case Hunter).

**Estado ruim evitado:** repasse aplicado a uma parcela do meio da compra "sumia" silenciosamente das parcelas seguintes já reais e das projeções futuras, sem erro, sem aviso -- o casal veria o total mudar para a parcela corrigida mas não para o resto da mesma compra.

**KEEP:** todo o resto do desenho (coluna nullable em vez de tabela de histórico, dono efetivo = `responsavelId ?? cartaoUsuarioId`, guard de concorrência no padrão `mapear-cartao.ts`, `safeRevalidate`) permanece correto e não precisou de re-derivação.

## Review Triage Log

### 2026-07-21 — Review pass 1
- intent_gap: 0
- bad_spec: 1 (high 1, medium 0, low 0)
- patch: 6 (high 0, medium 3, low 3)
- defer: 0
- reject: 13
- addressed_findings:
  - `[high]` `[bad_spec]` Herança de repasse assumia "parcela de maior parcelaNumero" = "parcela com a decisão mais recente" -- corrigido propagando o repasse a todas as parcelas reais já existentes com parcelaNumero maior/igual, na mesma transação.
  - `[medium]` `[patch]` FKs `responsavelId`/`repassadoPor` sem `onDelete` -- `SET NULL` adicionado (nova migration), evitando que uma exclusão futura de conta trave por violação de FK.
  - `[medium]` `[patch]` Duplo clique durante os 2.5s de atraso do refresh pós-sucesso reexecutava a ação e mostrava "já foi repassado" por cima da mensagem de sucesso -- botão de repasse agora fica desabilitado até o refresh agendado rodar.
  - `[medium]` `[patch]` Nome do destinatário no `badge-repasse` dependia de `outroConta` (heurística "a outra das duas contas"), frágil se `listarContasCasal()` degradar para menos de 2 contas -- passou a resolver direto via `nomePorConta.get(responsavelId)`, mesmo mapa já usado pelo `titular-badge`.
  - `[low]` `[patch]` Tiebreaker determinístico (`parcelaNumero desc, id desc`) adicionado em `obterResponsavelHerdadoDaCompra` para o caso de duas parcelas empatarem no maior número.
  - `[low]` `[patch]` Ternário duplicado de `aria-label`/`title` no botão de repasse extraído para uma variável única.

### 2026-07-21 — Review pass 2
- intent_gap: 0
- bad_spec: 0
- patch: 5 (high 0, medium 3, low 2)
- defer: 1 (medium 1)
- reject: 17
- addressed_findings:
  - `[medium]` `[patch]` Mensagem de sucesso do repasse/desfazer não revelava que parcelas seguintes já existentes da mesma compra também foram afetadas -- mensagem passa a citar isso quando o lançamento é parcelado.
  - `[medium]` `[patch]` Badge de repasse ficava suprimido (mas o botão continuava dizendo "Desfazer repasse") quando `destinatarioNome` não resolvia -- badge agora sempre aparece quando `item.repassado`, com fallback genérico "Repassado" se o nome não resolver.
  - `[medium]` `[patch]` `router.refresh()` agendado era perdido se o item saísse da lista filtrada (troca do filtro de Pessoa) antes dos 2.5s -- cleanup do efeito agora dispara o refresh pendente imediatamente ao desmontar, em vez de só cancelar.
  - `[low]` `[patch]` `outroConta` (alvo do toggle) passou a exigir `contas.length === 2` explicitamente antes do `.find` -- guarda adicional contra o caso (estruturalmente improvável, mas repetidamente apontado pelos dois revisores nas duas rodadas) de a lista de contas do casal ter mais de 2 entradas.
  - `[low]` `[patch]` Comentário adicionado documentando que `compraParceladaId`/`parcelaNumero` nunca são alterados após o insert (só lidos, nunca via UPDATE em nenhum módulo) -- justifica ler o contexto fora da transação sem risco de corrida.
  - defer: FK de `cartao.usuarioId` -> `auth.users` continua sem `onDelete`, pré-existente (desde Story 1.1/2.3, não introduzida por esta story) -- excluir uma conta do casal travaria por essa FK independente do fix desta story; registrado em `deferred-work.md`.
  - Demais achados (17): re-verificados e rejeitados -- na maioria repetição de achados já triados na rodada 1 (contas sempre 2, sem teste automatizado, mensagem ambígua "já resolvido ou não existe", TOCTOU sobre invariante imutável), 1 falso alarme confirmado (herança em `upload.ts` já estava conectada desde a implementação original, só não aparecia no diff desta rodada por escopo), e a "fragmentação" de repasses parciais tratada como consequência coerente do modelo (repasse futuro a partir do ponto clicado), não corrupção -- mitigada pela mensagem de transparência acima.

## Design Notes

`responsavelId ?? cartaoUsuarioId` é o único ponto de verdade para "total/lista de quem" em todo o app pós-story — qualquer novo agregador futuro deve seguir essa mesma regra, nunca ler `cartao.usuarioId` cru para fins de total. `repassadoPor`/`repassadoEm` guardam só a última ação (não um log) — suficiente para "quem mexeu nisso por último e quando", consciente de que não reconstrói um histórico completo de idas e vindas.

## Verification

**Commands:**
- `npm run typecheck` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build limpo

**Manual checks (if no CLI):**
- Script descartável contra Supabase de produção real cobrindo a I/O Matrix, removido sem resíduo ao final.

## Auto Run Result

Status: done

**Resumo:** Story 6.1 (Epic 6: Repasse de Responsabilidade Financeira entre o Casal) implementada integralmente. Um lançamento com titular já mapeado pode ser repassado (e desfeito) para a outra conta do casal — o titular do cartão (quem gastou) continua sempre visível, mas o valor passa a contar no total/lista da pessoa destinatária. Repasse em lançamento parcelado propaga automaticamente para toda parcela real já existente da mesma compra com número igual/maior, para as projeções de parcelas futuras, e para a próxima parcela real que chegar via upload.

**Arquivos alterados:**
- `db/schema/index.ts` — 3 colunas nullable em `lancamento` (`responsavelId`, `repassadoPor`, `repassadoEm`), FKs com `ON DELETE SET NULL`.
- `db/migrations/0006_sleepy_gladiator.sql`, `0007_absurd_klaw.sql` — migrations aditivas, aplicadas em produção.
- `server/visualizacao/repasse-lancamento.ts` (novo) — `repassarLancamento`/`desfazerRepasse`, guard de concorrência, propagação transacional a parcelas irmãs.
- `server/visualizacao/resumo-gastos.ts`, `server/parcelas/comprometimento-limite.ts`, `server/parcelas/projetar-parcelas-futuras.ts` — dono efetivo (`responsavelId ?? cartaoUsuarioId`) para totais/agregação.
- `server/parcelas/identificar-compra-parcelada.ts` — `obterResponsavelHerdadoDaCompra` (herança para nova parcela real via upload) + tiebreaker determinístico.
- `server/ingestao/upload.ts` — inserção de nova parcela real herda o repasse da parcela mais recente conhecida.
- `server/categorizacao/corrigir-categoria.ts` — expõe `responsavelId` para a UI.
- `app/(app)/lancamentos/_components/lancamento-item.tsx`, `lancamentos-view.tsx`, `app/globals.css` — botão de toggle, `badge-repasse`, filtro de Pessoa por dono efetivo.
- `bmad-output/planning-artifacts/prd.md` (FR-14), `epics.md` (Epic 6/Story 6.1) — avaliação PM+tech-lead+UX aplicada antes da implementação.

**Achados do review:** 2 rodadas (Blind Hunter + Edge Case Hunter em paralelo). Rodada 1: 1 bad_spec real de severidade alta (herança assumia que a parcela repassada era sempre a de maior número conhecido — corrigido com propagação transacional a parcelas irmãs já existentes) + 6 patches (FK onDelete, tiebreaker, ternário duplicado, badge frágil, atraso de refresh). Rodada 2 (sobre o fix): 0 bad_spec, 5 patches (mensagem de transparência sobre propagação, fallback de badge, refresh perdido ao desmontar, guard de contas.length, comentário de invariante), 1 deferred (FK de `cartao.usuarioId` sem `onDelete`, pré-existente), 17 rejeitados (maioria repetição já triada ou falso alarme confirmado).

**Verificação:** `tsc --noEmit`, `eslint`, `next build` limpos após cada rodada. Testado ponta a ponta contra o Supabase de produção real via 2 scripts descartáveis (removidos após uso, sem resíduo): 15 cenários no primeiro (repasse simples, auto-repasse rejeitado, titular pendente bloqueado, concorrência, desfazer, ciclo completo, conta inválida, efeito em resumo-gastos, propagação a parcelas futuras/comprometimento-limite, herança na próxima parcela real, sobrevivência a reenvio) + 9 cenários focados no fix do review pass 1 (repasse numa parcela do meio da compra, propagação correta para posteriores já existentes, sem retroagir às anteriores, herança e projeção corrigidas, desfazer simétrico) — todos passaram.

**Risco residual:** achado de FK sem `onDelete` em `cartao.usuarioId` deferido (pré-existente, decisão de produto não pedida ainda). Nenhuma verificação visual em navegador real desta vez (sem ferramenta de automação disponível nesta sessão) — mesma limitação já registrada em rodadas anteriores desta run.
