# Content Roadmap

This document prioritizes the future evolution of the portfolio. AI agents should consult this roadmap when asked to generate new content or labs.

## 🟢 Completed (Phase 1-2)
- [x] Initial JAMstack routing and custom Markdown engine.
- [x] About page with career timeline and engineering philosophy.
- [x] Flagship Project Hubs (Aegis, Core Banking, QuantAlpha).
- [x] Benchmark Interactive Labs (Redis vs BullMQ, Go vs TS, DB Replay).
- [x] Knowledge Graph and Ecosystem visualization.
- [x] AI Operating System governance `.ai/`.

## 🟢 Completed (Phase 3 — Production UI/UX, A11y & Performance Audit)
No new articles or labs. Fixed two live production bugs (an unrecoverable blank-screen error path
on a failed lazy-chunk load, and mobile horizontal overflow on articles/homepage from missing
`min-w-0`), plus a batch of accessibility, readability, and reliability fixes. Deferred/backlog
items from this pass are tracked in `.ai/audit-followups.md` — check it before starting new
frontend work, especially the `min-w-0` convention and the `rehype-raw` sanitization caveat.

## 🟢 Completed (Phase 2.5 — Platform Audit)
No new articles or labs; this pass fixed rendering/routing defects and content-engine
architecture. See `.ai/decision-log.md` Decisions 4–5 for the two that change how future
content should be authored/linked.
- [x] Fixed production-breaking routing: labs moved to `/labs/*`, a `/experiments` article/lab
      slug collision that made 3 articles unreachable, missing `/projects` list route, no GH
      Pages SPA fallback, root-absolute links that 404'd under the `/portfolio/` base.
- [x] Syntax highlighting was wired but unstyled (`.hljs-*` classes with no CSS) — themed now.
- [x] Implemented the `> [!NOTE]` callout syntax `.ai/writing-style-guide.md` already documented
      but that the content engine never actually rendered.
- [x] Split `ContentDetailPage` into reusable pieces under `src/components/content/`
      (`MarkdownContent`, `ArticleHeader`, `TableOfContents` w/ scrollspy, `RelatedContent`,
      `ArticleNav`, `ReadingProgress`), added a code-block copy button + language label, and
      figure/caption rendering for standalone images.
- [x] Split the generated index into a lean `content-index.json` and a full `search-index.json`
      — every route but `/search` now fetches ~24 KB instead of ~252 KB.
- [x] Merged two overlapping Redis Streams vs BullMQ articles into one.

## 🟡 In Progress (Phase 4 — Distribution, Provenance & Design System)
See `.ai/decision-log.md` Decisions 6–7 for the two systemic changes in this phase.

- [x] **Honest repositioning.** Removed the Staff/Principal framing from `.ai/` and the site copy;
      added a "Career Stage" section to `.ai/portfolio-context.md` and a typed `ProjectProvenance`
      badge to every project card. Rewrote the `/about` timeline, which claimed "Staff-Level
      Thinking", mentoring that didn't happen, a "Mid-Level" phase, and "HFT matching engines"
      (QuantAlpha has no matching engine).
- [x] **Prerendering.** Every route now ships as real HTML at 200 with its own metadata. Fixed a
      second, independent bug found on the way: nothing in `src/` referenced the 33 generated
      `public/og/<slug>.png` files, so every article's `og:image` fell back to `og-default.png`.
- [x] **Benchmark provenance.** All 9 labs now declare where their numbers come from
      (`src/labs/provenance.ts`) and render it above their controls.
- [ ] **Design tokens + dark mode.** `tailwind.config.js` has an empty `theme.extend` and there are
      zero `dark:` classes despite the constitution listing dark mode as a thing not to break.
- [x] **PFM as flagship #4.** `content/projects/pfm.md` written, registered in `portfolioData.ts`,
      linked in `.ai/flagship-projects.md`, `.ai/architecture-catalog.md`, `.ai/knowledge-graph.md`,
      and wired into the `/graph` diagram. The GitHub link (`github.com/khoahotran/PFM`) still 404s
      as of this writing — the repo is private and is being made public separately. **Follow-up:**
      verify the link resolves before considering this fully done.
- [ ] **Custom domain.** `site.config.mjs` now centralises the site URL, so this is a small change
      once a domain is bought.

### Benchmark harnesses (follow-up from Phase 4)
The three `measured` labs — `redis-vs-bullmq`, `go-vs-ts-concurrency`, `db-event-replay-benchmark` —
render figures from real runs whose harnesses were not kept. Each lab and article now says so in its
provenance/caveat rather than implying reproducibility. To close this properly, write a runnable
harness under `benchmarks/<name>/`, commit its raw JSON output, and have the lab import that file
instead of an inline `DATASET`, per the updated `.ai/prompts/benchmark-study.md`. Priority order:
1. `redis-vs-bullmq` — the environment is fully documented (c6g.xlarge, same VPC, Go 1.22 / Node 20),
   so this is the cheapest to reconstruct faithfully.
2. `db-event-replay-benchmark` — environment documented; note the comparison is intentionally
   lopsided and the harness should make that explicit rather than hide it.
3. `go-vs-ts-concurrency` — host hardware was never recorded, so a rerun establishes a new baseline
   rather than reproducing the old one. Re-measure and replace the figures.

## 🟡 Up Next (deferred from Phase 3)
*Content items, deliberately not started in Phase 4 — that phase was platform and credibility work.*

1. **ADR: Tracing vs Metrics in Microservices**
   - **Type:** Research / ADR
   - **Goal:** A short write-up on when to use OpenTelemetry tracing vs Prometheus metrics, referencing the Aegis project.
2. **Interactive Lab: Rate Limiting Algorithms**
   - **Type:** React Experiment
   - **Goal:** Build a visualizer comparing Token Bucket vs Leaky Bucket vs Fixed Window rate limiting algorithms.
3. **Blog: The Hidden Costs of Cloud Functions**
   - **Type:** Blog Post
   - **Goal:** Discuss cold starts and connection pooling issues encountered during the Core Banking project on Firebase.

## 🔴 Future Backlog (Phase 4+)
- **System Design:** Designing a Global API Gateway (Kong/Envoy).
- **Interactive Lab:** Gossip Protocol Visualizer (simulating node discovery).
- **Case Study Expansion:** Add a "Deployments & CI/CD" section to the QuantAlpha case study.
- **Experiment:** WebSockets vs Server-Sent Events (SSE) benchmark.

## 💡 Missing Content Gaps
- We currently lack content specifically focused on **Database Indexing optimization** (e.g., B-Tree vs BRIN in PostgreSQL).
- We have no articles discussing **Frontend Architecture** (despite having built a custom JAMstack framework for this very portfolio). This could be a meta-post.
