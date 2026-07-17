# Planning: state detection + plan construction

Reuses `bmad-help`'s own data sources and completion-detection method instead of inventing new sequencing logic — see `.claude/skills/bmad-help/SKILL.md` for the canonical description of this method; this file only adds what's specific to building a dispatchable plan from it.

## Inputs

1. **Catalog**: `{workflow.catalog_path}` (default `_bmad/_config/bmad-help.csv`). Columns: `module,skill,display-name,menu-code,description,action,args,phase,preceded-by,followed-by,required,output-location,outputs`.
2. **Config**: `uv run --python 3.11 {project-root}/_bmad/scripts/resolve_config.py --project-root {project-root}` for `output-location` variables (`planning_artifacts`, `implementation_artifacts`, `project_knowledge`).
3. **Artifacts on disk**: list files under resolved `planning_artifacts` and `implementation_artifacts`.

## Step A: Detect current state

For every row in the catalog with a non-empty `outputs`, check whether matching files already exist at its resolved `output-location` (same fuzzy-match approach `bmad-help` uses). Build a set of **completed stages**. For BMad Method rows specifically, also read enough of each found artifact's frontmatter (`status:` field, where present — `bmad-prd`, `bmad-architecture`, etc. use `status: draft` / `status: final`) to distinguish "exists but still draft" from "finalized." A stage counts as completed for planning purposes only when its artifact's status is final (or the skill has no status concept, e.g. epics/stories — presence of the file is enough there).

## Step B: Resolve the goal to a target stage

Match the goal statement (Step 1 in `SKILL.md`) against the catalog's `display-name`/`skill`/`description` columns. Open-ended goals ("avança o quanto der") resolve to the **furthest `required=true` stage reachable** given what currently exists (i.e. walk phases forward until a required stage's prerequisites aren't yet satisfiable without a decision only the user can make — that becomes the natural stopping point, logged as such, not asked about upfront).

## Step C: Build the ordered stage list

Walk the catalog from the first incomplete stage after the current state to the target, in phase order (`1-analysis` → `2-planning` → `3-solutioning` → `4-implementation`), respecting `preceded-by`. Rules:

- **`required=true` rows**: always included if not yet completed and on the path to the target.
- **`required=false` (optional) rows** — e.g. `bmad-ux`, the `1-analysis` research skills, `bmad-retrospective`: include only when there's a real signal it's needed, and log the reasoning:
  - `bmad-ux`: include if the PRD (once it exists) signals a meaningful UI surface (form-factor, multi-screen navigation, consumer-facing product) — inspect the PRD's Platform/Vision sections once produced, or the brief if that's all that exists yet. Skip for pure API/CLI/backend goals, internal single-screen tools, or when the brief/PRD explicitly scopes out UI complexity.
  - `1-analysis` research skills (`bmad-market-research`, `bmad-domain-research`, `bmad-technical-research`, `bmad-brainstorming`): skip by default unless the goal explicitly asks for research, or `bmad-product-brief`'s own headless run reports it couldn't proceed without domain grounding (a `blocked`/`partial` signal from that stage, not a guess made here).
  - `bmad-retrospective`: only relevant once an epic's stories are fully done; include only if the goal's target is "close out this epic" or later.
- **`bmad-product-brief` vs `bmad-prfaq`**: default to `bmad-product-brief` (gentler, faster) unless the goal or existing artifacts indicate the user is stress-testing an unproven concept — in which case note the alternative exists but don't switch without a signal.
- Stop the walk at the target stage; do not keep planning past it even if further required stages exist beyond it (that's a future run's goal, not this one's, unless the goal was open-ended, in which case the target *is* "as far as reachable").

## Step D: Attach per-stage intent and inputs

For each stage in the built list, determine:
- **intent**: `create` if the stage's artifact doesn't exist yet; `update` if it exists but is not yet final and the plan needs to push it forward; `validate` only if the goal explicitly asks for validation rather than progress.
- **inputs**: paths to the immediate upstream artifact(s) per `preceded-by` (e.g. `bmad-architecture` needs the PRD path, plus the UX doc path if that stage ran).

Output of this file's process: an ordered array of `{skill, intent, inputs[]}` — this is what `SKILL.md` Step 3 logs to the memlog and Step 4 dispatches one entry at a time.
