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
  link out to an interactive lab at `/labs/<id>` via a CTA button - see `/src/labs/`. The
  article and the lab are two separate routes; an article's slug and a lab's id may be the
  same string without colliding (`/experiments/:slug` and `/labs/:id` are disjoint paths).

### `/src/`
**Purpose:** The React + TypeScript frontend codebase (Vite).
- `/content-engine/`: The custom JAMstack core. Uses Vite's `import.meta.glob` to parse Markdown, render HTML, and extract Mermaid diagrams. `content-index.ts` fetches two generated artifacts - `content-index.json` (lean, used almost everywhere) and `search-index.json` (full article text, used only by `/search`) - see `.ai/decision-log.md` Decision 4.
- `/labs/`: `registry.ts` is the single source of truth for interactive labs - id, title, description, and the lazy-loaded component. `App.tsx` maps over it to register `/labs/:id` routes and (for non-colliding ids) `/experiments/:id` -> `/labs/:id` redirects.
- `/pages/`: Route-level React components.
  - `/experiments/`: The interactive lab page components. Folder name is a historical holdover - these render at `/labs/<id>`, not `/experiments/<id>`; see `/src/labs/registry.ts`.
  - `LabsIndexPage.tsx`: renders `/labs`, the lab directory.
  - `WritingIndexPage.tsx`: renders `/writing`, one entry point across all five content collections, with collection and tag filters held in the query string.
- `/components/content/`: Composable article-rendering pieces (`MarkdownContent`, `ArticleHeader`, `TableOfContents`, `RelatedContent`, `ArticleNav`, `ReadingProgress`, `MermaidDiagram`) consumed by `ContentDetailPage`.
- `/components/`: Reusable UI elements (Buttons, Headers, Project Cards).
- `/components/ui/`: The design-system primitives every page composes from - `Button` (three
  variants, with `ButtonLink`/`ButtonAnchor` so a link never has to fake a button), `Card`,
  `Section`/`SectionHeader` (three vertical rhythms), `CommandPalette` (Cmd-K search). `card-classes.ts`
  is split out from `Card.tsx` so the file exports components only and Fast Refresh keeps working.
- `/data/`: Static configuration. `portfolioData.ts` is the record of fact; `expertise.ts` and
  `background.ts` are homepage view-models derived from it, each entry carrying its own proof links,
  so a section grows by editing a list rather than by editing markup. `expertise.test.ts` asserts
  every proof link resolves against `lab-ids.json` and `content-index.json`.
- `/seo/`: Hooks and utilities for metadata and web vitals.

### `/site.config.mjs`
**Purpose:** The site's public identity - origin, base path, title, description - in one place.
Previously `siteUrl` was hardcoded in four unrelated files. Every Node-side build script reads it
from here. `basePath` must stay in sync with `base` in `vite.config.ts`; see `.ai/decision-log.md`
Decision 7.

### `/scripts/`
**Purpose:** Build and deployment automation.
- `lib/site-routes.mjs`: Single source for the collection list, the lab ids (read from
  `src/labs/lab-ids.json`), the static route list, and the article routes read from the generated
  index. Shared by the scripts below.
- `build-search-index.mjs`: Parses all Markdown in `/content/`, generates `content-index.json` and `search-index.json`, builds the RSS/JSON feeds, creates OpenGraph SVG assets (pruning any left over from a renamed/deleted content file), and generates the `sitemap.xml`.
- `prerender.mjs`: Runs after `vite build`. Serializes every route to `dist/<route>.html` so
  crawlers and social cards see real per-page metadata instead of the SPA shell. Fails the build on
  a route missing its own title/canonical/`og:image`. See `.ai/decision-log.md` Decision 6.
- `check-responsive.mjs`: Browser regression check - overflow, console/page errors, and mermaid
  rendering across every route and 7 viewport widths, in both themes.
- `check-contrast.mjs`: Walks every visible text node on every route in both themes and fails on
  anything below WCAG AA. See `.ai/decision-log.md` Decision 9.
- `check-interactions.mjs`: The three gates above only see a page's default state on load. This one
  clicks: a graph node must navigate somewhere real, every lab must survive its control extremes,
  the header must fit at 320px, and Cmd-K must open, filter and navigate. See `.ai/audit-followups.md`
  item 9 for what it was built to close and what it still does not cover.
- `check-type-scale.mjs`: Ratchet against `type-scale-baseline.json`. New arbitrary display sizes
  fail; the existing count may only shrink. `--update-baseline` after a legitimate reduction.
- `check-prose.mjs`: Fails on the em dash character, and on the `&mdash;` entity, anywhere in the
  repo. Inline code spans are exempt so
  the rule can be written down. See `.ai/writing-style-guide.md` "Dashes".

### `/public/`
**Purpose:** Static and dynamically generated assets served at the root.
- `404.html`: **Overwritten in a full build** by `scripts/prerender.mjs` with a real prerendered
  "Page not found" page, since every real route now ships as its own HTML file. The committed copy
  is the SPA-fallback redirect (encode the path as `?redirect=`, decode it in `index.html` via
  `history.replaceState` before React Router mounts), kept as the fallback for a bare `vite build`
  and for `?redirect=` links shared from the pre-prerender deployment.
- **NOTE:** The generated files (`content-index.json`, `search-index.json`, `og/`, `feeds/`, `sitemap.xml`) are tracked in git via dedicated `chore(build)` commits. Feature commits should exclude them.
