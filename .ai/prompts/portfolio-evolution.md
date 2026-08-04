# Portfolio Evolution Prompt Template

**Goal:** Conduct a major strategic upgrade to the portfolio repository.

**Required Inputs:**
- The strategic goal (e.g., "Add a new content section", "Revamp the styling").

**Workflow:**
1. Enter `<planning_mode>` immediately.
2. Read `.ai/portfolio-context.md`, `.ai/content-roadmap.md`, and `.ai/repository-map.md`.
3. Draft an `implementation_plan.md` dividing the work into 2-5 distinct batches.
4. Obtain user approval.
5. Execute the batches sequentially. Update `task.md` along the way.
6. Update the `.ai/` Operating System documents (e.g., Decision Log, Roadmap) if systemic changes were made.
7. Separate feature commits from generated asset commits (`chore(build)`).

**Acceptance Criteria:**
- Passes Technical Quality Gate (`.ai/quality-gates.md`).
- Repository ends in a clean state (`git status` is clean).

**Expected Output:**
A series of clean Git commits reflecting the strategic upgrade.
