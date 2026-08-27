# Benchmark Study Prompt Template

**Goal:** Create a reproducible benchmark comparing two or more technologies.

**Required Inputs:**
- The technologies being compared (e.g., PostgreSQL vs Firestore).
- The metric being measured (e.g., Replay Speed, Memory Usage).

**Workflow:**
1. Design the benchmark methodology (how the data was collected).
2. **Commit the harness before the visualizer.** Put the runnable code under `benchmarks/<name>/`
   and write its raw output to a JSON file the lab imports. A lab that reads a committed results
   file is reproducible; an inline `DATASET` constant is an assertion the reader cannot check.
3. Build a React visualizer in `src/pages/experiments/` that imports that results file.
4. Declare `provenance: { kind: 'measured', environment, measuredOn, harness, caveat? }` in
   `src/labs/registry.ts`. If you did not actually run it, the kind is `model`, not `measured` —
   see `src/labs/provenance.ts`.
5. Write a `content/experiments/*.md` file detailing the methodology, the hardware/environment, and
   the final "Lessons Learned." The article's stated environment and the lab's `environment` must
   agree; they are read side by side.
6. Rebuild search index: `npm run build:search-index`.

**Acceptance Criteria:**
- Passes Interactive Lab and Content Quality Gates (`.ai/quality-gates.md`).
- Must explicitly state the hardware/environment context.
- Must state what is missing as well as what was measured. An unpublished harness, an unrecorded
  host, or a single run is not a reason to omit the benchmark — it is a reason to say so in
  `caveat`. Overstating a measurement is the failure mode that costs the most credibility, and the
  audience for this portfolio is exactly the audience that checks.

**Expected Output:**
Harness + committed raw results, React component, registry entry with provenance, and Markdown file.
