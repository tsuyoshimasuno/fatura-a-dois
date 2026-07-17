# Dispatch: invoking one stage

Three categories of stage, dispatched differently. Determine the category from the stage's skill name before invoking.

## Category 1: Native-headless skills

`bmad-product-brief`, `bmad-prd`, `bmad-ux`, `bmad-architecture`, `bmad-brainstorming`. Each has its own `references/headless.md` defining its input/output contract — read that file for the specific one being dispatched if unfamiliar with it (do not assume they're identical; `bmad-prd`'s Update/Validate overrides differ from `bmad-architecture`'s, for instance).

Invoke via the `Skill` tool with `skill: "<stage-skill-name>"` and `args` set to a free-form text payload following that skill's documented headless input contract. At minimum include:
```
headless: true
intent: <create|update|validate>
<the skill's documented input fields — e.g. for bmad-prd Create: a brief path or product spec; for bmad-architecture: the PRD path>
```
These skills also self-detect headless mode from "invocation is from another skill" per their own docs — the explicit `headless: true` is belt-and-suspenders, not strictly required, but always include it for clarity and to satisfy callers whose detection heuristic looks for it literally.

**Read the returned JSON status.** Fields to expect: `status` (`complete`/`partial`/`blocked`), `assumptions[]`, `open_questions[]`, artifact path(s), and (Update only) `conflicts_with_prior_decisions[]`. Treat `conflicts_with_prior_decisions[]` as load-bearing — fold it into the blocked-protocol check even if `status` itself says `partial` rather than `blocked`.

## Category 2: No native headless mode

`bmad-create-epics-and-stories`, `bmad-check-implementation-readiness`, `bmad-sprint-planning`, and any other planning-phase skill invoked without a `references/headless.md` of its own.

Invoke via the `Skill` tool normally (`skill: "<stage-skill-name>"`), but prepend `{workflow.stage_overlay_instruction}` to the `args` payload, followed by the same goal/inputs context a human would have supplied. Example `args`:
```
{workflow.stage_overlay_instruction}

Contexto: <goal, upstream artifact paths>
```

These skills do not return a structured JSON status — read their final message and the artifact(s) they produced instead:
- If the skill completed and produced/updated the expected artifact without stopping at a menu: treat as `complete`.
- If the skill's own text shows it paused waiting for a menu selection or confirmation (some of these have a hardcoded "halt and wait" rule — e.g. `bmad-check-implementation-readiness` step files explicitly say "halt at menus and wait for user input") despite the overlay instruction: treat this exactly like a `blocked` status. This is expected friction for this category, not a malfunction — go to `blocked-protocol.md` rather than retrying the same call.

## Category 3: Phase 4 (implementation) — delegate to `bmad-dev-auto`

Do not attempt to drive `bmad-create-story` / `bmad-dev-story` / `bmad-code-review` individually through the overlay approach — `bmad-dev-auto` already exists specifically to run this loop unattended and reads planning/implementation artifacts directly (see its `step-01-clarify-and-route.md`: it derives epic/story context itself, no `bmad-sprint-planning` output strictly required).

For each story still needed toward the goal:
1. Invoke `Skill` with `skill: "bmad-dev-auto"`, `args` naming the specific story/epic intent (e.g. "implementa a próxima story do épico 3" or a specific story ID if the goal named one).
2. `bmad-dev-auto` is synchronous and self-halting by its own design — never invoke it with `run_in_background`. Wait for its HALT result in the same turn.
3. Read its final `status` (from its output file or frontmatter per its own HALT protocol). `done`/equivalent success → loop to the next story. `blocked` → go to `blocked-protocol.md`, treating `bmad-dev-auto`'s reported blocking condition as the open item to resolve with the user.
4. Stop this category's loop when the goal's target story/epic is reached, or when `bmad-dev-auto` reports no further story is ready to pick up.

## Logging every dispatch

Regardless of category, before moving to the next stage log to `{run_workspace}/.memlog.md`:
- `--type event` — "Dispatched <skill> (<intent>) -> <status>"
- `--type assumption` — one entry per item in the stage's `assumptions[]` (Category 1) or per inferred value you can identify from its output (Category 2/3)
- `--type override` — any point where headless/overlay behavior made a call an interactive run would have surfaced as a menu choice (e.g. "assumed Fast path", "skipped Reviewer Gate menu, ran gate quietly")
