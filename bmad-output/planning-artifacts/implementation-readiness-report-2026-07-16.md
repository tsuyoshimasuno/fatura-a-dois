---
stepsCompleted: [step-01, step-02, step-03, step-04, step-05, step-06]
---

# Implementation Readiness Assessment Report

**Date:** 2026-07-16
**Project:** Fatura a Dois

## 1. Document Discovery

**PRD Files Found:**
- Whole: `planning-artifacts/prds/prd-fatura-a-dois-2026-07-14/prd.md` (status: final)

**Architecture Files Found:**
- Whole: `planning-artifacts/architecture/architecture-fatura-a-dois-2026-07-16/ARCHITECTURE-SPINE.md` (status: final)
- `[NOTE]` Este arquivo não seria encontrado pelos padrões de busca padrão desta skill (`*architecture*.md`, minúsculo) porque o `bmad-architecture` nomeia sua saída em maiúsculas (`ARCHITECTURE-SPINE.md`) por convenção própria. Localizado manualmente para esta avaliação; vale um ajuste futuro no padrão de busca desta skill (case-insensitive) ou documentar a convenção.

**Epics & Stories Files Found:**
- Whole: `planning-artifacts/epics.md` (5 épicos, 14 stories)

**UX Design Files Found:**
- Nenhum — não existe UX spec para este projeto (decisão explícita do usuário; produto pequeno, hobby, 2 usuários, PRD carrega as UJs inline).

**Duplicatas:** nenhuma (nenhum documento existe em formato whole + sharded simultaneamente).

**Documentos faltando:** nenhum obrigatório (UX é opcional e foi conscientemente pulado).

**Documentos usados para esta avaliação:** os três listados acima.

## 2. Análise da PRD

### Functional Requirements

FR1: Login obrigatório; 2 contas provisionadas; sem auto-cadastro público.
FR2: Seleção de competência (mês/ano) antes do upload; aceita só `.xlsx`; rejeita layout inesperado.
FR3: Extração de data/estabelecimento/valor/titular-cartão de cada lançamento.
FR4: Atribuição de competência por seleção manual, nunca por data do lançamento.
FR5: Merge por delta em reenvio (chave sem valor, correspondência posicional, remoção em cascata sobre parcelas).
FR6: Mapeamento cartão/titular → conta; rejeição de cartão de terceiro.
FR7: Gestão de categorias (criar/editar/remover, aviso+substituição ou "categoria removida" na exclusão).
FR8: Sugestão automática de categoria por descrição.
FR9: Identificação de parcelas e chave de compra original.
FR10: Correção manual de categoria com regra memorizada (fuzzy match, desempate por recência).
FR11: Visão de gastos por pessoa/categoria por competência; grupo "pendente de revisão".
FR12: Projeção de parcelas futuras (computada, reconciliada por chave de compra original).
FR13: Comprometimento do limite mensal por mês futuro, por pessoa e combinado.

Total FRs: 13

### Non-Functional Requirements

NFR1: Login obrigatório, HTTPS, senha nunca em texto plano.
NFR2: Dados sensíveis protegidos em repouso.
NFR3: Planilha original descartada logo após extração; upload rejeitado descarta imediatamente.
NFR4: Backup regular dos lançamentos estruturados (único registro após descarte do arquivo original).
NFR5: Recuperação de senha não dependente de cadastro.
NFR6: Web usável sem scroll horizontal/zoom manual a partir de 360px; sem app nativo.
NFR7: Hospedagem gerenciada (cobre TLS/patches por padrão).
NFR8: Resiliência a mudança de layout do Itaú — risco conhecido, sem estratégia de versionamento definida (aceito).

Total NFRs: 8

### Additional Requirements

- Stack: Next.js 16.2, TypeScript 7.x, Node 24 LTS, Supabase (Postgres+Auth+Storage) gerenciado, Drizzle ORM, SheetJS via CDN (não npm), extensão `pg_trgm`, Vercel.
- Sem starter de terceiros formal.
- Ambiente único de produção nesta fase; sem staging/CI formal.

### PRD Completeness Assessment

PRD já passou por Reviewer Gate próprio (rubric + adversarial) em sessão anterior, com todos os achados ALTA resolvidos e incorporados aos FRs. Nenhuma pergunta em aberto (§9). Assessment: **completa e pronta para uso nesta avaliação.**

## 3. Validação de Cobertura dos Épicos

### Coverage Matrix

| FR | PRD Requirement (resumo) | Epic Coverage | Status |
| --- | --- | --- | --- |
| FR1 | Login obrigatório, 2 contas | Epic 1, Stories 1.1–1.2 | ✓ Covered |
| FR2 | Seleção de competência + upload | Epic 2, Story 2.1 | ✓ Covered |
| FR3 | Extração de lançamentos | Epic 2, Story 2.2 | ✓ Covered |
| FR4 | Atribuição de competência manual | Epic 2, Story 2.2 | ✓ Covered |
| FR5 | Merge por delta em reenvio | Epic 2, Story 2.4 | ✓ Covered |
| FR6 | Mapeamento cartão → conta | Epic 2, Story 2.3 | ✓ Covered |
| FR7 | Gestão de categorias | Epic 3, Story 3.1 (+3.3 p/ redirect de regra) | ✓ Covered |
| FR8 | Sugestão automática | Epic 3, Story 3.2 | ✓ Covered |
| FR9 | Identificação de parcelas | Epic 5, Story 5.1 | ✓ Covered |
| FR10 | Correção manual + regra memorizada | Epic 3, Story 3.3 | ✓ Covered |
| FR11 | Visão por pessoa/categoria | Epic 4, Story 4.1 | ✓ Covered |
| FR12 | Projeção de parcelas futuras | Epic 5, Story 5.2 | ✓ Covered |
| FR13 | Comprometimento do limite mensal | Epic 5, Story 5.3 | ✓ Covered |

### Missing Requirements

Nenhuma. Todos os 13 FRs têm cobertura rastreável em pelo menos uma story.

### Coverage Statistics

- Total PRD FRs: 13
- FRs cobertos nos épicos: 13
- Cobertura: 100%

## 4. Alinhamento de UX

### UX Document Status

Not Found — nenhum documento UX existe para este projeto.

### Alignment Issues

N/A (sem documento para comparar).

### Warnings

`⚠️` UI está implícita neste produto: 4 telas com interação real (upload com seletor de mês/ano, gestão/correção de categorias, dashboard de gastos por pessoa/categoria, tela de parcelas futuras). Normalmente a ausência de UX spec seria um warning de gap. Neste caso, porém, é uma **decisão explícita e já confirmada com o usuário** (produto hobby, 2 usuários, as UJ-1/UJ-2 da PRD já cobrem os fluxos com granularidade suficiente para o tamanho do projeto) — registrado aqui como decisão informada, não como lacuna não percebida.

## 5. Revisão de Qualidade dos Épicos

Revisão fresca e independente (não um re-carimbo da minha própria montagem em `bmad-create-epics-and-stories`), aplicando os critérios desta skill com rigor.

### 🔴 Critical Violations

Nenhuma. Todos os 5 épicos entregam valor de usuário (nenhum é "Database Setup"/"API Development" disfarçado); nenhum épico exige um épico posterior para funcionar; nenhuma story depende de story futura dentro do mesmo épico (as 2 violações originais já haviam sido corrigidas na sessão de criação: retração de parcela movida pra Epic5/5.2, redirect de regra movido pra Epic3/3.3).

### 🟠 Major Issues

**Encontrado e corrigido:** faltava uma story explícita de setup inicial de projeto greenfield (Next.js + Supabase + Drizzle + deploy Vercel) — a Story 1.1 original assumia "Supabase Auth configurado" como pré-condição sem nenhuma story anterior que o entregasse. Adicionada **Story 1.0: Setup inicial do projeto** no Epic 1, cobrindo scaffold da stack + PITR habilitado (NFR4), sem FR próprio associado (é suporte de infraestrutura, coberto pelos Additional Requirements, não pelas FRs numeradas) — consistente com a orientação de que projetos greenfield devem ter uma story de setup inicial.

### 🟡 Minor Concerns

- Story 1.1 ("Provisionamento das duas contas") é tecnicamente uma tarefa administrativa/de seed, não uma ação que o casal realiza sozinho na UI — aceitável dado que, num app de 2 usuários auto-operado, o "usuário" e quem faz o setup são as mesmas pessoas; não vale reestruturar por isso.
- Nenhuma inconsistência de formatação encontrada nas 15 stories (Given/When/Then presente e testável em todas).

### Best Practices Compliance Checklist (por épico)

| Épico | Valor de usuário | Independente | Stories bem dimensionadas | Sem dependência futura | Tabelas criadas sob demanda | ACs claros | Rastreável a FRs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ✓ | ✓ | ✓ | ✓ | ✓ (usuario) | ✓ | ✓ |
| 2 | ✓ | ✓ | ✓ | ✓ | ✓ (cartao, lancamento) | ✓ | ✓ |
| 3 | ✓ | ✓ | ✓ | ✓ | ✓ (categoria, regra_categorizacao) | ✓ | ✓ |
| 4 | ✓ | ✓ | ✓ | ✓ | — (sem tabela nova) | ✓ | ✓ |
| 5 | ✓ | ✓ | ✓ | ✓ | ✓ (compra_parcelada) | ✓ | ✓ |

## 6. Summary and Recommendations

### Overall Readiness Status

**READY** — PRD, Arquitetura e Épicos/Stories estão alinhados e prontos para a Fase 4 (implementação).

### Critical Issues Requiring Immediate Action

Nenhuma.

### Recommended Next Steps

1. Rodar `bmad-sprint-planning` para gerar o plano de sprint a partir do `epics.md` atualizado (com a nova Story 1.0).
2. Ao chegar em `server/categorizacao` (Epic 3) e `server/parcelas` (Epic 5), validar com uma spike a habilitação de `pg_trgm` no projeto Supabase real antes de depender dela (risco já registrado na arquitetura, AD-3).
3. Instalar SheetJS via `cdn.sheetjs.com`, não via npm, desde a Story 2.2 (risco de segurança já registrado na arquitetura).

### Final Note

Esta avaliação encontrou 1 issue major (story de setup inicial ausente, já corrigida adicionando Story 1.0) e 2 concerns menores (Story 1.1 ser administrativa por natureza; convenção de nome de arquivo do `bmad-architecture` não bater com o padrão de busca desta skill) — nenhuma delas bloqueante. PRD, Arquitetura e Épicos podem seguir para implementação como estão.
