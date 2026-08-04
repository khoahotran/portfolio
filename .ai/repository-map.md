# Repository Map

A high-level map of the portfolio's architecture and ownership.

## Root Directories

### `/.ai/`
**Purpose:** The AI Operating System. Contains all governance, context, and prompts required for AI agents to operate consistently. This is the source of truth.

### `/content/`
**Purpose:** The raw Markdown files that power the portfolio's articles and case studies. 
- `/projects/`: Long-form architectural deep dives of the Flagship Projects.
- `/blog/`: Engineering narratives and storytelling.
- `/research/`: Technical explorations and ADRs.
- `/system-design/`: System design notes and diagrams.
- `/field-notes/`: Pragmatic, boots-on-the-ground engineering lessons.
- `/experiments/`: Markdown wrappers for the interactive lab components.

### `/src/`
**Purpose:** The React + TypeScript frontend codebase (Vite).
- `/content-engine/`: The custom JAMstack core. Uses Vite's `import.meta.glob` to parse Markdown, render HTML, and extract Mermaid diagrams.
- `/pages/`: Route-level React components.
  - `/experiments/`: The interactive laboratory components (e.g., Benchmarks, Visualizers).
- `/components/`: Reusable UI elements (Buttons, Headers, Project Cards).
- `/data/`: Static configuration (e.g., `portfolioData.ts`).
- `/seo/`: Hooks and utilities for metadata and web vitals.

### `/scripts/`
**Purpose:** Build and deployment automation.
- `build-search-index.mjs`: Parses all Markdown in `/content/`, generates the `search-index.json`, builds the RSS/JSON feeds, creates OpenGraph SVG assets, and generates the `sitemap.xml`.

### `/public/`
**Purpose:** Static and dynamically generated assets served at the root.
- **NOTE:** The generated files (`search-index.json`, `og/`, `feeds/`, `sitemap.xml`) are tracked in git via dedicated `chore(build)` commits. Feature commits should exclude them.
