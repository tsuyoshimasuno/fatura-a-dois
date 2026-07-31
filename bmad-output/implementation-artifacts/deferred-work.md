# Deferred Work

<!-- Append-only. Populated by bmad-dev-auto step-04 when a review finding is real but pre-existing / out of this story's scope. Do not modify existing entries or look for duplicates. -->

- source_spec: `bmad-output/implementation-artifacts/spec-4-1-visao-de-gastos-por-pessoa-e-categoria.md`
  summary: Em `/gastos`, o item de "pendente de revisão" com motivo `categoria_removida` não mostra o nome da categoria que foi removida, dificultando decidir para qual categoria recategorizar o lançamento.
  evidence: `resumo-gastos.ts` monta `ItemPendente` sem incluir `categoriaNome` para esse motivo; não exigido por nenhum AC da Story 4.1, apenas uma melhoria de UX possível.

- source_spec: `bmad-output/implementation-artifacts/spec-4-1-visao-de-gastos-por-pessoa-e-categoria.md`
  summary: Se `listarContasCasal()` (Admin API) falhar, a visão combinada de `/gastos` ainda renderiza o card "Casal -- R$ 0,00" com aparência normal, indistinguível de um mês real sem gastos -- nenhum sinal visível de que houve uma falha de infraestrutura.
  evidence: Mesmo padrão de degradação silenciosa já aceito em `listarContasCasal()` desde a Story 2.3 (retorna `[]` e loga via `console.error`); uma correção completa (banner de erro explícito na UI) é uma preocupação transversal a todas as telas que dependem dessa função, fora do escopo desta story.

- source_spec: `bmad-output/implementation-artifacts/spec-5-1-identificacao-de-parcelas-e-compra-original.md`
  summary: `delta.atualizar` (merge por delta, quando o valor de um lançamento de parcela já existente muda) nunca reidentifica/revalida `compraParceladaId` -- se a correção mudar o que deveria ser a chave de identidade real da parcela, o link antigo fica desatualizado silenciosamente.
  evidence: `server/ingestao/upload.ts` só chama `identificarOuCriarCompraParcelada` no branch `delta.inserir`; a spec da Story 5.1 já excluía `delta.atualizar`/`delta.remover` do escopo explicitamente. Baixíssima probabilidade (correção de valor num lançamento já parcelado é rara); a Story 5.2 (reconciliação/retração) é o lugar natural para revisitar se necessário.

- source_spec: `bmad-output/implementation-artifacts/spec-5-3-comprometimento-do-limite-mensal.md`
  summary: Em `/parcelas`, o item "Pendente" (parcela projetada cujo cartão ainda não tem titular mapeado) não explica o que significa nem linka para `/cartoes`, onde o mapeamento seria de fato resolvido.
  evidence: `app/(app)/parcelas/page.tsx` renderiza a linha "Pendente -- R$ X" sem nenhum texto de apoio ou link; não exigido pelo AC da Story 5.3, apenas uma melhoria de UX possível.

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

- source_spec: `bmad-output/implementation-artifacts/spec-ux-feedback-acoes-silenciosas.md`
  summary: Inputs não-controlados com `defaultValue` (`categoria-item.tsx`'s `defaultValue={item.nome}`, `lancamento-item.tsx`'s `defaultValue={categoriaAtualSelecionavel}`) só capturam o valor no mount; se o parceiro editar/remover a mesma linha concorrentemente, o campo não reflete a mudança mesmo que o rótulo ao lado atualize.
  evidence: Padrão pré-existente ao próprio diff desta story -- `defaultValue={item.nome}` já era usado no `<form action={renomear}>` original antes da extração para Client Component; não é uma regressão introduzida agora, é um comportamento herdado.

- source_spec: `bmad-output/implementation-artifacts/spec-ux-feedback-acoes-silenciosas.md`
  summary: Nenhum `aria-busy`/live region anuncia o estado de carregamento a leitores de tela nos botões com rótulo de progresso ("Atribuindo...", "Salvando...", "Corrigindo...") -- só o resultado final (`role="alert"`/`aria-live="polite"`) é anunciado.
  evidence: Mesmo padrão parcial já aceito em produção em `/login`, `/upload`, `/esqueci-senha`, `/redefinir-senha` (nenhum usa aria-busy); gap real de acessibilidade mas transversal ao app inteiro, não introduzido por este diff -- merece um passe dedicado de acessibilidade em vez de uma correção pontual aqui.

- source_spec: `bmad-output/implementation-artifacts/spec-ux-feedback-acoes-silenciosas.md`
  summary: `CategoriaItem`'s input é não-controlado (`defaultValue={item.nome}`) e `editarCategoria` faz `trim()` no servidor -- se o usuário digitar espaços extras, o campo continua mostrando o texto não-trimado mesmo após "Categoria salva.", divergindo do que foi persistido. A mensagem de sucesso também nunca some (sem timeout/dismissal).
  evidence: Padrão de input não-controlado já existia antes desta story (mesmo `defaultValue={item.nome}` no `<form action={renomear}>` original); a mensagem de sucesso é nova nesta story mas é cosmética -- não afeta a correção do dado persistido, só a exatidão visual do campo entre um render e o próximo `router.refresh()`.

- source_spec: `bmad-output/implementation-artifacts/spec-ux-nav-mobile-responsiva.md`
  summary: O menu mobile (hamburguer) nao fecha com tecla Escape, nao fecha ao clicar fora dele, e nao move o foco para dentro da lista ao abrir nem de volta ao botao ao fechar -- padrao completo de "disclosure menu" acessivel exigiria os tres.
  evidence: Fora do escopo desta story (que pedia so: botao operavel por teclado, aria-label/aria-expanded, fechar ao navegar) -- nenhum destes e uma regressao, sao melhorias reais de acessibilidade para um passe dedicado futuro.
  
- source_spec: `bmad-output/implementation-artifacts/spec-ux-nav-mobile-responsiva.md`
  summary: Sem transicao/animacao ao abrir/fechar o menu mobile (display:none <-> flex instantaneo) e o icone de tres barras nao se transforma visualmente em "X" quando aberto -- so o aria-label/aria-expanded indicam o estado para tecnologia assistiva.
  evidence: Polimento visual nao pedido no escopo desta story; app inteiro ja tem postura de "sem sombra/animacao decorativa" (DESIGN.md), entao a ausencia de transicao e consistente com o resto do sistema, nao uma lacuna isolada.

- source_spec: `bmad-output/implementation-artifacts/spec-ux-competencia-persistente.md`
  summary: O novo link de atalho entre /gastos e /lancamentos nao tem landmark/skip-link ao redor, entao usuarios de teclado/leitor de tela precisam passar por ele (tab) antes de chegar ao conteudo da tela em toda carga de pagina.
  evidence: Real, mas o app inteiro ja nao tem nenhum skip-link em nenhuma tela -- gap pre-existente e transversal, nao especifico desta story; melhor enderecado num passe de acessibilidade dedicado.

- source_spec: `bmad-output/implementation-artifacts/spec-ux-dashboard-inicial.md`
  summary: Todo o app resolve "mes/ano atual" via `new Date()` local do servidor, sem ancoragem explicita a America/Sao_Paulo. Antes desta story isso so decidia quais anos populavam um <select> (inofensivo se errado por um mes); agora tambem decide qual dos 3 estados o dashboard mostra e a competencia contada nos badges da nav -- perto da meia-noite em Brasilia, se o servidor rodar em UTC, o dashboard pode mostrar o estado do mes errado por algumas horas.
  evidence: Padrao pre-existente em competenciaValida (lib/competencia.ts), /upload, /gastos, /lancamentos -- nao introduzido por esta story, mas elevado em importancia real. Corrigir direito exige auditar todo ponto de resolucao de data com uma decisao real de fuso horario (ex: Intl.DateTimeFormat com timeZone explicito), nao um patch pontual numa unica story.

- source_spec: `bmad-output/implementation-artifacts/spec-ux-feedback-mapeamento-cartao-e-links-pendencia.md`
  summary: Os links "Resolver em Cartões" adicionados em `/gastos` e `/parcelas` sempre apontam para `/cartoes` genérico, nunca para o cartão pendente específico por trás daquela linha -- se houver vários cartões pendentes, o usuário chega numa lista e precisa reidentificar qual é.
  evidence: `/cartoes` não tem suporte a deep-link/âncora por cartão hoje; adicionar isso é uma mudança maior de UI (parâmetro de URL + scroll/destaque) do que o escopo desta story, que só precisava fechar o gap de "nenhum link existia".

- source_spec: `bmad-output/implementation-artifacts/spec-ux-parcela-e-data-lancamentos.md`
  summary: O bloco "Pendente de revisão" de `/gastos` agora mostra a data formatada (`formatarData`), mas não ganhou o indicador de parcela ("N/M") que `/lancamentos` ganhou nesta mesma rodada -- um lançamento pendente que também é parcela de uma compra parcelada não mostra isso ali.
  evidence: Fora do escopo desta spec (achado 1 da auditoria de 2026-07-19 cobria só `/lancamentos`; achado 3, sobre `/gastos`, cobria só formato de data); achado real de paridade encontrado pelo Blind Hunter durante o review desta mesma story, candidato a uma correção futura pequena e mecânica (mesmo padrão já usado em `lancamento-item.tsx`).

- source_spec: `bmad-output/implementation-artifacts/spec-ux-unificar-lancamentos-e-gastos.md`
  summary: `listarLancamentosParaCorrecao` (agora usada pela tela unificada `/lancamentos`) nunca filtrou lançamentos de cartão marcado `terceiro` -- eles aparecem na lista principal sem badge de titular (mesmo comportamento visual de um titular ainda pendente de mapeamento), quando deveriam estar excluídos como em `resumo-gastos.ts`/`comprometimento-limite.ts`.
  evidence: Pré-existente à fusão desta story -- a função original de `/lancamentos` (Story 3.3) já não fazia join com `cartao` nem filtrava por `terceiro`, então esses lançamentos já apareciam ali antes; a fusão só herdou o gap, não o introduziu. Baixa consequência prática hoje (nenhum badge some/aparece incorretamente para o caso comum), mas caso o filtro de Pessoa algum dia precise distinguir "titular pendente real" de "cartão rejeitado", esse gap precisa ser fechado primeiro.

- source_spec: `bmad-output/implementation-artifacts/spec-ux-unificar-lancamentos-e-gastos.md`
  summary: Na visão combinada ("Casal") da tela unificada, "nenhuma conta do casal encontrada" (falha de `listarContasCasal()`) e "há contas mas nenhum gasto resolvido na competência" caem na mesma mensagem genérica ("Nenhum gasto resolvido nesta competência"), diferente da visão individual/por-pessoa que já distingue os dois casos.
  evidence: Comportamento herdado de `/gastos` antes da fusão (`categoriasCombinadas.length === 0` nunca diferenciou os dois motivos); agora mais visível por estar na mesma tela que a visão individual, que já trata isso corretamente -- correção pequena e mecânica, mas fora do escopo desta rodada de review.

- source_spec: `bmad-output/implementation-artifacts/spec-6-1-repasse-e-desfazer-repasse-lancamento.md`
  summary: A FK de `cartao.usuarioId` para `auth.users` não tem `onDelete` (default RESTRICT) -- excluir uma conta do casal que possui qualquer cartão continuaria travando por violação de FK, mesmo após esta story adicionar `ON DELETE SET NULL` em `lancamento.responsavelId`/`repassadoPor`.
  evidence: `db/schema/index.ts`, `cartao.usuarioId` (linha ~21) -- FK pré-existente desde Story 1.1/2.3, não introduzida por esta story; corrigir isso exigiria decidir o comportamento correto para "cartão sem dono" em todo o app (Story 2.3 trata `usuarioId is null` como "pendente de mapeamento", então `SET NULL` reintroduziria o cartão como pendente ao excluir a conta -- decisão de produto que nenhuma story pediu ainda).

- source_spec: `bmad-output/implementation-artifacts/spec-snowui-design-system-tokens.md`
  summary: `app/globals.css` mistura tamanhos de fonte em `rem` (assumindo raiz de 16px) com `body { font-size: 15px }` explícito e nenhuma regra em `html`/root para reconciliar os dois -- qualquer novo token em `rem` (page-title, page-subtitle, section-title, field, label, hint) resolve contra a raiz do navegador (16px), não contra os 15px do body, um descompasso sutil pré-existente.
  evidence: Confirmado via grep em `app/globals.css` -- nenhum seletor define `font-size` em `html`; `body` define 15px explicitamente. Pré-existente a esta spec (várias classes `rem`-based já existiam antes), só ficou mais carregado por esta mudança. Achado real do Blind Hunter durante a revisão da Story SnowUI, não causado por ela.

- source_spec: `bmad-output/implementation-artifacts/spec-snowui-paleta-de-cores.md`
  summary: Nenhum teste/lint automático de regressão de contraste WCAG existe no repositório -- uma futura troca de valor de cor pode reintroduzir uma falha de acessibilidade sem nenhum aviso automatico, do mesmo jeito que aconteceu no pass 1 desta spec (danger/pending/surface-dark).
  evidence: Confirmado por ambos os revisores (Blind Hunter + Edge Case Hunter) nesta spec -- a unica forma de pegar essas regressoes foi review manual/calculo explicito, nao ha CI/lint dedicado. Adicionar isso e um investimento de tooling transversal, fora do escopo de uma spec pontual de troca de paleta.

- source_spec: `bmad-output/implementation-artifacts/spec-snowui-paleta-de-cores.md`
  summary: `.badge-pending` (texto branco sobre `--pending`) tem contraste WCAG AA insuficiente mesmo apos o ajuste desta spec -- era uma falha pre-existente (~3.26:1, antes do SnowUI) que so foi parcialmente mitigada, nao totalmente corrigida, para nao afastar demais o tom do laranja/ambar pretendido.
  evidence: Confirmado por calculo WCAG explicito nesta spec (rodada de review). Corrigir totalmente exigiria escurecer --pending a ponto de perder a identidade "laranja vivo" do SnowUI Secondary.Orange, decisao de design que merece avaliacao propria, nao um ajuste reativo dentro desta spec de paleta.

- source_spec: `bmad-output/implementation-artifacts/spec-snowui-paleta-de-cores.md`
  summary: `--border` no modo claro (`#e2e5ea`) tem contraste muito baixo contra `--surface`/`--background` claros (~1.2:1, bem abaixo do minimo 3:1 de elemento grafico) -- bordas de `.card`/`.titular-badge`/`input` sao pouco perceptiveis no modo claro.
  evidence: Confirmado por calculo WCAG explicito durante a revisao da paleta SnowUI (pass 3). Pre-existente a esta spec -- `--border` claro nao foi alterado por nenhuma rodada desta iniciativa, e o deslocamento de `--surface` (`#f6f7f9` -> `#f9f9fa`, 3 unidades/canal) nao muda esse contraste de forma material. Corrigir exigiria escurecer `--border` claro, uma mudanca de paleta separada do escopo desta spec (troca de identidade SnowUI), que nunca teve autorizacao do usuario para alterar bordas no modo claro.

- source_spec: `bmad-output/implementation-artifacts/spec-snowui-sidebar-shell.md`
  summary: Nomes reais do casal ("Tsuyoshi"/"Milena") aparecem como texto estatico hardcoded no seletor de conta da sidebar, em vez de vir de dado real (email/perfil).
  evidence: Mesmo padrao ja usado em todo o app desde o Epic 1 (ex.: `lib/pessoa.ts` deriva nome do prefixo do email, mas varias telas ja tem nomes/iniciais hardcoded em contextos de exemplo/copy) -- nao e uma regressao introduzida por esta spec, e um padrao pre-existente do projeto (app domestico de 2 pessoas, sem sistema de perfil). Nao vale a pena resolver isoladamente aqui.

- source_spec: `bmad-output/implementation-artifacts/spec-snowui-sidebar-shell.md`
  summary: Redimensionar a janela do navegador para desktop (>=768px) enquanto o painel off-canvas mobile da sidebar esta aberto pode deixar o estado de foco/menuAberto inconsistente (o botao hamburguer fica display:none, tentativa de devolver foco a ele vira no-op silencioso).
  evidence: Apontado por Edge Case Hunter na 2a passada de review -- interacao rara (exige redimensionar a janela com o menu aberto, incomum em uso real de desktop/mobile separados), risco baixo. Corrigir exigiria fechar o menu automaticamente ao cruzar o breakpoint (matchMedia listener), fora do escopo desta rodada de reparo.
- source_spec: `bmad-output/implementation-artifacts/spec-snowui-sidebar-shell.md`
  summary: A duracao da transicao do painel mobile (0.2s) esta duplicada em duas declaracoes CSS independentes (transform e o delay de visibility) em vez de uma variavel compartilhada -- mudar uma sem a outra reintroduz o bug original de animacao de fechar quebrada.
  evidence: Apontado por Blind Hunter na 2a passada de review. Nitpick de manutenibilidade, nao um bug ativo hoje. Extrair para uma custom property (--sidebar-transition-duration) e uma melhoria de robustez futura, nao urgente.
- source_spec: `bmad-output/implementation-artifacts/spec-snowui-sidebar-shell.md`
  summary: Contraste de :hover puro em .sidebar-nav-link continua abaixo do ideal WCAG 1.4.11 (~3:1) mesmo apos o ajuste de opacidade da 2a passada -- o estado .ativo tem fallback forte (borda+negrito), mas hover isolado (sem ser o item ativo) fica com pista visual fraca.
  evidence: Confirmado por calculo de contraste na 2a passada de review. Atingir 3:1 pleno exigiria uma cor de hover muito mais saturada, o que destacaria demais um estado transitorio (hover) na filosofia de paleta enxuta do produto -- trade-off aceito, nao e uma falha de acesso critica (o item ativo, que e o que mais importa para orientacao, ja e claramente distinguivel).

- source_spec: `bmad-output/implementation-artifacts/spec-snowui-sidebar-shell.md`
  summary: Ao fechar o painel off-canvas mobile clicando num link de navegacao (nao Escape/scrim), o foco de teclado nao e explicitamente gerenciado -- o link clicado fica infocavel a meio da transicao de saida e o navegador aplica fixup padrao de foco para <body>.
  evidence: Confirmado (CONFIRMED) por Blind Hunter na 3a passada de review. Corrigir de forma robusta exigiria gerenciamento de foco a nivel de rota (mover foco pro heading da nova pagina ao navegar), uma funcionalidade maior e transversal a todo o app, fora do escopo de uma spec de shell de navegacao. O estado resultante (foco em <body>) e um fallback conhecido do navegador, nao um estado travado/quebrado.
- source_spec: `bmad-output/implementation-artifacts/spec-snowui-sidebar-shell.md`
  summary: O link de upload ("+") no rodape/topo da sidebar fica alcancavel por teclado so via Shift+Tab (o foco inicial ao abrir o painel mobile vai direto para o primeiro item da lista de navegacao principal, pulando o link de upload que vem antes no DOM).
  evidence: Confirmado (PLAUSIBLE) por Blind Hunter na 3a passada. Ainda alcancavel, so nao e o primeiro parada do Tab -- severidade baixa, aceito.

- source_spec: `bmad-output/implementation-artifacts/spec-7-1-suite-qa-automatizada.md`
  summary: O input de renomear categoria em `/categorias` (`categoria-item.tsx`, `<input type="text" name="nome" defaultValue={item.nome} .../>`) nao tem nenhum label acessivel (nem `<label>`, nem `aria-label`, nem `aria-labelledby`) -- violacao axe-core critica (`label`), invisivel para leitor de tela.
  evidence: Achado real via axe-core durante a captura do baseline da suite de QA (Story 7.1), pre-existente e nao causado por esta story -- filtrado do gate bloqueante em `e2e/structural/app.spec.ts` para nao travar a suite inteira; candidato a correcao quando `/categorias` migrar para os componentes shadcn (Story 7.7, Epic 7), que ja exige revisao do formulario.

- source_spec: `bmad-output/implementation-artifacts/spec-7-1-suite-qa-automatizada.md`
  summary: `.category-icon` (`lancamento-item.tsx`) usa `aria-label` num `<span>` sem `role` explicito -- violacao axe-core seria (`aria-prohibited-attr`): `aria-label` nao tem efeito num elemento sem role valido (role implicito de `<span>` e "generic"), entao o rotulo "Categoria: X" pode nao ser anunciado por leitor de tela.
  evidence: Achado real via axe-core durante a captura do baseline da suite de QA (Story 7.1), pre-existente (introduzido na rodada SnowUI do icone de categoria) e nao causado por esta story -- filtrado do gate bloqueante em `e2e/structural/app.spec.ts`. Correcao provavel: adicionar `role="img"` ao span (torna o aria-label valido); candidato a corrigir junto da migracao de `/lancamentos` para shadcn (Story 7.10, Epic 7).

- source_spec: `bmad-output/implementation-artifacts/spec-7-1-suite-qa-automatizada.md`
  summary: `.lancamentos-painel` (painel rolavel do layout de 2 colunas em `/lancamentos`, `overflow-y: auto`) nao tem `tabindex` nem conteudo focavel proprio -- violacao axe-core seria (`scrollable-region-focusable`): regiao rolavel nao acessivel via teclado no Safari (WCAG 2.1.1/2.1.3).
  evidence: Achado real via axe-core durante a captura do baseline da suite de QA (Story 7.1), pre-existente (introduzido na rodada da Lista Rolante + Total Central Estatico, spec-ux-lista-rolante-total-estatico.md) e nao causado por esta story -- filtrado do gate bloqueante em `e2e/structural/app.spec.ts`. Correcao provavel: `tabindex="0"` + `role="region"`/`aria-label` no `.lancamentos-painel`; candidato a corrigir junto da migracao de `/lancamentos` para shadcn (Story 7.10, Epic 7).

- source_spec: `bmad-output/implementation-artifacts/spec-7-4-migracao-auth-baixo-trafego.md`
  summary: O mask de privacidade `page.locator('.card')` em `e2e/visual/visual.spec.ts` (rotas autenticadas com dado financeiro real) so cobre o `.card` legado -- o novo `Card` shadcn (`components/ui/card.tsx`, `data-slot="card"`, sem classe `.card`) nao e coberto por esse seletor.
  evidence: Sem consequencia hoje (nenhuma rota de dado real usa o `Card` novo ainda -- so as telas de auth desta story, sem dado financeiro). Achado convergente de Blind Hunter e Edge Case Hunter na review desta story: assim que uma story futura (7.6+) migrar `/lancamentos`, `/categorias` ou `/` para o `Card` shadcn, o mask precisa virar `page.locator('.card, [data-slot="card"]')` (ou equivalente) antes de aceitar aquele baseline, senao um screenshot com dado financeiro real do casal seria commitado sem mascaramento.

- source_spec: `bmad-output/implementation-artifacts/spec-7-4-migracao-auth-baixo-trafego.md`
  summary: Nenhum `Input` em `/esqueci-senha` ou `/redefinir-senha` tem `aria-invalid`/`aria-describedby` apontando para o `Alert` de erro correspondente -- leitor de tela nao associa o campo ao erro, so anuncia o `Alert` isoladamente (via `role="alert"`).
  evidence: Gap pre-existente, nao introduzido por esta story (a versao legada com `<p role="alert" className="alert-error">` tinha a mesma lacuna). Achado convergente de Blind Hunter e Edge Case Hunter -- o proprio `Input`/`Alert` do shadcn ja vieram com os data attributes certos (`aria-invalid:border-destructive` no Input) para essa wiring, so falta o `aria-invalid`/`aria-describedby` real nos dois formularios; candidato a corrigir quando alguma story futura tocar validacao de formulario novamente (nenhuma prevista no restante do Epic 7).

- source_spec: `bmad-output/implementation-artifacts/spec-7-6-migracao-parcelas-cartoes.md`
  summary: `CartaoPendenteItem`/`CartaoRejeitadoItem` (`/cartoes`) migraram para `Card`/`Button`/`Alert`, mas o teste visual/estrutural nunca renderiza o conteudo real desses itens -- a conta real do casal usada pela suite de QA nao tem nenhum cartao pendente/rejeitado no momento, entao `/cartoes` so amostra o estado vazio (`.empty-state`).
  evidence: Limitacao de infraestrutura de teste, nao um bug: a suite usa a sessao real de producao (Boundaries do spec-7-1, nunca autentica sozinha nem cria dado sintetico no banco real do casal), entao nao ha como seedar um cartao pendente/rejeitado sinteticamente sem sujar o dado real. O botao "Nao e do casal" (`variant=outline` + override de cor destrutiva) e o `Alert` de sucesso/erro foram verificados manualmente via script Playwright descartavel (injecao de className isolada + `getComputedStyle`, sem depender de dado real) durante o review adversarial da Story 7.6 -- confirmou e corrigiu 1 bug real (borda destrutiva perdida em dark mode por cascata do Tailwind). Risco residual: qualquer regressao futura nesses 2 componentes especificos só seria pega por revisao manual/leitura de codigo, nao pela suite automatizada, ate que um cartao pendente/rejeitado real apareca na conta do casal durante uma dessas stories.

- source_spec: `bmad-output/implementation-artifacts/spec-7-7-migracao-categorias.md`
  summary: `lancamento-item.tsx` (`/lancamentos`, form inline "+ Nova categoria") tem `<input type="text" name="nome" placeholder="Nome da categoria" required disabled={loadingCriacao} />` sem nenhum label acessivel -- mesmo padrao de violacao axe-core `label` que existia em `categoria-item.tsx`/`criar-categoria-form.tsx` antes desta story.
  evidence: Achado real do Blind Hunter durante o review adversarial da Story 7.7 -- ao corrigir os 2 casos de `/categorias` e (corretamente) remover o filtro `GAPS_CONHECIDOS` de `label`/`name="nome"` em `e2e/structural/app.spec.ts` por achar a causa raiz resolvida, um terceiro caso identico (mesmo `name="nome"`, arquivo diferente) ficou destravado sem rastreamento -- o filtro casava por substring de HTML, nao por arquivo, entao cobria os 3 casos ao mesmo tempo sem que os 3 estivessem documentados individualmente em `deferred-work.md`. Nao falha a suite hoje porque o form so entra no DOM quando `criandoCategoria` (state local) vira `true`, e o teste estrutural nunca clica em "+ Nova categoria" antes de rodar o axe-core. Corrigido restaurando um filtro mais especifico (`name="nome" placeholder="Nome da categoria"`, string unica deste terceiro caso, nao mais generica) em vez de remove-lo, e documentando este caso aqui pela primeira vez -- candidato a correcao junto da migracao de `/lancamentos` para shadcn (Story 7.10, Epic 7), mesmo destino ja previsto para os outros 2 gaps pre-existentes daquele arquivo.

- source_spec: `bmad-output/implementation-artifacts/spec-7-10-migracao-lancamentos.md`
  summary: Edge Case Hunter (review da Story 7.10, ultima do Epic 7) encontrou varios pontos frageis de logica de runtime PRE-EXISTENTES em `lancamento-item.tsx`/`lancamentos-view.tsx`, nenhum causado pela migracao (Boundaries da spec exigia preservar 100% da logica, so JSX mudou, confirmado por diff contra o commit anterior a esta story): (1) `handleRepasseToggle` usa `if (repasseEmVoo) return` (guard de estado React) em vez de um `useRef` sincrono como as outras 2 acoes do mesmo componente (`emVooRef`/`emVooCriacaoRef`) -- inconsistente, risco teorico de disparo duplo numa janela muito estreita entre clique e commit do estado; (2) nenhuma reconciliacao se `pessoaSelecionada` referenciar uma conta removida de `contas` num refresh futuro (`categoriaSelecionada` tem essa reconciliacao, `pessoaSelecionada` nao); (3) visao='combinada' com `resumoPessoas` vazio (falha ao carregar contas) cai no card "Casal -- R$0,00" em vez da mensagem de erro "Nenhuma conta do casal encontrada", porque a ordem dos ternarios checa `visao==='combinada'` antes do `resumoPessoas.length===0`; (4) `categoriaExtra` (merge local de categoria criada inline) e um valor unico, nao um array -- criar uma segunda categoria antes do refresh da primeira sobrescreveria a primeira, que sumiria da lista ate o proximo `router.refresh()` resolver.
  evidence: Todos os 4 pontos confirmados por leitura direta do codigo (nao so a afirmacao do revisor) e verificados como identicos ao commit imediatamente anterior a esta story (`2b2cafb`) -- nenhum foi introduzido ou alterado pela migracao de componentes. Fora de escopo por design (Boundaries -> Block If do spec-7-1, herdado por todas as stories do Epic 7: nao alterar logica de negocio numa story de migracao estrutural). Sem story futura planejada no Epic 7 que revisite `/lancamentos` -- candidato a um epic/story futuro dedicado a hardening de `/lancamentos`, se e quando o produto justificar.

- source_spec: `bmad-output/implementation-artifacts/spec-8-1-chrome-compartilhado-icones-e-tokens-base.md`
  summary: O hover/ativo de `.sidebar-nav-link` (painel mobile) e do `SidebarMenuButton` (desktop) usa `background-color` translucido (`rgba()`/`color-mix()`) como unico sinal visual, alem da borda esquerda de 3px do estado `.ativo` -- em `forced-colors: active` (Windows High Contrast), `background-color` e ignorado pelo navegador, entao o item ativo/hover fica sem o destaque de fundo, restando so a borda esquerda (que so existe no estado `.ativo`, nao no `:hover`).
  evidence: Achado real do Edge Case Hunter (review da Story 8.1) -- confirmado por leitura do CSS (`.sidebar-nav-link:hover`/`.ativo`, `app/globals.css`): nenhuma regra `@media (forced-colors: active)` cobre esses seletores, ao contrario de `.card`/`.category-icon` (que ja tem fallback `border: 1px solid CanvasText`). NAO e regressao desta story -- o mecanismo (fundo translucido como unico sinal) e o mesmo desde a implementacao original da sidebar (rodada 10), a Story 8.1 so mudou a opacidade (0.05→0.08/0.06→0.1), o gap em `forced-colors` ja existia antes com a mesma severidade. Candidato a correcao (`border-left-color: CanvasText` ou similar tambem no `:hover`, nao so `.ativo`) numa story futura de acessibilidade dedicada, nao critico o suficiente para bloquear o polimento visual do Epic 8.
