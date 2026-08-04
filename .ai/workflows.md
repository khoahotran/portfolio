# Standard Workflows

This document defines the standard operating procedures for an AI agent performing routine tasks in this repository. 

## Add New Article Workflow
**Inputs:** Topic, target collection (e.g., `blog`, `system-design`), key takeaways.
**Steps:**
1. Check `search-index.json` or `.ai/content-roadmap.md` to ensure the topic doesn't already exist.
2. Draft the content in a temporary scratchpad using the structure from `.ai/writing-style-guide.md`.
3. Create a Markdown file in the appropriate `/content/` subfolder (e.g., `/content/system-design/YYYY-MM-DD-my-topic.md`).
4. Ensure valid YAML frontmatter is present.
5. Embed any necessary Mermaid diagrams following `.ai/visualization-guide.md`.
**Validation:** Run `npm run build:search-index` and `npm run build`.
**Expected Outputs:** A committed Markdown file and updated search index.

## Create Interactive Lab Workflow
**Inputs:** The technical concept to simulate or benchmark (e.g., Rate Limiting).
**Steps:**
1. Design the UI on a whiteboard/scratchpad. Avoid complex dependencies; use native SVG or standard HTML/CSS.
2. Create `src/pages/experiments/MyNewLabPage.tsx`.
3. Build the stateful React component.
4. Register the route in `src/App.tsx`.
5. Create a companion Markdown file `content/experiments/my-new-lab.md` to explain the methodology and provide a button linking to the route.
**Validation:** Run `npm run typecheck && npm run lint`.
**Expected Outputs:** The React component, route registration, and the companion Markdown file.

## Update Flagship Project Workflow
**Inputs:** The new architectural pattern or feature to add to an existing flagship project.
**Steps:**
1. Read the existing flagship project Markdown file (e.g., `content/projects/aegis.md`).
2. Read `.ai/flagship-projects.md` for context.
3. Apply the changes, ensuring you update the Mermaid C4 diagrams if the architecture changed.
4. Update `.ai/flagship-projects.md` and `.ai/architecture-catalog.md` if new patterns were introduced.
**Validation:** Ensure no broken links or orphaned diagrams exist.
**Expected Outputs:** Updated content file and updated `.ai/` governance docs.

## Portfolio Enhancement Workflow
**Inputs:** A broad mandate to improve the portfolio (e.g., "Make it more Staff-level").
**Steps:**
1. Start with `<planning_mode>`. Do not write code immediately.
2. Audit the entire `.ai/` directory and `content/` folders.
3. Propose a batch of changes in `implementation_plan.md`. Wait for user approval.
4. Execute the plan strictly in batches.
5. Upon completion, group the git commits logically, isolating generated assets (`public/`) into a separate `chore(build)` commit.
**Validation:** `npm run typecheck && npm run lint && npm run build`.
**Expected Outputs:** 2-5 clean Git commits representing a meaningful milestone.
