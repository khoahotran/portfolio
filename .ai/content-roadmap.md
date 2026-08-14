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

## 🟡 In Progress / Up Next (Phase 3)
*These are the highest priority items for the next AI session.*

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
