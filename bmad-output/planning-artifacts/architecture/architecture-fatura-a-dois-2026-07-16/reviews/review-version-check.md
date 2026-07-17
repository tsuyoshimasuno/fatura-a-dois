# Review — Version/Reality Check (Reviewer Gate: web-researched vs asserted)

**Target:** `ARCHITECTURE-SPINE.md` → `## Stack` table
**Date of review:** 2026-07-16
**Lens:** every named technology/version must be confirmed live via web search, not asserted from training data.

## Verdict: CHANGES REQUESTED

Most entries hold up. One entry (**TypeScript 5.x**) is materially stale and reads as a training-data assertion rather than a checked fact. Two more entries (**SheetJS/xlsx**, **pg_trgm on Supabase**) are technically "current" but hide a real, currently-open risk that the spine's one-line Stack table doesn't surface — and since both sit directly under invariants (AD-3, AD-5, the upload/parse path), that risk belongs in the architecture, not just in this review.

---

## Item-by-item findings

### 1. Next.js (App Router) 16.2 — CONFIRMED, current

- 16.2 is genuinely the current stable line as of mid-July 2026. 16.3 exists only as a preview series (three preview posts dated June 25/26/29, 2026); no stable 16.3 has shipped yet. So "16.2" is not stale — it's the right call, not a training-data guess.
- Minimum Node requirement for the Next.js 16 line is Node ≥20.9.0. Node 24 (spine's pick) comfortably satisfies this. Fits together correctly.

Sources: [Next.js 16.2](https://nextjs.org/blog/next-16-2), [Next.js 16.3: Turbopack](https://nextjs.org/blog/next-16-3-turbopack), [Next.js EOL/version tracker](https://eosl.date/eol/product/nextjs/), [Upgrading: Version 16](https://nextjs.org/docs/app/guides/upgrading/version-16)

### 2. Node.js 24 (LTS) — CONFIRMED, current and well-chosen

- Node 24 entered Active LTS and is the current Active LTS line through 2026 (transitions toward Maintenance later in 2026, full EOL April 2028). Node 26 is the current "odd/Current" release, correctly *not* chosen for a production app. Good, checked choice.

Sources: [Node.js 24 Becomes LTS — NodeSource](https://nodesource.com/blog/nodejs-24-becomes-lts), [Node.js releases](https://nodejs.org/en/about/previous-releases), [endoflife.date/nodejs](https://endoflife.date/nodejs)

### 3. TypeScript 5.x — FLAGGED: stale, looks asserted not researched

- **This is wrong for July 2026.** TypeScript 6.0 shipped ~March 2026, and **TypeScript 7.0 reached general availability on July 8, 2026** — a week before this spine's creation date — as the Go-native compiler rewrite (claimed 8–12x faster builds). "5.x" was the latest major during the assistant's training window, which is exactly the failure mode this review lens exists to catch: an unresearched, training-data-shaped assertion.
- This isn't just a cosmetic version bump: TS 7.0 is a different compiler implementation (Go, not the old JS-hosted tsc), so "5.x" vs "7.x" is a real compatibility/tooling delta (editor plugins, ts-node-style tooling, build scripts) that an implementer would hit immediately.
- **Action:** update the Stack table to a real, current TypeScript line (6.x or 7.x) and note whether the ecosystem (Next.js 16.2, Drizzle Kit) has caught up to TS 7's new compiler, since some tools reportedly lag (per search: Vue/Svelte tooling cited as not yet compatible with TS 7 as of its GA week — worth a similar check against this project's toolchain, e.g. `@types/node`, eslint-plugin configs).

Sources: [Announcing TypeScript 7.0 — official devblog](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/), [TypeScript 7 Now Stable — TechTimes](https://www.techtimes.com/articles/320049/20260710/typescript-7-now-stable-10-faster-builds-not-vue-svelte-yet.htm), [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)

### 4. Supabase (Postgres + Auth + Storage) — CONFIRMED, current, no red flags

- Actively maintained, mainstream managed Postgres/Auth/Storage platform; nothing suggesting deprecation or instability. Reasonable choice for a 2-user personal app. No further version pinning needed since it's "hospedado, gerenciado."

### 5. Drizzle ORM + Drizzle Kit — CONFIRMED current, but a real Supabase gotcha is missing from the spine

- Drizzle ORM/Kit are active (2026 releases include drizzle-kit MCP server, SQLite migration-tree merging, etc.) — no deprecation risk. Neither package pins an `engines.node` minimum, so Node 24 is not a conflict.
- **Missing note, not a version problem:** Supabase's pooled connection (Supavisor, and the paid Dedicated Pooler/PgBouncer) runs in transaction mode by default, which does **not** support prepared statements. Drizzle's Postgres driver uses prepared statements unless you explicitly pass `prepare: false`. This is a well-documented, currently-live gotcha (Supabase's own Drizzle guide calls it out) that will break queries silently/loudly if missed. The spine's Deployment section says "Drizzle... aplicadas manualmente antes de cada deploy" but never states which connection string (direct vs. pooled) the app uses at runtime, nor the `prepare: false` requirement.
- **Action:** add one line to Stack or Deployment: which Supabase connection (direct vs. Supavisor pooled) the app uses at runtime, and that `prepare: false` must be set if pooled.

Sources: [Drizzle ORM - Supabase](https://orm.drizzle.team/docs/connect-supabase), [Supabase Docs: Drizzle](https://supabase.com/docs/guides/database/drizzle), [Supavisor FAQ](https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI)

### 6. SheetJS (`xlsx`) "atual" — FLAGGED: the word "atual" hides an active security trap

- The public **npm registry package `xlsx` is stuck at 0.18.5**, last published years ago — effectively abandoned on npm. It carries **two unpatched high-severity vulnerabilities**: Prototype Pollution (CVE-2023-30533) and a ReDoS, both exploitable via a **crafted spreadsheet file being parsed** — which is *exactly* this app's threat model (FR-2/FR-3: parsing user-uploaded XLSX).
- The patched/maintained versions (0.19.3+ fixing the CVE, current 0.20.3) are **only distributed via `cdn.sheetjs.com`**, not npm. A team that does `npm install xlsx` — the obvious, default action implied by "atual" — gets the vulnerable, abandoned version.
- This directly touches **AD-5** ("arquivo original nunca sobrevive além do parsing") — the parsing step is the attack surface, and the spine currently has zero mention of which xlsx distribution channel to use or a vulnerability-scanning note.
- **Action:** Stack table entry should say something like: `SheetJS (xlsx) — via cdn.sheetjs.com (0.20.x), NOT the abandoned npm "xlsx" 0.18.5 package (CVE-2023-30533)`. This is a decision that materially affects security posture, not a cosmetic detail.

Sources: [CVE-2023-30533 — Snyk](https://security.snyk.io/vuln/SNYK-JS-XLSX-5457926), [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6), [SheetJS CVE-2023-30533 advisory](https://cdn.sheetjs.com/advisories/CVE-2023-30533), [npm xlsx package page](https://www.npmjs.com/package/xlsx), [SheetJS NodeJS install docs](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)

### 7. Postgres extension `pg_trgm` — CONFIRMED to exist/built-in, but a Supabase-specific open bug is directly relevant to AD-3 and was not surfaced

- `pg_trgm` is indeed a standard built-in Postgres contrib extension (real, current, in the Postgres 18 docs). That much is fine.
- However, there is an **open, unresolved Supabase GitHub issue (#30503)**: enabling `pg_trgm` on Supabase does not reliably expose `similarity(text, text)` — queries fail with `42883: function similarity(text, text) does not exist` even though the extension shows as enabled in `pg_extension`, while the same Postgres version works fine locally. Search turned up no confirmation this was fixed as of 2026.
- **AD-3 is the categorization authority invariant** and explicitly names `similarity()` as the mechanism ("trigram similarity (`pg_trgm`, `similarity()`) sobre estabelecimento normalizado"). If this Supabase-specific bug (or a variant of it) is still live, the core categorization mechanism the whole architecture is built around may not work out of the box on the chosen host.
- **Action:** before treating AD-3 as settled, do a throwaway spike — enable `pg_trgm` on the actual target Supabase project and confirm `SELECT similarity('a','b')` works — rather than assuming "built-in Postgres" is sufficient. If it reproduces, the workaround (schema-qualifying the function, e.g. `public.similarity(...)`, or re-enabling via SQL rather than dashboard) should be captured as a note near AD-3.

Sources: [Issue #30503 — supabase/supabase](https://github.com/supabase/supabase/issues/30503), [pg_trgm — PostgreSQL 18 docs](https://www.postgresql.org/docs/current/pgtrgm.html), [Supabase Postgres Extensions overview](https://supabase.com/docs/guides/database/extensions)

### 8. Vercel — CONFIRMED for Next.js 16 support; Node 24 runtime selection not explicitly confirmed

- Vercel's own docs confirm first-class/zero-config support for Next.js (App Router, Server Actions, Middleware, PPR, etc.) as of 2026. No deprecation concern.
- Search did **not** turn up an explicit, current confirmation that Node.js 24 is an available "Node.js Version" option in Vercel project settings today (Vercel has historically lagged a bit behind brand-new Node majors before adding them as a selectable runtime). This is a minor gap, not a contradiction — worth a 30-second manual check in the actual Vercel dashboard before treating "Node 24" as guaranteed available at deploy time, since if it isn't yet selectable, the project would silently run on whatever Vercel's current default is instead.

Sources: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel Functions docs](https://vercel.com/docs/functions), [Vercel Functions runtimes](https://vercel.com/docs/functions/serverless-functions/runtimes)

---

## Summary table

| Stack entry | Status | Severity |
| --- | --- | --- |
| Next.js 16.2 | Confirmed current | — |
| Node.js 24 LTS | Confirmed current | — |
| TypeScript 5.x | **Stale — real current is TS 6.x/7.x (7.0 GA July 8 2026)** | High |
| Supabase | Confirmed, no issue | — |
| Drizzle ORM/Kit | Confirmed current; missing pooling/`prepare:false` note | Medium |
| SheetJS `xlsx` "atual" | Ambiguous — hides abandoned/vulnerable npm package vs. maintained CDN package | High |
| `pg_trgm` | Confirmed built-in, but open Supabase-specific bug directly threatens AD-3 | Medium-High |
| Vercel | Confirmed for Next.js 16; Node 24 runtime availability not explicitly confirmed | Low |

## Recommendation

Do not block on Next.js/Node/Supabase/Vercel — those are genuinely checked and current. Before promoting this spine out of the Reviewer Gate:
1. Fix the TypeScript version to reflect reality (6.x/7.x), or explicitly justify staying on 5.x if there's a deliberate compatibility reason (e.g., a dependency not yet TS7-ready) — but that justification needs to be stated, not silently defaulted to training-data-era "5.x."
2. Make the SheetJS entry explicit about distribution channel (cdn.sheetjs.com vs. abandoned npm package) given the CVE directly matches this app's upload/parse attack surface.
3. Add a one-line note near AD-3 or in Deployment about verifying `pg_trgm`'s `similarity()` actually resolves on the target Supabase project, given the open upstream issue.
4. Add the Drizzle `prepare: false` / pooling note if the app will run through Supabase's pooled connection on Vercel serverless.
