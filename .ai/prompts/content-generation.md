# Content Generation Prompt Template

**Goal:** Write a new Markdown article for the portfolio.

**Required Inputs:**
- Target collection (`blog`, `research`, `system-design`, etc.)
- Specific topic or title
- Key takeaways or trade-offs to highlight

**Workflow:**
1. Check `.ai/writing-style-guide.md` for tone and formatting templates.
2. Check `.ai/knowledge-graph.md` to find relevant internal links.
3. Draft the Markdown file with YAML frontmatter.
4. If applicable, embed a Mermaid diagram.
5. Rebuild the search index: `npm run build:search-index`.

**Acceptance Criteria:**
- Passes Content Quality Gate (`.ai/quality-gates.md`).
- Frontmatter is valid.
- `npm run build` succeeds.

**Expected Output:**
A committed Markdown file in the appropriate `/content/` directory.
