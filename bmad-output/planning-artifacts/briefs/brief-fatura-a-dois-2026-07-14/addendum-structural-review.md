---
title: Fatura a Dois - Addendum - Structural Review
status: draft
created: 2026-07-14
---

# Structural Review: addendum.md

## Document Summary
- **Purpose:** Capture technical/scope details (PDF invoice structure, descoped items, user's security knowledge level) surfaced during brief conversation that didn't fit the main brief, for reuse by PRD and architecture work.
- **Audience:** Downstream PM/architect (not the end user) — a reference for future BMAD phases.
- **Reader type:** humans (default; not specified)
- **Structure model:** Reference/Database (MECE, random-access notes) — closest fit since sections are independent topics a reader will jump to, not a linear narrative.
- **Current length:** ~450 words across 3 sections + 1-sentence intro

## Recommendations

### 1. MERGE - Duplicate "out-of-scope PDF sections" listing
**Rationale:** Bullet 4 of "Estrutura observada no PDF" (juros, encargos do rotativo, limites de crédito, simulações) and bullet 3 of "Decisões de escopo" (juros, encargos, crédito rotativo, limites) name the same excluded items twice, in two different sections, breaking MECE. Recommend keeping the "deliberate exclusion" framing (with rationale "não como esquecimento") in the scope-decisions section, and in the PDF-structure section replacing the repeated list with a short cross-reference (e.g., "financeiro do rotativo/limites — ver seção de escopo") plus only the items unique to parsing robustness (transações internacionais, cabeçalho, rodapé).
**Impact:** ~20-25 words saved; more importantly, removes a MECE violation that could cause the two sections to drift out of sync if one is edited later.
**Comprehension note:** None — this is a pure duplication fix, not a comprehension aid.

### 2. QUESTION - Forward-looking action item embedded inside a scope decision
**Rationale:** The "Excel como formato de entrada" bullet records a past decision (descartado) but also embeds a forward-looking suggestion ("Vale reconfirmar, ao entrar em arquitetura, se não existe uma exportação CSV/Excel..."). Mixing a decision record with an open action item is a minor scope blend — a reader scanning for "what was decided" has to parse out "what still needs checking."
**Impact:** 0 words if left as-is; ~15 words if split into two shorter statements.
**Comprehension note:** Splitting would slightly aid scanability but isn't required — author may prefer keeping the caveat attached to its context.

### 3. PRESERVE - Section ordering (PDF structure → scope decisions → security note)
**Rationale:** Order moves from concrete technical facts to explicit exclusions to a cross-cutting constraint on how architecture should behave. This matches a Reference/Database model well enough and doesn't bury anything critical — the security note, while short, is clearly delimited under its own heading so it won't be missed.
**Impact:** 0 words (no change recommended).

## Summary
- **Total recommendations:** 3 (1 MERGE, 1 QUESTION, 1 PRESERVE)
- **Estimated reduction:** ~20-25 words (~5% of original) if the MERGE is accepted
- **Meets length target:** No target specified
- **Comprehension trade-offs:** None significant — the one real cut (duplicate exclusion list) removes redundancy without touching any comprehension aid; document has no visuals/summaries to weigh against.
