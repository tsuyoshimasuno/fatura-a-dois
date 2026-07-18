# Deferred Work

<!-- Append-only. Populated by bmad-dev-auto step-04 when a review finding is real but pre-existing / out of this story's scope. Do not modify existing entries or look for duplicates. -->

- source_spec: `bmad-output/implementation-artifacts/spec-4-1-visao-de-gastos-por-pessoa-e-categoria.md`
  summary: Em `/gastos`, o item de "pendente de revisão" com motivo `categoria_removida` não mostra o nome da categoria que foi removida, dificultando decidir para qual categoria recategorizar o lançamento.
  evidence: `resumo-gastos.ts` monta `ItemPendente` sem incluir `categoriaNome` para esse motivo; não exigido por nenhum AC da Story 4.1, apenas uma melhoria de UX possível.

- source_spec: `bmad-output/implementation-artifacts/spec-4-1-visao-de-gastos-por-pessoa-e-categoria.md`
  summary: Se `listarContasCasal()` (Admin API) falhar, a visão combinada de `/gastos` ainda renderiza o card "Casal -- R$ 0,00" com aparência normal, indistinguível de um mês real sem gastos -- nenhum sinal visível de que houve uma falha de infraestrutura.
  evidence: Mesmo padrão de degradação silenciosa já aceito em `listarContasCasal()` desde a Story 2.3 (retorna `[]` e loga via `console.error`); uma correção completa (banner de erro explícito na UI) é uma preocupação transversal a todas as telas que dependem dessa função, fora do escopo desta story.

- source_spec: `bmad-output/implementation-artifacts/spec-1-2-login-obrigatorio-rota-de-dado.md`
  summary: Sem affordance de logout em nenhuma rota de `app/(app)` — uma vez autenticado, não há como encerrar a sessão pela UI.
  evidence: Confirmado ao ler `app/(app)/page.tsx` e o restante de `app/(app)`: nenhum botão/link/ação de logout existe em lugar nenhum do app.

- source_spec: `bmad-output/implementation-artifacts/spec-1-2-login-obrigatorio-rota-de-dado.md`
  summary: O middleware responde com redirect (3xx) a requisições não autenticadas mesmo quando o chamador não é uma navegação de página (ex.: `fetch`/Server Action para uma futura rota de API sob `app/(app)`), quando o correto seria um 401 JSON.
  evidence: Hoje só existem rotas de página sob `app/(app)`, então não é exercitado ainda; passa a valer assim que Epic 2+ adicionar rotas de API/Server Actions de dado sob esse grupo.

- source_spec: `bmad-output/implementation-artifacts/spec-1-2-login-obrigatorio-rota-de-dado.md`
  summary: Nenhum test runner está configurado no projeto; o enforcement de AD-6 (login obrigatório em toda rota de dado) — um invariante de segurança — não tem cobertura automatizada.
  evidence: Nenhuma story anterior (1.0, 1.1) configurou test runner ou escreveu testes; gap pré-existente do projeto como um todo, não introduzido especificamente por esta story.

- source_spec: `bmad-output/implementation-artifacts/spec-1-2-login-obrigatorio-rota-de-dado.md`
  summary: `lib/supabase/middleware.ts` chama `supabase.auth.getUser()` sem timeout/`AbortController`; se o Supabase Auth travar (em vez de falhar rápido), toda rota de dado fica pendurada esperando essa chamada.
  evidence: `@supabase/ssr` não expõe um jeito direto de abortar essa chamada específica; corrigir direito exigiria uma spike (ex: `Promise.race` com timeout e fallback fail-closed), fora do escopo trivial de um patch de revisão.

- source_spec: `bmad-output/implementation-artifacts/spec-1-3-recuperacao-de-senha.md`
  summary: A sessão criada por `exchangeCodeForSession` (fluxo de recuperação de senha) é uma sessão comum e completa; `/redefinir-senha` só exige alguma sessão válida (herdado do middleware), sem checar se ela veio especificamente do evento `PASSWORD_RECOVERY` nem exigir a senha atual -- qualquer sessão já autenticada pode trocar a senha sem confirmação adicional.
  evidence: Confirmado ao ler `app/(auth)/redefinir-senha/page.tsx` e `lib/supabase/middleware.ts`: nenhum dos dois inspeciona o tipo de evento de auth, só a presença de um usuário autenticado.

- source_spec: `bmad-output/implementation-artifacts/spec-1-3-recuperacao-de-senha.md`
  summary: O fluxo PKCE (`exchangeCodeForSession`) amarra o `code_verifier` ao navegador/dispositivo que chamou `resetPasswordForEmail`; abrir o link de recuperação num dispositivo/navegador diferente do que solicitou o reset falha com uma mensagem genérica de "link inválido", sem explicar o motivo real.
  evidence: Comportamento documentado do fluxo PKCE que o Supabase recomenda para `@supabase/ssr` -- não introduzido por erro nesta story, mas uma limitação real do fluxo escolhido que pode confundir o casal na prática.

- source_spec: `bmad-output/implementation-artifacts/spec-1-3-recuperacao-de-senha.md`
  summary: Nenhuma outra sessão ativa é revogada após uma troca de senha bem-sucedida em `/redefinir-senha` -- um acesso já aberto sob a senha antiga continua válido.
  evidence: `updateUser({ password })` no client não invalida outras sessões; fazer isso exigiria uma Server Action chamando `auth.admin.signOut` (Admin API, service role), não implementado.

- source_spec: `bmad-output/implementation-artifacts/spec-1-3-recuperacao-de-senha.md`
  summary: Um clique duplo/retry no link de `/auth/confirm` no mesmo navegador pode fazer a segunda tentativa de troca de código falhar (código de uso único já consumido pela primeira), levando a pessoa para a tela de erro mesmo já estando autenticada pela primeira tentativa.
  evidence: `app/auth/confirm/route.ts` trata qualquer erro de `exchangeCodeForSession` como link inválido, sem checar se já existe uma sessão válida antes de declarar falha.

- source_spec: `bmad-output/implementation-artifacts/spec-2-1-selecao-competencia-upload-planilha.md`
  summary: `server/ingestao/upload.ts` não valida um tamanho máximo de arquivo -- só rejeita arquivo vazio (`size === 0`), sem limite superior.
  evidence: Story 2.1 nunca lê o conteúdo do arquivo (só nome/extensão), então o risco é baixo hoje; passa a importar de verdade quando a Story 2.2 ler o conteúdo em memória com SheetJS -- resolver o limite junto dessa mudança.
  status: resolvido na Story 2.2 (teto de 5MB adicionado).

- source_spec: `bmad-output/implementation-artifacts/spec-2-2-extracao-lancamentos-atribuicao-competencia.md`
  summary: Corrida (TOCTOU) na criação de `cartao`: duas requisições concorrentes de upload introduzindo o mesmo `numero_mascarado` novo podem ambas tentar `INSERT`, uma falhando na constraint `unique`.
  evidence: `server/ingestao/upload.ts` faz um `SELECT` seguido de `INSERT` condicional sem lock/upsert atômico; mitigado a uma falha graciosa (não mais uma exceção não tratada) pelo `try/catch` da transação, mas ainda pode exigir um novo upload se acontecer. Risco real muito baixo para 2 pessoas fazendo upload manualmente.

- source_spec: `bmad-output/implementation-artifacts/spec-2-3-mapeamento-cartao-titular-conta-casal.md`
  summary: Corrida (TOCTOU) entre a consulta de cartões-terceiro e a abertura da transação em `processarUpload`: uma chamada a `rejeitarCartaoTerceiro` exatamente nesse intervalo (entre o SELECT de checagem e o commit da transação) poderia deixar passar lançamentos de um cartão que acabou de ser marcado como terceiro.
  evidence: `server/ingestao/upload.ts` não usa lock nem re-checa dentro da própria transação; extremamente improvável na prática (exigiria duas pessoas agindo no mesmo segundo em ações diferentes), mas real em teoria.

- source_spec: `bmad-output/implementation-artifacts/spec-2-3-mapeamento-cartao-titular-conta-casal.md`
  summary: Não existe forma de desfazer `rejeitarCartaoTerceiro` pela UI -- uma vez um cartão marcado como "não é do casal", só é reversível editando o banco diretamente.
  evidence: `listarCartoesPendentes` filtra por `terceiro = false`, então um cartão rejeitado nunca mais aparece em nenhuma tela; nenhuma story pede um fluxo de "desmarcar", candidato a uma story de polimento futura.

- source_spec: `bmad-output/implementation-artifacts/spec-2-4-merge-delta-reenvio-competencia.md`
  summary: Quando o merge por delta remove um lançamento que é a primeira parcela conhecida de uma compra parcelada, nenhuma retração de projeção futura acontece -- `server/parcelas`/`compra_parcelada` (Epic 5) ainda não existem.
  evidence: `server/ingestao/upload.ts` só deleta a linha removida, sem chamar nenhuma função de retração (AD-7 prevê essa chamada, mas o módulo alvo só é criado no Epic 5). Como parcelas futuras são sempre computadas em leitura e nunca materializadas (AD-7), é possível que nenhuma ação ativa seja necessária -- a leitura futura do Epic 5 simplesmente deixaria de ver o lançamento removido; a Story 5.2 (ou a que criar `compra_parcelada`) precisa confirmar isso ao ser implementada.

- source_spec: `bmad-output/implementation-artifacts/spec-3-1-gestao-de-categorias-do-casal.md`
  summary: Nenhuma tela permite ver ou restaurar uma categoria removida (soft-delete via `removido_em`) -- o único "desfazer" disponível é criar uma categoria nova com o mesmo nome, que é uma linha/id diferente e não recupera o que foi migrado na remoção original.
  evidence: `listarCategorias` filtra por `removido_em is null`, então uma categoria removida nunca mais aparece em nenhuma tela; nenhum AC da Story 3.1 pede um fluxo de restauração, candidato a uma story de polimento futura (mesmo padrão do "sem undo de rejeição de cartão" deferido na Story 2.3).

- source_spec: `bmad-output/implementation-artifacts/spec-3-3-correcao-manual-categoria-regra-memorizada.md`
  summary: Corrida (TOCTOU) entre `corrigirCategoriaLancamento` (lê o estado ativo da categoria numa SELECT antes de escrever) e `removerCategoria` sem substituta (apaga a regra memorizada daquela categoria) rodando concorrentemente -- uma correção que comita nesse intervalo pode recriar uma regra apontando para uma categoria que acabou de ser removida.
  evidence: Nenhuma das duas funções usa lock (`SELECT ... FOR UPDATE`) na linha de `categoria`; mitigado na prática pela defesa em profundidade em `resolverCategoriaSugerida` (que já ignora regras apontando para categoria removida), então a regra órfã nunca seria usada para sugerir -- mas ficaria órfã na tabela `regra_categorizacao` até a categoria (já removida) ser afetada por uma nova operação. Baixíssima probabilidade para um casal operando manualmente, mesmo padrão de outras corridas já aceitas (Stories 2.2, 2.3, 3.1).
