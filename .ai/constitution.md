# AI Constitution

These are the immutable rules of engagement for all AI agents operating in this repository. Violating these rules degrades the quality of the portfolio and causes context fragmentation.

## 1. General Rules
- **Preserve Consistency:** Match the existing technical depth, tone, and architectural complexity. Do not simplify concepts unless requested.
- **Avoid Duplicate Content:** Before writing a new article or lab, check `search-index.json` or existing `content/` files to ensure it doesn't already exist.
- **Maintain Architecture:** Do not rip out the custom Content Engine, Vite, or React configurations without an explicit ADR and approval.
- **Do Not Break Functionality:** If you touch React components or the markdown engine, it must compile successfully.

## 2. Execution Rules
- **Audit Before Implementation:** Always read the relevant `.ai/` files and source code before starting a change.
- **Plan Before Execution:** Use `<planning_mode>` for any architectural change, new flagship project, or complex benchmark lab. Wait for approval.
- **Work in Batches:** Group logical changes (e.g., Narrative, Visuals, Labs). Do not leave half-finished components hanging.
- **Continuously Update Progress:** Update `task.md` or the user as you complete milestones.

## 3. Documentation Rules
- **Maintain Portfolio Narrative:** The author is an early-career backend/distributed-systems engineer
  who writes with senior-level rigor — see `.ai/portfolio-context.md` "Career Stage". Write in a
  professional, first-person plural ("we") or authoritative first-person singular ("I") as defined in the
  `writing-style-guide.md`. Never claim a seniority title, years of experience, or team leadership the
  timeline does not support.
- **Preserve Writing Style:** High-signal, low-noise. Use Mermaid diagrams over walls of text.
- **Maintain Cross-links:** When a new concept is introduced, link it to existing articles (e.g., `[Core Banking](/projects/core-banking)`).
- **Update Related Documents:** If you change a project's architecture, update `.ai/flagship-projects.md` and `.ai/architecture-catalog.md`.

## 4. Code Quality Rules
- **No Unnecessary Complexity:** Avoid adding heavy npm dependencies (e.g., D3.js) if a simpler alternative exists (e.g., Mermaid.js or native SVG).
- **Prefer Readability:** Code in `/src` must be clean, typed, and well-structured. No `any` types in TypeScript.
- **Remove Dead Code:** Clean up unused imports, components, and CSS.
- **Avoid Regressions:** Do not break the UI layouts, dark mode, or mobile responsiveness.

## 5. Verification Rules
Always verify your changes before ending a session:
```bash
# Verify TypeScript
npm run typecheck

# Verify Code Style
npm run lint

# Rebuild search index (if content changed)
npm run build:search-index

# Verify production build
npm run build
```

## 6. Prohibited Actions
- **NEVER** push automatically.
- **NEVER** rewrite git history (rebase/amend) without explicit approval.
- **NEVER** create duplicate articles or overlapping concepts without resolving the original.
- **NEVER** ignore failing checks. If `typecheck` fails, you must fix it before proceeding.
- **NEVER** commit generated artifacts (`public/search-index.json`, `public/og/`, `public/feeds/`) in standard feature commits. They belong in a dedicated `chore(build)` commit.
