# Epic 3 Context: Categorização de Gastos

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

O casal precisa classificar os lançamentos extraídos (Epic 2) num vocabulário de categorias que eles mesmos definem, sem precisar categorizar tudo manualmente todo mês. Cada lançamento novo já chega com uma sugestão automática de categoria baseada na descrição do estabelecimento; qualquer um dos dois pode corrigir a categoria de qualquer lançamento (próprio ou do parceiro), e essa correção precisa virar uma regra memorizada que evita o mesmo erro nas próximas faturas — o sinal de sucesso do produto é justamente as correções manuais caindo ao longo dos meses, não se mantendo constantes. Categorias são um recurso compartilhado do casal (não por pessoa), então gerenciar o conjunto (criar/editar/remover) também é responsabilidade deste épico, incluindo o que acontece com lançamentos e regras quando uma categoria usada é removida.

## Stories

- Story 3.1: Gestão de categorias do casal
- Story 3.2: Sugestão automática de categoria
- Story 3.3: Correção manual de categoria com regra memorizada

## Requirements & Constraints

- Categorias são criadas, editadas e removidas por qualquer um dos dois; o conjunto é compartilhado entre as duas contas (nunca por pessoa).
- Excluir uma categoria com lançamentos associados avisa antes quantos lançamentos serão afetados. Ao confirmar, o usuário escolhe uma categoria substituta (nova ou existente) que migra automaticamente todos os lançamentos associados; se recusar a substituição, os lançamentos ficam marcados "categoria removida" até reclassificação manual — nunca perdem a informação silenciosamente.
- Uma regra memorizada que apontava para a categoria excluída é redirecionada para a substituta escolhida; sem substituta, a regra é removida junto — nunca fica sugerindo uma categoria inexistente.
- Todo lançamento novo precisa ter uma categoria (sugerida) ou "sem categoria" explícito no momento em que aparece — nunca em branco sem indicação.
- Regra memorizada para o padrão de estabelecimento tem prioridade sobre a sugestão automática genérica.
- Corrigir a categoria de um lançamento se aplica imediatamente e cria/atualiza uma regra memorizada por padrão de estabelecimento normalizado; a regra vale para as duas contas, independentemente de quem corrigiu.
- Casamento de padrão é aproximado (fuzzy), nunca exige igualdade exata de string — a descrição do mesmo estabelecimento varia entre lançamentos.
- Quando duas regras memorizadas poderiam casar com o mesmo lançamento, a mais recentemente atualizada prevalece — o desempate é por recência, nunca pelo score de similaridade.
- Um lançamento que reaparece depois de removido (ex: reversão de estorno) é tratado como novo na competência em que reaparece: recupera categoria via regra memorizada na maioria dos casos, mas não herda diretamente a categoria manual do registro removido.
- Categorias já corrigidas manualmente em lançamentos existentes nunca são sobrescritas por um reenvio de fatura (invariante de Epic 2 que este épico não pode violar).
- Contra-métrica explícita: não otimizar para número de categorias ou granularidade — objetivo é visibilidade rápida, não taxonomia perfeita; categorias demais tornam a revisão mensal mais lenta.
- NFR: dados de categoria/estabelecimento protegidos em repouso — já coberto pela hospedagem gerenciada, nenhuma ação adicional deste épico.

## Technical Decisions

- AD-3: sugestão/resolução de categoria passa sempre pela mesma função/consulta única, em duas etapas ordenadas: (1) filtrar `regra_categorizacao` cujo `padrao_estabelecimento` tem `similarity()` (`pg_trgm`) acima de um limiar configurável contra o estabelecimento normalizado; (2) entre as regras acima do limiar, a mais recentemente `atualizado_em` vence. `[ASSUMPTION: pg_trgm tem relatos de falha de habilitação em alguns projetos Supabase — validar com spike antes de depender; fallback é fuzzy-match em nível de aplicação (lib JS), mantendo a mesma ordem de resolução.]` Limiar exato de similaridade é decisão de tuning na implementação, não invariante.
- AD-8: `categoria` e `regra_categorizacao` nunca recebem coluna de escopo por usuário — compartilhadas pelas duas contas sempre; nenhuma story deste épico deve introduzir particionamento por usuário.
- AD-9: normalização de estabelecimento usa a função única já implementada em `server/shared/normalizar-estabelecimento` (Epic 2) — `server/categorizacao` reutiliza essa função, nunca reimplementa sua própria normalização.
- Módulos: `server/categorizacao` concentra a lógica de FR7–FR10; UI de gestão de categorias em `app/(app)/categorias`.
- Modelo de dados a criar: `categoria` (id, nome) e `regra_categorizacao` (id, padrao_estabelecimento, categoria_id, atualizado_em). A tabela `lancamento` já existe (Epic 2) com coluna `categoria_id` nullable mas **sem FK ainda** (comentário no schema: "tabela categoria só existe no Epic 3") — este épico precisa criar `categoria` e ligar a FK.
- Convenções gerais já em vigor: valores em centavos (integer); mutação sempre via camada de serviço, nunca query direta em rota; erros de domínio como exceções tipadas traduzidas na borda da rota; toda rota sob `app/(app)/*` já exige sessão válida (Epic 1) — nada adicional de auth necessário aqui.

## Cross-Story Dependencies

- Story 3.1 (gestão de categorias) e Story 3.3 (regra memorizada) são acopladas na exclusão: excluir uma categoria com regra memorizada apontando para ela exige redirecionar ou remover essa regra (comportamento definido em 3.3, acionado por uma ação de 3.1).
- Story 3.2 (sugestão automática) e Story 3.3 (correção manual) compartilham a mesma função de resolução (AD-3) — a prioridade da regra memorizada sobre a sugestão genérica não é um caminho de código separado, é a mesma consulta ordenada.
- Este épico depende do Epic 2 para existir lançamentos a categorizar, e reutiliza `normalizar-estabelecimento` (AD-9) já construído lá.
- O Epic 4 (visão por competência) depende do estado "categoria removida" produzido aqui para popular o agrupamento "pendente de revisão".
