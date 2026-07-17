# Blocked protocol: batching and resolving real interruptions

This is the *only* place in the whole run where stopping to ask the user is correct — everything else in the dispatch loop is designed to avoid it. Use it deliberately, not defensively: a stage that merely made a reasonable inference is not blocked.

## When this triggers

- A dispatched stage returned `status: blocked`.
- A dispatched stage returned `status: partial` with `open_questions[]` that are load-bearing (would change scope, contradict a prior decision, or make the artifact unsafe for the next stage to consume) — not cosmetic gaps a downstream stage can absorb.
- A Category 2 skill halted at a hardcoded menu despite the overlay instruction.
- A Category 1 skill's `conflicts_with_prior_decisions[]` is non-empty.
- `bmad-dev-auto` HALTed with `status: blocked`.

## What to do

1. **Log the block first**: `memlog.py append --workspace {run_workspace} --type override --text "<stage> blocked: <reason>"` before doing anything else — the run must be resumable even if the user doesn't answer right away.
2. **Collect, don't drip-feed.** If more than one open item is pending (rare, but possible if a stage surfaced several `open_questions[]` at once), present them together in a single interruption — never ask one, wait, ask the next.
3. **Ask precisely.** Use `AskUserQuestion` when the open item has a finite, enumerable set of resolutions (mirrors how `bmad-prd`'s own Discovery phase asks); use direct text for open-ended information gaps (a fact only the user knows, a judgment call with no clean option set).
4. **Never restate the whole interactive flow.** The point of this protocol is a surgical question, not falling back to running the blocked stage interactively end-to-end. Ask exactly what's needed to unblock, nothing more.
5. **Apply the answer and resume the same stage** — re-invoke it with `intent: update` (Category 1) or re-run with the answer folded into the `args` context (Category 2), or re-invoke `bmad-dev-auto` with the blocking condition resolved (Category 3). Do not advance to the next planned stage until the current one clears blocked.
6. **Log the resolution**: `memlog.py append --type decision --text "<what the user decided, and why>"`.
7. **Resume `SKILL.md` Step 4** at the same stage.

## What this protocol is not for

- Process checkpoints the invoked skill would normally surface interactively (stakes calibration, working-mode choice, reviewer-gate menus) — those are exactly what headless/overlay mode already suppresses. If one of these leaks through as a "blocker," that's a signal the overlay instruction needs strengthening for that skill, not a real interruption — note it in the memlog as a rough edge and answer it yourself with the most conservative reasonable default, then continue.
- "Should I proceed to the next stage?" — never ask this; `SKILL.md` Step 4 already says to proceed automatically on `complete`/non-blocking `partial`.
