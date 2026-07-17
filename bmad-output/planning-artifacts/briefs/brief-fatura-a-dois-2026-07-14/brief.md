---
title: Fatura a Dois
status: draft
created: 2026-07-14
updated: 2026-07-14
---

# Product Brief: Fatura a Dois

## Resumo Executivo

Fatura a Dois é um app web pessoal para um casal acompanhar, juntos, os gastos do cartão de crédito. Todo mês, o casal faz upload do PDF da fatura do banco, e o app extrai, categoriza (com categorias próprias do casal, corrigíveis manualmente) e organiza os gastos por pessoa e por mês — incluindo quanto do limite mensal de cada mês seguinte já está comprometido por parcelas em andamento.

Hoje isso não existe: o casal só tem o PDF bruto da fatura para entender esses números. Fatura a Dois resolve isso lendo a fatura que já é gerada mensalmente, sem exigir digitação manual de cada gasto.

## O Problema

O casal usa cartões de crédito do mesmo banco, cada um com um ou mais cartões próprios, e recebe uma única fatura consolidada mensalmente. Hoje, entender "quem gastou quanto" e "em que" exige abrir o PDF da fatura e ler manualmente: o banco agrupa os lançamentos por titular e cartão, mas não oferece nenhuma visão consolidada por pessoa, e as categorias que ele atribui (ALIMENTAÇÃO, SAÚDE, VESTUÁRIO etc.) não refletem a forma como o casal categoriza os próprios gastos. Some a isso as compras parceladas: cada fatura nova soma parcelas antigas às novas, e fica difícil enxergar, sem abrir o extrato inteiro, quanto do limite mensal dos próximos meses já está comprometido.

O custo do status quo é baixa visibilidade financeira conjunta — decisões de gasto e orçamento são tomadas sem dados organizados, e surpresas de fatura (por conta de parcelas acumuladas) só aparecem quando a fatura já fechou.

## A Solução

Um app web onde o casal faz upload do PDF da fatura mensal. O sistema:

1. Extrai os lançamentos do PDF, respeitando a estrutura de seções por titular/cartão que o banco já usa para saber de quem é cada gasto.
2. Sugere automaticamente uma categoria (do conjunto de categorias que o próprio casal define) para cada lançamento, com base na descrição do estabelecimento.
3. Permite correção manual da categoria quando a sugestão erra.
4. Mostra os gastos do mês por pessoa e por categoria.
5. Mostra as compras parceladas em andamento: total de parcelas futuras e quanto do limite mensal de cada mês seguinte já está comprometido por elas.

Como só existe um banco e um formato de fatura para suportar, o parser pode ser construído e ajustado especificamente para esse layout, em vez de tentar generalizar para múltiplos bancos.

## Quem Isso Serve

Um casal (2 usuários, contas separadas), cada um com um ou mais cartões sob o mesmo banco. Ambos precisam ver o gasto combinado do casal e o próprio gasto, individualmente, e ambos podem corrigir categorização de qualquer lançamento. Não há outros usuários previstos nesta fase.

## Critérios de Sucesso

- Depois de cada upload de fatura, o casal consegue ver em poucos minutos quanto cada um gastou e em que categorias, sem precisar reler o PDF manualmente.
- A visão de parcelas futuras elimina surpresas: antes de a próxima fatura fechar, dá para saber quanto do limite mensal dela já está comprometido.
- O app é usado de fato, mês após mês — sinal de que o processo de upload + revisão de categoria é mais prático do que a situação atual, que é nenhum processo: só abrir o PDF e conferir manualmente.

## Escopo

**Dentro do escopo (primeira versão):**
- Upload manual de um PDF de fatura por vez, de um único banco (Itaú).
- Extração de lançamentos: data, estabelecimento, valor, titular/cartão.
- Categorização automática por descrição, usando categorias definidas pelo próprio casal, com correção manual.
- Visualização de gastos por pessoa e por categoria, por mês.
- Visualização de compras parceladas: parcelas futuras e comprometimento do limite mensal nos próximos meses.
- Autenticação por usuário (2 contas).

**Fora do escopo (por ora):**
- Suporte a múltiplos bancos ou formatos de fatura.
- Integração automática com o banco (open banking, download automático da fatura).
- Mais de dois usuários ou qualquer ambição de virar produto para outras pessoas.
- Juros, encargos, crédito rotativo, simulações de crédito — tudo que é sobre o custo do crédito em si, não sobre categorizar o gasto.
- Orçamentos com metas/alertas (pode ser um passo natural depois, mas não é o pedido original).
- Apps nativos mobile — a interface web deve funcionar bem no navegador do celular. `[ASSUMPTION]`

## Considerações de Segurança

Dados de gasto pessoal e financeiro do casal são sensíveis; o casal reconhece isso mas não tem bagagem técnica de segurança para decidir sozinho as ferramentas. Para esta fase, os requisitos não-negociáveis são: login obrigatório por usuário (sem acesso anônimo), tráfego sempre criptografado (HTTPS), dados sensíveis protegidos em repouso, e os PDFs originais das faturas não devem ficar armazenados além do necessário para o processamento. A escolha de hospedagem (self-host vs. provedor gerenciado) e das ferramentas específicas de criptografia/autenticação fica para a fase de arquitetura — aqui fica registrado que é um requisito real, não um "nice to have". `[ASSUMPTION: um provedor gerenciado (ex.: Vercel/Railway) tende a ser mais seguro na prática que self-host para quem não tem experiência em segurança, por cobrir patches e TLS por padrão — a arquitetura deve avaliar isso.]`

## Visão

Se funcionar bem para os dois, o próximo passo natural seria orçamentos por categoria com alertas quando alguém se aproxima do limite combinado, e talvez suporte a mais de um banco caso um dos dois troque de cartão. Não é o foco agora, mas é a direção mais provável de crescimento. `[ASSUMPTION]`
