---
title: 'Story 1.3: Recuperação de senha'
type: 'feature'
created: '2026-07-17'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
baseline_revision: 'd23f30c41c8071c0b591f8397ae8c566dc75440f'
---

<intent-contract>

## Intent

**Problem:** As duas contas do casal (Story 1.1) foram criadas com senha temporária gerada pelo admin; sem um caminho de recuperação de senha, ninguém consegue trocá-la nem recuperar acesso se esquecer a senha real depois — e não existe (nem pode existir, FR1) um fluxo de recadastro como alternativa.

**Approach:** Fluxo nativo de recuperação do Supabase Auth: uma página `/esqueci-senha` pede o e-mail e chama `resetPasswordForEmail`; o link do e-mail aponta para uma rota de callback `/auth/confirm` que troca o código por uma sessão de recuperação (PKCE, `exchangeCodeForSession`) e redireciona para `/redefinir-senha`, onde a pessoa define a nova senha via `updateUser({ password })`. As três novas rotas entram na allowlist pública do middleware (`/esqueci-senha`, `/auth/confirm`) ou dependem da sessão de recuperação já estabelecida (`/redefinir-senha`), sem tocar a lógica de redirecionamento já existente além de estender a allowlist.

## Boundaries & Constraints

**Always:** Usa exclusivamente as funções nativas do Supabase Auth (`resetPasswordForEmail`, `exchangeCodeForSession`, `updateUser`) — nunca um endpoint de auth próprio nem geração/hash de senha manual; a página `/esqueci-senha` sempre mostra a mesma mensagem de sucesso genérica independentemente de o e-mail existir ou não (evita confirmar quais e-mails têm conta, mesmo sendo só 2 contas fixas); `/auth/confirm` e `/esqueci-senha` entram na allowlist pública do middleware existente (`lib/supabase/middleware.ts`), reaproveitando a mesma allowlist e o mesmo mecanismo de redirecionamento — nunca duplicar a lógica de sessão em outro lugar; `/redefinir-senha` só é alcançável com uma sessão válida (a de recuperação, estabelecida por `/auth/confirm`), então permanece fora da allowlist pública e usa o enforcement de sessão que já existe.

**Block If:** nenhuma decisão de código aqui depende de informação exclusiva do usuário. Uma configuração fora do código (allowlist de "Redirect URLs" no painel do Supabase Auth, necessária para o link do e-mail funcionar em produção) não pode ser feita por este agente — não há token de Management API do Supabase disponível, só a service-role key (que não cobre configuração de projeto). Isso não bloqueia escrever/testar o código localmente, mas é documentado como passo manual pendente na Verificação.

**Never:** Nunca criar um fluxo de recadastro como parte da recuperação (ex: pedir para a pessoa "criar conta de novo"); nunca expor se um e-mail específico tem conta ou não através de mensagens diferentes; nunca reimplementar hashing/validação de senha.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Solicitação de reset, e-mail de conta existente | e-mail de uma das 2 contas (Story 1.1) em `/esqueci-senha` | Supabase envia e-mail com link de recuperação; página mostra mensagem de sucesso genérica | Nenhum erro exposto |
| Solicitação de reset, e-mail que não existe | e-mail qualquer não cadastrado | Mesma mensagem de sucesso genérica é mostrada (nenhum e-mail é de fato enviado, mas a UI não revela a diferença) | Nenhum erro exposto — evita enumeração de conta |
| Link de recuperação válido, primeiro clique | `GET /auth/confirm?code=...` dentro da validade do link | Código trocado por sessão de recuperação; redireciona para `/redefinir-senha` | Nenhum erro |
| Link de recuperação expirado/inválido/já usado | `GET /auth/confirm?code=<invalido>` | Redireciona para `/esqueci-senha` com aviso de que o link expirou/é inválido, convidando a solicitar um novo | Erro do Supabase tratado, sem stack técnico exposto |
| Definição de nova senha | Sessão de recuperação válida em `/redefinir-senha`, nova senha informada (2x, confirmação) | `updateUser({ password })` aplica a nova senha; pessoa é redirecionada para `/` já autenticada | Nenhum erro |
| Acesso direto a `/redefinir-senha` sem sessão | `GET /redefinir-senha` sem sessão válida (nunca passou por `/auth/confirm`) | Middleware redireciona para `/login` (comportamento padrão de rota protegida, nada de novo aqui) | Nenhum erro |

</intent-contract>

## Code Map

- `lib/supabase/middleware.ts` -- já existente (Story 1.2); adicionar `/esqueci-senha` e `/auth/confirm` à `PUBLIC_PATHS`
- `lib/supabase/client.ts` -- já existente, reutilizado por `/esqueci-senha` (`resetPasswordForEmail`) e `/redefinir-senha` (`updateUser`)
- `lib/supabase/server.ts` -- já existente, `createClient()` server-side com permissão de escrita de cookie em Route Handlers; reutilizado por `/auth/confirm`
- `lib/supabase/safe-redirect.ts` -- já existente (Story 1.2); reutilizado se necessário para validar `next` no callback
- `app/(auth)/esqueci-senha/page.tsx` -- NOVO: formulário de e-mail, chama `resetPasswordForEmail`
- `app/auth/confirm/route.ts` -- NOVO: Route Handler que troca `code` por sessão (`exchangeCodeForSession`) e redireciona
- `app/(auth)/redefinir-senha/page.tsx` -- NOVO: formulário de nova senha, chama `updateUser({ password })`
- `app/(auth)/login/page.tsx` -- MODIFICAR: adicionar link "Esqueci minha senha" apontando para `/esqueci-senha`

## Tasks & Acceptance

**Execution:**
- [x] `lib/supabase/middleware.ts` -- adicionar `'/esqueci-senha'` e `'/auth/confirm'` ao array `PUBLIC_PATHS` -- reaproveita o mecanismo de allowlist já existente, sem tocar o resto da lógica de redirecionamento (AD-6 continua intacto para as outras rotas)
- [x] `app/(auth)/esqueci-senha/page.tsx` -- client component com input de e-mail; no submit, chama `createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/confirm?next=/redefinir-senha` })`; independentemente do resultado (sucesso ou erro do Supabase), mostra a mesma mensagem de sucesso genérica ("se esse e-mail tiver conta, um link foi enviado") -- nunca revela se a conta existe
- [x] `app/auth/confirm/route.ts` -- Route Handler `GET`; lê `code` e `next` (default `/redefinir-senha`) da query string; se `code` ausente ou `exchangeCodeForSession(code)` falhar, redireciona para `/esqueci-senha?error=link_invalido`; em sucesso, redireciona para `next` (validado via `isSafeRedirectPath`, senão `/redefinir-senha`) -- estabelece a sessão de recuperação antes de qualquer acesso a `/redefinir-senha`
- [x] `app/(auth)/redefinir-senha/page.tsx` -- client component com dois inputs (nova senha, confirmação); valida no cliente que os dois campos coincidem antes de chamar `createClient().auth.updateUser({ password })`; em sucesso, `window.location.href = '/'`; em erro, mensagem genérica de erro (`role="alert"`, mesmo padrão da Story 1.2)
- [x] `app/(auth)/login/page.tsx` -- adicionar um link `<a href="/esqueci-senha">Esqueci minha senha</a>` abaixo do formulário -- é o ponto de entrada natural do fluxo, sem ele a rota `/esqueci-senha` ficaria só acessível por URL direta

**Acceptance Criteria:**
- Given uma conta existente, when a pessoa solicita redefinição de senha informando seu e-mail em `/esqueci-senha`, then recebe um link de redefinição via Supabase Auth e vê uma mensagem de confirmação, sem nenhum passo de recadastro envolvido
- Given um e-mail que não corresponde a nenhuma conta, when a pessoa solicita redefinição, then vê a mesma mensagem de confirmação (nenhuma diferença observável)
- Given um link de redefinição válido, when a pessoa clica nele e define uma nova senha em `/redefinir-senha`, then consegue acessar `/` imediatamente (sessão já ativa, sem precisar logar de novo)
- Given a nova senha já definida, when a pessoa desloga e tenta logar em `/login` com a nova senha, then consegue autenticar normalmente

## Design Notes

Fluxo PKCE do Supabase (`exchangeCodeForSession`) em vez do fluxo antigo por hash de URL (`#access_token=...`): é o padrão atual para projetos usando `@supabase/ssr` com sessão baseada em cookie, e evita expor o token na URL/histórico do navegador.

Passo manual fora do código, não automatizável por este agente (sem Management API token do Supabase, só a service-role key): confirmar no painel do Supabase (Authentication > URL Configuration > Redirect URLs) que `http://localhost:3000/auth/confirm` e `https://bmad-project.vercel.app/auth/confirm` estão na allowlist — do contrário, o Supabase ignora o `redirectTo` informado e o link do e-mail aponta para a Site URL configurada, quebrando o fluxo em produção. Ver Verification abaixo.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

### 2026-07-17 — Review pass 1

- intent_gap: 0
- bad_spec: 0
- patch: 4 (high 0, medium 2, low 2)
- defer: 4 (medium 4)
- reject: 6
- addressed_findings:
  - `[medium]` `[patch]` `resetPasswordForEmail` descartava tanto o `{ error }` retornado quanto exceções sem nenhum log -- uma falha real (rate limit, SMTP fora do ar) ficava indistinguível de sucesso. Adicionado `console.error` em ambos os caminhos (a mensagem ao usuário continua genérica, só o diagnóstico interno mudou).
  - `[medium]` `[patch]` Nenhuma indicação de que uma senha muito curta seria rejeitada só depois do round-trip ao Supabase. Adicionado `minLength={6}` nos dois inputs de senha (client-side, mesmo mínimo padrão do Supabase).
  - `[low]` `[patch]` Uma senha só de espaços passava pelo `required` do HTML e pela comparação de igualdade. Adicionado trim antes de comparar e de enviar, com erro explícito ("A senha não pode ficar em branco.") se o resultado for vazio.
  - `[low]` `[patch]` Falha em `updateUser` (ex: sessão de recuperação expirada) não oferecia nenhum caminho de volta -- usuário ficava preso na tela. Adicionado link "Solicitar novo link" de volta para `/esqueci-senha`, mostrado só na falha de submissão (não nos erros de validação client-side, onde a sessão continua válida).
- deferred:
  - `[medium]` A sessão criada por `exchangeCodeForSession` é uma sessão completa e comum, sem marcação/short-circuit específico de "veio de recuperação"; `/redefinir-senha` só exige *alguma* sessão válida (herdado do middleware), não exige que tenha vindo do fluxo de recuperação nem pede a senha atual -- qualquer sessão já autenticada (não só a de recuperação) pode trocar a senha sem confirmar a atual. Real, mas corrigir exigiria inspecionar o evento `PASSWORD_RECOVERY` do Supabase Auth e reestruturar o guard da rota -- desproporcional para 2 contas de uso doméstico nesta fase; registrado em `deferred-work.md`.
  - `[medium]` PKCE (`exchangeCodeForSession`) amarra o `code_verifier` ao navegador/dispositivo que chamou `resetPasswordForEmail`; se a pessoa abrir o e-mail de recuperação num dispositivo/navegador diferente do que usou para pedir o reset, a troca falha e ela só vê "link inválido" sem saber o motivo real. É o comportamento padrão do fluxo PKCE recomendado pelo próprio Supabase para `@supabase/ssr` -- não é um bug introduzido aqui, mas é uma limitação real a documentar; registrado em `deferred-work.md`.
  - `[medium]` Nenhuma outra sessão ativa é revogada depois de uma troca de senha bem-sucedida -- um acesso já aberto sob a senha antiga continua válido. Corrigir exigiria uma Server Action chamando a Admin API (`auth.admin.signOut`), fora do escopo trivial de um patch; registrado em `deferred-work.md`.
  - `[medium]` Um clique duplo/retry no link de `/auth/confirm` no mesmo navegador pode fazer a segunda tentativa de troca de código falhar mesmo que a primeira já tenha tido sucesso (código de uso único já consumido), levando a pessoa para a tela de erro por engano mesmo estando de fato autenticada. Corrigir corretamente (checar se já existe sessão válida antes de declarar falha) tem risco de nova condição de corrida mal tratada -- desproporcional para o volume de uso de 2 pessoas; registrado em `deferred-work.md`.
- Rejeitados (com razão): requisição GET consumindo o código de uso único se um scanner de e-mail pré-buscar o link -- reject, é exatamente o padrão de Route Handler GET + `exchangeCodeForSession` documentado pelo próprio Supabase para `@supabase/ssr`, mudar exigiria uma etapa de confirmação adicional desproporcional para este MVP; falta de rate limiting/CAPTCHA em `/esqueci-senha` -- reject, mesma razão já estabelecida nas Stories 1.2 (Supabase Auth/GoTrue já aplica rate limit no próprio provedor); `redirectTo` assume que a origem da requisição bate com a allowlist do Supabase (quebraria em preview deployments) -- reject, este projeto tem ambiente único de produção por decisão de arquitetura (sem staging), e o passo de configurar a allowlist já está documentado como ação manual pendente; sem confirmação visual antes do redirect automático em caso de sucesso -- reject, cosmético, não é requisito do AC; atualização de estado após unmount do componente (ambas as páginas) -- reject, mesmo padrão já aceito desde a Story 1.2 (login page tem a mesma característica, nunca endereçada); `error`/`error_description` do Supabase não lidos explicitamente na query do callback -- reject, falso alarme: nesse caso `code` já vem ausente e cai corretamente no branch existente `if (!code)`, mesmo resultado final.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: build de produção sucede (rotas `/esqueci-senha`, `/auth/confirm`, `/redefinir-senha` sem colisão)

**Manual checks (if no CLI):**
- Rodar `npm run dev`, acessar `/esqueci-senha`, informar um e-mail real de conta (Story 1.1) -- deve mostrar mensagem de sucesso genérica; repetir com e-mail inexistente -- mesma mensagem
- **Pendente de ação humana fora deste código:** confirmar no painel do Supabase que `/auth/confirm` (localhost e produção) está na allowlist de Redirect URLs antes de testar o link de e-mail de ponta a ponta
- Testar o clique no link de e-mail real (uma vez a allowlist acima esteja confirmada) -- deve cair em `/redefinir-senha` já autenticado, permitir definir nova senha, e navegar para `/`
- Logar em `/login` com a nova senha definida -- deve autenticar normalmente

## Auto Run Result

Status: done

**Summary:** Fluxo completo de recuperação de senha via Supabase Auth nativo (`resetPasswordForEmail` → `/auth/confirm` com `exchangeCodeForSession` PKCE → `/redefinir-senha` com `updateUser`), reaproveitando a allowlist e o mecanismo de sessão já existentes do middleware (Story 1.2).

**Files changed:**
- `lib/supabase/middleware.ts` -- `/esqueci-senha` e `/auth/confirm` adicionados à `PUBLIC_PATHS`
- `app/(auth)/esqueci-senha/page.tsx` (novo) -- formulário de solicitação, mensagem genérica anti-enumeração
- `app/auth/confirm/route.ts` (novo) -- troca de código PKCE por sessão
- `app/(auth)/redefinir-senha/page.tsx` (novo) -- definição de nova senha
- `app/(auth)/login/page.tsx` -- link "Esqueci minha senha"

**Review findings breakdown:** 4 patches aplicados (log de erros antes engolidos, `minLength` client-side, trim/rejeição de senha em branco, link de retorno em falha de submissão); 4 achados reais deferidos para `deferred-work.md` (sessão de recuperação sem marcação de escopo/step-up auth, limitação cross-device do PKCE, sem revogação de outras sessões após troca, corrida em clique duplo no callback) -- todos não-triviais ou desproporcionais para 2 contas de uso doméstico nesta fase; 6 rejeitados como comportamento inerente ao fluxo recomendado pelo Supabase, decisão de arquitetura já tomada, ou cosmético.

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos. `curl` contra `npm run dev`: `GET /esqueci-senha` → `200`; `GET /auth/confirm` sem `code` → `307` para `/esqueci-senha?error=link_invalido`; `GET /redefinir-senha` sem sessão → `307` para `/login?next=%2Fredefinir-senha`. Não foi disparado nenhum e-mail de reset real (evitado deliberadamente para não spammar a caixa de entrada real do usuário sem necessidade).

**Residual risks:** Ponto pendente fora do código — confirmar no painel do Supabase (Authentication > URL Configuration > Redirect URLs) que `http://localhost:3000/auth/confirm` e `https://bmad-project.vercel.app/auth/confirm` estão na allowlist; sem isso, o link do e-mail em produção pode não respeitar o `redirectTo` informado. Teste de ponta a ponta com clique real no e-mail ainda não foi feito.

Follow-up review recommended: true
