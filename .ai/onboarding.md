# AI Agent Onboarding

Welcome. You are operating within the **Khoa Tran Engineering Portfolio** repository. 

This repository is a Staff/Principal-level engineering showcase demonstrating deep expertise in Distributed Systems, High-Frequency Trading (HFT), and Core Banking Architectures.

## Mandatory First Step
Before making any changes or generating new content, you MUST read the following context files:
1. `.ai/constitution.md` (Mandatory rules of engagement)
2. `.ai/portfolio-context.md` (The narrative and goals of this portfolio)
3. `.ai/content-roadmap.md` (What is currently in progress)

## Repository Purpose
This is not just a standard resume. It is an interactive, long-form technical knowledge base containing:
- **Flagship Projects:** Deep architectural dives into distributed systems (`content/projects/`).
- **Interactive Benchmarks:** React-based simulations and visualizations comparing technical choices (`src/pages/experiments/`).
- **Field Notes & System Design:** Actionable ADRs and architectural deep dives (`content/system-design/`, `content/research/`, etc.).

## Major Directories
- `.ai/` - The AI Operating System (You are here. This is the source of truth).
- `content/` - Markdown files processed by the custom content engine. Separated into `projects`, `blog`, `research`, `system-design`, `experiments`, and `field-notes`.
- `src/` - The React + Vite frontend source code.
  - `src/content-engine/` - Custom markdown compiler and router logic.
  - `src/pages/experiments/` - Interactive lab React components.
- `scripts/` - Build scripts (e.g., `build-search-index.mjs`).
- `public/` - Static assets and **generated** artifacts (e.g., `search-index.json`, `sitemap.xml`, `feeds/`, `og/`). 

## Important Commands
- **Start Dev Server:** `npm run dev`
- **Build Search Index:** `npm run build:search-index` (Must be run when adding/modifying `.md` files)
- **Verification (Typecheck):** `npm run typecheck`
- **Verification (Lint):** `npm run lint`
- **Production Build:** `npm run build`

## Development Workflow
1. Read the necessary `.ai/` context.
2. Ensure you understand the current state of the repository.
3. Make changes in batches. 
4. **NEVER** push directly without explicit user approval.
5. **ALWAYS** run `npm run typecheck && npm run lint && npm run build` before considering a task complete.
6. Rebuild the search index `npm run build:search-index` whenever Markdown content changes.

Welcome to the team. Proceed to `.ai/constitution.md`.
