---
title: 'Story 3.1: Gestão de categorias do casal'
type: 'feature'
created: '2026-07-18'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
baseline_revision: '94f5b5fb4d0ba0bd41d4cf965f710830afaee782'
---

<intent-contract>

## Intent

**Problem:** Não existe nenhum vocabulário de categorias no sistema -- `lancamento.categoria_id` já existe na tabela (Epic 2) mas sem FK e sem nenhuma tabela `categoria` para apontar, e não há nenhuma tela para o casal criar, renomear ou remover categorias.

**Approach:** Nova tabela `categoria` (compartilhada pelas duas contas, AD-8) com exclusão lógica (`removido_em`) para nunca perder a informação de "esta categoria existia" quando lançamentos ainda apontam pra ela. Tela `/categorias` lista categorias ativas com formulários de criar/editar; remover uma categoria com lançamentos associados navega para uma tela de confirmação (`/categorias/[id]/remover`) que mostra quantos lançamentos serão afetados e pede uma substituta (existente ou nova) ou confirma sem substituta.

## Boundaries & Constraints

**Always:** Categorias são compartilhadas pelas duas contas -- nunca ganham coluna de escopo por usuário (AD-8). Remover uma categoria é exclusão lógica (`removido_em`), nunca `DELETE` físico -- um `lancamento.categoria_id` que aponta para uma categoria removida continua uma referência válida (FK íntegra), permitindo distinguir "categoria removida" de "nunca categorizado" (`categoria_id is null`) sem perder qual era a categoria original. Escolher uma substituta migra todos os lançamentos daquela categoria para a substituta antes de marcar a categoria original como removida. Nomes de categoria ativas são únicos (constraint de banco, índice parcial `where removido_em is null`) -- criar/editar com nome duplicado entre categorias ativas retorna erro, nunca deixa duas ativas com o mesmo nome. Editar ou remover uma categoria já removida é rejeitado (guard no `WHERE`, mesmo padrão de `mapear-cartao.ts`).

**Block If:** nenhuma decisão de código aqui depende de informação exclusiva do usuário.

**Never:** Nunca fazer `DELETE` físico de uma linha de `categoria` (perderia a rastreabilidade de lançamentos antigos). Nunca migrar lançamentos para uma "substituta" que não seja uma categoria ativa (nem para a própria categoria sendo removida). Nunca introduzir `regra_categorizacao` ou lógica de sugestão automática nesta story -- isso é Story 3.2/3.3; esta story só cuida do CRUD de categoria e da migração/soft-delete na remoção.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Criar categoria | Nome não vazio, sem categoria ativa com esse nome | Categoria criada, disponível na lista | Nenhum erro |
| Criar categoria com nome duplicado | Nome igual a uma categoria ativa existente | Rejeitado, nenhuma linha criada | Mensagem "já existe uma categoria ativa com esse nome" |
| Editar nome de categoria ativa | Categoria existe e está ativa | Nome atualizado | Nenhum erro |
| Editar categoria já removida | `categoriaId` de uma categoria com `removido_em` setado | Rejeitado, nada alterado | Mensagem "categoria não existe ou foi removida" |
| Remover categoria sem lançamentos associados | Categoria ativa, 0 lançamentos com esse `categoria_id` | Marcada como removida imediatamente | Nenhum erro |
| Remover categoria com lançamentos, escolhendo substituta existente | Categoria ativa com N lançamentos; casal escolhe outra categoria ativa | Todos os N lançamentos migram para a substituta; categoria original marcada como removida | Nenhum erro |
| Remover categoria com lançamentos, criando substituta nova | Casal digita um nome novo na tela de confirmação | Nova categoria criada, lançamentos migrados para ela, categoria original marcada como removida | Nenhum erro |
| Remover categoria com lançamentos, recusando substituta | Casal confirma sem selecionar/criar substituta | Categoria marcada como removida; lançamentos mantêm o `categoria_id` antigo (agora "categoria removida") | Nenhum erro |
| Tentativa de usar a própria categoria como substituta dela mesma | `substitutaId === categoriaId` | Rejeitado, nada alterado | Mensagem de erro |
| Tentativa de usar categoria já removida como substituta | `substitutaId` aponta para categoria com `removido_em` setado | Rejeitado, nada alterado | Mensagem de erro |

</intent-contract>

## Code Map

- `db/schema/index.ts` -- MODIFICAR: nova tabela `categoria` (id, nome, removidoEm, createdAt) com índice único parcial em `nome` (`where removido_em is null`); `lancamento.categoriaId` ganha `.references(() => categoria.id)`
- `server/categorizacao/gerenciar-categorias.ts` -- NOVO: `listarCategorias`, `contarLancamentosPorCategoria`, `criarCategoria`, `editarCategoria`, `removerCategoria`
- `app/(app)/categorias/page.tsx` -- NOVO: lista categorias ativas, formulário de criação, formulário inline de renomear por categoria, link "Remover"
- `app/(app)/categorias/[id]/remover/page.tsx` -- NOVO: mostra contagem de lançamentos afetados, formulário de confirmação (selecionar substituta existente, criar nova, ou nenhuma), link cancelar

## Tasks & Acceptance

**Execution:**
- [x] `db/schema/index.ts` -- adicionar `export const categoria = pgTable('categoria', { id: serial('id').primaryKey(), nome: text('nome').notNull(), removidoEm: timestamp('removido_em'), createdAt: timestamp('created_at').notNull().defaultNow() }, (table) => [uniqueIndex('categoria_nome_ativa_idx').on(table.nome).where(sql\`removido_em is null\`)])`; mudar `lancamento.categoriaId` para `integer('categoria_id').references(() => categoria.id)` (mantendo nullable); gerar e aplicar migration (`npm run db:generate` + `npm run db:migrate`)
- [x] `server/categorizacao/gerenciar-categorias.ts` -- `'use server'`; `listarCategorias()` retorna categorias onde `removido_em is null`, ordenado por `nome`; `contarLancamentosPorCategoria(categoriaId: number)` retorna `count(*)` de `lancamento` onde `categoria_id = categoriaId`; `criarCategoria(nome: string)` valida nome não vazio (trim), insere, captura violação de unique constraint e retorna `{ ok: false, message: 'Já existe uma categoria ativa com esse nome.' }` nesse caso, senão `{ ok: true, categoria }`; `editarCategoria(categoriaId: number, nome: string)` valida nome não vazio, `UPDATE categoria SET nome = ... WHERE id = categoriaId AND removido_em IS NULL RETURNING *` (mesma captura de unique violation), 0 linhas afetadas -> `{ ok: false, message: 'Categoria não existe ou foi removida.' }`; `removerCategoria(categoriaId: number, substitutaId: number | null)` -- se `substitutaId` informado: rejeita se `substitutaId === categoriaId`; busca a substituta e rejeita se não existir ou `removido_em` não for null; numa transação, `UPDATE lancamento SET categoria_id = substitutaId WHERE categoria_id = categoriaId`, depois `UPDATE categoria SET removido_em = now() WHERE id = categoriaId AND removido_em IS NULL RETURNING *` (guard, 0 linhas -> erro "categoria não existe ou já foi removida"); se `substitutaId` é `null`, só o `UPDATE categoria SET removido_em = now() ...` com o mesmo guard; todas chamam `revalidatePath('/categorias')` em caso de sucesso
- [x] `app/(app)/categorias/page.tsx` -- Server Component `async`; chama `listarCategorias()`; formulário no topo para criar categoria (input nome + submit via Server Action inline chamando `criarCategoria`, log de erro se `!ok`); lista cada categoria com um formulário inline de renomear (input com valor atual + submit chamando `editarCategoria`) e um link `<a href={\`/categorias/${id}/remover\`}>Remover</a>`; mensagem "Nenhuma categoria cadastrada ainda." se lista vazia
- [x] `app/(app)/categorias/[id]/remover/page.tsx` -- Server Component `async` recebendo `params: Promise<{ id: string }>`; resolve `categoriaId`, chama `listarCategorias()` (para o select de substitutas, excluindo a própria) e `contarLancamentosPorCategoria(categoriaId)`; renderiza a contagem ("N lançamentos serão afetados" ou "Nenhum lançamento associado" quando 0); formulário com (a) select de substituta existente com opção "Nenhuma (marcar como removida)" e (b) input de texto "ou criar nova categoria substituta"; Server Action de confirmação: se o input de nova categoria vier preenchido, chama `criarCategoria(novoNome)` primeiro e usa o id resultante como `substitutaId` (aborta com erro se a criação falhar), senão usa o valor do select (string vazia = `null`); chama `removerCategoria(categoriaId, substitutaId)`; em sucesso redireciona para `/categorias` (`redirect`), em erro loga e mantém a página; link "Cancelar" voltando para `/categorias`

**Acceptance Criteria:**
- Given estou autenticado, when crio uma nova categoria com um nome, then ela fica disponível (compartilhada pelas duas contas) para classificar lançamentos
- Given tento excluir uma categoria com lançamentos associados, when confirmo a intenção de excluir, then o sistema avisa antes quantos lançamentos serão afetados
- Given o aviso de exclusão foi mostrado, when escolho uma categoria substituta (nova ou existente), then todos os lançamentos associados são migrados automaticamente para a substituta
- Given o aviso de exclusão foi mostrado, when recuso escolher uma substituta, then os lançamentos afetados ficam marcados "categoria removida" até reclassificação manual -- nunca perdem a informação silenciosamente

## Design Notes

Exclusão lógica em vez de física evita o problema de "para onde aponta `lancamento.categoria_id` depois que a categoria some": com `removido_em`, a FK continua íntegra e a distinção "nunca categorizado" (`categoria_id is null`) vs "categoria removida" (`categoria_id` aponta pra uma linha com `removido_em` setado) fica trivial de consultar via join, sem precisar de uma coluna de status redundante em `lancamento`. Isso também é o que a Story 3.3 (regra memorizada) e o Epic 4 (grupo "pendente de revisão") vão precisar -- ambos só leem o estado, não mudam este modelo.

O índice único parcial (`where removido_em is null`) permite recriar uma categoria com o mesmo nome de uma que já foi removida, sem herdar nenhum estado da antiga -- são entidades independentes que só coincidem no nome.

A opção de "criar nova categoria substituta" na tela de remoção reaproveita `criarCategoria` em vez de duplicar lógica de inserção -- a tela de remoção só resolve qual `substitutaId` usar antes de chamar `removerCategoria`.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

### 2026-07-18 — Review pass 1

- intent_gap: 0
- bad_spec: 0
- patch: 9 (high 1, medium 4, low 4)
- defer: 1 (low 1)
- reject: 6
- addressed_findings:
  - `[high]` `[patch]` `removerCategoria` migrava lançamentos para a substituta e só depois checava se o `UPDATE` final (marcar a categoria original como removida) afetou alguma linha -- retornar array vazio não lança, então a transação commitava a migração mesmo quando a remoção reportava falha (categoria já removida/inexistente concorrentemente). Restruturado para lançar uma exceção (`CategoriaValidationError`) dentro da própria transação nesse caso, forçando rollback completo.
  - `[medium]` `[patch]` A existência/estado ativo da substituta era checada antes de abrir a transação (janela de corrida entre a checagem e a escrita). Movida para dentro da transação, junto com a correção acima.
  - `[medium]` `[patch]` O fluxo de "criar nova categoria substituta" na tela de remoção fazia duas chamadas de servidor separadas (`criarCategoria` depois `removerCategoria`); uma falha na segunda deixava a categoria nova órfã, já commitada e visível em `/categorias`. `removerCategoria` agora aceita `novaCategoriaNome` e cria a substituta dentro da mesma transação da migração/soft-delete -- tudo atômico, sem chamada dupla.
  - `[low]` `[patch]` A checagem da substituta rodava fora do `try/catch` que envolvia a transação, podendo propagar uma exceção não tratada. Resolvido pela mesma unificação acima (tudo dentro do mesmo `try`/transação).
  - `[low]` `[patch]` `/categorias/[id]/remover` não validava o parâmetro de rota (`Number(id)` em segmento não numérico gerava `NaN` e um erro de banco não tratado) nem verificava se a categoria realmente existia entre as ativas. Adicionado `notFound()` para ambos os casos.
  - `[medium]` `[patch]` Unicidade de nome só cobria correspondência exata -- "Mercado" e "mercado" podiam coexistir como categorias ativas distintas. Adicionada checagem de duplicidade case-insensitive (`lower()`) na camada de aplicação em `criarCategoria`/`editarCategoria`/`removerCategoria` (criação de substituta), mantendo o índice único de banco (exato) como defesa secundária contra corrida -- sem exigir nova migration.
  - `[low]` `[patch]` Nenhum limite de tamanho no nome da categoria (`text` irrestrito), diferente do teto já usado em outros inputs de usuário no projeto. Adicionado limite de 60 caracteres.
  - `[low]` `[patch]` Formulário de remoção permitia preencher o select de substituta existente e o campo de nova categoria ao mesmo tempo, sem indicar qual prevalece (a nova era escolhida silenciosamente). Rótulo do campo esclarecido para declarar a prioridade.
  - `[medium]` `[patch]` (achado próprio, fora dos dois relatórios de revisão, encontrado ao testar de ponta a ponta contra o banco real) `revalidatePath` estava dentro do mesmo `try/catch` da escrita em `criarCategoria`/`editarCategoria` -- uma falha na revalidação de cache fazia uma criação/edição já persistida ser reportada como falha ao chamador. Isolado numa função `safeRevalidate` que nunca deixa uma falha de invalidação de cache mascarar uma mutação bem-sucedida (em `removerCategoria` a chamada já estava corretamente fora do try/catch).
- deferred:
  - `[low]` Nenhuma tela permite ver ou restaurar uma categoria removida (soft-delete) -- o único "desfazer" é criar uma categoria nova com o mesmo nome, que é uma linha/id diferente e não recupera o que foi migrado na remoção original. Registrado em `deferred-work.md` como candidato a story de polimento futura (mesmo padrão do "sem undo de rejeição de cartão" da Story 2.3).
- Rejeitados (com razão): falta de feedback visível na UI além de `console.error` para erros de criar/editar/remover -- reject, mesmo padrão já estabelecido e aceito desde a Story 2.3 (`mapear-cartao.ts`/`cartoes/page.tsx`); falta de testes automatizados -- reject, gap pré-existente de todo o projeto já registrado em `deferred-work.md` desde a Story 1.2, não duplicado aqui; falta de `updatedAt`/trilha de auditoria para renomeações -- reject, não pedido por nenhum AC, fora do escopo mínimo da story; FK `ON DELETE no action` problemática para um hipotético script futuro de limpeza física de `categoria` -- reject, especulativo, nada no código atual faz `DELETE` físico dessa tabela (é exclusão lógica por design desta story); risco de migration falhar por linhas pré-existentes de `lancamento` com `categoria_id` não nulo -- reject, verificado: nenhum código de Epic 1/2 jamais escreveu em `categoriaId` antes desta story, e a migration já foi aplicada com sucesso contra o Supabase de produção real; `substitutaId` de um `<select>` poder ser forjado para um valor fora das opções renderizadas -- reject, `removerCategoria` já valida existência/estado ativo da substituta dentro da própria transação independentemente da origem do valor, não é um bypass real.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: sucesso
- `npm run db:generate` / `npm run db:migrate` -- expected: tabela `categoria` criada e FK de `lancamento.categoria_id` aplicada em produção

**Manual checks (if no CLI):**
- Acessar `/categorias` autenticado -- criar uma categoria nova, deve aparecer na lista
- Tentar criar outra com o mesmo nome -- deve ser rejeitada com mensagem clara
- Editar o nome de uma categoria -- deve refletir na lista
- Criar uma categoria, associar manualmente (via SQL/Supabase Studio, já que a atribuição por lançamento é Story 3.2/3.3) alguns lançamentos reais a ela, depois remover escolhendo uma substituta existente -- lançamentos devem migrar
- Remover uma categoria com lançamentos associados recusando substituta -- lançamentos devem manter o `categoria_id` antigo, categoria deve sumir da lista ativa
- Tentar remover/editar uma categoria já removida -- deve ser rejeitado

## Auto Run Result

Status: done

**Summary:** Tela `/categorias` (criar/renomear) e `/categorias/[id]/remover` (excluir com aviso de impacto e escolha de substituta existente/nova/nenhuma). Nova tabela `categoria` com exclusão lógica (`removido_em`) -- um lançamento apontando para uma categoria removida nunca perde a FK, distinguindo "categoria removida" de "nunca categorizado". `removerCategoria` executa validação da substituta, criação da nova categoria (se pedida), migração dos lançamentos e a marcação de removida numa única transação atômica.

**Files changed:**
- `db/schema/index.ts` -- nova tabela `categoria` (com índice único parcial por nome ativo); `lancamento.categoriaId` ganhou FK para `categoria.id`
- `db/migrations/0003_early_ender_wiggin.sql` (novo) -- aplicada em produção
- `server/categorizacao/gerenciar-categorias.ts` (novo) -- `listarCategorias`, `contarLancamentosPorCategoria`, `criarCategoria`, `editarCategoria`, `removerCategoria`
- `app/(app)/categorias/page.tsx` (novo) -- tela de gestão (criar/renomear)
- `app/(app)/categorias/[id]/remover/page.tsx` (novo) -- tela de confirmação de remoção

**Review findings breakdown:** 9 patches aplicados (1 alto: transação de remoção não fazia rollback da migração de lançamentos quando o guard final de "já removida" falhava -- corrigido lançando exceção dentro da própria transação; 4 médios: re-checagem da substituta movida para dentro da transação, fluxo de criar-substituta-nova unificado numa única transação atômica em vez de duas chamadas separadas, unicidade de nome passou a ser case-insensitive na camada de aplicação, `revalidatePath` isolado numa função que nunca mascara uma escrita bem-sucedida como falha; 4 baixos: exceção não tratada fora do try/catch, validação do parâmetro de rota com `notFound()`, limite de 60 caracteres no nome, rótulo esclarecendo prioridade entre substituta selecionada e nova). 1 deferido (sem UI de restauração de categoria removida). 6 rejeitados como convenção já estabelecida no projeto, gap pré-existente já registrado, fora do escopo mínimo da story, ou especulativo sem impacto real verificado.

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos (build gera `/categorias` e `/categorias/[id]/remover` com sucesso contra o Supabase de produção real). Migration `0003` aplicada em produção. Testado de ponta a ponta com um script temporário (removido após o teste) executando as funções reais contra o banco de produção real, usando categorias e um lançamento sintéticos criados e apagados ao final: criação, rejeição de duplicata case-insensitive, rejeição de nome vazio/longo demais, edição, rejeição de rename para nome duplicado, contagem de lançamentos, remoção com migração para substituta existente, rejeição de remover categoria já removida, remoção sem substituta (lançamento mantém `categoria_id` antigo agora "removida"), remoção criando substituta nova atomicamente, rejeição de substituta igual à própria categoria, e `listarCategorias` só retornando ativas -- todos os 15 cenários passaram. Nenhum dado real do casal foi tocado (nenhum lançamento real teve seu `categoria_id` alterado; o único lançamento usado no teste foi sintético e removido ao final).

**Residual risks:** Sem UI de restauração de categoria removida (ver `deferred-work.md`); nenhuma cobertura de teste automatizado (gap pré-existente de todo o projeto).

Follow-up review recommended: true -- o volume de patches (9, incluindo 1 de severidade alta em integridade transacional de dados) e a reestruturação real da lógica de `removerCategoria` (de duas chamadas separadas para uma transação atômica única) justificam uma segunda revisão independente antes de avançar para as próximas stories do Epic 3, que vão depender diretamente deste módulo.
