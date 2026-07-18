# Epic 5 Context: Parcelas Futuras e Comprometimento de Limite

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

O casal precisa enxergar, antes da fatura fechar, quanto de compras parceladas em andamento ainda vai aparecer nas próximas faturas e quanto isso já compromete do limite mensal de cada mês seguinte — hoje essa informação só aparece como surpresa quando a fatura fecha. Este épico fecha o ciclo: reconhece que um lançamento é parcela de uma compra dividida, projeta as parcelas futuras mês a mês sem nunca criar lançamentos fictícios, reconcilia a projeção contra a parcela real assim que ela aparece numa fatura processada (inclusive realinhando se um mês for pulado), e soma essas projeções por mês futuro para mostrar o comprometimento do limite, por pessoa e combinado. As três stories são estritamente sequenciais: identidade da compra (5.1) alimenta a projeção (5.2), que alimenta o comprometimento (5.3).

## Stories

- Story 5.1: Identificação de parcelas e compra original
- Story 5.2: Projeção de parcelas futuras
- Story 5.3: Comprometimento do limite mensal

## Requirements & Constraints

- Uma parcela extraída (ex: "3/10") registra o número da parcela atual, o total de parcelas da compra e o valor de cada parcela.
- A compra original é identificada pela combinação titular/cartão + estabelecimento normalizado + valor da parcela + total de parcelas — essa é a única chave usada para reconhecer que duas parcelas (em faturas de meses diferentes, ou numa projeção futura) pertencem à mesma compra.
- Projeção: a parcela N de uma compra, vista pela primeira vez na competência X, projeta as parcelas N+1, N+2, ... até o total, uma por mês calendário seguinte (X+1, X+2, ...). Essa competência projetada é estimada, nunca selecionada manualmente — é a única exceção à regra de que competência de lançamento real é sempre explícita.
- Para cada mês futuro com parcelas pendentes, mostrar o total que vai incidir naquele mês, computado sempre em leitura — nunca como linha real de lançamento.
- Reconciliação: quando uma nova fatura é processada, cada parcela real extraída é comparada às projeções pela chave de compra original; ao casar, a projeção correspondente sai da lista de "futuras". Se a competência real divergir da projetada (mês pulado sem envio), a reconciliação realinha pela parcela real, não pela contagem calendário.
- Se um lançamento removido no merge por delta (Epic 2) era a primeira parcela conhecida de uma compra, a projeção derivada dele precisa ser retraída — o comprometimento de limite (Story 5.3) não pode continuar contando uma compra desfeita.
- Comprometimento do limite mensal de um mês futuro específico = soma de todas as parcelas projetadas para aquele mês, separada por pessoa e agregada no total do casal. "Limite mensal comprometido" é o valor da fatura projetada daquele mês, não o limite de crédito total do cartão.
- Valores monetários sempre em centavos (integer), nunca float; interface usável sem scroll horizontal e sem zoom manual a partir de 360px de largura.
- Métrica de sucesso do produto associada a este épico: a tela de comprometimento é consultada antes de compras maiores, não só depois do fato — sinal de que os números precisam ser confiáveis o suficiente para orientar decisão, não só informativos.

## Technical Decisions

- AD-4: `titular/cartão + estabelecimento normalizado + valor da parcela + total de parcelas` é a única chave usada para linkar uma parcela entre faturas e projeções futuras — nenhum módulo deste épico pode inventar sua própria heurística de matching.
- AD-7: parcela projetada é sempre computada em leitura (query/view sobre `compra_parcelada`), nunca materializada como linha de `lancamento`. `server/parcelas` é o único módulo que escreve em `compra_parcelada`. `server/ingestao` nunca escreve nessa tabela diretamente — ao remover um lançamento que é a primeira parcela conhecida de uma compra, `ingestao` deve chamar uma função de serviço exposta por `server/parcelas` para retrair a projeção.
- AD-9: normalização de estabelecimento reaproveita a função única já implementada em `server/shared/normalizar-estabelecimento` (Epic 2) — `server/parcelas` nunca reimplementa sua própria normalização.
- Modelo de dados a criar: `compra_parcelada` (id, cartao_id, estabelecimento, valor_parcela_centavos, total_parcelas, competencia_inicial_ano, competencia_inicial_mes — a âncora da identidade da AD-4). A tabela `lancamento` (Epic 2) já tem `compra_parcelada_id` (nullable), `parcela_numero`, `parcela_total`, `valor_centavos` prontos para linkar.
- Módulo vertical: `app/(app)/parcelas` (UI/route handlers) → `server/parcelas` (identificação FR-9, projeção FR-12, comprometimento FR-13) → Drizzle → Postgres.
- Convenções já em vigor: mutação sempre via camada de serviço, nunca query direta em rota; erros de domínio como exceções tipadas traduzidas na borda da rota; toda rota sob `app/(app)/*` já exige sessão válida (Epic 1) — nada adicional de auth necessário aqui.

## UX & Interaction Patterns

Não existe spec de UX dedicado (decisão explícita do usuário); a jornada UJ-2 da PRD carrega o fluxo inline: abrir a tela de parcelas em andamento → ver o total de parcelas futuras por mês e quanto do limite mensal de cada mês seguinte já está comprometido → decidir uma compra maior com o número real na frente, não com a memória do que foi parcelado.

## Cross-Story Dependencies

- Sequência estrita dentro do épico: 5.1 (identidade da compra original) é pré-requisito de 5.2 (projeção usa essa identidade para linkar parcelas entre faturas); 5.2 é pré-requisito de 5.3 (o comprometimento soma exatamente as projeções que 5.2 computa).
- Depende do Epic 2: a Story 2.2 já marca lançamentos como parcela na extração (populando `parcela_numero`/`parcela_total` em `lancamento`), e reutiliza `normalizar-estabelecimento` (AD-9) construído lá.
- Gap aberto herdado do Epic 2: a Story 2.4 (merge por delta) já previa, mas nunca implementou, a chamada de retração a `server/parcelas` quando um lançamento removido era a primeira parcela conhecida de uma compra (AD-7) — hoje `server/ingestao` só deleta a linha, sem chamar nenhuma função de retração. A Story 5.2 (ou a que criar `compra_parcelada`) precisa fechar esse gap: confirmar se o modelo de projeção 100% em leitura já resolve isso de graça (a leitura futura simplesmente deixa de ver o lançamento removido) ou se `ingestao` precisa de fato de uma chamada explícita.
- A Story 1.4 (shell de navegação) já reservou um item de menu "Parcelas" para quando este épico existir — as stories deste épico devem ligá-lo.
- O Epic 4 (visão por competência) é independente mas adjacente: já garante que parcelas projetadas nunca aparecem como lançamento real nessa tela — este épico é o único lugar onde a projeção é exibida.
