# Epic 4 Context: Visão de Gastos por Competência

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

O casal precisa conseguir olhar, para qualquer competência de fatura já processada, quanto cada um gastou e em que categorias — combinado e individualmente — sem reabrir a planilha original. Esta épica entrega a tela que fecha o ciclo mensal iniciado pelo upload (Epic 2) e pela categorização (Epic 3): transforma lançamentos já extraídos e classificados numa leitura rápida e confiável, garantindo que nada fique invisível mesmo quando um titular ainda não foi mapeado ou uma categoria foi removida.

## Stories

- Story 4.1: Visão de gastos por pessoa e categoria

## Requirements & Constraints

- Para uma competência selecionada, mostrar o total gasto por pessoa e o detalhamento por categoria dentro do gasto de cada pessoa.
- Permitir alternar entre visão combinada (casal) e visão individual na mesma tela, com os totais recalculados de acordo.
- O agrupamento é sempre pela competência da fatura (mês/ano selecionado no upload), nunca pela data individual do lançamento.
- Lançamentos com titular ainda pendente de mapeamento (cartão não associado a nenhuma das duas contas) ou marcados "categoria removida" devem aparecer num grupo separado e sempre visível, "pendente de revisão" — nunca ausentes silenciosamente da visão.
- Valores monetários são tratados sempre em centavos (inteiro), nunca float.
- Interface web usável sem scroll horizontal e sem zoom manual a partir de 360px de largura; sem app nativo.

## Technical Decisions

- Módulo vertical: `app/(app)/lancamentos` (UI/route handlers) → `server/visualizacao` (agregação) → Drizzle → Postgres. UI nunca consulta o banco diretamente; qualquer mutação (ex.: correção de categoria feita a partir desta tela) passa pela camada de serviço do módulo dono da regra, não por `visualizacao`.
- Agregação lê de `lancamento` (`competencia_ano`, `competencia_mes`, `valor_centavos`, `cartao_id`, `categoria_id` nullable), unido a `cartao` (`usuario_id` nullable até mapeamento) e `categoria`.
- Parcelas futuras projetadas (Epic 5, `compra_parcelada`) nunca são materializadas como linha de `lancamento` — esta visão enxerga só lançamentos reais já processados, sem necessidade de filtrar projeções.
- "Categoria removida" é um estado no lançamento distinto de um `categoria_id` nulo comum; tanto esse estado quanto titular pendente de mapeamento alimentam o mesmo grupo "pendente de revisão".

## UX & Interaction Patterns

Não existe spec de UX dedicado para este projeto (decisão explícita do usuário — produto pequeno, hobby, 2 usuários); a jornada UJ-1 da PRD carrega o fluxo inline: após o upload, a mesma tela mostra os gastos da competência por pessoa e por categoria, e o casal corrige ali mesmo 2-3 lançamentos categorizados errado. A alternância entre visão combinada e individual é um toggle simples na mesma tela, não uma página separada.

## Cross-Story Dependencies

- Depende do Epic 2 (lançamentos extraídos e atribuídos à competência) e do Epic 3 (categoria sugerida/corrigida, marcação "categoria removida") como fonte de dados.
- Depende da Story 2.3 (mapeamento cartão/titular → conta) para a condição de "titular pendente" que alimenta o grupo "pendente de revisão".
- O Epic 5 (parcelas) é independente desta épica; a Story 1.4 já reserva um item de navegação "Parcelas" para quando o Epic 5 existir, mas o item "Lançamentos" desta épica já faz parte do menu comum compartilhado.
