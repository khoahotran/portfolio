# Portfolio Completion TODO

## Resolved — dead code (was "decision needed")

Decided in the Phase 4 pass; see `.ai/content-roadmap.md`.

- [x] **`Metrics.tsx` — wired in.** Rendered on the homepage directly after `Experience`, because
      `metricsData` attributes every number to the system it was measured on, which is exactly the
      evidence the repositioning in `.ai/portfolio-context.md` asks the site to lead with. Placing it
      next to the timeline that describes that work is the point.
- [x] **`Architecture.tsx` — deleted.** Its content duplicated `/projects` (the same systems, with
      less detail) and `/graph` (the same relationships, drawn better). The "Placeholder for
      Architecture diagrams" item below is therefore moot: the diagrams now live in the case studies
      and the Ecosystem graph, where they are actually maintained.
- [x] **`Philosophy.tsx` — deleted.** Duplicated the four philosophy cards already on `/about` and
      the canonical text in `.ai/engineering-principles.md`. It also shipped a non-functional
      "Read essay →" affordance.
- [x] **`Credibility.tsx` — deleted.** Its OSS panel duplicated the repo links already on every
      project card, and its "writing" panel was a hand-maintained list of four articles sitting
      beside a live index of 33 — a drift trap, given `PortfolioHome` already reads real counts from
      `content-index.json`.

`architectureData`, `credibilityData`, and `philosophyData` were removed from
`src/data/portfolioData.ts` along with them, per `.ai/constitution.md` §4 "Remove Dead Code".

## Open

- [x] Project Screenshots — `MarkdownContent` wraps a standalone `![alt](src)` image in a `<figure>`
      with lazy loading, a max-width constraint, and a `<figcaption>` from the alt text. The
      rendering capability is in place.
- [ ] **Add actual screenshots** to `content/projects/*.md`. Still purely a content task — the
      rendering path has been ready for a while and nothing uses it. Worth doing: the three case
      studies are currently all prose and diagrams, with no evidence of a running system.
