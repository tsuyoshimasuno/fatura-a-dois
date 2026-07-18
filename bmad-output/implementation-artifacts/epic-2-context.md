# Epic 2 Context: Ingestão de Fatura

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

O casal precisa conseguir selecionar a competência (mês/ano) da fatura, subir a planilha `.xlsx` exportada do Itaú, e ter os lançamentos extraídos e atribuídos automaticamente a essa competência — sem precisar digitar cada gasto manualmente. Cartões/titulares novos precisam ser mapeados para uma das duas contas do casal antes que qualquer lançamento fique "sem dono", e cartões de terceiros (fora do casal) nunca podem ser aceitos silenciosamente. Como a fatura muitas vezes é reenviada (exportação parcial antes do fechamento, ou reenvio integral), o sistema precisa fazer merge por delta sem duplicar nem perder lançamentos, e sem sobrescrever categorizações já corrigidas manualmente. Este épico é a porta de entrada de todo dado financeiro do app — os épicos de categorização, visualização e parcelas (3, 4, 5) dependem inteiramente dos lançamentos aqui persistidos.

## Stories

- Story 2.1: Seleção de competência e upload de planilha
- Story 2.2: Extração de lançamentos e atribuição de competência
- Story 2.3: Mapeamento de cartão/titular para conta do casal
- Story 2.4: Merge por delta em reenvio da mesma competência

## Requirements & Constraints

- Upload exige seleção prévia de mês/ano de competência; sem isso, o envio é bloqueado com mensagem clara.
- Só arquivos `.xlsx` são aceitos; qualquer outro formato (incluindo PDF) é rejeitado com mensagem clara.
- Planilha fora do layout esperado do Itaú é rejeitada por inteiro, com mensagem específica — nenhum lançamento parcial ou corrompido pode ficar salvo.
- Todo lançamento extraído de uma planilha recebe a competência selecionada no upload, nunca uma competência derivada da data individual do lançamento.
- Cada lançamento extraído precisa capturar: data, estabelecimento, valor e titular/cartão bruto. Lançamentos que são parcelas (ex: "3/10") já são marcados como tal na extração, mesmo que a identificação plena da compra original só ganhe valor no Epic 5.
- Cartão/titular ainda não mapeado exige associação manual a uma das duas contas do casal; uma vez mapeado, não pede confirmação de novo em uploads futuros.
- Cartão/titular que não corresponde a nenhuma das duas contas (ex: cartão adicional de terceiro) rejeita o upload inteiro, com aviso específico exigindo resolução manual antes de prosseguir — nunca é assumido automaticamente.
- Reenvio da mesma competência faz merge por delta: chave de correspondência é data + estabelecimento normalizado + titular/cartão (valor fica fora da chave — uma mudança de valor na mesma chave é tratada como atualização, não lançamento novo, ex. pré-autorização ajustada ao valor final).
- Múltiplas ocorrências da mesma chave (ex: duas compras iguais no mesmo estabelecimento e dia) são resolvidas por correspondência posicional — nenhuma é descartada por engano.
- Categorias já corrigidas manualmente em lançamentos existentes nunca são sobrescritas por um reenvio.
- Lançamento previamente salvo que não aparece mais no reenvio é removido/desconsiderado da fatura; se ele era a primeira parcela conhecida de uma compra, a projeção futura já criada a partir dele precisa ser retraída em cascata (via `server/parcelas`, não diretamente).
- NFR: o arquivo `.xlsx` original nunca é retido além do parsing da própria requisição — descartado logo após extração bem-sucedida, e imediatamente também quando o upload é rejeitado (sem retenção para diagnóstico).
- NFR: dados sensíveis (valores, estabelecimentos, categorias) protegidos em repouso — já coberto pela hospedagem gerenciada, nenhuma ação adicional exigida deste épico.

## Technical Decisions

- AD-1: atribuição de competência de lançamento real é sempre explícita — o service de upload recebe `competencia_ano`/`competencia_mes` como parâmetro obrigatório; nenhuma função de parsing infere competência a partir de datas de lançamento. (Parcelas projetadas, no Epic 5, são a única exceção documentada — não se aplica aqui.)
- AD-2: a chave de merge por delta (data + estabelecimento normalizado + titular/cartão; correspondência posicional dentro da mesma chave; valor fora da chave) vive exclusivamente em `server/lancamento-matching` — nenhum outro módulo (nem um futuro import em lote) pode reimplementá-la.
- AD-9: normalização de estabelecimento é uma função única e compartilhada, `server/shared/normalizar-estabelecimento`, usada por `lancamento-matching` (este épico) e também por `categorizacao` e `parcelas` (épicos futuros) — nenhum módulo deste épico deve normalizar por conta própria.
- AD-5: o XLSX original existe só durante o parsing da requisição de upload (memória/temp); nunca é gravado em storage durável.
- AD-7: `server/ingestao` nunca escreve diretamente em `compra_parcelada`. Ao remover, no merge por delta, um lançamento que era a primeira parcela conhecida de uma compra, `ingestao` deve chamar uma função de serviço exposta por `server/parcelas` para retrair a projeção — nunca manipular a tabela diretamente.
- Stack: parsing de planilha via SheetJS, instalado a partir de `cdn.sheetjs.com` — não via npm (a tag `xlsx` do npm está travada em versão antiga com CVEs de prototype pollution/ReDoS não corrigidas, relevante por processar arquivo enviado por usuário).
- Tabela `lancamento`: id, competencia_ano, competencia_mes, data, estabelecimento, valor_centavos (integer, nunca float), cartao_id, categoria_id (nullable), compra_parcelada_id (nullable), parcela_numero, parcela_total.
- Tabela `cartao`: id, identificador_banco, usuario_id (nullable até o mapeamento da Story 2.3).
- Convenções gerais do projeto: datas em ISO 8601 sem hora; valores monetários sempre em centavos (integer); mutação de dados sempre via camada de serviço (`server/*`), nunca query direta numa rota; erros de domínio são exceções tipadas traduzidas para HTTP na borda da rota.
- Já implementado (Epic 1, completo): toda rota sob `app/(app)/*` já exige sessão válida do Supabase Auth via middleware — nada a fazer de novo quanto a autenticação neste épico. Também já existem `db/index.ts` (client Drizzle) e `db/schema/index.ts` (vazio, tabelas entram incrementalmente por story) e `lib/supabase/{admin,client,server,middleware}.ts`.
- Deferred (fora deste épico, não implementar): fila/job assíncrono para parsing (arquivo cabe em memória, processamento síncrono no request é suficiente na escala atual); estratégia de versionamento de layout do Itaú (revisitar só quando o parser quebrar pela primeira vez).

## Cross-Story Dependencies

- Story 2.1 (seleção de competência + upload) precede 2.2 (extração) — a competência selecionada em 2.1 é o parâmetro obrigatório que 2.2 usa para atribuir cada lançamento (AD-1).
- Story 2.2 (extração) precede 2.3 (mapeamento cartão→conta) — o mapeamento opera sobre titular/cartão bruto já extraído.
- Story 2.3 (mapeamento) precede 2.4 (merge por delta) em uploads que introduzem cartão novo — um upload com cartão de terceiro não mapeável é rejeitado por inteiro antes que o merge por delta sequer rode.
- Story 2.4 (merge por delta) depende do módulo `server/lancamento-matching` (AD-2) e da normalização compartilhada (AD-9) — nenhuma story deste épico deve implementar sua própria versão da chave de correspondência.
- Story 2.4 tem uma dependência de saída com o Epic 5 (parcelas): a retração em cascata de projeções futuras ao remover um lançamento no merge por delta exige uma função de serviço de `server/parcelas`, que só é construída no Epic 5 — a Story 2.4 precisa expor o ponto de chamada mesmo que `server/parcelas` ainda não exista em pleno (coordenar ordem de implementação ou usar um stub).
- Este épico é pré-requisito de dados para Epic 3 (categorização), Epic 4 (visualização) e Epic 5 (parcelas) — nenhum deles tem lançamento para operar sem que a ingestão esteja funcionando.
