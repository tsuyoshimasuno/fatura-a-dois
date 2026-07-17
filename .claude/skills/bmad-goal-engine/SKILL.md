---
name: bmad-goal-engine
description: 'Autonomous orchestrator that drives the BMad planning/implementation pipeline (brief -> PRD -> UX -> architecture -> epics/stories -> dev) toward a stated goal, dispatching each stage headless where possible and only interrupting the user for genuine blockers or at completion. Use when the user wants to give a high-level goal and have BMad work toward it without validating every intermediate step — "goal engine", "orchestrate this", "leva isso até X sem me perguntar cada etapa", "avança sozinho".'
---

# BMad Goal Engine

A goal-engine, not a checkpoint-runner: you take a high-level goal, compute the shortest path through the existing BMad pipeline to get there, and drive it — stage after stage, without pausing at process checkpoints (stakes calibration, working-mode menus, reviewer-gate menus). You only interrupt the user for two reasons: a stage is genuinely **blocked** on information only the user has, or the **goal has been reached** (or the achievable pipeline is exhausted).

This skill does not reinvent BMad's sequencing or its headless behavior — it reuses what already exists:
- `bmad-prd`, `bmad-ux`, `bmad-architecture`, `bmad-brainstorming` already self-detect headless mode when invoked by another skill (see each one's `references/headless.md`) and already return a structured `complete`/`partial`/`blocked` status instead of asking questions.
- `bmad-dev-auto` is already a fully unattended implementation loop (HALT protocol, no backgrounded subagents).
- `bmad-help`'s catalog (`_bmad/_config/bmad-help.csv`) already encodes the phase graph, `preceded-by`/`followed-by` sequencing, `required` gates, and output locations used for completion detection.

This skill's job is narrow: **read the goal, read the catalog and the artifacts on disk, compute a plan, dispatch it stage by stage, and only surface real decisions.**

## Conventions

- Bare paths resolve from skill root; `{skill-root}` is this skill's install dir.
- `{workflow.<name>}` resolves to fields in `customize.toml`'s `[workflow]` table (overrides win per BMad merge rules).
- `{run_workspace}` is this run's bound log folder: `{workflow.output_path}/{workflow.run_folder_pattern}/`.
- Never run a dispatched stage in the background or detached, and never end your turn to "await a completion notification" mid-stage. This workflow runs synchronously in one sitting, the same constraint `bmad-dev-auto` imposes on itself — there is no event loop to resume a yielded turn once you hand control back.

## On Activation

1. Resolve customization: `uv run {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root} --key workflow`. On failure, read `customize.toml` directly and use defaults.
2. Run `{workflow.activation_steps_prepend}`. Load `{workflow.persistent_facts}` as foundational context (entries prefixed `file:` are loaded).
3. Load `{project-root}/_bmad/bmm/config.yaml` (+ `config.user.yaml` if present). Resolve `{user_name}`, `{communication_language}`, `{planning_artifacts}`, `{implementation_artifacts}`, `{project_name}`, `{date}`.
4. Greet `{user_name}` briefly, in `{communication_language}` — one or two sentences, no menu (this skill has none; it's invoked directly). Mention that it's the goal engine: it will drive toward the goal and only interrupt for real blockers.
5. Run `{workflow.activation_steps_append}`.

## Step 1: Goal intake

Treat the invocation prompt as the goal. A goal names either:
- a **target stage/artifact** ("leva o PRD até a arquitetura", "quero os épicos e stories prontos", "implementa a story 3.2"), or
- an **open-ended push** ("avança o quanto der", "continua sozinho a partir daqui").

If the invocation prompt gives genuinely no identifiable target and no existing run to resume (see Step 2), this is the one legitimate up-front blocker: ask the user once, directly, what the goal is. Do not proceed on a guess.

If the invocation names an existing goal-engine run (or one is the only one in `{workflow.output_path}`), treat this as **resume**, not a fresh goal — go to Step 2 already knowing the workspace.

**Every goal statement — the first one and every one that follows across resumes — is a first-class, dated fact, not a one-time setup value.** A run's `goal` frontmatter field is a snapshot of *only the latest* objective; the append-only body is what makes the full history of objectives pursued reconstructable. Never let the two drift apart (see Step 2).

## Step 2: Bind or resume the run workspace

Scan `{workflow.output_path}` for existing run folders. If one matches the current goal/project (by `{project_name}` or explicit user reference):

- **Resume, same objective** (the user is just telling you to keep going on the already-recorded goal — e.g. answering a blocked-protocol question): read its `.memlog.md` to recover the prior plan, completed stages, and any standing open items, and continue the dispatch loop from where it left off. No goal update needed.
- **Resume, new or extended objective** (the user names a next stage, an open-ended push, or anything that isn't simply "continue what was already logged" — e.g. "vamos pro próximo objetivo," "agora avança até X"): this is a **goal change**, and it is logged as one, every time, in both places at once — the frontmatter snapshot and the append-only trail:
  ```
  uv run {project-root}/_bmad/scripts/memlog.py set --workspace {run_workspace} --key goal --value "<new goal statement>"
  uv run {project-root}/_bmad/scripts/memlog.py append --workspace {run_workspace} --type goal --text "<new goal statement> -- <why it changed / what prompted it>"
  ```
  Then re-enter Step 3 to compute the (possibly extended) plan from current state — do not silently keep dispatching against a stale plan built for the old goal.

Otherwise bind a fresh `{run_workspace}` at `{workflow.output_path}/{workflow.run_folder_pattern}/` and seed its memlog:
```
uv run {project-root}/_bmad/scripts/memlog.py init --workspace {run_workspace} --field goal="<goal statement>"
```
Immediately also log it via `memlog.py append --type goal` (not `--type event`) — `init`'s `--field` only seeds the frontmatter snapshot; the dedicated `(goal)`-tagged append is what lets a later reader `grep` the objective trail without wading through every dispatch/override entry. Every subsequent goal change (above) uses the same `--type goal` tag, so the full sequence of objectives pursued in a run is always recoverable by filtering on it alone.

## Step 3: Compute state and plan

Read fully and follow: `references/planning.md`. It produces an ordered list of stage skills to dispatch (each with its intent — create/update/validate — and required upstream inputs) to close the gap between current artifact state and the goal. Log the computed plan to the memlog (`--type decision`) before dispatching anything, so the run is auditable and resumable.

If the plan is empty (goal already satisfied by existing artifacts), skip to Step 5 (Close) immediately — do not dispatch anything.

## Step 4: Dispatch loop

For each stage in the plan, in order:

1. Read fully and follow: `references/dispatch.md` for how to invoke *this category* of stage (native-headless skill / no-native-headless skill via `{workflow.stage_overlay_instruction}` / `bmad-dev-auto` delegation for phase 4).
2. Log the dispatch and its outcome to the memlog (`--type event` for dispatch/result, `--type assumption` for every inferred value the stage reports, `--type override` for any headless-mode decision that deviates from what an interactive run would have asked).
3. Interpret the stage's returned status:
   - **`complete`** (or `partial` with only cosmetic/non-blocking assumptions) → proceed to the next stage in the plan automatically. Do not ask "should I continue?" — that is exactly the checkpoint this skill exists to remove.
   - **`blocked`**, or **`partial` with load-bearing `open_questions[]`** → stop the dispatch loop. Read fully and follow: `references/blocked-protocol.md`. Resume the loop at the same stage once resolved.
4. If a stage without native headless support still halts at a menu despite the overlay instruction (a hardcoded "wait for user input" rule baked into that skill), treat it exactly like a `blocked` status — not a failure — and follow `references/blocked-protocol.md`.

Continue until the plan is exhausted or the goal's target stage is reached.

## Step 5: Close

Stop dispatching. Write a single consolidated summary to the user — not a per-stage recap:
- What was reached (goal met? partially? which stages ran).
- Every artifact produced, with paths.
- Every assumption made along the way (pull from the memlog's `assumption`/`override` entries) — surfaced once, together, not as they happened.
- Anything still open, with what would unblock it.

Log closure: `uv run {project-root}/_bmad/scripts/memlog.py append --workspace {run_workspace} --type event --text "Goal engine run closed: <one-line outcome>"`.

Run `{workflow.on_complete}` if non-empty.

## Explicit non-goals (v1)

- Does not run detached/backgrounded across sessions — this is a single-sitting synchronous driver, same constraint `bmad-dev-auto` already imposes on itself. Running it unattended overnight is a hosting decision (a backgrounded `Agent` call, a scheduled routine) orthogonal to this skill.
- Does not register itself in `_bmad/_config/bmad-help.csv` — that file is installer-managed and treated read-only. Invoke this skill directly by name or trigger phrase.
- Does not force `bmad-create-story` / `bmad-dev-story` / `bmad-sprint-planning` past their own hardcoded interactive halts — phase 4 is delegated wholesale to `bmad-dev-auto`, which doesn't need them to run.
