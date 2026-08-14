# Decision Log

This log captures major repository-level decisions that dictate the architecture of the portfolio itself (not the projects it showcases).

## Decision 1: Custom JAMstack over Next.js
**Date:** 2026-06-25
**Decision:** Built a custom static site generator using Vite, React, and `import.meta.glob` instead of using a heavy framework like Next.js or Astro.
**Rationale:** The portfolio only needs client-side routing and static markdown parsing. Introducing Next.js SSR would require a Node server or complex static export configurations. Vite offers lightning-fast HMR and a minimal footprint.
**Consequences:** We must manually manage SEO (via `react-helmet-async` or similar) and we had to write our own `build-search-index.mjs` script to generate sitemaps and search indexes.

## Decision 2: Mermaid for Architecture Diagrams
**Date:** 2026-06-26
**Decision:** Standardized on Mermaid.js embedded within Markdown code blocks for all architecture diagrams.
**Rationale:** Traditional images (PNG/SVG exported from Draw.io or Excalidraw) are impossible to version control natively and difficult for AI agents to update. Mermaid charts are pure text, making them trivial to diff, update, and maintain.
**Consequences:** We are constrained by Mermaid's layout engine, which can sometimes be finicky with spacing or complex nested subgraphs.

## Decision 3: Separation of Generated Artifacts in Git
**Date:** 2026-06-28
**Decision:** Generated assets (`public/search-index.json`, `public/og/`, `public/feeds/`, `public/sitemap.xml`) must be committed separately from feature code, typically in a `chore(build)` commit.
**Rationale:** Bundling thousands of lines of auto-generated JSON or XML changes into a `feat(content)` commit obscures the actual Markdown changes, making code reviews and history tracking impossible.
**Consequences:** AI agents must explicitly exclude these files from feature commits and follow up with a dedicated chore commit.

## Decision 4: Split the Generated Index into a Lean and a Full Artifact
**Date:** 2026-08-11
**Decision:** `build-search-index.mjs` now emits `content-index.json` (every field except `searchableText`) alongside the original `search-index.json` (which also includes `searchableText`, i.e. the full article body). List pages, detail pages, related-articles, and prev/next all fetch the lean file; only `/search` fetches the full one.
**Rationale:** `search-index.json` embeds every article's full body so Fuse.js can full-text search it. Measured on the 33-document corpus: 252 KB whole vs 24 KB without `searchableText`. Every route other than `/search` was downloading that whole 252 KB just to render title/date/summary cards.
**Consequences:** Two generated JSON files now need pruning/regenerating together — `build-search-index.mjs` writes both in one pass, so this is automatic. Any future consumer that only needs list-page fields should fetch `content-index.json`, not `search-index.json`.
