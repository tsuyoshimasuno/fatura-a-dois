---
title: Fatura a Dois
status: final
created: 2026-07-14
updated: 2026-07-21
---

# PRD: Fatura a Dois

## 0. Propósito do Documento

Este PRD traduz o [Product Brief: Fatura a Dois](../../briefs/brief-fatura-a-dois-2026-07-14/brief.md) em requisitos funcionais implementáveis. É a base para as próximas etapas (arquitetura, UX, épicos/histórias). Vocabulário é âncorado no Glossário (§3); as Features (§4) agrupam Requisitos Funcionais numerados globalmente (FR-1 a FR-N); suposições inferidas aparecem inline como `[ASSUMPTION]` e estão indexadas em §10.

## 1. Visão

Fatura a Dois é um app web pessoal para um casal enxergar, juntos e sem esforço manual, para onde vai o dinheiro do cartão de crédito. Todo mês, um dos dois seleciona o período (mês/ano) e sobe a planilha (XLSX) de lançamentos exportada do Itaú; o app extrai os lançamentos, já separados por titular, sugere categorias no vocabulário do próprio casal (corrigível a qualquer momento) e mostra dois números que hoje exigem ler o PDF inteiro à mão: quanto cada um gastou (e em quê) nesta fatura, e quanto do limite dos próximos meses já está garantido pelas parcelas em andamento.

O ganho não é "mais um app de finanças" — é substituir "abrir o PDF e vasculhar" por uma leitura de poucos minutos, mês após mês, sem surpresa quando a próxima fatura fechar. Hoje não existe processo nenhum — só o PDF bruto — e decisões de gasto e orçamento do casal são tomadas sem dados organizados; o ganho de tempo é a forma visível de um ganho maior, que é decidir juntos com números confiáveis, não por impressão.

## 2. Usuários-Alvo

### 2.1 Jobs To Be Done

- Como pessoa do casal, quero ver rapidamente meus gastos do mês por categoria, sem reler o PDF da fatura.
- Como casal, queremos ver o gasto combinado dos dois, não só o individual.
- Como casal, queremos saber, antes da próxima fatura fechar, quanto do limite mensal já está comprometido por parcelas em andamento.
- Como pessoa que corrige uma categoria errada, quero que o app não erre a mesma coisa de novo no mês seguinte.

### 2.2 Não-Usuários (v1)

Qualquer pessoa fora do casal (2 contas); qualquer banco além do Itaú; qualquer forma de crédito rotativo/juros/simulação — ver §5.

### 2.3 Jornadas-Chave do Usuário

- **UJ-1. Revisão da fatura do mês.**
  - **Persona + contexto:** um dos dois, fatura do Itaú acabou de fechar, exporta a planilha (XLSX) de lançamentos pelo app/site do banco.
  - **Estado inicial:** autenticado, acessa o app pelo navegador (computador ou celular).
  - **Caminho:** seleciona mês/ano da competência no menu → faz upload da planilha (XLSX) → app extrai lançamentos e sugere categorias → tela mostra gastos da competência por pessoa e por categoria → usuário corrige 2-3 categorias que vieram erradas.
  - **Clímax:** em poucos minutos, os dois sabem exatamente quanto cada um gastou e em quê, sem ter aberto a planilha manualmente.
  - **Resolução:** correções feitas viram regra memorizada; próxima fatura já vem com essas categorias certas.
  - **Caso de borda:** se a mesma planilha (ou uma exportação parcial da fatura em aberto) já foi enviada antes para a mesma competência, o app identifica os lançamentos já existentes e insere só os novos, sem duplicar; lançamentos que sumiram entre um envio e outro são desconsiderados da fatura.

- **UJ-2. Conferir o comprometimento futuro antes da fatura fechar.**
  - **Persona + contexto:** qualquer um dos dois, no meio do mês, pensando em uma compra maior.
  - **Estado inicial:** autenticado, abre a visão de parcelas.
  - **Caminho:** abre a tela de parcelas em andamento → vê total de parcelas futuras por mês e quanto do limite mensal de cada mês seguinte já está comprometido.
  - **Clímax:** decide a compra com o número real na frente, não com a memória do que foi parcelado.
  - **Resolução:** evita a surpresa que hoje só aparece quando a fatura fecha.

## 3. Glossário

- **Fatura** — a planilha (XLSX) de lançamentos exportada do Itaú para um período, contendo lançamentos de um ou mais cartões/titulares.
- **Competência da fatura** — o mês de referência escolhido manualmente pelo casal, via menu de mês/ano, no momento do upload. Todos os lançamentos extraídos da planilha enviada são atribuídos a essa competência, **não** ao mês calendário individual de cada lançamento — a planilha exportada não traz um campo de fechamento de fatura que permita derivar isso automaticamente. Parcelas futuras projetadas (ver FR-12) são a única exceção: como ainda não existe upload real para elas, usam uma competência *estimada* por incremento de mês calendário, substituída pela competência real assim que a parcela aparece de fato numa fatura enviada.
- **Titular** — a pessoa (uma das duas contas do casal) dona de um cartão específico dentro da fatura consolidada.
- **Lançamento** — um gasto individual extraído da fatura: data, estabelecimento, valor, titular/cartão, categoria.
- **Categoria** — rótulo de classificação de um lançamento, do conjunto definido pelo próprio casal (não as categorias do banco).
- **Regra de categorização** — associação memorizada entre um padrão de descrição de estabelecimento e uma categoria, criada quando o casal corrige uma sugestão automática.
- **Parcela** — um lançamento que faz parte de uma compra dividida em N parcelas; cada parcela futura ainda não apareceu em nenhuma fatura, mas é projetada a partir da compra original.
- **Limite mensal comprometido** — soma das parcelas futuras já conhecidas que incidirão sobre a fatura de um mês seguinte específico.

## 4. Features

### 4.1 Autenticação e Contas do Casal

**Descrição:** Cada pessoa do casal tem sua própria conta; não há acesso sem login. As duas contas enxergam os mesmos dados (gasto combinado), mas cada lançamento é atribuído a um titular.

#### FR-1: Login obrigatório

Qualquer pessoa só acessa dados da fatura se estiver autenticada. Realiza UJ-1, UJ-2.

**Consequências (testáveis):**
- Nenhuma rota de dados (upload, lançamentos, categorias, parcelas) responde sem sessão válida.
- Existem exatamente 2 contas de usuário provisionadas para o casal; não há fluxo de auto-cadastro aberto ao público.

**Feature-specific NFRs:**
- Tráfego sempre em HTTPS.
- Dados sensíveis (lançamentos, valores) protegidos em repouso.

### 4.2 Upload e Processamento de Fatura

**Descrição:** Um dos dois seleciona o mês/ano de competência num menu e sobe a planilha (XLSX) de lançamentos do Itaú correspondente a esse período. O sistema extrai os lançamentos identificando o titular/cartão de cada um, atribui todos à competência selecionada e faz merge inteligente com o que já existe, para suportar reenvios/uploads parciais ao longo do mês. Realiza UJ-1.

#### FR-2: Seleção de competência e upload de planilha

Antes de enviar o arquivo, o usuário seleciona mês e ano de competência em um menu; em seguida envia a planilha (XLSX) de lançamentos do Itaú correspondente a esse período.

**Consequências (testáveis):**
- O upload exige seleção prévia de mês e ano; não é possível enviar um arquivo sem competência definida.
- Aceita apenas arquivos `.xlsx`; rejeita outros formatos (incluindo PDF) com mensagem clara.
- Planilha que não corresponde ao layout esperado do Itaú é rejeitada com mensagem de erro específica, sem lançamentos parciais/corrompidos salvos.

#### FR-3: Extração de lançamentos

O sistema extrai de cada linha/seção da planilha: data, estabelecimento, valor e o titular/cartão correspondente.

**Consequências (testáveis):**
- Todo lançamento presente na planilha aparece extraído, associado ao titular/cartão correto conforme a estrutura do arquivo (coluna ou seção). `[ASSUMPTION: a planilha exportada identifica o titular/cartão de cada lançamento por coluna ou seção — estrutura exata a confirmar na implementação do parser.]`
- Lançamentos que são parcelas são identificados como tal (ver FR-9).

#### FR-4: Atribuição de competência por seleção manual

Todos os lançamentos extraídos de uma planilha enviada são atribuídos à competência (mês/ano) que o usuário selecionou no upload (FR-2) — não há derivação automática a partir de datas dentro do arquivo.

**Consequências (testáveis):**
- Todo lançamento de uma planilha enviada pertence à mesma competência, a selecionada pelo usuário naquele upload, independentemente da data individual do lançamento.
- Consultar "gastos de agosto" retorna todos os lançamentos de todas as planilhas enviadas com competência agosto selecionada.

#### FR-5: Merge por delta em reenvio

Quando uma fatura da mesma competência é enviada novamente (reenvio integral ou exportação parcial feita antes do fechamento), o sistema identifica os lançamentos já existentes e insere apenas os novos, sem duplicar.

**Consequências (testáveis):**
- Chave de correspondência: data + estabelecimento (normalizado) + titular/cartão. **Valor não faz parte da chave** — um lançamento que corresponde nos outros três campos mas com valor diferente do já salvo é tratado como atualização de valor (ex: pré-autorização que se ajusta ao valor final na liquidação), não como lançamento novo.
- Quando mais de um lançamento salvo compartilha a mesma chave (ex: duas compras iguais no mesmo estabelecimento, no mesmo dia), a correspondência é posicional — 1º novo com 1º salvo, 2º com 2º, e assim por diante. Lançamentos extras além da contagem já salva são inseridos como novos, nunca descartados por engano.
- Reenviar a mesma planilha sem alterações não cria nenhum lançamento novo.
- Categorias já corrigidas manualmente em lançamentos existentes não são sobrescritas por um reenvio (a correspondência preserva a categoria já atribuída).
- Lançamentos previamente registrados para a competência que não aparecem mais no reenvio (contagem por chave menor que a já salva) são removidos/desconsiderados da fatura. `[ASSUMPTION: o casal aceita esse risco — um reenvio incompleto ou incorreto pode remover lançamentos legítimos por engano; nenhuma salvaguarda adicional (ex: aviso quando a remoção for grande) está no escopo do MVP.]`
- Se o lançamento removido era a primeira parcela conhecida de uma compra parcelada, as parcelas futuras já projetadas a partir dela (FR-12) são retraídas junto — o comprometimento de limite mensal (FR-13) não continua contando uma compra desfeita.
- Um lançamento que reaparece depois de ter sido removido (ex: reversão de um estorno) é tratado como um lançamento novo na competência em que reaparece — recupera a categoria correta automaticamente na maioria dos casos via a regra memorizada (FR-10) para aquele estabelecimento, mas não herda diretamente a categoria manual do registro removido.

#### FR-6: Mapeamento cartão/titular → conta

Quando aparece um titular/cartão ainda não mapeado, o sistema pede ao casal para associá-lo a uma das duas contas; a associação é lembrada para as próximas faturas.

**Consequências (testáveis):**
- Todo lançamento exibido tem uma conta do casal associada (nunca fica "sem dono") após a etapa de mapeamento.
- Um cartão já mapeado não pede confirmação de novo em faturas seguintes.
- Se aparecer um titular/cartão que não corresponde a nenhuma das duas contas do casal (ex: cartão adicional de terceiro), o upload é rejeitado com aviso específico, exigindo resolução manual antes de prosseguir — o app nunca assume automaticamente a quem ele pertence.

### 4.3 Categorização de Gastos

**Descrição:** O casal define seu próprio conjunto de categorias. Cada lançamento novo recebe uma sugestão automática de categoria baseada na descrição do estabelecimento; qualquer um dos dois pode corrigir qualquer lançamento, e a correção vira regra para o futuro. Realiza UJ-1.

#### FR-7: Gestão de categorias

Qualquer um dos dois pode criar, editar e remover categorias do conjunto do casal.

**Consequências (testáveis):**
- Categoria removida deixa de aparecer como sugestão para novos lançamentos.
- Ao tentar excluir uma categoria com lançamentos associados, o sistema avisa antes quantos lançamentos estão associados a ela.
- Ao confirmar a exclusão, o usuário pode escolher uma categoria (nova ou já existente) para substituir automaticamente em todos os lançamentos associados.
- Se o usuário recusar a substituição, os lançamentos afetados ficam marcados como "categoria removida" até reclassificação manual — nunca perdem a informação silenciosamente.
- Uma regra de categorização memorizada (FR-10) que apontava para a categoria excluída é redirecionada para a categoria substituta escolhida; se o usuário recusar a substituição, a regra é removida junto — nunca fica sugerindo uma categoria que não existe mais.

#### FR-8: Sugestão automática de categoria

Todo lançamento novo recebe uma categoria sugerida automaticamente, com base na descrição do estabelecimento.

**Consequências (testáveis):**
- Todo lançamento novo tem uma categoria (sugerida ou "sem categoria") no momento em que aparece na tela — nunca aparece em branco sem indicação.
- Se existe uma regra memorizada (FR-10) para aquele padrão de estabelecimento, ela tem prioridade sobre uma sugestão genérica.

#### FR-9: Identificação de parcelas

O sistema reconhece quando um lançamento é uma parcela de uma compra dividida (ex: "3/10") e associa a compra original.

**Consequências (testáveis):**
- Uma parcela extraída registra número da parcela atual, total de parcelas da compra e o valor de cada parcela.
- A compra original é identificada pela combinação titular/cartão + estabelecimento (normalizado) + valor da parcela + total de parcelas — essa chave é o que permite reconhecer que duas parcelas, seja numa projeção futura (FR-12) ou em faturas de meses diferentes, pertencem à mesma compra.

#### FR-10: Correção manual de categoria

Qualquer um dos dois pode corrigir a categoria de qualquer lançamento, próprio ou do parceiro. A correção cria ou atualiza uma regra memorizada por padrão de estabelecimento.

**Consequências (testáveis):**
- Corrigir a categoria de um lançamento com estabelecimento "X" faz com que o próximo lançamento novo com descrição de estabelecimento aproximada de "X" já venha sugerido com a categoria corrigida — o casamento é aproximado (fuzzy), não exige igualdade exata de string, já que a descrição do mesmo estabelecimento varia entre lançamentos.
- A correção se aplica à conta combinada do casal (a regra vale para os dois, não só para quem corrigiu).
- Quando duas regras memorizadas (criadas por pessoas diferentes) poderiam casar com o mesmo lançamento, a regra mais recentemente criada/atualizada prevalece.

**Notas:** algoritmo específico de matching aproximado fica para a fase de arquitetura.

### 4.4 Visualização de Gastos por Competência

**Descrição:** O casal vê os gastos agrupados pela competência da fatura (não pelo mês calendário), por pessoa e por categoria, tanto combinados quanto individualmente. Realiza UJ-1.

#### FR-11: Visão por pessoa e categoria

O sistema mostra, para uma competência de fatura escolhida, o total gasto por pessoa e o detalhamento por categoria dentro do gasto de cada pessoa.

**Consequências (testáveis):**
- Selecionar uma competência mostra todos os lançamentos daquela fatura, independentemente do mês calendário em que ocorreram (ver Glossário, FR-4).
- É possível ver o total combinado do casal e o total de cada pessoa separadamente na mesma tela ou com uma alternância simples.
- Lançamentos com titular ainda não mapeado (FR-6 pendente) ou marcados "categoria removida" (FR-7) aparecem num agrupamento visível e separado ("pendente de revisão") — nunca ficam ausentes silenciosamente da visão.

### 4.5 Parcelas Futuras e Comprometimento de Limite

**Descrição:** O casal vê quanto das parcelas em andamento ainda vai aparecer nas próximas faturas, mês a mês, e quanto isso compromete do limite mensal. Realiza UJ-2.

#### FR-12: Projeção de parcelas futuras

O sistema projeta, para cada compra parcelada em andamento, quais parcelas ainda vão aparecer em faturas futuras e em qual mês futuro cada uma cai. Diferente da competência de uma fatura real (FR-4), a competência de uma parcela projetada não vem de seleção manual — não existe upload para um mês que ainda não aconteceu. Ela é derivada automaticamente: a parcela N de uma compra, vista pela primeira vez na competência X, projeta as parcelas N+1, N+2, ... até o total, uma por mês calendário seguinte a X (X+1, X+2, ...).

**Consequências (testáveis):**
- Para cada mês futuro com parcelas pendentes, o sistema mostra o total de parcelas que vão incidir naquele mês, calculado por incremento sequencial de mês calendário a partir da competência em que a compra foi vista pela primeira vez.
- Quando uma nova fatura é processada, cada parcela real extraída é reconciliada contra as parcelas projetadas usando a chave de compra original (FR-9): se casar, a projeção correspondente é marcada como realizada e sai da lista de "futuras".
- Se a competência real em que uma parcela aparece divergir da projeção (ex: o casal pulou um mês sem enviar fatura), a reconciliação por chave de compra original (FR-9) realinha a projeção pela parcela real, não pela contagem calendário.
- Uma parcela que já apareceu em alguma fatura processada deixa de ser "futura".

**Notas:** `[ASSUMPTION: parcelas futuras avançam um mês calendário por parcela, assumindo que o casal não pula fechamento de fatura; se um mês for pulado, a reconciliação por chave de compra original acima corrige o desalinhamento assim que a próxima fatura real for processada.]`

#### FR-13: Comprometimento do limite mensal

O sistema mostra, por mês futuro, quanto do limite mensal já está comprometido pela soma das parcelas projetadas, por pessoa e combinado.

**Consequências (testáveis):**
- A visão de um mês futuro específico soma todas as parcelas projetadas para aquele mês, separadas por pessoa e agregadas no total do casal.

**Notas:** "Limite mensal comprometido" refere-se ao valor da fatura projetada daquele mês, não ao limite de crédito total do cartão — confirmado com o casal.

### 4.6 Repasse de Responsabilidade Financeira entre o Casal

**Descrição:** *(adicionado 2026-07-21, avaliação PM+tech-lead+UX)* Um gasto que caiu no cartão de uma pessoa pode, mesmo assim, ser de responsabilidade financeira da outra — qualquer um dos dois pode marcar um lançamento específico como "repassado" para o parceiro. A autoria (quem efetivamente fez a compra, titular do cartão) permanece sempre visível; o que muda é para quem o valor conta nos totais e listas de gasto (FR-11).

#### FR-14: Repasse de responsabilidade financeira de lançamento

Qualquer um dos dois pode marcar um lançamento (com titular já mapeado, FR-6) como repassado para o parceiro; o valor passa a contar no total e na lista de gastos do parceiro, não mais na de quem fez a compra, mas a informação de quem efetivamente gastou nunca é ocultada. A ação é reversível a qualquer momento.

**Consequências (testáveis):**
- Um lançamento repassado deixa de contar no total/detalhamento por categoria de quem fez a compra (FR-11) e passa a contar no de quem recebeu o repasse — em ambos os casos, quem foi o titular do cartão continua visível junto ao lançamento, distinto do indicador de repasse.
- Só é possível repassar um lançamento com titular já mapeado (FR-6); um lançamento em "pendente de revisão" por titular desconhecido não pode ser repassado.
- Repassar e desfazer o repasse são ações simétricas e reversíveis a qualquer momento, sem limite de quantas vezes — desfazer devolve o lançamento à conta de quem originalmente fez a compra.
- Um lançamento identificado como parcela (FR-9) que é repassado propaga o repasse automaticamente às parcelas futuras já projetadas da mesma compra (FR-12) e ao comprometimento de limite mensal (FR-13) — o casal não precisa repetir o repasse mês a mês, parcela a parcela.
- Um repasse feito manualmente não é perdido quando a mesma competência é reenviada (FR-5) e o lançamento corresponde pela chave de delta — mesma garantia já dada para categoria corrigida manualmente.
- Existe um registro mínimo de quem repassou e quando, mesmo sem uma tela de histórico dedicada — o suficiente para investigar uma divergência encontrada meses depois.

**Notas:** avaliação conjunta PM+tech-lead+UX (2026-07-21) tratou isso como capacidade nova (mutação de dado, não refinamento de visualização), distinta de FR-11 — ver `epics.md` Epic 6.

## 5. Não-Objetivos (Explícito)

- O app não vai suportar múltiplos bancos ou formatos de fatura nesta fase — o parser é feito sob medida para o layout do Itaú.
- O app não vai integrar automaticamente com o banco (open banking, download automático) — upload é sempre manual.
- O app não vai suportar mais de duas contas nem qualquer caminho para virar produto multiusuário.
- O app não vai calcular juros, encargos, crédito rotativo ou simulações de crédito — o foco é categorizar gasto, não o custo do crédito.
- O app não vai ter orçamentos com metas/alertas nesta fase (ver §Visão de crescimento no brief).
- O app não vai ter aplicativo nativo mobile — só web responsivo.

## 6. Escopo do MVP

### 6.1 Dentro do Escopo

- Upload manual de planilha (XLSX) de fatura do Itaú, um por vez, com seleção de mês/ano de competência.
- Extração de lançamentos com titular/cartão, atribuídos à competência selecionada no upload.
- Merge por delta em reenvios da mesma competência.
- Mapeamento manual cartão → conta.
- Categorias definidas pelo casal, sugestão automática, correção manual com memória de regra.
- Visão de gastos por pessoa e categoria, por competência de fatura.
- Visão de parcelas futuras e comprometimento de limite mensal por mês seguinte.
- Autenticação obrigatória, 2 contas.
- Repasse (e desfazer repasse) de responsabilidade financeira de um lançamento entre as duas contas do casal.

### 6.2 Fora do Escopo do MVP

- Múltiplos bancos/formatos — ver §5.
- Integração automática com banco — ver §5.
- Orçamentos com metas/alertas — natural passo seguinte, não é o pedido original.
- Retenção configurável / exportação de dados — não solicitado; revisitar se virar necessidade real.

## 7. NFRs Transversais

- **Segurança e Privacidade:** os itens abaixo são não-negociáveis, não "nice to have" — o casal reconhece que os dados são sensíveis mas não tem bagagem técnica de segurança para julgar alternativas sozinho, então a barra é a mais conservadora, não a mais conveniente.
  - Login obrigatório (FR-1); tráfego sempre em HTTPS; senha nunca armazenada em texto plano.
  - Dados sensíveis de gasto (valores, descrições de estabelecimento, categorias) protegidos em repouso.
  - Planilhas originais das faturas não ficam armazenadas além do necessário para o processamento — são descartadas após a extração bem-sucedida dos lançamentos. `[ASSUMPTION: "além do necessário" significa descarte logo após extração bem-sucedida, mantendo apenas os lançamentos estruturados, não o arquivo original — a confirmar.]`
  - Uploads rejeitados (layout inválido, arquivo corrompido) descartam o arquivo original imediatamente, sem retenção para diagnóstico.
- **Durabilidade:** como o arquivo original é descartado, os lançamentos estruturados extraídos são o único registro dos dados e precisam de backup regular — perda desses dados não é recuperável a partir do arquivo original, já descartado por design.
- **Autenticação:** além do login obrigatório, existe um caminho de recuperação de senha para as duas contas provisionadas (já que não há auto-cadastro público, "esqueci minha senha" não pode depender de um fluxo de cadastro).
- **Plataforma:** web, usável sem scroll horizontal e sem zoom manual a partir de 360px de largura de tela; sem app nativo nesta fase. `[ASSUMPTION, herdado do brief]`
- **Hospedagem:** decisão de self-host vs. provedor gerenciado fica para a fase de arquitetura; requisito aqui é que a escolha cubra os itens de segurança acima por padrão. `[ASSUMPTION, herdado do brief: um provedor gerenciado (ex.: Vercel/Railway) tende a ser mais seguro na prática que self-host para quem não tem experiência em segurança, por cobrir patches e TLS por padrão — a arquitetura deve avaliar isso, não é uma decisão já tomada.]`
- **Resiliência a mudança de layout:** o parser é feito sob medida para o layout atual da planilha do Itaú (§5); mudanças de layout pelo banco podem quebrar a extração sem aviso. `[NOTE FOR PM: nenhuma estratégia de versionamento/tolerância de layout está definida — revisitar quando (ou se) o parser quebrar pela primeira vez; risco real mas de baixa probabilidade a curto prazo.]`

## 8. Métricas de Sucesso

Stakes de hobby/casal — sem dashboard formal. Sucesso é qualitativo, mas checável:

- Uso contínuo: o casal usa o app mês após mês, fatura após fatura — sinal de que o processo de upload + revisão é mais prático que a situação atual, que é nenhum processo: só abrir o PDF/planilha e conferir manualmente.
- Correções em queda: depois de 2-3 faturas com as regras de categorização (FR-10) ativas, o número de correções manuais por fatura tende a cair, não a se manter constante.
- Visão de parcelas consultada antes de decisão: a tela de comprometimento de limite mensal (§4.5) é consultada antes de compras maiores, não só depois do fato.

**Contra-métrica (não otimizar):** número de categorias criadas ou granularidade de categorização — o objetivo é visibilidade rápida, não taxonomia perfeita; categorias demais tornam a revisão mensal mais lenta, não mais útil.

## 9. Perguntas em Aberto

Nenhuma pergunta em aberto nesta versão do PRD — as questões da primeira rodada de correção (tratamento de estorno em reenvio, precisão do casamento de categorização, definição de "limite mensal", destino de lançamentos de categoria removida) e os 4 achados de severidade alta da revisão adversarial (contradição na derivação de competência de parcelas projetadas, reconciliação projetada-vs-real, fragilidade da chave de dedup, divergência de valor em reenvio parcial) foram todos resolvidos e incorporados aos FRs correspondentes (FR-5, FR-6, FR-7, FR-9, FR-10, FR-12, FR-13).

## 10. Índice de Suposições

- §4.2, FR-3 — a planilha exportada identifica o titular/cartão de cada lançamento por coluna ou seção (estrutura exata a confirmar na implementação do parser).
- §4.2, FR-5 — o casal aceita o risco de que um reenvio incompleto ou incorreto remova lançamentos legítimos por engano; nenhuma salvaguarda adicional está no escopo do MVP.
- §4.5, FR-12 — parcelas futuras avançam um mês calendário por parcela a partir da competência em que foram vistas pela primeira vez; desalinhamentos por mês pulado se corrigem por reconciliação quando a fatura real chega.
- §7 — arquivo original (XLSX) é descartado logo após extração bem-sucedida dos lançamentos, mantendo só os lançamentos estruturados.
- §7 — plataforma é só web responsivo, sem app nativo (herdado do brief).
- §7 — provedor de hospedagem gerenciado tende a ser mais seguro que self-host para quem não tem experiência em segurança; a arquitetura deve avaliar, não é decisão tomada (herdado do brief).
