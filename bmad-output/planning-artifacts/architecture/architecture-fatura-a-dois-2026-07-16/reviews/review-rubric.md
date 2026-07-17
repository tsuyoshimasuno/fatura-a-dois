# Review — Rubric Walk (Reviewer Gate: good-spine checklist)

**Target:** `ARCHITECTURE-SPINE.md`
**Source:** `../../prds/prd-fatura-a-dois-2026-07-14/prd.md`
**Reviewer lens:** independent judgment against the good-spine checklist (divergence coverage, AD enforceability, Deferred safety, tech plausibility, altitude ownership, stakes-fit). Not a self-check by the spine's author.
**Note:** this folder already has `review-version-check.md` (deep tech-currency research) and `reconcile-prd.md` (FR/NFR coverage mapping). Where this review's findings overlap with theirs, that is noted explicitly as corroboration rather than claimed as independently re-verified; net-new findings are marked as such.

## Verdict: CHANGES REQUESTED

The spine's core shape is sound: six ADs each fix a real, previously-identified divergence risk (competência derivation, merge-key ownership, categorization authority, installment identity, file retention, session gating), the money/date/naming conventions close off classic float/timezone bugs, and the Deferred list mostly defers things that genuinely can't cause cross-unit divergence at this scale (async queue, staging/CI, observability, similarity threshold tuning). Stakes-fit is largely right — no microservices, no queues, no premature abstraction for a 2-user hobby app.

But there are real gaps: two cross-module divergence risks that the checklist specifically warns about were missed (a shared normalization authority referenced by three different ADs but never itself fixed; a data-model state — "categoria removida" — that FR-7 and FR-11 both need but the ERD can't represent), one non-negotiable PRD invariant (backup/durability) is completely unaddressed anywhere in the document (not decided, not deferred, not flagged), and the Stack table has version-plausibility problems already substantiated in depth by the sibling `review-version-check.md`.

---

## 1. Divergence points for the level below — fixed vs. missed

**Fixed well:** AD-1 (competência is explicit, never date-derived) directly matches the PRD's most-argued-about ambiguity (FR-4, glossary). AD-2 pins the merge-delta key to one module with the exact field composition from FR-5 (including the positional-correspondence rule and value-excluded-from-key rule). AD-3 names one authority function/mechanism for categorization (trigram similarity + recency tie-break), which is exactly what FR-8/FR-10 needed to prevent UI/batch/future-API divergence. AD-4 gives installment identity a single composite key, matching FR-9/FR-12's reconciliation needs precisely. AD-5 and AD-6 are simple and correctly scoped.

**Missed (net-new findings):**

- **Shared "estabelecimento normalizado" authority is never fixed.** AD-2 (merge key), AD-3 (trigram similarity), and AD-4 (installment key) each independently reference "estabelecimento normalizado" as an input, but no AD or convention says these three consumers share one normalization function/module. AD-2 explicitly protects against reimplementation of the *merge* key elsewhere ("nunca reimplementada"), but gives no equivalent protection to the normalization step feeding all three ADs. If the ingestão module's normalization (used for merge) diverges even slightly from categorização's or parcelas' idea of "normalized" (case, accents, whitespace, punctuation), the same establishment could match for merge purposes but not for categorization or installment-linking — a silent, hard-to-diagnose divergence of exactly the kind the spine exists to prevent.
- **FR-7's category-deletion cascade and the "categoria removida" state have no real architectural home**, despite the Capability→Architecture Map claiming FR-7 is "governed by AD-3." AD-3's rule only covers suggestion/resolution authority — it says nothing about what happens on delete, redirect, or refusal-to-substitute. More concretely: FR-11 requires lançamentos marked "categoria removida" to appear in a distinct "pendente de revisão" grouping, separate from ordinary uncategorized items — but the ERD's `lancamento.categoria_id` is a single nullable field with no sentinel/status to distinguish "never yet suggested" from "was categorized, category later deleted." Two people (or the same person on two different days) implementing the deletion cascade (`server/categorizacao`) and the grouping query (`server/visualizacao`) have no fixed contract for how this state is represented and could easily diverge (sentinel category row vs. boolean flag vs. separate table).

---

## 2. AD enforceability

All six ADs state a concrete mechanism, not just an aspiration:
- AD-1: explicit required params + "no parsing function infers from dates" — enforceable by function signature and code review/tests.
- AD-2: exact key fields + single module name — enforceable structurally (one module owns it).
- AD-3: names the actual mechanism (`pg_trgm`/`similarity()`) and the tie-break rule — concrete enough to test.
- AD-4: exact composite key — concrete.
- AD-5: "only survives during the parsing step, never written to durable storage" — concrete, testable by code review (no storage-write call on raw bytes).
- AD-6: middleware-before-any-data-route — concrete, standard Next.js pattern.

None read as vague filler. The main enforceability caveat is that AD-2's "nunca reimplementada" and AD-5's "nunca gravado" are convention-level guarantees (no compiler/lint enforces them) rather than structural guarantees — acceptable at this stakes level, but worth a one-line note if a lint rule or code-review checklist item would be cheap to add.

---

## 3. Deferred — anything load-bearing hiding in there?

Checked each entry for divergence risk if left unresolved:
- Other-bank parsers, budgets/alerts, native app — correctly out of scope, no divergence risk (non-goals).
- Async parsing queue, Staging/CI, dedicated observability — correctly deferred with stated revisit triggers; none of these can cause two independently-built units to disagree on behavior, only on operational polish.
- `pg_trgm` similarity threshold — correctly deferred: because AD-3 already centralizes categorization behind one function, the threshold is an internal tuning parameter of that one function, not something that can diverge across call sites.

**Nothing missing from Deferred is actually load-bearing** — but the flip side of this check surfaced a real gap: **backup/durability is not in Deferred, not decided, and not an open question — it's simply absent.** The PRD is explicit and non-negotiable about this ("os lançamentos estruturados... precisam de backup regular — perda desses dados não é recuperável", §7 Durabilidade), and it's causally tied to AD-5 (the original file is discarded by design, so the structured rows are the *only* copy). The spine's Deployment section covers migrations and environments but says nothing about Supabase backup/PITR configuration. This is exactly the kind of "silently skipped operational envelope item" the checklist asks to check for. (Corroborated independently by `reconcile-prd.md` §4.)

---

## 4. Named tech plausibility for July 2026

I did not re-run web verification myself; `review-version-check.md` already did this rigorously with sources, so I'm treating its findings as established and folding the ones relevant to this checklist item in:
- Next.js 16.2, Node 24 LTS, Supabase, Vercel: confirmed current and well-matched (per sibling review).
- **TypeScript "5.x" is stale** — TypeScript 7.0 (Go-native compiler rewrite) reportedly reached GA July 8, 2026, a week before this spine's creation date. "5.x" reads as a training-data-era default rather than a checked fact, and the compiler rewrite is a real tooling-compatibility concern, not a cosmetic version bump.
- **SheetJS `xlsx` "atual" is ambiguous in a security-relevant way**: the npm package is reportedly stuck on an old, vulnerable release (prototype pollution + ReDoS, both triggerable by a crafted uploaded spreadsheet — exactly this app's threat model per FR-2/FR-3), while the patched/maintained line is distributed only via SheetJS's own CDN. The Stack table's one-word "atual" doesn't distinguish these, and a default `npm install xlsx` would silently land on the vulnerable one.
- **`pg_trgm`/`similarity()` on Supabase** has a reported open compatibility issue that would directly break AD-3's core mechanism if still live — worth a pre-build spike to confirm rather than assuming "built-in Postgres" is sufficient on the actual managed host.

These all sit squarely inside this checklist's "flag anything that reads suspicious or unverified" bullet, so they're included here even though the primary research lives in the sibling document.

---

## 5. Altitude ownership — operational/environmental envelope

| Dimension | Status |
| --- | --- |
| Deployment & environments | Decided (single prod env, local dev via Supabase CLI + `next dev`) |
| Infra/provider strategy | Decided (Vercel + Supabase managed) |
| Migrations | Decided (Drizzle Kit, manual pre-deploy) |
| Observability/alerting | Deferred, with rationale |
| CI/CD | Deferred, with rationale |
| **Backup/DR** | **Missing entirely** — not decided, not deferred, not an open question |
| **At-rest encryption / HTTPS / plaintext-password** ("não-negociável" NFRs) | **Implicit only** — satisfied by the stack choice (Vercel TLS, Supabase default encryption/Auth) but never stated as a bound rule anywhere (no AD, no Consistency Convention row, no Deferred entry acknowledging "relies on provider defaults"). Corroborated by `reconcile-prd.md` §2. |

The backup gap and the security-NFR-explicitness gap are the two places this altitude's ownership responsibility was silently skipped rather than actively resolved.

---

## 6. Stakes-fit (2-user hobby app)

**No over-engineering found.** The modular monolith with a plain UI→service→DAO→Postgres layering, no message queue, no CI/CD, no staging, no dedicated observability, single production environment — all of this is correctly right-sized for a couple's personal tool. AD-2's dedicated single module for the merge key is justified by the real complexity the PRD describes (positional correspondence, value-outside-key, retraction cascades), not gold-plating.

**Under-engineering found:** backup/durability (above) is the clearest case — the PRD calls it non-negotiable, the spine's own AD-5 makes it strictly load-bearing (structured rows become the *only* surviving copy), and it's simply not addressed. This isn't a "nice to have for scale," it's a real invariant (irrecoverable data loss) left unfixed. The normalization-authority gap and the categoria-removida schema gap are secondary but real instances of the same pattern: a genuine invariant assumed rather than fixed.

---

## Findings (ranked by severity)

| # | Severity | Finding | Source |
| --- | --- | --- | --- |
| 1 | High | Backup/DR of the Supabase Postgres data (the *only* surviving copy, per AD-5) is not decided, deferred, or flagged as open — a non-negotiable PRD invariant left unaddressed. | Net-new (corroborated by `reconcile-prd.md`) |
| 2 | High | "Estabelecimento normalizado" is used as an input by AD-2, AD-3, and AD-4 but no single normalization authority/module is fixed — real risk of the three consumers diverging on what counts as "the same" establishment. | Net-new |
| 3 | High | FR-7's deletion cascade and the "categoria removida" state have no schema/AD coverage despite the Capability Map attributing FR-7 to AD-3; the ERD's single nullable `categoria_id` cannot distinguish "never categorized" from "category removed," risking divergence between the deletion-cascade code and the FR-11 grouping query. | Net-new |
| 4 | High | Stack table lists TypeScript "5.x," reportedly stale for July 2026 (TS 7.0 GA'd July 8, 2026, per sibling research) — a training-data-shaped assertion rather than a verified current pick. | Corroborated from `review-version-check.md` |
| 5 | High | SheetJS `xlsx` "atual" doesn't distinguish the reportedly abandoned/vulnerable npm package (prototype pollution + ReDoS, exploitable via crafted uploaded spreadsheet — exactly this app's attack surface) from the maintained CDN-distributed line. | Corroborated from `review-version-check.md` |
| 6 | Medium | Non-negotiable security NFRs (HTTPS enforcement, at-rest encryption, no-plaintext-password) exist only implicitly via stack choice; no AD/convention binds anyone to them as a rule. | Corroborated from `reconcile-prd.md` |
| 7 | Medium | FR-5's requirement that removing a lançamento retract its already-projected future installments (cross-module: ingestão/merge → parcelas) has no named owning module or contract — risks divergence on when/how retraction happens. | Net-new |
| 8 | Medium | Reported open Supabase-specific issue with `pg_trgm`'s `similarity()` not reliably resolving threatens AD-3's core mechanism; needs a pre-build verification spike rather than assuming "built-in Postgres" suffices on the managed host. | Corroborated from `review-version-check.md` |
| 9 | Low | AD-1's frontmatter binds FR-12, but the Capability→Architecture Map attributes FR-12 to AD-4 instead — an internal inconsistency that could confuse an implementer about which AD actually governs FR-12's projected-competência behavior. | Net-new |
| 10 | Low | Password recovery for the 2 fixed accounts is named only as a folder-tree comment (`(auth)/ # ... recuperação de senha`), not backed by any AD or convention. | Corroborated from `reconcile-prd.md` |
| 11 | Low | Drizzle-on-Supabase pooled-connection `prepare: false` requirement, and unconfirmed Node 24 runtime availability on Vercel, are not mentioned in Deployment/Stack. | Corroborated from `review-version-check.md` |

**Counts:** Critical: 0 · High: 5 · Medium: 3 · Low: 3
