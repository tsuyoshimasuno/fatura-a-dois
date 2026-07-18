# Deferred Work

<!-- Append-only. Populated by bmad-dev-auto step-04 when a review finding is real but pre-existing / out of this story's scope. Do not modify existing entries or look for duplicates. -->

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
