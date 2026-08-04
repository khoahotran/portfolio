# Architecture Review Prompt Template

**Goal:** Audit or enhance an existing Flagship Project's architecture documentation.

**Required Inputs:**
- Project name (Aegis, Core Banking, QuantAlpha).
- The new feature or pattern being introduced.

**Workflow:**
1. Read `.ai/flagship-projects.md` and the specific `content/projects/*.md` file.
2. If introducing a new pattern, update `.ai/architecture-catalog.md`.
3. Update the Mermaid C4 diagram in the project's Markdown file.
4. Update the text to reflect the new trade-offs.
5. Rebuild search index: `npm run build:search-index`.

**Acceptance Criteria:**
- Mermaid syntax is valid.
- Architectural claims include explicit trade-offs.

**Expected Output:**
Updated Markdown file and updated `.ai/` governance docs.
