# Epic 6 Context: Repasse de Responsabilidade Financeira entre o Casal

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Today, a card's mapped owner (`cartao.usuarioId`) decides both who bought something and whose total it counts toward — those two facts always collapse into one. This epic separates them: either person can mark a specific lançamento as "repassado" (passed along) to their partner, so the expense counts toward the partner's total/list instead, while who actually made the purchase stays permanently visible. It matters because it's the first capability in the product that mutates financial responsibility per-transaction rather than per-card, and it must not let a repasse silently corrupt totals, installment projections, or survive incorrectly (or incorrectly not survive) a re-upload.

## Stories

- Story 6.1: Repasse e desfazer repasse de lançamento

## Requirements & Constraints

- Only a lançamento with an already-mapped titular (not `titular_pendente`) can be repassado; the pending-review group can never offer this action.
- Repasse and undo-repasse are fully symmetric and reversible, any number of times, by either person.
- Repassing changes which person's total/category breakdown the value counts toward; it never hides or alters who the actual card titular was.
- A repasse on an installment lançamento must automatically propagate to that purchase's already-projected future installments and to monthly limit commitment — the couple must not have to repeat the action month after month. When the next month's real installment is later ingested via upload, it must inherit the repasse of the most recent known installment of the same purchase.
- A manually-set repasse must survive a resend of the same competência (delta merge) when the lançamento matches by the delta key — same guarantee already given to manually-corrected categories.
- Two concurrent repasse/undo actions on the same lançamento: the second, arriving after the first already applied, must be rejected with a clear message (state already changed), never silently applied on top.
- A minimal audit trail of who acted and when must exist, even without a dedicated history screen — enough to investigate a discrepancy found months later.

## Technical Decisions

- Data model: additive, nullable columns on `lancamento` — `responsavelId` (override of `cartao.usuarioId`, used only for totals/aggregation, never for identity), plus `repassadoPor`/`repassadoEm` as the minimal audit trail. No separate history table. Migration is additive, no backfill needed.
- Effective owner for aggregation is `responsavelId ?? cartao.usuarioId`; the titular shown to the user is always `cartao.usuarioId`, never mutated by a repasse. Both `server/visualizacao` (Epic 4 summary/list) and `server/parcelas` (Epic 5 projection/commitment) must switch their aggregation key from titular to this effective-owner value.
- Propagation to future installments reuses the same purchase-identity mechanism as installment projection (`compra_parcelada`, AD-4/AD-7): when `server/ingestao` inserts a new real installment for a purchase that already has a `responsavelId` on a prior installment, it must copy that `responsavelId` onto the new one — otherwise the repasse silently "resets" every month.
- Concurrency guard follows the same conditional-update pattern already used by `mapearCartao`/`rejeitarCartaoTerceiro` (Story 2.3): mutate with a `WHERE responsavel_id IS NULL` (repasse) or `WHERE responsavel_id IS NOT NULL` (undo) condition and treat zero rows affected as a rejected/stale action, not a silent no-op success.
- `categoria`/`regra_categorizacao` sharing rules (AD-8) and the delta-merge key (AD-2, `server/lancamento-matching`) are unaffected — repasse is an orthogonal, per-lançamento field, not part of any matching key.

## UX & Interaction Patterns

- Trigger is a second `icon-button` in the lançamento `item-card` header, next to the existing edit-category pencil (same visual family, 14px icon). Single click, no selector or panel: "Repassar para {primeiro nome do outro}" — unambiguous because the couple is always exactly two accounts. Same direct-action pattern as "Atribuir a {email}" in `/cartoes`, not the expandable panel used by category correction.
- Once repassado, the same button toggles its label to "Desfazer repasse" — identical pair pattern to `rejeitarCartaoTerceiro`/`desfazerRejeicaoCartao`. No dedicated confirmation page or modal (not destructive/cascading, instantly reversible).
- Per-item loading state: button `disabled` + progress label ("Repassando...", "Desfazendo repasse..."); failure shows inline `alert-error` on the card without changing local state.
- The `titular-badge` never changes on repasse (always shows who actually spent). A new, visually distinct `badge-repasse` appears next to it only for repassado items, using `{colors.accent}` for text/border on a transparent background (`rounded.full`, 1px border) — never `{colors.pending}` (that means "awaiting action," a repasse is already resolved) or `{colors.danger}`.
- Same "confusing disappearance" risk already solved for `CartaoRejeitadoItem`/`CartaoPendenteItem`: when repassing an item while filtered to the person who's about to lose it from their filtered view, show an inline confirmation message for a brief delay (`ATRASO_REFRESH_MS`, 2500ms) before the refresh removes it, rather than an instant silent disappearance.
- Filtro de Pessoa now filters by effective responsible party (repasse destinatário when present, else original titular) — same underlying meaning the filter already had, just extended. Filtro de Categoria is unaffected/orthogonal. Summary totals (`summary-card`) must aggregate by the same effective-responsible key.
- Repasse action is hidden entirely for `titular_pendente` items; it applies normally to `sem_categoria`/`categoria_removida` pending items (no special-casing needed there).
- No partial/split repasse: a lançamento is either not repassado or repassado in full to the one other person — never a fractional amount, never more than two possible states.

## Cross-Story Dependencies

- Requires Story 2.3 (cartão/titular mapping) — repasse is unavailable until a lançamento's titular is mapped.
- Extends the `item-card`/list UI built by Stories 3.3/4.1 (`/lancamentos`) with the new icon-button and `badge-repasse`, and changes the semantics of the person filter and summary aggregation already implemented there.
- Depends on Story 5.1's purchase-identity key and Story 5.2's projection mechanism for propagating repasse to future installments, and feeds into Story 5.3's monthly commitment totals (both must aggregate by effective responsible party, not raw titular).
- Must not be undone by Story 2.4's delta-merge resend logic — reuses the same "don't overwrite manually-set field on match" guarantee already applied there to manually-corrected categories.
