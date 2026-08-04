# Benchmark Study Prompt Template

**Goal:** Create a reproducible benchmark comparing two or more technologies.

**Required Inputs:**
- The technologies being compared (e.g., PostgreSQL vs Firestore).
- The metric being measured (e.g., Replay Speed, Memory Usage).

**Workflow:**
1. Design the benchmark methodology (how the data was collected).
2. Build a React visualizer in `src/pages/experiments/` to display the results dynamically.
3. Write a `content/experiments/*.md` file detailing the methodology, the hardware/environment, and the final "Lessons Learned."
4. Rebuild search index: `npm run build:search-index`.

**Acceptance Criteria:**
- Passes Interactive Lab and Content Quality Gates (`.ai/quality-gates.md`).
- Must explicitly state the hardware/environment context.

**Expected Output:**
React component and Markdown file.
