---
title: Adversarial Seam Review — Fatura a Dois Architecture Spine
lens: adversarial-seam
target: ../ARCHITECTURE-SPINE.md
source_prd: ../../../prds/prd-fatura-a-dois-2026-07-14/prd.md
created: 2026-07-16
verdict: CHANGES-REQUESTED
---

# Adversarial Seam Review — Fatura a Dois

**Method:** for each pairing of modules (`ingestao`, `categorizacao`, `parcelas`, `visualizacao`) I tried to construct two concrete implementations that each satisfy AD-1 through AD-6 to the letter, and checked whether they'd still build/interoperate consistently. Six seams produced genuine, constructible divergence. They are ranked by how badly the resulting systems would actually clash in production, not by how interesting the ambiguity is in the abstract.

**Verdict: CHANGES-REQUESTED.** The spine is well-formed prose but leaves at least two load-bearing decisions (compra_parcelada ownership, projected-parcela data shape) entirely to implementer judgment, and one AD (AD-3) is ambiguous in a way that changes *which category gets suggested*, not just how good the tuning is. None of these are exotic edge cases — they all trigger on the second month of normal use (first reenvio, first projected parcela reconciliation).

---

## Finding 1 — SEVERITY: HIGH — Projected parcelas have no defined data shape; two compliant builds produce incompatible persistence models

**AD/FR involved:** AD-4, FR-9, FR-12, ERD (`lancamento`, `compra_parcelada`)

The ERD's only transaction-shaped entity is `lancamento`, and its columns (`competencia_ano`, `competencia_mes`, `data`, `estabelecimento`, `valor_centavos`, `cartao_id`, `categoria_id` nullable, `compra_parcelada_id` nullable, `parcela_numero`, `parcela_total`) list `cartao_id` and `data` without a nullable annotation, implying both are required. There is no `status`/`is_projected`/`realizada` column anywhere in the ERD, and no separate entity for "a parcela the app expects to see next month but hasn't yet."

FR-12 requires the system to: project parcelas N+1..total for months that haven't happened, show per-month totals for them, and later "mark [a projection] as realized" when the real lançamento shows up via AD-4's key, "retracting" it if the anchor lançamento is later removed (FR-5 cascade). All three of those verbs (`project`, `mark as realized`, `retract`) presuppose *something persisted and addressable*, but the architecture never says what.

**Two AD-4-literal, ERD-literal builds:**
- **Builder A** materializes projected parcelas as ordinary `lancamento` rows: `compra_parcelada_id` set, `cartao_id` copied from the anchor purchase, `data` synthesized (e.g., first-of-month or null-with-sentinel), a real `categoria_id` inherited from the anchor. "Marking as realized" = flipping some flag or just letting the AD-2 delta-merge naturally absorb it later. This satisfies AD-4's identity key literally and doesn't touch the ERD.
- **Builder B** treats "projected parcela" as a purely computed value: `parcelas` module queries `compra_parcelada` + already-realized `lancamento` count and derives future months at read time, persisting nothing extra. There is no row to "mark realized" — reconciliation just means "on next read, count(realizado) went up, so remaining future count went down." This also satisfies AD-4 literally (the key is used for reconciliation, just at read time instead of at write time) and also doesn't touch the ERD (it adds nothing).

These are not cosmetic differences. Builder A puts synthetic, non-real rows into the same table `visualizacao` (FR-11) reads to compute "gasto da competência" — nothing in AD-anything or FR-11 says visualizacao must filter out projected/synthetic lançamentos, so Builder A's visualizacao either double-counts future money as current-month spend or needs an undocumented filter that Builder B's schema doesn't even need to think about. Builder B, conversely, cannot satisfy FR-13's phrasing of "soma das parcelas projetadas" via a simple join if another module (e.g. a future batch job) expects projected parcelas to be queryable rows.

**Close with:** a 7th AD (or an ERD amendment) stating explicitly that projected-but-not-yet-real parcelas are never rows in `lancamento` (or conversely, that they are, with a required discriminator column and a defined default `data`/`cartao_id` synthesis rule), and that `visualizacao` must exclude non-real rows from actuals if they exist.

---

## Finding 2 — SEVERITY: HIGH — No defined order of operations between AD-2 delta-merge and the FR-5 cascade into FR-12 projections; `compra_parcelada` has two plausible owners

**AD/FR involved:** AD-2, AD-4, FR-5 (cascade-on-removal clause), FR-9, FR-12

The Capability→Architecture Map assigns FR-5 (merge por delta) solely to `server/lancamento-matching`, governed by AD-2, and FR-9/FR-12/FR-13 solely to `server/parcelas`, governed by AD-4. But FR-5's own text requires a cross-module cascade: *"Se o lançamento removido era a primeira parcela conhecida de uma compra parcelada, as parcelas futuras já projetadas a partir dela (FR-12) são retraídas junto."* Detecting "this lançamento is gone" is a pure AD-2 computation (positional key match count went down); deciding what that means for `compra_parcelada` and its projections is a pure AD-4 concern. Nothing in the spine says which module calls which, whether it happens in the same transaction, or what the calling contract looks like.

**Two AD-2/AD-4-literal builds:**
- **Builder A** has `lancamento-matching` directly delete/retract rows in `compra_parcelada`/projected parcelas as part of computing the delta (it "owns" the removal, so it finishes the job). This makes `lancamento-matching` a second writer of parcela-projection state, alongside `server/parcelas`.
- **Builder B** has `lancamento-matching`'s function stay pure (return new/updated/removed lançamento IDs only, per AD-2's literal scope: "a chave... vive em um único módulo"), and has `server/parcelas` separately re-derive removals by diffing before/after `compra_parcelada`-linked lançamento sets after every upload.

Both read AD-2 and AD-4 literally. But Builder A's `compra_parcelada` has two owners in practice (whoever runs first wins/loses races), and Builder B requires an implicit second full pass over parcela-linked data on every upload that no AD mandates the interface for (does `lancamento-matching` even return removed-IDs? AD-2's rule text never says its function has an output contract beyond "matching"). A team split across these two modules would genuinely build incompatible services here — this is precisely the case the review brief called out as a suspected clash and it verified as real.

**Close with:** an AD that fixes call direction and transaction boundary — e.g. "delta-merge returns an explicit `{novos, atualizados, removidos}` lançamento-ID set; `parcelas` is invoked synchronously, in the same request/transaction, with `removidos` to perform any projection retraction; `lancamento-matching` never mutates `compra_parcelada` directly."

---

## Finding 3 — SEVERITY: MEDIUM-HIGH — AD-3's threshold/tie-break wording supports two different selection semantics, not just two tuning values

**AD/FR involved:** AD-3, FR-8, FR-10

The Deferred section explicitly punts the *threshold value* to implementation tuning, which is reasonable. But the review brief's suspicion goes deeper than the threshold number: AD-3's rule — *"trigram similarity... empate pela regra mais recentemente atualizada"* — is ambiguous about **what "empate" (tie) means**, and that ambiguity changes which category gets suggested, not just how sensitive matching is.

Two readings, both literal:
- **(a) Similarity-primary:** rank all candidate regras by `similarity()` DESC; if two land on the *exact same score*, break the tie by `atualizado_em` DESC. The highest-similarity rule normally wins regardless of recency.
- **(b) Recency-primary-among-matches:** filter regras to those clearing *some* similarity threshold (i.e., "casa" at all), then rank the survivors by `atualizado_em` DESC — recency wins among anything that matches, even if a different rule has strictly higher similarity.

FR-10's own text pulls toward reading (b): *"Quando duas regras memorizadas... poderiam casar com o mesmo lançamento, a regra mais recentemente criada/atualizada prevalece"* — it says recency prevails when both *could* match, with no mention of comparing similarity scores first. AD-3's phrasing ("empate") pulls toward reading (a) — literal ties in a float-valued similarity score are rare, so under reading (a) recency almost never actually matters, which contradicts FR-10 treating recency as the normal resolution path, not a rare-tie fallback.

Builder A (reading a) and Builder B (reading b) both implement "trigram similarity... tie-break by most-recently-updated" to the letter, but will suggest *different categories* for the same lançamento whenever two regras from different partners both loosely match — which is exactly the couple's-correction-collision scenario FR-10 exists to handle. This is not a tuning knob; it's a semantic fork in the one function AD-3 says must be the "única autoridade."

**Close with:** tighten AD-3's rule text to state the actual selection order unambiguously, e.g.: "select all regras with `similarity(...) >= threshold`; among survivors, the most recently updated wins outright (recency is the primary tie-break dimension among any match, not a fallback for exact score ties)." Threshold value itself can stay deferred; the *selection order* should not be.

---

## Finding 4 — SEVERITY: MEDIUM — `categoria` being shared-not-per-user is asserted only in ERD prose; no AD forecloses a `usuario_id` column

**AD/FR involved:** ERD (`categoria`), FR-7, FR-11 — no AD binds this at all

The ERD states: *"`categoria` — id, nome (compartilhada entre as duas contas, não por usuário)."* This is the only place the shared-not-per-user property is stated, and it's prose describing a design intent, not a rule any AD enforces. None of AD-1 through AD-6 mention category ownership, scoping, or forbid a `usuario_id` column on `categoria`.

**Two builds that both pass every AD:**
- **Builder A** implements `categoria` with no user-scoping column at all — physically one shared list, matching the ERD prose exactly.
- **Builder B**, anticipating "maybe one partner wants a personal category someday," adds a nullable `usuario_id` to `categoria` (defaulting to null = "shared"), and has `categorizacao`'s category-listing query do `WHERE usuario_id IS NULL OR usuario_id = :current_user`. This still satisfies AD-3 ("uma função é a única autoridade de categorização" — the suggestion function is still singular), still satisfies AD-6 (session still required), and arguably still satisfies the ERD's prose (shared is still the default path).

Under Builder B, `visualizacao` (FR-11, "detalhamento por categoria") and `categorizacao` (FR-7, category CRUD) can silently disagree about which categories exist for a given render, depending on which query path each module uses to enumerate `categoria` — a shared-data-shape clash with no AD standing in the way. Nothing here breaks any AD text; it breaks the assumption three other modules make about `categoria` being a single flat list with no scoping filter.

**Close with:** a lightweight AD or a strengthened Consistency Convention entry: `categoria` has no user/account-scoping column, full stop — any per-user personalization on categories is out of scope for this schema shape, not just deferred.

---

## Finding 5 — SEVERITY: MEDIUM — "Estabelecimento normalizado" is used as an equality key (AD-2, AD-4) and as fuzzy-match input (AD-3) with no single shared normalization function mandated

**AD/FR involved:** AD-2, AD-3, AD-4

Three separate ADs reference "estabelecimento normalizado," each for a different purpose: AD-2 uses it inside an *equality* key (delta-merge dedup), AD-4 uses it inside a different *equality* key (parcela identity), and AD-3 feeds it into `pg_trgm` for *fuzzy* similarity. AD-2's "Prevents" clause only guards against a *future upload path* reimplementing the matching key — it says nothing about `categorizacao` or `parcelas` reusing the same normalization routine that `lancamento-matching` presumably owns.

**Two builds, both AD-literal:**
- **Builder A** puts one `normalizarEstabelecimento()` utility in `lancamento-matching` (since AD-2 already centralizes the matching key there) and has `parcelas` and `categorizacao` both import it.
- **Builder B**, following the letter of the spine (which never says normalization itself must be centralized — only that the *AD-2 key* must live in one module), writes its own light normalizer inside `parcelas` for AD-4's key ("uppercase + trim" is enough for exact match) and a separate one inside `categorizacao` for AD-3's trigram input ("also strip store numbers/digits, since trigram similarity degrades on numeric suffixes").

Under Builder B, the *same raw estabelecimento string* can normalize differently depending on which module reads it, meaning a lançamento that AD-2 correctly dedupes and AD-4 correctly links to a `compra_parcelada` can still get inconsistent categorization suggestions purely because `categorizacao`'s normalizer diverges from the other two. Nothing in AD-2/AD-3/AD-4's text requires a shared normalizer; each AD only claims singularity over its *own* key/function.

**Close with:** extend AD-2 (or add a new AD) so the shared `lancamento-matching` module owns *normalization*, not just the delta key, and require AD-3/AD-4 to consume it rather than each computing their own.

---

## Finding 6 — SEVERITY: LOW-MEDIUM — AD-1's "never derived from date" rule textually contradicts FR-12's calendar-increment derivation, despite AD-1 listing FR-12 in `Binds`

**AD/FR involved:** AD-1, FR-12

AD-1 lists `Binds: FR-4, FR-12`, and its Rule text says *"nenhuma função de parsing lê ou infere limites de período a partir de datas para fins de atribuição."* But FR-12 is explicitly a date-inference mechanism: *"a competência de uma parcela projetada... é derivada automaticamente... por incremento sequencial de mês calendário."* Read narrowly, AD-1's rule only constrains "the upload service" and "parsing functions," so FR-12's projection logic (which lives in `server/parcelas`, not the upload/parsing path) is technically outside the rule's literal scope — but the AD's own `Binds` line invites a reader to think AD-1 governs FR-12 directly, and nothing in the AD text carves out the projection exception explicitly. A builder who takes `Binds: FR-12` at face value could reasonably conclude FR-12's calendar-derivation is *forbidden* by AD-1 and either refuse to implement it as specified or invent a workaround (e.g., requiring a manual competência selection for every projected parcela, which contradicts FR-12's whole premise of not needing an upload for future months).

**Close with:** either narrow AD-1's stated scope explicitly to upload/parsing (and drop FR-12 from its `Binds`, replacing it with a note that FR-12's derivation is the intentional, sole exception), or add one clarifying sentence carving out projected-parcela competência as explicitly outside AD-1's prohibition.

---

## Summary Table

| # | Finding | Severity | Modules in clash |
|---|---|---|---|
| 1 | No defined data shape for projected parcelas (materialized rows vs. computed) | HIGH | parcelas, visualizacao, ingestao (schema) |
| 2 | No order-of-operations / call-direction between AD-2 delta-merge and FR-5→FR-12 cascade; two owners of `compra_parcelada` | HIGH | ingestao (lancamento-matching), parcelas |
| 3 | AD-3 tie-break wording supports two different selection semantics (similarity-primary vs. recency-primary) | MEDIUM-HIGH | categorizacao |
| 4 | `categoria` shared-not-per-user is prose only, no AD forecloses a scoping column | MEDIUM | categorizacao, visualizacao |
| 5 | "Estabelecimento normalizado" normalizer not mandated as a single shared function across AD-2/AD-3/AD-4 | MEDIUM | ingestao, categorizacao, parcelas |
| 6 | AD-1 binds FR-12 but its rule text contradicts FR-12's required date-derivation | LOW-MEDIUM | ingestao, parcelas |

**Recommendation:** Findings 1 and 2 should block moving forward — they produce genuinely incompatible schemas/service boundaries between two teams (or two people) building strictly to the current spine. Findings 3–6 are tightenings of existing ADs' wording, not new invariants, and are cheap to fix before they calcify into diverging code.
