---
stepsCompleted: [step-01, step-02, step-03, step-04]
inputDocuments: ['planning-artifacts/prds/prd-fatura-a-dois-2026-07-14/prd.md', 'planning-artifacts/architecture/architecture-fatura-a-dois-2026-07-16/ARCHITECTURE-SPINE.md']
---

# Fatura a Dois - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Fatura a Dois, decomposing the requirements from the PRD and Architecture spine into implementable stories. No UX design contract exists — skipped by explicit user decision (small hobby/couple product; the PRD's UJ-1/UJ-2 carry the interaction flow inline).

## Requirements Inventory

### Functional Requirements

FR1: Qualquer pessoa só acessa dados da fatura se estiver autenticada; existem exatamente 2 contas provisionadas para o casal, sem auto-cadastro público.
FR2: Antes do upload, o usuário seleciona mês/ano de competência num menu; o sistema só aceita arquivo `.xlsx`; rejeita planilha fora do layout esperado do Itaú com mensagem específica.
FR3: O sistema extrai data, estabelecimento, valor e titular/cartão de cada lançamento presente na planilha.
FR4: Todo lançamento de uma planilha enviada é atribuído à competência (mês/ano) selecionada no upload — nunca derivada da data individual do lançamento.
FR5: Reenvio da mesma competência faz merge por delta: chave de correspondência é data + estabelecimento normalizado + titular/cartão (valor fora da chave); correspondência posicional cobre duplicatas legítimas; lançamentos que somem no reenvio são removidos, com retração em cascata das parcelas futuras já projetadas a partir deles.
FR6: Titular/cartão ainda não mapeado exige associação manual a uma das duas contas; um titular/cartão que não corresponde a nenhuma das duas contas (cartão de terceiro) rejeita o upload inteiro com aviso.
FR7: O casal cria, edita e remove categorias do conjunto compartilhado; excluir uma categoria com lançamentos associados avisa a quantidade antes e oferece substituição automática por outra categoria (nova ou existente), ou marca os lançamentos como "categoria removida" se a substituição for recusada — inclusive redirecionando/removendo regras de categorização que apontavam para ela.
FR8: Todo lançamento novo recebe sugestão automática de categoria com base na descrição do estabelecimento; uma regra memorizada para aquele padrão tem prioridade sobre a sugestão genérica.
FR9: O sistema identifica lançamentos que são parcelas (ex: "3/10") e associa cada uma à mesma compra original via a chave titular/cartão + estabelecimento normalizado + valor da parcela + total de parcelas.
FR10: Corrigir manualmente a categoria de um lançamento cria ou atualiza uma regra memorizada por padrão de estabelecimento (casamento aproximado/fuzzy, não exato); a regra vale para as duas contas; em conflito entre regras, a mais recentemente atualizada prevalece.
FR11: Visão de gastos por pessoa e por categoria, agrupada pela competência da fatura (não pelo mês calendário); lançamentos com titular pendente de mapeamento ou marcados "categoria removida" aparecem num grupo visível separado ("pendente de revisão"), nunca ausentes silenciosamente.
FR12: Projeção de parcelas futuras por mês — sempre computada em leitura, nunca materializada como lançamento —, reconciliada contra a parcela real quando ela aparece de fato numa fatura processada (por chave de compra original, FR9), realinhando se um mês for pulado.
FR13: Comprometimento do limite mensal por mês futuro, somando as parcelas projetadas daquele mês, por pessoa e combinado para o casal.

### NonFunctional Requirements

NFR1: Login obrigatório; tráfego sempre em HTTPS; senha nunca armazenada em texto plano.
NFR2: Dados sensíveis de gasto (valores, descrições de estabelecimento, categorias) protegidos em repouso.
NFR3: Planilha original descartada logo após extração bem-sucedida dos lançamentos; upload rejeitado (layout inválido/corrompido) descarta o arquivo imediatamente, sem retenção para diagnóstico.
NFR4: Lançamentos estruturados são o único registro dos dados após o descarte do arquivo original — precisam de backup regular (Point-in-Time Recovery em produção).
NFR5: Existe caminho de recuperação de senha para as duas contas, não dependente de um fluxo de cadastro (já que não há auto-cadastro público).
NFR6: Interface web usável sem scroll horizontal e sem zoom manual a partir de 360px de largura; sem app nativo nesta fase.
NFR7: Hospedagem gerenciada (cobre TLS e patches por padrão) — já resolvido na arquitetura: Supabase + Vercel.
NFR8: Resiliência a mudança de layout do Itaú é um risco conhecido e aceito, sem estratégia de versionamento definida ainda — revisitar se/quando o parser quebrar pela primeira vez.

### Additional Requirements

- Stack: Next.js 16.2 (App Router), TypeScript 7.x, Node.js 24 (LTS). Sem starter de terceiros formal — a própria stack decide grande parte do scaffold inicial (Epic 1 deve incluir o setup do projeto com essa stack).
- Infra: Supabase (Postgres + Auth + Storage) gerenciado; Vercel para deploy/hospedagem; Point-in-Time Recovery habilitado em produção (satisfaz NFR4).
- ORM: Drizzle + Drizzle Kit; migrations aplicadas manualmente antes de cada deploy (sem pipeline de CI/CD formal nesta fase).
- Parsing de planilha: SheetJS instalado via `cdn.sheetjs.com` — não via npm (a tag `xlsx` do npm está abandonada com CVEs não corrigidas, relevante por processar arquivo enviado por usuário).
- Extensão Postgres `pg_trgm` para o matching aproximado de categorização (FR8/FR10) — validar habilitação com uma spike antes de depender dela; fallback definido é fuzzy-match em nível de aplicação caso a extensão não funcione de forma confiável no Supabase.
- Módulo único `server/lancamento-matching` implementa a chave de delta do FR5 — nenhum outro módulo reimplementa essa lógica.
- Módulo único `server/shared/normalizar-estabelecimento` implementa a normalização de estabelecimento usada por FR5, FR8/FR10 e FR9 — nenhum módulo normaliza por conta própria.
- `server/parcelas` é o único módulo que escreve em `compra_parcelada`; parcelas futuras (FR12) são sempre computadas em leitura, nunca materializadas como `lancamento`.
- `categoria` e `regra_categorizacao` nunca recebem coluna de escopo por usuário — são compartilhadas pelas duas contas, sempre (nenhuma story deve introduzir particionamento por usuário nessas tabelas).
- Toda rota de dado exige sessão válida do Supabase Auth, validada em middleware antes de qualquer route handler (FR1).
- Ambiente único de produção nesta fase; dev local via Supabase CLI + `next dev`; sem staging formal (revisitar se a escala crescer).

### UX Design Requirements

Nenhum — sem UX spec para este projeto (decisão explícita do usuário; produto pequeno, hobby, 2 usuários, fluxos já cobertos pelas UJs da PRD).

### FR Coverage Map

| FR | Feature PRD | Módulo (Arquitetura) | Governado por |
| --- | --- | --- | --- |
| FR1 | 4.1 Autenticação | `app/(auth)`, middleware | AD-6 |
| FR2 | 4.2 Upload | `app/(app)/upload`, `server/ingestao` | AD-1 |
| FR3 | 4.2 Upload | `server/ingestao` | Stack (SheetJS) |
| FR4 | 4.2 Upload | `server/ingestao` | AD-1 |
| FR5 | 4.2 Upload | `server/lancamento-matching` | AD-2, AD-7, AD-9 |
| FR6 | 4.2 Upload | `server/ingestao` | — |
| FR7 | 4.3 Categorização | `app/(app)/categorias`, `server/categorizacao` | AD-3, AD-8 |
| FR8 | 4.3 Categorização | `server/categorizacao` | AD-3, AD-9 |
| FR9 | 4.3 Categorização | `server/parcelas` | AD-4, AD-7, AD-9 |
| FR10 | 4.3 Categorização | `server/categorizacao` | AD-3, AD-8, AD-9 |
| FR11 | 4.4 Visualização | `app/(app)/lancamentos`, `server/visualizacao` | AD-7 |
| FR12 | 4.5 Parcelas | `server/parcelas` | AD-4, AD-7 |
| FR13 | 4.5 Parcelas | `server/parcelas` | AD-4, AD-7 |

## Epic List

### Epic 1: Autenticação e Contas do Casal
O casal consegue logar com suas duas contas próprias e nenhum dado da fatura fica acessível sem sessão válida.
**FRs covered:** FR1

### Epic 2: Ingestão de Fatura
O casal consegue selecionar a competência, subir a planilha do Itaú, mapear cartões novos para uma das duas contas, e reenviar a mesma fatura mês a mês sem duplicar ou perder lançamentos.
**FRs covered:** FR2, FR3, FR4, FR5, FR6

### Epic 3: Categorização de Gastos
O casal consegue definir suas próprias categorias, receber sugestão automática por lançamento, e corrigir manualmente — com a correção virando regra memorizada para os próximos meses.
**FRs covered:** FR7, FR8, FR10

### Epic 4: Visão de Gastos por Competência
O casal consegue ver, para qualquer competência de fatura, quanto cada um gastou e em que categorias, combinado e individualmente.
**FRs covered:** FR11

### Epic 5: Parcelas Futuras e Comprometimento de Limite
O casal consegue ver quanto das compras parceladas em andamento ainda vai aparecer nas próximas faturas e quanto isso já compromete do limite mensal de cada mês seguinte.
**FRs covered:** FR9, FR12, FR13

### FR Coverage Map

FR1: Epic 1 - Login obrigatório, 2 contas provisionadas, sem auto-cadastro.
FR2: Epic 2 - Seleção de competência e upload de planilha .xlsx.
FR3: Epic 2 - Extração de data/estabelecimento/valor/titular de cada lançamento.
FR4: Epic 2 - Atribuição de competência por seleção manual, nunca por data.
FR5: Epic 2 - Merge por delta em reenvio (chave sem valor, correspondência posicional, remoção em cascata).
FR6: Epic 2 - Mapeamento cartão/titular → conta; rejeição de cartão de terceiro não mapeável.
FR7: Epic 3 - Gestão de categorias (criar/editar/remover, aviso e substituição na exclusão).
FR8: Epic 3 - Sugestão automática de categoria por descrição.
FR9: Epic 5 - Identificação de parcelas e chave de compra original (dado que só ganha valor visível no Epic 5).
FR10: Epic 3 - Correção manual de categoria com regra memorizada (fuzzy match).
FR11: Epic 4 - Visão de gastos por pessoa e categoria, por competência.
FR12: Epic 5 - Projeção de parcelas futuras, computada e reconciliada.
FR13: Epic 5 - Comprometimento do limite mensal por mês futuro.

Nenhum FR ficou de fora (FR1–FR13, 13/13 cobertos).

## Epic 1: Autenticação e Contas do Casal

O casal consegue logar com suas duas contas próprias e nenhum dado da fatura fica acessível sem sessão válida.
**FRs covered:** FR1

### Story 1.0: Setup inicial do projeto

As a desenvolvedor(a) do projeto,
I want o projeto Next.js configurado com Supabase (Postgres + Auth), Drizzle e deploy no Vercel,
So that as próximas stories tenham uma base funcionando para rodar.

**Acceptance Criteria:**

**Given** a stack definida na arquitetura (Next.js 16.2 App Router, TypeScript 7.x, Node 24 LTS)
**When** o projeto é inicializado
**Then** existe um projeto Supabase (Postgres + Auth) conectado ao app via Drizzle, com Drizzle Kit configurado para migrations
**And** o projeto está publicado no Vercel com deploy funcionando (ainda sem funcionalidade além de uma página inicial)
**And** Point-in-Time Recovery está habilitado no projeto Supabase de produção (NFR4)

### Story 1.1: Provisionamento das duas contas do casal

As a casal,
I want que nossas duas contas já existam configuradas no sistema,
So that não exista fluxo de auto-cadastro público.

**Acceptance Criteria:**

**Given** o Supabase Auth configurado
**When** as duas contas do casal são criadas com e-mail/senha (via setup administrativo, não autoatendido)
**Then** ambas conseguem autenticar via Supabase Auth
**And** nenhum endpoint de auto-cadastro público está exposto na aplicação

### Story 1.2: Login obrigatório em toda rota de dado

As a pessoa do casal,
I want fazer login para acessar meus dados de fatura,
So that ninguém sem sessão válida veja informações financeiras.

**Acceptance Criteria:**

**Given** uma pessoa não autenticada
**When** ela tenta acessar qualquer rota de dado (upload, lançamentos, categorias, parcelas)
**Then** é redirecionada para a tela de login
**And** nenhuma dessas rotas retorna dado algum sem sessão válida (AD-6)

**Given** uma sessão válida
**When** a pessoa acessa uma rota de dado
**Then** o conteúdo é exibido normalmente

### Story 1.3: Recuperação de senha

As a pessoa do casal,
I want recuperar minha senha caso esqueça,
So that eu não fique bloqueado do app sem depender de recriar minha conta.

**Acceptance Criteria:**

**Given** uma conta existente
**When** a pessoa solicita redefinição de senha informando seu e-mail
**Then** recebe um link de redefinição via Supabase Auth
**And** o fluxo não depende de nenhum passo de recadastro

**Given** um link de redefinição válido
**When** a pessoa define uma nova senha
**Then** consegue logar com a nova senha imediatamente

## Epic 2: Ingestão de Fatura

O casal consegue selecionar a competência, subir a planilha do Itaú, mapear cartões novos para uma das duas contas, e reenviar a mesma fatura mês a mês sem duplicar ou perder lançamentos.
**FRs covered:** FR2, FR3, FR4, FR5, FR6

### Story 2.1: Seleção de competência e upload de planilha

As a pessoa do casal,
I want selecionar o mês/ano da fatura e enviar a planilha do Itaú,
So that o app saiba a qual competência atribuir os lançamentos.

**Acceptance Criteria:**

**Given** estou autenticado
**When** seleciono mês e ano num menu e envio um arquivo `.xlsx`
**Then** o upload é aceito e a competência fica registrada para essa importação

**Given** não selecionei mês/ano
**When** tento enviar o arquivo
**Then** o upload é bloqueado com mensagem clara

**Given** envio um arquivo que não é `.xlsx` (incluindo PDF)
**When** o upload é processado
**Then** é rejeitado com mensagem clara

### Story 2.2: Extração de lançamentos e atribuição de competência

As a pessoa do casal,
I want que o app extraia automaticamente os lançamentos da planilha enviada,
So that eu não precise digitar cada gasto manualmente.

**Acceptance Criteria:**

**Given** uma planilha válida do Itaú enviada com competência X (Story 2.1)
**When** o processamento roda
**Then** cada lançamento (data, estabelecimento, valor, titular/cartão bruto) é extraído e persistido com `competencia_ano`/`competencia_mes` = X, independentemente da data individual de cada lançamento (AD-1)
**And** lançamentos que são parcelas (ex: "3/10") são marcados como tal, mesmo que sua identificação plena fique para o Epic 5

**Given** uma planilha fora do layout esperado do Itaú
**When** o processamento roda
**Then** o upload inteiro é rejeitado com mensagem específica, sem lançamentos parciais/corrompidos salvos

### Story 2.3: Mapeamento de cartão/titular para conta do casal

As a pessoa do casal,
I want associar um cartão/titular novo a uma das duas contas,
So that todo lançamento fique atribuído à pessoa certa.

**Acceptance Criteria:**

**Given** um lançamento extraído (Story 2.2) com um titular/cartão ainda não mapeado
**When** o casal abre a tela de mapeamento
**Then** pode associar aquele cartão a uma das duas contas, e a associação vale para lançamentos futuros do mesmo cartão sem pedir confirmação de novo

**Given** um titular/cartão que não corresponde a nenhuma das duas contas do casal (ex: cartão adicional de terceiro)
**When** o sistema tenta processar o upload
**Then** o upload inteiro é rejeitado com aviso específico, exigindo resolução manual antes de prosseguir

### Story 2.4: Merge por delta em reenvio da mesma competência

As a pessoa do casal,
I want reenviar a planilha da mesma competência sem duplicar gastos,
So that eu possa atualizar a fatura conforme novos gastos aparecem antes do fechamento.

**Acceptance Criteria:**

**Given** lançamentos já salvos para uma competência
**When** a mesma planilha (ou uma nova exportação da mesma fatura em aberto) é reenviada
**Then** lançamentos já existentes (chave: data + estabelecimento normalizado + titular/cartão, sem considerar valor) não são duplicados
**And** um lançamento cuja chave já existe mas com valor diferente tem o valor atualizado (ex: pré-autorização ajustada ao valor final)

**Given** duas compras iguais no mesmo estabelecimento e dia (mesma chave)
**When** a planilha é reenviada
**Then** ambas são preservadas por correspondência posicional — nenhuma é descartada por engano

**Given** categorias já corrigidas manualmente em lançamentos existentes
**When** um reenvio acontece
**Then** essas categorias não são sobrescritas

**Given** um lançamento previamente salvo que não aparece mais no reenvio
**When** o processamento roda
**Then** ele é removido/desconsiderado da fatura

## Epic 3: Categorização de Gastos

O casal consegue definir suas próprias categorias, receber sugestão automática por lançamento, e corrigir manualmente — com a correção virando regra memorizada para os próximos meses.
**FRs covered:** FR7, FR8, FR10

### Story 3.1: Gestão de categorias do casal

As a pessoa do casal,
I want criar, editar e remover categorias,
So that eu possa classificar meus gastos do jeito que faz sentido pra gente.

**Acceptance Criteria:**

**Given** estou autenticado
**When** crio uma nova categoria com um nome
**Then** ela fica disponível (compartilhada pelas duas contas, AD-8) para classificar lançamentos

**Given** tento excluir uma categoria com lançamentos associados
**When** confirmo a intenção de excluir
**Then** o sistema avisa antes quantos lançamentos serão afetados

**Given** o aviso de exclusão foi mostrado
**When** escolho uma categoria substituta (nova ou existente)
**Then** todos os lançamentos associados são migrados automaticamente para a substituta

**Given** o aviso de exclusão foi mostrado
**When** recuso escolher uma substituta
**Then** os lançamentos afetados ficam marcados "categoria removida" até reclassificação manual — nunca perdem a informação silenciosamente

### Story 3.2: Sugestão automática de categoria

As a pessoa do casal,
I want que cada lançamento novo já venha com uma categoria sugerida,
So that eu não precise categorizar tudo manualmente.

**Acceptance Criteria:**

**Given** um lançamento novo extraído (Epic 2)
**When** ele é exibido pela primeira vez
**Then** já tem uma categoria sugerida com base na descrição do estabelecimento, ou "sem categoria" explícito — nunca aparece em branco sem indicação

### Story 3.3: Correção manual de categoria com regra memorizada

As a pessoa do casal,
I want corrigir a categoria de qualquer lançamento (meu ou do meu parceiro),
So that o app aprenda e não erre a mesma coisa de novo.

**Acceptance Criteria:**

**Given** um lançamento com categoria sugerida errada
**When** eu corrijo manualmente para outra categoria
**Then** a correção se aplica imediatamente, e uma regra memorizada por padrão de estabelecimento (normalizado) é criada/atualizada, valendo para as duas contas

**Given** a regra memorizada existe
**When** um lançamento novo com estabelecimento aproximado (fuzzy match, não exato) ao da regra aparece
**Then** ele já vem sugerido com a categoria da regra, com prioridade sobre a sugestão genérica (Story 3.2)

**Given** duas regras memorizadas conflitantes poderiam casar com o mesmo lançamento
**When** a sugestão é calculada
**Then** a regra mais recentemente atualizada prevalece

**Given** uma regra memorizada aponta para uma categoria que é excluída (Story 3.1)
**When** a exclusão acontece com substituta escolhida
**Then** a regra é redirecionada para a categoria substituta
**And** se a exclusão acontecer sem substituta, a regra é removida junto — nunca fica sugerindo uma categoria que não existe mais

## Epic 4: Visão de Gastos por Competência

O casal consegue ver, para qualquer competência de fatura, quanto cada um gastou e em que categorias, combinado e individualmente.
**FRs covered:** FR11

### Story 4.1: Visão de gastos por pessoa e categoria

As a pessoa do casal,
I want ver, para uma competência escolhida, quanto cada um gastou e em quê,
So that a gente saiba rapidamente pra onde foi o dinheiro sem reler a planilha.

**Acceptance Criteria:**

**Given** lançamentos existentes para uma competência (Epic 2, categorizados via Epic 3)
**When** seleciono essa competência
**Then** vejo o total gasto por pessoa e o detalhamento por categoria dentro do gasto de cada pessoa

**Given** a tela de gastos está aberta
**When** alterno entre visão combinada e individual
**Then** os totais mudam de acordo

**Given** lançamentos com titular ainda pendente de mapeamento (Story 2.3) ou marcados "categoria removida" (Story 3.1)
**When** vejo a competência
**Then** eles aparecem num grupo separado "pendente de revisão" — nunca ausentes silenciosamente da visão

## Epic 5: Parcelas Futuras e Comprometimento de Limite

O casal consegue ver quanto das compras parceladas em andamento ainda vai aparecer nas próximas faturas e quanto isso já compromete do limite mensal de cada mês seguinte.
**FRs covered:** FR9, FR12, FR13

### Story 5.1: Identificação de parcelas e compra original

As a pessoa do casal,
I want que o app reconheça quando um gasto é uma parcela,
So that ele possa ser rastreado ao longo dos meses.

**Acceptance Criteria:**

**Given** um lançamento com indicação de parcela na descrição (ex: "3/10", Epic 2 Story 2.2)
**When** ele é extraído
**Then** o sistema registra o número da parcela atual, o total de parcelas, e o valor de cada parcela

**Given** duas parcelas da mesma compra em faturas diferentes
**When** ambas são processadas
**Then** são reconhecidas como pertencentes à mesma compra original via a chave titular/cartão + estabelecimento normalizado + valor da parcela + total de parcelas (AD-4, AD-9)

### Story 5.2: Projeção de parcelas futuras

As a pessoa do casal,
I want ver quais parcelas ainda vão aparecer nas próximas faturas,
So that eu saiba o que vem pela frente antes da fatura fechar.

**Acceptance Criteria:**

**Given** uma compra parcelada em andamento (Story 5.1)
**When** acesso a tela de parcelas
**Then** vejo, para cada mês futuro, o total de parcelas que vão incidir naquele mês, computado em leitura — nunca uma linha real de lançamento (AD-7)

**Given** uma nova fatura processada
**When** uma parcela projetada corresponde a uma parcela real extraída (mesma chave de compra original)
**Then** a projeção correspondente sai da lista de "futuras"

**Given** o casal pulou um mês sem enviar fatura
**When** a próxima fatura real chega
**Then** a reconciliação realinha a projeção pela parcela real, não pela contagem calendário

**Given** um lançamento removido no merge por delta (Epic 2, Story 2.4) era a primeira parcela conhecida de uma compra
**When** a remoção acontece
**Then** a projeção correspondente é retraída — o comprometimento de limite mensal (Story 5.3) não continua contando uma compra desfeita

### Story 5.3: Comprometimento do limite mensal

As a pessoa do casal,
I want ver quanto do limite mensal de cada mês seguinte já está comprometido pelas parcelas,
So that eu possa decidir uma compra maior com o número real na frente.

**Acceptance Criteria:**

**Given** parcelas projetadas para um mês futuro específico (Story 5.2)
**When** acesso esse mês na tela de parcelas
**Then** vejo a soma de todas as parcelas projetadas para aquele mês, separadas por pessoa e agregada no total do casal
