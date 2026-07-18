---
title: 'Story 2.2: Extração de lançamentos e atribuição de competência'
type: 'feature'
created: '2026-07-17'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context: []
warnings: []
baseline_revision: '5cc2a564e665e93824bd1119942ca2a38d7153bd'
---

<intent-contract>

## Intent

**Problem:** `processarUpload` (Story 2.1) hoje só valida a forma da requisição (competência + extensão `.xlsx`) e nunca lê o conteúdo do arquivo nem persiste nada — nenhum lançamento existe ainda no banco, e nenhum dos épicos seguintes (categorização, visualização, parcelas) tem dado para operar.

**Approach:** Estender `processarUpload` para ler o arquivo com SheetJS (instalado via tarball de `cdn.sheetjs.com`, nunca do registro npm), localizar a linha de cabeçalho da seção de lançamentos da planilha do Itaú (formato inspecionado diretamente em duas exportações reais fornecidas pelo usuário, uma fatura paga e uma em aberto — layout idêntico entre as duas, cabeçalho pode variar de linha dependendo do cabeçalho superior da planilha, então é localizado por conteúdo, nunca por índice fixo), extrair e validar cada lançamento, e persistir tudo numa única transação: cria/reaproveita linhas de `cartao` (chave: número mascarado) e insere as linhas de `lancamento` com a competência do formulário.

## Boundaries & Constraints

**Always:** A linha de cabeçalho da seção de lançamentos é localizada por conteúdo (procurando a linha cujas colunas batem com o padrão esperado — ver Design Notes), nunca por índice de linha fixo, já que a arquitetura vertical do cabeçalho superior da planilha pode variar; todo lançamento recebe `competencia_ano`/`competencia_mes` do formulário (Story 2.1), nunca de nenhuma data individual (AD-1); persistência de todos os lançamentos de um upload acontece numa única transação — tudo ou nada, nenhum lançamento parcial fica salvo se qualquer linha falhar a validação; um cartão (`numero_mascarado`) novo é criado automaticamente sem `usuario_id` (fica `null`, pendente de mapeamento — Story 2.3 cuida da UI de mapeamento e da rejeição de cartão de terceiro; esta story não rejeita nenhum cartão); valores monetários sempre convertidos para centavos (`integer`), nunca `float`; datas convertidas para ISO 8601 sem hora; o arquivo enviado só existe em memória durante esta requisição — nunca é escrito em disco/storage (NFR3, já satisfeito por construção, sem nenhum passo extra de "descarte").

**Block If:** nenhuma decisão de código aqui depende de informação exclusiva do usuário (o layout já foi verificado diretamente pelo agente em duas planilhas reais fornecidas).

**Never:** Nunca aceitar planilha de outro banco ou com layout diferente do Itaú de forma silenciosa — qualquer desvio do padrão esperado (cabeçalho não encontrado, linha de dado que não bate com o padrão de data/valor/parcelamento) rejeita o upload inteiro, sem persistir nada; nunca implementar aqui a lógica de merge por delta em reenvio (isso é a Story 2.4 — esta story sempre insere, nunca compara com lançamentos já existentes da mesma competência); nunca implementar aqui a rejeição de cartão de terceiro nem UI de mapeamento (Story 2.3); nunca reimplementar normalização de estabelecimento nesta story (não é necessária aqui — só entra em uso na Story 2.4/Epic 3/5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Planilha válida do Itaú | `.xlsx` real (paga ou em aberto) com competência X | Todos os lançamentos da seção "Lançamentos" são extraídos e persistidos com `competencia_ano`/`competencia_mes` = X; cartões novos são criados sem `usuario_id` | Nenhum erro; mensagem de sucesso com a contagem |
| Lançamento com parcelamento | Coluna "Parcelamento" no formato `Parcela N de M` | `parcela_numero` = N, `parcela_total` = M persistidos no lançamento | Nenhum erro |
| Lançamento sem parcelamento | Coluna "Parcelamento" vazia | `parcela_numero`/`parcela_total` ficam `null` | Nenhum erro |
| Cabeçalho de lançamentos não encontrado | Planilha sem a linha com as colunas esperadas (ex: outro banco, arquivo `.xlsx` genérico) | Upload inteiro rejeitado, nenhum lançamento salvo | Mensagem específica: "Planilha fora do layout esperado do Itaú." |
| Linha de dado com formato inesperado | Uma linha entre o cabeçalho e o fim da seção não bate com o padrão de data (`DD/MM/AAAA`) ou valor (`R$ ...`) | Upload inteiro rejeitado (transação não é aberta/commitada), nenhum lançamento parcial salvo | Mensagem específica citando que o layout não bateu com o esperado |
| Arquivo `.xlsx` corrompido/ilegível | Arquivo com extensão certa mas conteúdo inválido para o parser | Upload rejeitado | Mensagem específica: "Não foi possível ler o arquivo." |

</intent-contract>

## Code Map

- `server/ingestao/upload.ts` -- MODIFICAR: após a validação estrutural (Story 2.1), chamar a extração/persistência real
- `server/ingestao/parse-planilha-itau.ts` -- NOVO: parsing puro (sem I/O de banco) do buffer `.xlsx` para uma lista tipada de lançamentos brutos, usando SheetJS
- `db/schema/index.ts` -- MODIFICAR: adicionar `cartao` e `lancamento`
- `db/schema/auth-ref.ts` -- NOVO: referência somente-leitura a `auth.users` (schema gerenciado pelo Supabase, nunca migrado por nós) para a FK `cartao.usuario_id`
- `package.json` -- MODIFICAR: adicionar `xlsx` como dependência instalada via tarball de `cdn.sheetjs.com` (nunca do registro npm)
- `db/migrations/*` -- NOVA migration gerada via `drizzle-kit generate` para as tabelas novas

## Tasks & Acceptance

**Execution:**
- [x] `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` -- instala o SheetJS a partir do tarball da CDN oficial (nunca `npm install xlsx` do registro, que está travado numa versão antiga com CVEs conhecidas) -- registra a URL do tarball em `package.json`, não uma versão semver do registro
- [x] `db/schema/auth-ref.ts` -- declarar `export const authUsers = pgSchema('auth').table('users', { id: uuid('id').primaryKey() })` -- referência somente-leitura ao schema `auth` do Supabase (nunca criado/alterado por uma migration nossa), usada só para a FK abaixo
- [x] `db/schema/index.ts` -- adicionar tabela `cartao` (id serial/uuid pk, `numero_mascarado` text unique not null, `nome_titular` text not null, `tipo_cartao` text not null, `usuario_id` uuid nullable referenciando `authUsers.id`, `created_at` timestamp default now) e tabela `lancamento` (id pk, `competencia_ano` integer not null, `competencia_mes` integer not null, `data` date not null, `estabelecimento` text not null, `valor_centavos` integer not null, `cartao_id` referenciando `cartao.id` not null, `categoria_id` nullable (sem FK ainda, tabela `categoria` só existe no Epic 3), `compra_parcelada_id` nullable (sem FK ainda, tabela só existe no Epic 5), `parcela_numero` integer nullable, `parcela_total` integer nullable, `created_at` timestamp default now)
- [x] Gerar e aplicar a migration: `npm run db:generate` seguido de `npm run db:migrate` -- cria as tabelas de fato no Supabase de produção (único ambiente, sem staging)
- [x] `server/ingestao/parse-planilha-itau.ts` -- exporta `parsePlanilhaItau(buffer: ArrayBuffer): { ok: true; lancamentos: LancamentoBruto[] } | { ok: false; message: string }`; usa `XLSX.read` para ler a primeira planilha; localiza a linha de cabeçalho procurando a linha cujas células (a partir da segunda coluna não vazia) começam com `Data`, `Lançamento`, `Parcelamento`, `Valor` (nessa ordem, ignorando colunas subsequentes) -- se não encontrar em nenhuma linha, retorna `{ ok: false, message: 'Planilha fora do layout esperado do Itaú.' }`; a partir da linha seguinte ao cabeçalho, lê cada linha até encontrar uma linha cuja coluna de data esteja vazia (fim da seção de lançamentos); para cada linha: valida `Data` no formato `DD/MM/AAAA` (regex), `Valor` no formato `R$ [-]?[\d,]+\.\d{2}` (regex, aceitando milhar com vírgula e decimal com ponto), e -- se não vazio -- `Parcelamento` no formato `Parcela \d+ de \d+`; qualquer linha que não bata com esses padrões faz a função inteira retornar `{ ok: false, message: 'Planilha fora do layout esperado do Itaú (linha inesperada).' }` sem processar mais nada; em sucesso, retorna a lista de lançamentos brutos com `data` (ISO 8601), `estabelecimento` (trim), `valorCentavos` (integer, `Math.round(valor * 100)`), `parcelaNumero`/`parcelaTotal` (ou `null`), `nomeTitular` (coluna "Nome", trim), `tipoCartao` (coluna "Tipo do cartão", trim), `numeroMascarado` (coluna "Número do cartão", trim)
- [x] `server/ingestao/upload.ts` -- após a validação estrutural existente (Story 2.1) passar, ler `await arquivo.arrayBuffer()`, chamar `parsePlanilhaItau`; se falhar, retornar `{ ok: false, message: <mensagem do parser> }` (nenhuma escrita no banco); se tiver sucesso, abrir uma transação Drizzle (`db.transaction`) que, para cada lançamento bruto: (a) busca `cartao` por `numero_mascarado`, insere se não existir (`nome_titular`/`tipo_cartao` do primeiro lançamento visto, `usuario_id` null) e obtém o `id`; (b) insere o `lancamento` com `competencia_ano`/`competencia_mes` do formulário, `cartao_id` resolvido, e os demais campos mapeados; ao final, retorna `{ ok: true, message: '<N> lançamentos importados para a competência <mês>/<ano>.' }` -- substitui a mensagem placeholder da Story 2.1

**Acceptance Criteria:**
- Given uma planilha válida do Itaú enviada com competência X (Story 2.1), when o processamento roda, then cada lançamento (data, estabelecimento, valor, titular/cartão bruto) é extraído e persistido com `competencia_ano`/`competencia_mes` = X, independentemente da data individual de cada lançamento (AD-1)
- Given um lançamento com indicação de parcela na coluna "Parcelamento" (ex: "Parcela 3 de 10"), when ele é extraído, then é marcado como tal (`parcela_numero`, `parcela_total` persistidos)
- Given uma planilha fora do layout esperado do Itaú, when o processamento roda, then o upload inteiro é rejeitado com mensagem específica, sem lançamentos parciais/corrompidos salvos

## Design Notes

Layout real inspecionado diretamente pelo agente em duas planilhas de exemplo (fatura paga e fatura em aberto) fornecidas pelo usuário via `fixtures/` (diretório fora do controle de versão, `.gitignore`): um bloco de cabeçalho superior (nome do titular, agência, conta, título "Fatura Paga/Aberta - Mês/Ano", resumo do cartão) antecede a seção "Lançamentos"; a linha de cabeçalho da tabela em si tem as colunas (a partir da segunda coluna não vazia da planilha): `Data`, `Lançamento`, `Parcelamento`, `Valor`, (uma coluna intermediária usada só para nota de câmbio em compras internacionais, ignorada), `Titularidade` (`Titular`/`Adicional`), `Nome` (nome completo do titular/adicional), `Tipo do cartão` (`Físico`/`Virtual recorrente`/`Wallet`), `Número do cartão` (mascarado, ex: `****1234`). A posição da linha de cabeçalho varia entre as duas amostras (o bloco de resumo acima pode ter uma linha a mais ou a menos) -- por isso a busca é por conteúdo, nunca por índice fixo. Depois da última linha de lançamento há uma linha em branco seguida de uma linha "Subtotal" e um rodapé "Importante saber" -- não precisam ser tratados especificamente, já que a extração para na primeira linha com coluna de data vazia.

Chave de identidade do cartão para a Story 2.3 (mapeamento): o "Número do cartão" mascarado, não o "Nome" -- uma mesma pessoa pode ter vários números de cartão distintos ao longo do tempo (cartões virtuais recorrentes são recriados por estabelecimento/assinatura), então cada número mascarado novo entra como um `cartao` pendente de mapeamento próprio, mesmo que o `nome_titular` já tenha sido mapeado antes para outro número. Isso bate com a redação da própria Story 2.3 ("a associação vale para lançamentos futuros do **mesmo cartão**").

Linhas de pagamento ("Pagamento Efetuado") e estorno aparecem na mesma seção de lançamentos, com valor negativo -- são extraídas e persistidas como qualquer outro lançamento (sem filtragem especial aqui); a categorização (Epic 3) é responsável por lidar com o significado delas, não a ingestão.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

### 2026-07-18 — Review pass 1

- intent_gap: 0
- bad_spec: 0
- patch: 9 (high 0, medium 3, low 6)
- defer: 1 (low 1)
- reject: 7
- addressed_findings:
  - `[medium]` `[patch]` `REGEX_DATA` só validava o formato `DD/MM/AAAA`, não o calendário -- uma data como `31/02/2026` passava e chegava como string inválida na coluna `date` do Postgres. Adicionada validação de round-trip via `Date.UTC` em `converterDataParaIso`, rejeitando datas com dia/mês inexistentes antes de qualquer escrita.
  - `[medium]` `[patch]` `db.transaction(...)` não tinha `try/catch`; qualquer erro do Postgres (violação de constraint, corrida de concorrência) escapava como exceção não tratada, quebrando o contrato `{ ok, message }` que o resto da função respeita. Envolvido em `try/catch`, retornando `{ ok: false, message: 'Falha ao gravar os lançamentos. Tente novamente.' }` em qualquer falha (a atomicidade da transação em si já garantia que nada ficaria parcialmente salvo -- o patch é sobre o contrato de retorno, não sobre integridade de dado).
  - `[medium]` `[patch]` Nenhum limite de tamanho de arquivo -- resolve também o item deferido pela Story 2.1 agora que o conteúdo passa a ser lido de fato. Adicionado teto de 5MB (fatura real tem no máximo algumas dezenas de KB).
  - `[low]` `[patch]` Cabeçalho encontrado mas zero linhas de lançamento extraídas era reportado como sucesso (`"0 lançamentos importados"`), quando é muito mais provável sinal de arquivo/aba errada do que uma fatura genuinamente vazia. Agora retorna erro de layout inesperado nesse caso.
  - `[low]` `[patch]` Mensagens de linha inesperada não citavam onde o problema estava. Adicionado o número da linha (`(linha N)`) na mensagem.
  - `[low]` `[patch]` Números de parcela (`Parcela N de M`) não eram validados semanticamente -- "Parcela 0 de 0" ou `N > M` passavam. Adicionada validação `N >= 1, M >= 1, N <= M`.
  - `[low]` `[patch]` Linha com `Nome`/`Tipo do cartão`/`Número do cartão` vazios (colunas finais ausentes) faria múltiplas linhas compartilharem um `cartao` bogus com `numero_mascarado = ''`. Adicionada rejeição explícita se qualquer uma dessas 3 colunas vier vazia.
  - `[low]` `[patch]` Campo `titularidade` era extraído do parser mas nunca persistido nem usado em lugar nenhum -- código morto. Removido do tipo `LancamentoBruto` e da extração (nada no FR6/Story 2.3 depende do papel "Titular"/"Adicional", só do "Nome" e do número mascarado).
  - `[low]` `[patch]` `lancamento.cartaoId` e `(competenciaAno, competenciaMes)` não tinham índice, apesar de serem exatamente os padrões de consulta que Epic 4/5 vão usar pesadamente. Adicionados os 2 índices, migration gerada e aplicada.
- deferred:
  - `[low]` Corrida (TOCTOU) na criação de `cartao`: duas requisições concorrentes introduzindo o mesmo `numero_mascarado` novo podem ambas tentar inserir, uma falhando na constraint `unique`. Mitigado a uma falha graciosa (não mais uma exceção não tratada) pelo patch do `try/catch` na transação; resolver com um upsert atômico de verdade é desproporcional para 2 pessoas que praticamente nunca vão fazer upload no mesmo segundo exato -- registrado em `deferred-work.md`.
- Rejeitados (com razão): formato de moeda "deveria" seguir convenção brasileira (milhar com ponto, decimal com vírgula) -- reject, verificado diretamente nas 2 planilhas reais de exemplo: o Itaú exporta nesse formato específico "R$ 1,234.56" (milhar vírgula, decimal ponto), confirmado, não é suposição; hipótese de segunda seção de lançamentos depois de uma linha em branco -- reject, as 2 planilhas reais completas foram inspecionadas linha a linha e nenhuma das duas tem uma segunda seção; hipótese de múltiplas abas na planilha -- reject, as 2 planilhas reais têm exatamente 1 aba cada; falta de checagem de auth dentro da própria Server Action -- reject, decisão arquitetural já estabelecida (AD-6, Stories 1.2/2.1): middleware é o único ponto de enforcement; falta de constraint de banco para os limites de `competencia_mes`/`competencia_ano` -- reject, único caminho de escrita já validado no código, desproporcional adicionar redundância de banco agora; reconciliação de `nome_titular`/`tipo_cartao` quando um cartão já existente reaparece com dado diferente -- reject, esses valores não deveriam mudar para o mesmo número mascarado na prática, sem cenário real observado; política de `onDelete` nas FKs -- reject, não existe nenhum fluxo de exclusão de cartão/usuário ainda, prematuro.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: sucesso
- `npm run db:generate` -- expected: gera migration para `cartao`/`lancamento`
- `npm run db:migrate` -- expected: aplica no Supabase de produção sem erro

**Manual checks (if no CLI):**
- Rodar `processarUpload` diretamente (script ad-hoc) com os dois arquivos reais de `fixtures/` (um por vez, competências diferentes) -- confirmar contagem de lançamentos extraída bate com o número de linhas de dado de cada planilha, e que os cartões (`****0701`, `****5553`, `****2674`, etc.) foram criados
- Rodar com um `.xlsx` qualquer sem o layout esperado (ex: uma planilha em branco) -- confirmar rejeição sem nenhuma linha salva
- Conferir no Supabase (Table Editor) que os valores estão em centavos (integer) e as datas em ISO 8601

## Auto Run Result

Status: done

**Summary:** `processarUpload` agora lê de fato o conteúdo do `.xlsx` (SheetJS via tarball da CDN), localiza a seção de lançamentos por conteúdo (nunca índice fixo), valida cada linha contra o layout real do Itaú, e persiste tudo numa única transação -- criando `cartao` (por número mascarado, sempre sem dono ainda) e `lancamento` com a competência do formulário.

**Files changed:**
- `db/schema/auth-ref.ts` (novo) -- referência somente-leitura a `auth.users`
- `db/schema/index.ts` -- tabelas `cartao` e `lancamento` (com índices em `cartao_id` e `(competencia_ano, competencia_mes)`)
- `db/migrations/0000_*.sql`, `0001_*.sql` -- migrations aplicadas em produção
- `server/ingestao/parse-planilha-itau.ts` (novo) -- parser puro do layout do Itaú
- `server/ingestao/upload.ts` -- estende a Server Action com a extração/persistência real
- `package.json` -- `xlsx` instalado via tarball de `cdn.sheetjs.com`

**Review findings breakdown:** 9 patches aplicados (3 médios: validação de calendário na data, `try/catch` na transação, teto de tamanho de arquivo; 6 baixos: rejeição de "0 lançamentos" como sucesso, número da linha na mensagem de erro, validação semântica de parcela, rejeição de colunas de cartão vazias, remoção de campo morto `titularidade`, índices de banco); 1 deferido (corrida TOCTOU na criação de cartão, mitigada a falha graciosa); 7 rejeitados como verificado-contra-dado-real, decisão arquitetural já tomada, ou prematuro.

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos. `npm run db:generate`/`db:migrate` aplicados com sucesso em produção. Testado de ponta a ponta com as duas planilhas reais fornecidas pelo usuário (`fixtures/`, fora do git): 162 e 103 lançamentos extraídos, batendo exatamente com a contagem manual de linhas de cada arquivo, antes e depois dos patches (regressão verificada). Teste de rejeição com planilha fora do layout esperado confirmado. Dados de teste inseridos sob competência fictícia (2001) durante a segunda rodada de verificação foram removidos do banco depois.

**Residual risks:** Corrida TOCTOU na criação de `cartao` (ver deferred-work.md); nenhuma cobertura de teste automatizado (gap de todo o projeto); merge por delta em reenvio ainda não existe (Story 2.4) -- reenviar a mesma competência hoje duplicaria lançamentos.

Follow-up review recommended: true
