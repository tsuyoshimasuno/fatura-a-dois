---
title: Input Reconciliation — Brief vs PRD (Fatura a Dois)
step: Finalize → Input Reconciliation
source_input: bmad-output/planning-artifacts/briefs/brief-fatura-a-dois-2026-07-14/brief.md
target_prd: bmad-output/planning-artifacts/prds/prd-fatura-a-dois-2026-07-14/prd.md
generated: 2026-07-16
---

# Reconciliation: brief.md → prd.md

## Method

Read both documents in full. Brief sections checked against PRD §0–§10 section by section:
Resumo Executivo / Problema / Solução / Quem Isso Serve / Critérios de Sucesso / Escopo /
Considerações de Segurança / Visão, cross-referenced against PRD §1 Visão, §2 Usuários-Alvo,
§4 Features (FR-1..FR-13), §5 Não-Objetivos, §6 Escopo do MVP, §7 NFRs, §8 Métricas,
§10 Índice de Suposições.

## Known, Already-Accepted Divergence (not reported as a gap)

- Brief: upload source is a **PDF** bank statement (Itaú fatura).
- PRD: upload source is an **XLSX** export from Itaú (§1, FR-2, FR-3, NFR §7).
- This is an intentional, user-corrected supersession from the second correction round. PRD's
  FR-2 even explicitly rejects PDF uploads with a clear error message — correct behavior given
  the correction. Not a gap.

## Explicit Check Requested: Non-Goals Still Respected

Brief's Visão section frames "orçamentos por categoria com alertas" (budgets with alerts) and
"suporte a mais de um banco" (multi-bank support) as **future-only, explicitly out of scope now**.

Verified in PRD:
- §5 Não-Objetivos: "O app não vai ter orçamentos com metas/alertas nesta fase (ver §Visão de
  crescimento no brief)" — present, correctly deferred, cites the brief.
- §5 Não-Objetivos: "O app não vai suportar múltiplos bancos ou formatos de fatura nesta fase" —
  present, correctly deferred.
- §6.2 Fora do Escopo do MVP: both items repeated ("Orçamentos com metas/alertas — natural passo
  seguinte, não é o pedido original"; "Múltiplos bancos/formatos — ver §5").

**Result: both non-goals are still respected and were not accidentally reintroduced anywhere in
FRs, Jobs-To-Be-Done, or NFRs.** No gap here.

## Gaps Found

### Gap 1 — Hosting-provider assumption from the brief's Segurança section is dropped

**Brief (§Considerações de Segurança):**
> `[ASSUMPTION: um provedor gerenciado (ex.: Vercel/Railway) tende a ser mais seguro na prática
> que self-host para quem não tem experiência em segurança, por cobrir patches e TLS por
> padrão — a arquitetura deve avaliar isso.]`

This is a concrete, actionable piece of guidance explicitly earmarked for the architecture phase.

**PRD (§7 NFRs Transversais, Hospedagem):**
> "decisão de self-host vs. provedor gerenciado fica para a fase de arquitetura; requisito aqui é
> que a escolha cubra os itens de segurança acima por padrão."

The PRD keeps the *decision deferral* but drops the *specific recommendation and its rationale*
(managed provider likely safer for a non-security-expert couple, because it covers patching/TLS
by default). It is also absent from the PRD's own Índice de Suposições (§10), which otherwise
faithfully carries forward other brief-inherited assumptions (e.g., the mobile-web assumption is
explicitly tagged "herdado do brief" in §7 and indexed in §10). This one assumption was not
carried through either channel.

**Why it matters:** the architecture phase will read the PRD without this steer and may treat
self-host vs. managed as a neutral tradeoff, when the brief's author (the couple, via the analyst)
had already formed a leaning and a reason for it.

### Gap 2 — The "we lack security expertise, so these are non-negotiable" framing is flattened

**Brief (§Considerações de Segurança):**
> "o casal reconhece isso mas não tem bagagem técnica de segurança para decidir sozinho as
> ferramentas... aqui fica registrado que é um requisito real, não um 'nice to have'."

This framing does two things the PRD's version doesn't: (a) explains *why* the requirements are
strict (the couple is consciously delegating security judgment because they can't self-assess it),
and (b) uses "não-negociável" / "não um nice-to-have" as an explicit severity marker.

**PRD (§7 NFRs Transversais):** states the same four requirements (login, HTTPS, encryption at
rest, no long-term retention of the original file) matter-of-factly, without the "couple defers to
you because they can't evaluate this themselves" framing or the non-negotiable emphasis.

**Why it matters:** this is exactly the kind of tone/emphasis an FR-driven PRD structure tends to
silently normalize away — the requirements survived, but the *reason they're immovable* and the
*trust relationship* behind them (couple → downstream phases) did not. A later phase skimming NFRs
could deprioritize one of these under time pressure without knowing the couple explicitly flagged
them as non-negotiable BECAUSE they can't judge alternatives themselves.

### Gap 3 — Problem framing narrows from "joint financial decision-making" to "time efficiency"

**Brief (§O Problema):**
> "O custo do status quo é baixa visibilidade financeira conjunta — **decisões de gasto e
> orçamento são tomadas sem dados organizados**, e surpresas de fatura... só aparecem quando a
> fatura já fechou."

The brief frames the core stakes as a couple's *shared financial decision-making* being degraded
by lack of visibility — this is a relational/trust framing, not just an inconvenience.

**PRD (§1 Visão):**
> "O ganho não é 'mais um app de finanças' — é substituir 'abrir o PDF e vasculhar' por uma leitura
> de poucos minutos, mês após mês, sem surpresa quando a próxima fatura fechar."

The PRD's reframing is almost entirely about time/effort savings ("poucos minutos", "sem esforço
manual"). The installment-surprise angle survives (via UJ-2, "decide a compra com o número real na
frente"), but the broader claim from the brief — that *spending and budget decisions themselves*
are currently being made on bad data — doesn't resurface anywhere in the PRD's Vision, JTBD, or
Success Metrics. This is a plausible casualty of the FR-driven structure: efficiency is easy to
turn into testable FRs, "better joint decisions" is not, so it got quietly dropped rather than
translated.

### Gap 4 — Brief's baseline comparison ("no process at all today") is not restated as a success framing

**Brief (§Critérios de Sucesso):**
> "...sinal de que o processo de upload + revisão de categoria é mais prático do que a situação
> atual, **que é nenhum processo: só abrir o PDF e conferir manualmente**."

The brief explicitly names the baseline being beaten as "no process at all" — a qualitative anchor
for what "success" is being measured against.

**PRD (§8 Métricas de Sucesso):** keeps "uso contínuo... mais prático que abrir a planilha
manualmente" (first bullet) but drops the sharper framing that the current state is literally
*zero process*, not a worse process. Minor, but it's the kind of detail that clarifies expectations
(e.g., for a future evaluator judging whether the app "succeeded") and was smoothed away in
translation to metric-speak.

## Summary Table

| # | Gap | Severity | Where it should probably land if reincorporated |
|---|-----|----------|---------------------------------------------------|
| 1 | Managed-hosting-safer assumption dropped | Medium — actionable architecture input lost | PRD §7 Hospedagem + §10 Índice de Suposições |
| 2 | "Non-negotiable because we can't judge it ourselves" framing dropped | Medium — explains WHY NFRs are strict | PRD §7 NFRs Transversais intro |
| 3 | "Joint financial decision-making" framing narrowed to "time efficiency" | Low-Medium — tone/emphasis, not a functional gap | PRD §1 Visão |
| 4 | "Baseline is zero process" framing dropped from success criteria | Low — minor qualitative anchor | PRD §8 Métricas de Sucesso |

No brief requirement was found to be entirely absent from the PRD's FRs, Non-Goals, or NFRs — all
functional and security requirements from the brief have a corresponding home in the PRD. The gaps
above are about dropped qualitative framing/assumptions, not missing functionality.
