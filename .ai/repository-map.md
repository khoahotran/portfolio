# Repository Map

A high-level map of the portfolio's architecture and ownership.

## Root Directories

### `/.ai/`
**Purpose:** The AI Operating System. Contains all governance, context, and prompts required for AI agents to operate consistently. This is the source of truth.

### `/content/`
**Purpose:** The raw Markdown files that power the portfolio's articles and case studies. 
- `/projects/`: Long-form architectural deep dives of the Flagship Projects. Listed at `/projects`.
- `/blog/`: Engineering narratives and storytelling.
- `/research/`: Technical explorations and ADRs.
- `/system-design/`: System design notes and diagrams.
- `/field-notes/`: Pragmatic, boots-on-the-ground engineering lessons.
- `/experiments/`: Standalone write-ups (methodology, benchmarks, comparisons). Several also
  link out to an interactive lab at `/labs/<id>` via a CTA button — see `/src/labs/`. The
  article and the lab are two separate routes; an article's slug and a lab's id may be the
  same string without colliding (`/experiments/:slug` and `/labs/:id` are disjoint paths).

### `/src/`
**Purpose:** The React + TypeScript frontend codebase (Vite).
- `/content-engine/`: The custom JAMstack core. Uses Vite's `import.meta.glob` to parse Markdown, render HTML, and extract Mermaid diagrams. `content-index.ts` fetches two generated artifacts — `content-index.json` (lean, used almost everywhere) and `search-index.json` (full article text, used only by `/search`) — see `.ai/decision-log.md` Decision 4.
- `/labs/`: `registry.ts` is the single source of truth for interactive labs — id, title, description, and the lazy-loaded component. `App.tsx` maps over it to register `/labs/:id` routes and (for non-colliding ids) `/experiments/:id` -> `/labs/:id` redirects.
- `/pages/`: Route-level React components.
  - `/experiments/`: The interactive lab page components. Folder name is a historical holdover — these render at `/labs/<id>`, not `/experiments/<id>`; see `/src/labs/registry.ts`.
  - `LabsIndexPage.tsx`: renders `/labs`, the lab directory.
- `/components/content/`: Composable article-rendering pieces (`MarkdownContent`, `ArticleHeader`, `TableOfContents`, `RelatedContent`, `ArticleNav`, `ReadingProgress`, `MermaidDiagram`) consumed by `ContentDetailPage`.
- `/components/`: Reusable UI elements (Buttons, Headers, Project Cards).
- `/data/`: Static configuration (e.g., `portfolioData.ts`).
- `/seo/`: Hooks and utilities for metadata and web vitals.

### `/scripts/`
**Purpose:** Build and deployment automation.
- `build-search-index.mjs`: Parses all Markdown in `/content/`, generates `content-index.json` and `search-index.json`, builds the RSS/JSON feeds, creates OpenGraph SVG assets (pruning any left over from a renamed/deleted content file), and generates the `sitemap.xml`.

### `/public/`
**Purpose:** Static and dynamically generated assets served at the root.
- `404.html`: GitHub Pages has no server-side rewrites, so this implements the standard SPA-fallback redirect (encode the path as `?redirect=`, decode it in `index.html` via `history.replaceState` before React Router mounts) so a hard refresh or shared deep link resolves instead of 404ing.
- **NOTE:** The generated files (`content-index.json`, `search-index.json`, `og/`, `feeds/`, `sitemap.xml`) are tracked in git via dedicated `chore(build)` commits. Feature commits should exclude them.
