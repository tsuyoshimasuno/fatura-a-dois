---
title: Reconcile Inputs — PRD vs Architecture Spine
source-prd: ../../prds/prd-fatura-a-dois-2026-07-14/prd.md
source-spine: ./ARCHITECTURE-SPINE.md
generated: 2026-07-16
---

# Reconcile PRD ↔ Architecture Spine (Fatura a Dois)

## 1. FR coverage (FR-1 .. FR-13)

All 13 FRs appear in the spine's `binds` front-matter and in the Capability → Architecture Map table, each pointing to a module and (mostly) an AD:

| FR | Spine home | Governed by |
| --- | --- | --- |
| FR-1 | `app/(auth)`, middleware | AD-6 |
| FR-2 | `app/(app)/upload`, `server/ingestao` | AD-1 |
| FR-3 | `server/ingestao` | Stack (SheetJS) |
| FR-4 | `server/ingestao` | AD-1 |
| FR-5 | `server/lancamento-matching` | AD-2 |
| FR-6 | `server/ingestao` | — (no AD; acceptable, FR-6 is a workflow, not an invariant) |
| FR-7 | `app/(app)/categorias`, `server/categorizacao` | AD-3 |
| FR-8 | `server/categorizacao` | AD-3 |
| FR-9 | `server/parcelas` | AD-4 |
| FR-10 | `server/categorizacao` | AD-3 |
| FR-11 | `app/(app)/lancamentos`, `server/visualizacao` | — (view-only, no invariant needed) |
| FR-12 | `server/parcelas` | AD-4 |
| FR-13 | `server/parcelas` | AD-4 |

**Verdict: no FR is silently dropped.** FR-6 and FR-11 have no governing AD, but neither is an invariant-worthy concern (FR-6 is a one-time mapping workflow, FR-11 is a read-only aggregation) — the missing "Governed by" is a reasonable "—", not an omission.

## 2. NFR coverage (PRD §7)

| NFR (§7) | Spine home | Verdict |
| --- | --- | --- |
| Login obrigatório (FR-1) | AD-6 | Covered |
| Tráfego sempre em HTTPS | Only appears as an edge label in the Structural Seed diagram (`Browser -->|HTTPS| NextApp`); no AD, no Consistency Convention, no Deferred entry | **Gap** — implicitly true because Vercel forces TLS, but the spine never states this as a decision/rule anyone is bound to |
| Senha nunca armazenada em texto plano | Not mentioned anywhere; implicitly delegated to Supabase Auth by stack choice | **Gap (minor)** — reasonable via stack pick, but not written down as a rule/AD |
| Dados sensíveis protegidos em repouso | Not mentioned anywhere — no AD, no convention, no Deferred entry | **Gap** — this is explicitly flagged in the PRD as "não-negociável," yet the spine has zero artifact addressing at-rest protection (e.g., relying on Supabase's default encryption is never stated as the resolution) |
| Planilha original descartada após extração (uploads bem-sucedidos) | AD-5 | Covered |
| Uploads rejeitados descartam arquivo imediatamente | AD-5 (by extension — AD-5's rule is "XSLX existe somente durante o parsing," which covers both success and failure paths) | Covered |
| Durabilidade — backup regular dos lançamentos estruturados | Not mentioned anywhere — no AD, no convention, no Deployment/Stack note about Supabase backup/PITR configuration | **Gap** — the PRD calls this out precisely because the original file is discarded by design (AD-5), making backup the *only* safety net; the spine implements the discard (AD-5) but never closes the loop on backup |
| Recuperação de senha para as 2 contas | Named only as a folder-tree comment (`(auth)/ # login, recuperação de senha`) | Weak coverage — present as a file-tree annotation, not backed by an AD or convention |
| Plataforma web responsiva ≥360px, sem app nativo | Not addressed (arguably out of architecture-spine scope, belongs to UX spec) | Not a gap for this document type, but flag for UX/reconcile-ux pass |
| Resiliência a mudança de layout do Itaú | Indirectly acknowledged in Deferred ("Staging/CI formal ... revisitar se o parser quebrar com mudança de layout do Itaú") | Covered adequately — PRD itself marks this as a non-committed PM note, not a hard NFR |

## 3. Explicit architecture-deferred items — were they actually resolved?

1. **§7 hosting choice (self-host vs. managed)** — **Resolved, not re-deferred.** Stack table picks Supabase (Postgres + Auth + Storage, "hospedado, gerenciado") and Vercel for hosting/deploy. This is a concrete decision, not left open.
2. **§10 assumption — managed hosting is safer** — **Resolved by implication, but rationale untraced.** The spine acts on the assumption (chooses managed hosting) but contains no AD or note stating *why* — i.e., no explicit line connecting "we picked Vercel+Supabase because it satisfies the non-negotiable security NFRs by default" the way PRD §7 required as a check ("requisito aqui é que a escolha cubra os itens de segurança acima por padrão"). Combined with the at-rest-encryption and HTTPS gaps above, the security justification for this hosting choice is asserted implicitly, not demonstrated.
3. **FR-10 fuzzy-matching algorithm choice** — **Resolved correctly, and appropriately scoped.** AD-3 picks a concrete algorithm (`pg_trgm` trigram similarity, tie-break by most-recently-updated rule), and it's in the Stack table as a real dependency. Only the similarity *threshold* is pushed to the Deferred section ("Algoritmo exato / limiar de similaridade do pg_trgm — valor de threshold é uma decisão de tuning na implementação, não uma invariante"), which is a legitimate implementation-tuning deferral, not a re-defer of the algorithm decision itself.

## 4. Summary of gaps to flag in Finalize

- **Security NFRs not tracked as invariants**: "dados sensíveis protegidos em repouso" and "tráfego sempre HTTPS" have no AD/convention/Deferred entry, despite being called "não-negociável" in the PRD. Recommend adding either an AD (e.g., "AD-7 — transport and at-rest protection rely on Vercel TLS + Supabase default encryption, never re-implemented ad hoc") or at least a Consistency Convention row.
- **Durability/backup NFR silently dropped**: no mention of Supabase backup/PITR strategy anywhere in the spine, even though the PRD explicitly ties this to AD-5's discard-the-original design (the structured rows become the *only* copy of the data).
- **Password recovery / plaintext-password NFRs** are only nominally present (a file-tree comment), not backed by a stated rule.
- **Hosting decision resolved, but the "cover security NFRs by default" check from PRD §7 is not explicitly demonstrated** — worth a one-line AD tying the hosting pick to the security requirement it was supposed to satisfy.
- **FR-10 algorithm choice: confirmed properly resolved** (not a gap) — pg_trgm trigram similarity chosen in AD-3, only the numeric threshold deferred to tuning.
