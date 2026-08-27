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

## 🟢 Completed (Phase 4 — Distribution, Provenance & Design System)
See `.ai/decision-log.md` Decisions 6–10 for the five systemic changes in this phase. 10 commits on
`feat/phase-4-hardening`, not yet pushed.

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
- [x] **Design tokens + dark mode.** Tailwind palettes are now CSS variables (`src/index.css`,
      `tailwind.config.js`); a theme toggle lives in `SiteHeader`. Measuring contrast for this
      (`scripts/check-contrast.mjs`) surfaced a pre-existing, unrelated production bug:
      `tailwind.config.js` never scanned `content/`, so the `bg-teal-600` CTA buttons embedded in 8
      articles' raw HTML generated **zero** CSS and rendered invisible (white text on white). Fixed
      alongside 26 pre-existing WCAG AA failures, none caused by dark mode.
- [x] **PFM as flagship #4.** `content/projects/pfm.md` written, registered in `portfolioData.ts`,
      linked in `.ai/flagship-projects.md`, `.ai/architecture-catalog.md`, `.ai/knowledge-graph.md`,
      and wired into the `/graph` diagram.
      **Open follow-up, carried into Phase 5 below:** `github.com/khoahotran/PFM` still 404s (repo
      is private) — verify the link before calling this fully done.
- [ ] **Custom domain.** `site.config.mjs` now centralises the site URL, so this is a small change
      once a domain is bought. Not part of Phase 4 or 5 — genuinely "whenever," no dependency on
      either.

## 🟡 Phase 5 — Evidence Depth & Discoverability

**Growth model: deep before wide.** 34 articles / ~34k words today. The next phase adds *fewer,
stronger* pieces rather than raising publishing cadence — every new claim ships with evidence a
reader can check (a runnable harness, a real screenshot, a reproducible number), which is the same
standard Phase 4 just applied retroactively to the existing labs. Cadence/volume growth is
deliberately deferred until the infra in §5.5–§5.7 exists to support it without the tag sprawl and
build-noise problems already measured below.

Priority order across the four tracks: **5.1 → 5.8 → 5.5 → 5.2 → 5.6/5.7 → 5.3 → 5.4.** Rationale:
5.1 is free (evidence already sitting in this repo's own commits), 5.8 closes the single biggest
remaining credibility gap, 5.5 should land before more articles add more tags, and 5.3/5.4 are
lowest-urgency because they don't depend on anything else being true first.

### 5.1 ✅ Meta-posts from the Phase 4 evidence — DONE (2026-08-27)
*Do these first — the evidence already exists in this session's own commits and `.ai/decision-log.md`,
so no new investigation is needed, only writing. Also closes the "Missing Content Gaps: Frontend
Architecture" item that was open in every prior version of this roadmap.*

All four pieces written, including the optional one. Two more real bugs surfaced writing them —
both fixed and documented rather than routed around:
- `scripts/prerender.mjs`'s origin-leak check false-positived on an article that mentions
  "127.0.0.1" as a topic (Decision 11) — the check now matches the exact server origin, not a bare
  substring.
- A Markdown link wrapping inline code (`` [`text`](url) ``) measured 4.44:1 — the first time this
  pattern appeared anywhere in the corpus. Fixed with a targeted `.markdown-body a code` rule
  (`src/index.css`) rather than widening it into a global link-color change.

1. **"The SPA Google Never Saw"** — `system-design` or `blog`.
   The prerendering story: cite the `curl -sI` evidence (51/52 sitemap URLs returning 404), walk
   through why `public/404.html`'s client-side redirect defeats crawlers, and the
   snapshot-vs-`react-dom/server` decision in `.ai/decision-log.md` Decision 6. A concrete before/
   after (`curl` output, a Playwright `page.goto()` diff) is stronger than describing it in prose.
2. **"Measuring Contrast Instead of Guessing at It"** — `field-notes`.
   Decision 9's story: `.ai/audit-followups.md` item 2 correctly refused to blind-fix ~44
   `text-slate-400` occurrences; `scripts/check-contrast.mjs` is what turned "probably fine" into a
   number. Include the CTA-invisible bug (Decision 10) as the twist — a completely unrelated defect
   the same measurement pass caught.
3. **"Why Prerender Instead of Migrating to Next.js"** — `research` (ADR format).
   Revisit Decision 1 (custom JAMstack over Next.js) against Decision 6 (snapshot prerendering
   instead of SSR) — an honest "the original trade-off held, here's the boundary where it would
   stop holding" piece. `.ai/writing-style-guide.md`'s comparison-table convention fits this well.
4. *(Optional, smaller)* **A short field-note on the Mermaid `sequenceDiagram` entity/semicolon
   hazard** discovered while writing `content/projects/pfm.md` — see `content/README.md`'s "Mermaid
   syntax hazards" section, which already documents the exact failure. Only worth writing if it can
   stay under ~400 words; otherwise leave it as documentation, not an article.

### 5.2 Deepen the four flagships
*Case studies are currently the thinnest artifacts on the site relative to their evidentiary
weight — ~1,200 words each, shorter than several blog posts, despite being the primary evidence.*

- **Screenshots.** `MarkdownContent` already renders a standalone `![alt](src)` as a `<figure>` with
  lazy loading and a caption (`todo.md`'s "Open" item — rendering path built, unused). Aegis and
  Core Banking are backend-only with no UI to screenshot; a Grafana/Jaeger dashboard or terminal
  output showing a real trace/metric is the honest equivalent. QuantAlpha (Angular frontend) and PFM
  (Next.js frontend) can take real UI screenshots.

- **QuantAlpha — "Deployments & CI/CD" section.** Already scoped in the prior backlog; carried
  forward unchanged.

- **PFM.**
  - Verify `github.com/khoahotran/PFM` resolves once made public (blocking item from Phase 4).
  - Once `UA-US-03` (User Status) merges, update the "Current status" paragraph in
    `content/projects/pfm.md` from "not yet merged" to reflect the real state — the constitution's
    honesty standard applies to this repo's own claims about another repo, not just to code.
- **Aegis.** `content/projects/aegis.md` already documents, correctly, that the shipped rate limiter
  is fixed-window rather than the Lua-scripted token-bucket variant referenced in the gRPC blog
  post. If the underlying Aegis repository changes, keep this claim in sync — don't let the case
  study quietly drift ahead of the actual code, the same failure Decision 3/Cross-Document
  Consistency exists to prevent.

### 5.3 Queued content (already scoped, unchanged)

1. **ADR: Tracing vs Metrics in Microservices** (`research`) — when to use OpenTelemetry tracing vs
   Prometheus metrics, referencing Aegis.
2. **Interactive Lab: Rate Limiting Algorithms** (`experiments` + lab) — Token Bucket vs Leaky
   Bucket vs Fixed Window. This one can legitimately be `provenance: { kind: 'implementation' }`
   from day one (see `src/labs/provenance.ts`) — the algorithms are simple enough to run for real
   in the browser rather than modeled, unlike three of the existing labs.
3. **Blog: The Hidden Costs of Cloud Functions** — cold starts and connection pooling from the Core
   Banking project on Firebase.

### 5.4 New technical domains (lowest priority — start only once §5.1–§5.3 are done)

- **System Design:** Designing a Global API Gateway (Kong/Envoy).
- **Interactive Lab:** Gossip Protocol Visualizer (node discovery simulation) —
  `provenance: 'implementation'` candidate, same reasoning as the rate-limiting lab above.

- **Experiment:** WebSockets vs Server-Sent Events (SSE) benchmark — if built as `measured`, write
  the harness *first*, per §5.8's lesson, not after the fact.

- **Research:** Database Indexing optimization (B-Tree vs BRIN in PostgreSQL) — ties naturally to
  QuantAlpha's existing BRIN-indexed time-series design, already mentioned in
  `.ai/flagship-projects.md` but never explained on its own.

### 5.5 Tag taxonomy + cross-collection browse
**Measured problem:** 80 distinct tags across 34 articles; **47 (59%) are used exactly once.** Tags
also only filter within a single collection today (`ContentListPage.tsx`'s `selectedTag` state) —
there is no route that lists everything tagged `go` across `blog`+`research`+`system-design` at
once. This gets worse, not better, as more articles land without a fix first.

**Plan:**

1. Define a canonical vocabulary (~20–25 tags) in a new `.ai/tag-taxonomy.md`, grouped by kind:
   languages (`go`, `typescript`, `python`), datastores (`postgresql`, `firestore`, `redis`),
   patterns (`event-sourcing`, `cqrs`, `saga-pattern`, `rbac`), infra (`grpc`, `kafka`,
   `opentelemetry`), domain (`fintech`, `hft`). Merge singleton tags into their nearest canonical
   neighbor rather than keeping them (e.g. `protobuf` → folds under `grpc`'s article instead of
   its own tag).
2. Migrate all 34 files' `tags:` frontmatter to the canonical set — mechanical, but by hand per file
   since meaning has to be preserved, not scripted.
3. Add `/tags` (canonical tags with per-tag counts) and `/tags/:tag` (cross-collection article list)
   routes. Reuse `loadContentIndex()` from `src/content-engine/content-index.ts` (already returns
   every collection combined — it's what `getContentCounts()` in `content-service.ts` uses today)
   rather than the per-collection `getContentIndex()`; reuse `ContentListPage.tsx`'s existing card
   grid as the template.
4. **Enforce it going forward the same way `related:` is already enforced:** have
   `scripts/build-search-index.mjs` fail the build if any article uses a tag outside the canonical
   vocabulary in `.ai/tag-taxonomy.md`. Cheap now (34 files); expensive to retrofit at 100.

### 5.6 "Latest" + series support
`getLatestContent(limit = 6)` (`src/content-engine/content-service.ts:47`) is fully implemented and
**imported by nothing** — a returning reader currently has no way to see what's new. Separately,
there is no `series` frontmatter field, so a multi-part deep-dive (e.g. the benchmark-harness
rewrites in §5.8, or a 3-part Rate Limiting series) has nowhere to declare itself as one.

**Plan:**

- Wire `getLatestContent(4)` into a "Recently Published" strip on `PortfolioHome.tsx`, below the
  existing write-up/lab/case-study counts section.

- Add optional `series?: string` and `seriesOrder?: number` to `ContentFrontmatter`
  (`src/content-engine/types.ts`) and the build script's frontmatter emission. Render a "Part N of
  M in `<series>`" badge on `ArticleHeader`, with prev/next-in-series links — same pattern as
  `ArticleNav.tsx`'s prev/next-in-collection, scoped to `series` instead of `collection`.

### 5.7 Build hygiene + search scale
Two small, cheap-now fixes surfaced while measuring the above:

- **`lastBuildDate` churns every feed on every build**, regardless of whether content changed —
  `scripts/build-search-index.mjs`'s RSS/JSON-feed builder uses `new Date().toUTCString()`
  unconditionally. Confirmed: rerunning the build with zero content changes still dirties 7 files
  under `public/feeds/`. Fix: derive it from the max `date` across docs (deterministic, already
  have the field) instead of wall-clock time — makes `chore(build)` commits actually diff-clean when
  nothing changed, which is the whole point of Decision 3's commit-separation rule.

- **`search-index.json` is 4.6 KB/article** (measured on the current 34-doc corpus), projecting to
  ~460 KB at 100 articles — not urgent at the "deep, not wide" pace this phase commits to, but worth
  a stated trigger rather than an unstated one: revisit if/when the corpus crosses ~100 articles or
  the file crosses ~500 KB, per the same measure-before-acting discipline as
  `.ai/audit-followups.md` item 7.

### 5.8 Real benchmark harnesses (closes the largest remaining credibility gap)

**1/3 done (2026-08-27): `redis-vs-bullmq`.** Real, runnable harness at `benchmarks/redis-vs-bullmq/`
(Go + Node + Docker Compose, `./run.sh` reproduces it end to end). The lab and article both now
import the committed `results.json` instead of a hardcoded `DATASET`. The re-measurement (on a local
host, not the original AWS c6g.xlarge — see that directory's README for why) found a more nuanced
result than the old "4-5x" claim: the throughput gap is payload-dependent, ~2.2-3x at 1-10 KB and
~5.1-5.5x at 100 KB, not a flat multiplier.

**2/3 done (2026-08-27): `db-event-replay-benchmark`.** Real harness at
`benchmarks/db-event-replay-benchmark/` — PostgreSQL 16 + the official Firestore emulator, both via
Docker Compose, `./run.sh` reproduces it end to end. The re-measurement found a **much larger** gap
than the old claim: ~19.6-30.1x (vs. the old flat "7-8x"), and the gap doesn't stay flat — it tracks
document count, since Firestore pays a per-document read cost a single Postgres range scan doesn't.
`go-vs-ts-concurrency` is the last one remaining.
The three `measured` labs — `redis-vs-bullmq`, `go-vs-ts-concurrency`, `db-event-replay-benchmark` —
currently ship a `caveat` admitting the harness that produced their numbers isn't in the repo. This
is honest, not resolved. Per the chosen direction: write real, runnable harnesses rather than
downgrading to `model` or leaving the gap open.

**Shape, per `.ai/prompts/benchmark-study.md` (already updated in Phase 4):**

- `benchmarks/<name>/` per lab: a `docker-compose.yml`, the actual producer/consumer source, a
  `run.sh` that writes `results.json`, and a `README.md` with exact reproduction steps.

- The lab page imports the committed `results.json` instead of an inline `DATASET` constant.
- Once a harness ships, update that lab's `registry.ts` entry: add `harness` (link into
  `benchmarks/<name>/`) and drop `caveat`, or narrow it to whatever genuinely still can't be
  reproduced (e.g. exact cloud hardware).

**Priority order (unchanged from Phase 4's assessment — cheapest and best-documented first):**

1. `redis-vs-bullmq` — environment fully documented (AWS c6g.xlarge, same VPC, Go 1.22 / Node 20),
   cheapest to reconstruct faithfully.
2. `db-event-replay-benchmark` — environment documented; the harness should make explicit that the
   comparison (one sequential scan vs 100k individual document reads) is intentionally lopsided, per
   the caveat already in `content/experiments/2026-06-27-db-event-replay-benchmark.md`.
3. `go-vs-ts-concurrency` — host hardware was never recorded originally, so this is a fresh
   measurement establishing a new baseline, not a reproduction of the old numbers.
