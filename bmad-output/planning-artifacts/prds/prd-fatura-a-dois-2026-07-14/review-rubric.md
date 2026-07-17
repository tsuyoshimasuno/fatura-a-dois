# PRD Quality Review — Fatura a Dois

## Overall verdict

This is a tight, well-earned PRD for its stated stakes: the 13 FRs trace cleanly to two UJs and a specific thesis (replace manual PDF/XLSX reading with a few-minute read), the glossary and FR/UJ IDs round-trip cleanly, and all three inline `[ASSUMPTION]` tags are correctly indexed. The two things holding it back from "strong" across the board are a real product risk left unflagged (FR-5's silent-delete-on-reupload behavior) and the complete absence of any success-metric statement — both fixable in a few lines without new discovery work.

## Decision-readiness — adequate

Most decisions in this PRD are stated as decisions, not softened into "considerations" — FR-4's manual-competência-only rule and FR-13's clarifying note on what "limite mensal comprometido" does and does not mean (§4.5, "confirmado com o casal") are good examples of trade-offs named plainly. §8 closes out the prior round's open questions with specific FR pointers (FR-5, FR-7, FR-10, FR-13) rather than vague hand-waving.

One real trade-off is under-surfaced: FR-5's merge-by-delta behavior removes/disregards any previously-registered lançamento that doesn't reappear in a re-upload, treating its absence as a reversal ("estorno, cancelamento"). This is a reasonable design choice, but the PRD never names the risk it accepts — that an incomplete or wrong re-upload (a corrupted export, a user selecting the wrong file) would silently delete legitimate lançamentos rather than flagging an anomaly. UJ-1's "Caso de borda" states the behavior as fact but doesn't acknowledge it as a risk the couple is choosing to accept.

### Findings
- **medium** Silent-delete risk in FR-5 not named as a trade-off (§4.2 FR-5; §2.3 UJ-1 "Caso de borda") — "Lançamentos previamente registrados para a competência que não aparecem mais no reenvio... são removidos/desconsiderados" is stated as pure behavior, with no acknowledgment that a bad/partial upload could be misread as a mass reversal. *Fix:* add a short note (even informal, matching the style of FR-10/FR-13's "Notas:") naming the risk and confirming the couple accepted it — or add a lightweight safeguard (e.g., warn if a reupload would remove more than N lançamentos).

## Substance over theater — strong

No theater detected. The Vision (§1) is concrete to this product — it names the Itaú card, the XLSX upload, the two specific numbers the app replaces ("quanto cada um gastou... e quanto do limite dos próximos meses já está garantido") — and would not swap cleanly into another PRD. The JTBD list (§2.1) is four lines, each driving a distinct FR cluster, with no inflated persona bios. NFRs in §7 are specific to this product (login, HTTPS, discard-original-file-after-extraction) rather than generic "must be secure/scalable" boilerplate. There is no competitive-differentiation section — correctly, since none is needed for a 2-person personal tool.

## Strategic coherence — adequate

The thesis is explicit and the features serve it directly: every FR maps to UJ-1 (fatura review) or UJ-2 (future-limit commitment), and the Non-Goals (§5) consistently protect the thesis's boundary (no multi-bank, no open banking, no interest/revolving-credit math, no budgets/alerts) rather than being an arbitrary cut list. MVP scope reads as "experience" scope (replace manual reading with a fast read) with scope logic that matches — nothing in §6.1 looks like it was included "because it's easy."

The gap: there is no Success Metrics section anywhere in the document, and no explicit "how will we know this worked" statement outside of the qualitative UJ resolutions (§2.3: "correções feitas viram regra memorizada," "evita a surpresa que hoje só aparece quando a fatura fecha"). For hobby stakes this is not a blocker — a 2-person app doesn't need DAU/MAU or a metrics dashboard — but even one line naming what "working" looks like (e.g., manual corrections trending toward zero after N faturas, or the couple actually checking §4.5 before a big purchase) would let the thesis be checked against reality later instead of only against qualitative UJ language.

### Findings
- **low** No Success Metrics section or explicit success statement (document-wide; closest proxy is UJ-1/UJ-2 "Resolução" in §2.3) — thesis is stated and scope follows it, but nothing lets the couple check later whether it actually worked. *Fix:* one or two lines, e.g. "sabemos que funcionou se, depois de 2-3 faturas, as correções manuais de categoria ficarem raras e a visão de parcelas (§4.5) for consultada antes de compras maiores."

## Done-ness clarity — strong

FRs are unusually concrete for a document at this stakes level — nearly every FR has 2-4 testable consequences with explicit matching rules (FR-5's "coincide em data + estabelecimento + valor + titular/cartão"), explicit priority rules (FR-8: memorized rule beats generic suggestion), and explicit failure-mode handling (FR-7: what happens to lançamentos when a category is deleted and the user declines substitution — "ficam marcados como 'categoria removida'... nunca perdem a informação silenciosamente"). This is the dimension the rubric asks to be most unforgiving on, and the PRD holds up well against that scrutiny.

One vague bound survives: §7 Plataforma states "responsivo o suficiente para uso confortável no navegador do celular" — "suficiente" and "confortável" are exactly the adjective-without-bound pattern the rubric flags, even though the clause is already tagged `[ASSUMPTION, herdado do brief]`.

### Findings
- **low** Unbounded "responsivo o suficiente" (§7, Plataforma) — no concrete bound (minimum viewport, no horizontal scroll, tap-target size) accompanies the adjective. *Fix:* add one concrete bound, e.g. "usável sem scroll horizontal e sem zoom manual a partir de 360px de largura."

## Scope honesty — strong

§5 Não-Objetivos is substantive and specific (multi-bank, open banking, revolving credit/interest, budgets/alerts, native mobile — each with a one-line reason), and §6.2 restates the MVP-specific cuts with rationale rather than silence. All three `[ASSUMPTION]` tags are inline at genuine inference points (FR-3's column/section structure, §7's "além do necessário" scope for file discard, §7's web-only platform) and none read as filler. Open-items density is appropriately low for hobby stakes and a second correction round: 0 open questions + 3 assumptions + 0 `[NOTE FOR PM]` callouts. The one deferred decision that isn't tagged — hosting choice, §7 "decisão de self-host vs. provedor gerenciado fica para a fase de arquitetura" — is correctly left untagged since it's an architecture-phase decision, not a product assumption or unresolved tension.

## Downstream usability — strong

The PRD explicitly feeds architecture/UX/stories (§0), so this dimension matters. FR IDs run FR-1 through FR-13 with no gaps or duplicates; UJ-1 and UJ-2 are both referenced from every Feature section ("Realiza UJ-1," "Realiza UJ-1, UJ-2," "Realiza UJ-2") and both cross-references resolve. Internal FR-to-FR references (§4.2 FR-3 → FR-9; §4.3 FR-8 → FR-10; §4.4 FR-11 → FR-4; §8 → FR-5/FR-7/FR-10/FR-13) all point to FRs that exist. The Glossário (§3) is used consistently — "competência," "titular," "lançamento," "parcela" appear with stable meaning across every FR that touches them; the compound shorthand "titular/cartão" is used consistently rather than drifting between synonyms.

## Shape fit — strong

Calibrated correctly to hobby/couple stakes: two UJs (not four-plus), light JTBD list instead of persona bios, no competitive-differentiation section, no formal metrics dashboard — all appropriately absent rather than under-formalized gaps. UJ protagonists are role-based ("um dos dois," "qualquer um dos dois") rather than fictional names — for a real 2-person household app this is the right call, not a shortfall; inventing a fictional name would add nothing the actual couple doesn't already provide as context. The document is neither over-built for a personal tool nor thin on the substance that does matter (the FR consequence density, notably, is higher than many enterprise PRDs bother with).

## Mechanical notes

- **Glossary drift:** none found. Terms are used identically across FRs; the "titular/cartão" compound is consistent shorthand, not synonym drift.
- **ID continuity:** FR-1 through FR-13 contiguous, no gaps or duplicates. UJ-1/UJ-2 both defined and both referenced from Features. All internal cross-references (FR→FR, §8→FR) resolve to existing IDs.
- **Assumptions Index roundtrip:** clean. All three inline `[ASSUMPTION]` tags (FR-3; §7 "além do necessário"; §7 platform, "herdado do brief") appear in §9's index, and all three index entries have a matching inline tag — no orphans either direction.
- **UJ protagonist naming:** both UJs carry context inline (who, when, what triggers the journey) even without a fictional proper name — acceptable given the product is literally built for two named real people, not archetypal personas.
- **`[NOTE FOR PM]` convention:** not used anywhere in the document. FR-10 and FR-13 use an informal "Notas:" line for similar purpose (deferring the matching algorithm to architecture; clarifying "limite mensal comprometido" scope). Not a defect, but worth knowing if a later pass wants to standardize on the tagged convention for tooling/search purposes.
- **Required sections for stakes:** all present except a formal Success Metrics section (see Strategic coherence finding above) — the only structural gap in an otherwise complete document for its stakes.
