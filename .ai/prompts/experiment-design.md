# Experiment Design Prompt Template

**Goal:** Create a new Interactive React Laboratory.

**Required Inputs:**
- The concept to simulate (e.g., Retry Backoff, Token Bucket).
- The state parameters the user should be able to manipulate.

**Workflow:**
1. Check `.ai/visualization-guide.md` for interactive lab standards.
2. Build the React component in `src/pages/experiments/`.
3. Register the route in `src/App.tsx`.
4. Create the companion Markdown file in `content/experiments/` so it is indexed.
5. Link to the lab from the Markdown file.
6. Rebuild search index: `npm run build:search-index`.

**Acceptance Criteria:**
- Passes Interactive Lab Quality Gate (`.ai/quality-gates.md`).
- `npm run typecheck` and `npm run lint` pass.
- No heavy external dependencies used.

**Expected Output:**
React component, App route, and Markdown file committed.
