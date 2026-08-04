# Quality Gates

Before an AI agent can consider a task "complete" and ready for a final commit, it must pass the following Quality Gates. Failing to pass these gates indicates the task is incomplete.

## 1. Content Quality Gate
- [ ] Does the article have a valid YAML frontmatter block (`title`, `date`, `tags`, `summary`, `reading_time`)?
- [ ] Is the narrative written in a professional, Staff-level tone?
- [ ] Are all architectural claims backed by trade-off analysis?
- [ ] Does the article contain at least one visual element (Mermaid diagram, table, or callout)?
- [ ] Are there no duplicate H1 (`#`) tags in the Markdown body?

## 2. Interactive Lab Quality Gate
- [ ] Does the React component compile without TypeScript `any` errors?
- [ ] Is the component styled consistently using Tailwind CSS without inline styles?
- [ ] Does the lab include a companion Markdown file in `content/experiments/` so it is indexed?
- [ ] Is the route registered in `src/App.tsx`?

## 3. Visualization Quality Gate
- [ ] Do all Mermaid diagrams use valid syntax (e.g., no spaces in Subgraph IDs without brackets)?
- [ ] Are the diagrams concise and focused on a single architectural boundary?
- [ ] If using interactive SVGs in React, are they accessible and responsive?

## 4. Documentation Quality Gate (The AI OS)
- [ ] If a new project, technology, or pattern was introduced, was `.ai/architecture-catalog.md` updated?
- [ ] Was the `.ai/knowledge-graph.md` updated with new relationships?
- [ ] Was the `.ai/content-roadmap.md` updated to move the item from "In Progress" to "Completed"?

## 5. Technical Quality Gate (Mandatory)
All commands must exit with code `0`:
```bash
npm run typecheck
npm run lint
npm run build:search-index
npm run build
```
