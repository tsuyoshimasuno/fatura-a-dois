---
title: 'Story 2.1: Seleção de competência e upload de planilha'
type: 'feature'
created: '2026-07-17'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: 'ac7ddd1d3ab217753eabcba125e6a81929b75e72'
---

<intent-contract>

## Intent

**Problem:** Não existe nenhuma tela sob `app/(app)` além do placeholder da Story 1.2; o casal não tem como informar a qual competência (mês/ano) uma planilha do Itaú pertence nem enviar o arquivo — pré-requisito de todo o Epic 2.

**Approach:** Página `app/(app)/upload` com um formulário (seletor de mês, seletor de ano, input de arquivo) que envia para uma Server Action em `server/ingestao/upload.ts`; a action valida apenas a forma da requisição (competência selecionada, arquivo com extensão `.xlsx`) e retorna aceite ou rejeição com mensagem específica — a extração de conteúdo da planilha (parsing real, layout do Itaú) é escopo da Story 2.2, que vai estender esta mesma action.

## Boundaries & Constraints

**Always:** Upload só é aceito com mês E ano selecionados; arquivo precisa ter extensão `.xlsx` (case-insensitive) — qualquer outro (incluindo `.pdf`) é rejeitado antes de qualquer tentativa de leitura de conteúdo; a competência (`competencia_mes` 1–12, `competencia_ano`) é sempre um parâmetro explícito enviado pelo formulário, nunca inferida de nada (AD-1); a rota `/upload` fica sob `app/(app)`, já protegida pelo middleware existente (Epic 1) — nenhuma checagem de sessão duplicada aqui.

**Block If:** nenhuma decisão de código aqui depende de informação exclusiva do usuário.

**Never:** Nunca ler/parsear o conteúdo do arquivo nesta story (isso é a Story 2.2) — só nome/extensão são inspecionados; nunca persistir nada em banco nesta story (nenhuma tabela de `lancamento` existe ainda, ela é criada na Story 2.2); nunca reter o arquivo além da própria requisição (NFR3 — mesmo sem parsing, o arquivo não deve ser salvo em disco/storage).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Upload válido | Mês e ano selecionados + arquivo `fatura.xlsx` | Aceito; mensagem confirma a competência registrada para essa importação | Nenhum erro |
| Sem mês/ano selecionado | Arquivo `.xlsx` enviado, mês ou ano vazio | Upload bloqueado antes do envio (validação client) e também rejeitado no server se contornado | Mensagem clara: "Selecione mês e ano antes de enviar." |
| Arquivo não é `.xlsx` (ex: PDF) | `fatura.pdf` com mês/ano selecionados | Upload rejeitado | Mensagem clara: "Envie um arquivo .xlsx. Recebido: fatura.pdf." |
| Arquivo ausente | Mês/ano selecionados, nenhum arquivo | Upload bloqueado | Mensagem clara: "Selecione um arquivo .xlsx." |

</intent-contract>

## Code Map

- `app/(app)/upload/page.tsx` -- NOVO: página com formulário de competência + arquivo
- `server/ingestao/upload.ts` -- NOVO: Server Action de validação estrutural do upload (`'use server'`)

## Tasks & Acceptance

**Execution:**
- [x] `server/ingestao/upload.ts` -- Server Action `processarUpload(formData: FormData)`; lê `competencia_mes` (número 1–12), `competencia_ano` (número), e `arquivo` (File) do `FormData`; se mês ou ano ausente/inválido, retorna `{ ok: false, message: 'Selecione mês e ano antes de enviar.' }`; se arquivo ausente, retorna `{ ok: false, message: 'Selecione um arquivo .xlsx.' }`; se o nome do arquivo não terminar em `.xlsx` (case-insensitive), retorna `{ ok: false, message: `Envie um arquivo .xlsx. Recebido: ${arquivo.name}.` }`; caso contrário retorna `{ ok: true, message: `Upload aceito para a competência ${mes}/${ano}. Processamento dos lançamentos ainda não implementado (Story 2.2).` }` -- valida só a forma da requisição, sem tocar conteúdo/banco (escopo desta story)
- [x] `app/(app)/upload/page.tsx` -- client component com `<select>` de mês (1–12, nomes em português), `<input type="number">` ou `<select>` de ano (ano atual -1 até ano atual +1 é suficiente), `<input type="file" accept=".xlsx">`; no submit, guard contra duplo envio, monta `FormData` e chama `processarUpload`; exibe a mensagem retornada (sucesso em texto normal, erro com `role="alert"`, mesmo padrão das páginas de auth)

**Acceptance Criteria:**
- Given estou autenticado, when seleciono mês e ano num menu e envio um arquivo `.xlsx`, then o upload é aceito e a mensagem confirma a competência registrada para essa importação
- Given não selecionei mês/ano, when tento enviar o arquivo, then o upload é bloqueado com mensagem clara
- Given envio um arquivo que não é `.xlsx` (incluindo PDF), when o upload é processado, then é rejeitado com mensagem clara

## Design Notes

Esta story entrega só a validação estrutural (competência + extensão) — a Story 2.2 estende `processarUpload` para de fato ler o conteúdo com SheetJS (via `cdn.sheetjs.com`, nunca `npm install xlsx`), validar o layout esperado do Itaú, e persistir os lançamentos na tabela `lancamento` (ainda não criada). Não criar essa tabela nem importar SheetJS aqui.

## Spec Change Log

<!-- Append-only. Populated by step-04 during review loops. -->

## Review Triage Log

<!-- Append-only. Populated by step-04 on every review pass. -->

### 2026-07-17 — Review pass 1

- intent_gap: 0
- bad_spec: 0
- patch: 6 (high 1, medium 1, low 4)
- defer: 1 (low 1)
- reject: 6
- addressed_findings:
  - `[high]` `[patch]` `ano` só validava `Number.isInteger`, sem faixa -- selecionar mês mas deixar ano vazio dava `Number('') = 0`, um inteiro válido, e o upload passava com competência `mes/0`, violando o AC de bloqueio. Adicionada faixa `2000–2100`.
  - `[medium]` `[patch]` `anoAtual` calculado durante o render de um client component pode ficar desatualizado se a página for prerenderizada estaticamente num build anterior a uma virada de ano. Mitigado mantendo a janela `atual-1..atual+1` (na prática já cobre o ano seguinte mesmo com build antigo) em vez de introduzir `useEffect` + `setState` (bloqueado pelo lint `react-hooks/set-state-in-effect` e desproporcional para o risco real de um app de 2 usuários).
  - `[low]` `[patch]` Só o botão ficava desabilitado durante o envio; os selects e o input de arquivo continuavam editáveis, permitindo trocar a seleção enquanto uma requisição anterior ainda estava em voo. Adicionado `disabled={loading}` aos três campos.
  - `[low]` `[patch]` Formulário não era limpo após um envio aceito, convidando a um reenvio acidental duplicado. Adicionado `form.reset()` no caminho de sucesso.
  - `[low]` `[patch]` Mensagem de sucesso não tinha nenhum tratamento de live-region para leitores de tela (só o erro tinha `role="alert"`). Adicionado `aria-live="polite"` no caminho de sucesso.
  - `[low]` `[patch]` Nome de arquivo refletido na mensagem de erro sem limite de tamanho. Truncado para 200 caracteres antes de exibir.
- deferred:
  - `[low]` Nenhuma checagem de tamanho máximo de arquivo nesta story. Mais relevante na Story 2.2, quando o conteúdo passa a ser de fato lido/parseado em memória (aqui o arquivo nunca é lido) -- registrado em `deferred-work.md` para ser resolvido junto do parsing real.
- Rejeitados (com razão): ausência de checagem de auth dentro da própria Server Action -- reject, decisão arquitetural já estabelecida (AD-6, Story 1.2): middleware é o único ponto de enforcement, checagem duplicada ad-hoc é proibida pelo próprio Design Notes da Story 1.2; ausência de checagem de MIME-type -- reject, resolvido com um comentário explícito de que a checagem por extensão é só triagem de UX, não fronteira de segurança (validação de conteúdo real é escopo da Story 2.2); múltiplos arquivos sob o mesmo campo do FormData -- reject, desproporcional, sem efeito destrutivo (nada é persistido ainda); mensagem de sucesso mostra número do mês em vez do nome localizado -- reject, texto efêmero que a própria Story 2.2 substitui por inteiro; "inconsistência" de estilo inline -- reject, falso alarme, é a convenção já estabelecida desde a Story 1.0; tipo local do estado `result` não derivado do tipo de retorno da action -- reject, nit de DX de baixo valor, TypeScript já pega divergências estruturais nos pontos de uso.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: sem erros
- `npm run lint` -- expected: sem erros
- `npm run build` -- expected: sucesso

**Manual checks (if no CLI):**
- `npm run dev`, acessar `/upload` autenticado -- formulário deve aparecer
- Enviar sem mês/ano -- mensagem de bloqueio
- Enviar um `.pdf` -- mensagem de rejeição citando o nome do arquivo
- Enviar um `.xlsx` qualquer com mês/ano -- mensagem de aceite

## Auto Run Result

Status: done

**Summary:** Página `/upload` (protegida por sessão, herdada do Epic 1) com formulário de competência + arquivo, ligada a uma Server Action que valida forma da requisição (mês/ano, extensão `.xlsx`) sem tocar conteúdo ou banco.

**Files changed:**
- `server/ingestao/upload.ts` (novo) -- `processarUpload`, primeira Server Action do projeto
- `app/(app)/upload/page.tsx` (novo) -- formulário

**Review findings breakdown:** 6 patches aplicados (1 alto: bug real de validação de ano vazio permitindo competência `mes/0`; 1 médio: risco de ano desatualizado em build estático; 4 baixos: campos não desabilitados durante envio, sem reset pós-sucesso, sem aria-live no sucesso, nome de arquivo sem truncamento); 1 deferido (tamanho máximo de arquivo, mais relevante quando a Story 2.2 ler o conteúdo); 6 rejeitados como decisão arquitetural já tomada, escopo explicitamente fora desta story, ou cosmético.

**Verification performed:** `npx tsc --noEmit`, `npm run lint`, `npm run build` -- limpos. Testes diretos da Server Action via Node (4 cenários da matriz I/O, incluindo o bug de ano vazio antes/depois do patch) -- todas as mensagens batem com o spec.

**Residual risks:** Nenhum teste manual via navegador real foi feito (só a Server Action isoladamente e os testes de rota já cobertos pelo Epic 1). Mensagem de sucesso é texto-placeholder, substituída por completo na Story 2.2.

Follow-up review recommended: false
