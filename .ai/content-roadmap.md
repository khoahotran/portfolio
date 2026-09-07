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

**Status (2026-08-28): 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8 done — Phase 5 complete except 5.2, which
remains blocked (see below) on causes outside this session's control.**

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

### 5.2 ⛔ Deepen the four flagships — BLOCKED (2026-08-27), not abandoned
*Case studies are currently the thinnest artifacts on the site relative to their evidentiary
weight — ~1,200 words each, shorter than several blog posts, despite being the primary evidence.*

Every sub-item here turned out to depend on something outside this repo's own control, tried and
found genuinely blocked rather than skipped by choice:
- **Screenshots.** PFM was live and reachable on this machine (localhost:3000, an existing dev
  session) — the right move was to log in as the seeded Admin, create a demo user, add a few
  Wallets/Transactions, and screenshot the real UI. That was explicitly approved, then blocked by
  Claude Code's own safety classifier at the login-and-mutate step, independent of the approval.
  **Next attempt needs a human at the keyboard**, not a different automation approach — either
  someone takes the screenshots directly and hands them over, or the classifier rule is adjusted
  first. Don't retry the automated path without one of those two changing.
- **QuantAlpha "Deployments & CI/CD" section** needs real operational detail from that repository,
  which isn't checked out or accessible in this environment. Writing it without that would mean
  inventing specifics — exactly what this whole phase has been working against.
- **PFM repo visibility** and **keeping the Aegis rate-limiter claim in sync** both depend on GitHub
  account actions and another repository's actual state, neither observable or actionable from here.

Not removed from the roadmap — revisit once a human can drive the PFM screenshot session, or once
QuantAlpha/Aegis repo access exists in whatever environment picks this up next.

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

### 5.3 ✅ Queued content — DONE (2026-08-28)

1. **ADR: Tracing vs Metrics in Microservices** (`research`) — shipped as
   `research/2026-08-28-adr-tracing-vs-metrics-in-microservices.md`. Frames it as which signal
   answers which question (aggregate health vs per-request causality) rather than either/or,
   grounded in Aegis's real existing OTel/Jaeger tracing and its sub-5ms Policy Service claim.
   Honest about scope: Aegis has no Prometheus metrics wired in today — the ADR argues for adding
   them, and says so explicitly, same convention as the tracing article's own
   "Current Aegis implementation" callout.
2. **Interactive Lab: Rate Limiting Algorithms** (`experiments` + lab) — shipped at
   `/labs/rate-limiting-algorithms` with a companion article. `provenance: { kind: 'implementation'
   }` from day one, as this section predicted: Token Bucket, Leaky Bucket, and Fixed Window Counter
   are real, pure, unit-tested functions (`src/labs/rateLimiting.ts`, 13 tests) run against an
   identical arrival timeline, not three formulas tuned to look different. Fixed Window's
   boundary-reset flaw (a burst split across a window edge can double-admit) is asserted directly
   in the test suite, not just described in prose.
3. **Blog: The Hidden Costs of Cloud Functions** — shipped as
   `blog/2026-08-28-hidden-costs-of-firebase-cloud-functions.md`, **corrected from this note's
   original attribution**: `content/projects/core-banking.md` never mentions Firebase Cloud
   Functions anywhere in the corpus — it's a Go service using Firestore as an event store, not a
   project deployed as Cloud Functions. The only real Firebase-Functions project in this portfolio
   is SeensioGO (`content/field-notes/2026-06-03-why-i-chose-firebase-functions-over-cloud-run.md`),
   so the new post is written as an honest, cross-linked follow-up to that field note — two costs
   (stacked cold-start, connection-pool arithmetic under Gen 2's concurrency model) grounded in that
   article's own published config, not a fabricated Core Banking incident. See
   `.ai/decision-log.md` Decision 17.

### 5.4 ✅ New technical domains — DONE (2026-08-28)

- **System Design:** Designing a Global API Gateway (Kong/Envoy) — shipped as
  `system-design/2026-08-28-designing-a-global-api-gateway.md`. Explicit about scope: this is the
  network-layer edge routing job (TLS termination, health-aware routing, global rate limiting,
  canary), distinct from and layered in front of the application-layer choice Aegis's existing
  GraphQL-over-REST ADR already settled — not a replacement for it, and not built or deployed.
- **Interactive Lab:** Gossip Protocol Visualizer — shipped at `/labs/gossip-protocol-visualizer`,
  `provenance: 'implementation'` as this section predicted: a real push-based epidemic broadcast
  (`src/labs/gossipProtocol.ts`, 8 tests) — Fisher-Yates peer selection, real round-by-round spread,
  O(log n) convergence asserted directly in the test suite (50 nodes at fanout 3 converge in under
  15 rounds), not just described.

- **Experiment: WebSockets vs Server-Sent Events benchmark** — shipped at `/labs/websockets-vs-sse`
  with `benchmarks/websockets-vs-sse/`, harness written *first* as this section required. One Go
  binary, two roles, both transports in the same language/process model to isolate the transport
  from a language confound. **The finding itself is the interesting part**: memory is close and SSE
  is *not* the cheaper transport at scale (137.5MB vs. WebSocket's 122.2MB at 5,000 connections, re-measured 2026-08-28 after a Phase 6 harness robustness fix — see Decision 21) —
  the opposite of the common "SSE is lighter" intuition, most plausibly an artifact of this
  harness's own SSE handler carrying more per-connection state than `gorilla/websocket`'s path, not
  a law about the wire protocols. **Connect-time was measured and then explicitly not trusted**: a
  manual re-run at 5,000 connections reversed which transport was faster, twice — documented in the
  harness README and the lab's own UI rather than picking whichever run looked cleaner. See
  `.ai/decision-log.md` Decision 18.
- **Research:** Database Indexing (B-Tree vs BRIN in PostgreSQL) — shipped as
  `research/2026-08-28-database-indexing-btree-vs-brin-for-time-series.md`, grounded in QuantAlpha's
  own documented target design (tick-ingestion pipeline not yet built) rather than presenting BRIN
  as installed.

**Also found and fixed in this pass, unrelated to any single deliverable above:** all three
percentage-height bar charts across `GoVsTsConcurrencyPage.tsx` and `RedisVsBullMQPage.tsx` were
silently rendering 0px tall — a CSS bug (percentage height needs a definite-height ancestor; the
row container was `items-end`, not `stretch`, so the column wrapping each bar had no definite height
to resolve against) discovered by screenshotting the new WebSockets-vs-SSE page in the same style and
noticing its bars didn't render either. Fixed in all three pages in the same pass. See
`.ai/decision-log.md` Decision 19.

### 5.5 ✅ Tag taxonomy + cross-collection browse — DONE (2026-08-27)
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

**Result:** 92 tags -> 35 (62% reduction), 56 singleton tags -> 5, all 5 justified per
`.ai/tag-taxonomy.md` rule 1. Canonical list lives in `scripts/lib/tag-taxonomy.mjs`; build-time
enforcement is live and verified (tested with a deliberately fake tag — build failed with a clear
message, then confirmed clean). `/tags` and `/tags/:tag` routes ship, prerendered, in the sitemap,
and covered by the responsive/contrast checks (95 routes total now, up from 59).

### 5.6 ✅ "Latest" + series support — DONE (2026-08-28)
`getLatestContent(limit = 6)` (`src/content-engine/content-service.ts:47`) was fully implemented and
imported by nothing — a returning reader had no way to see what's new. Separately, there was no
`series` frontmatter field, so a multi-part deep-dive (e.g. the benchmark-harness rewrites in §5.8,
or a future 3-part Rate Limiting series) had nowhere to declare itself as one.

**Shipped:**

- `getLatestContent(4)` now backs a "Recently Published" strip on `PortfolioHome.tsx`, rendered
  below the write-up/lab/case-study counts section (degrades silently, same convention as that
  section, when the fetch is still loading or fails).

- `series?: string` and `seriesOrder?: number` added to `ContentFrontmatter`
  (`src/content-engine/types.ts`), the build script's frontmatter emission, and enforced at build
  time (`scripts/build-search-index.mjs`): a `series` without a valid numeric `seriesOrder`, or two
  parts sharing an order, fails the build — same fail-loud philosophy as the existing `related`/tag
  checks. New `src/components/content/SeriesNav.tsx` renders the "Part N of M in `<series>`" badge
  plus prev/next-in-series links on `ArticleHeader`, fetching the full cross-collection index
  (unlike `ArticleNav`'s single-collection prev/next) since a series can span collections.

- No content currently sets `series:` — this is infrastructure ahead of use, not a feature with
  existing content behind it. The next multi-part write-up (§5.3/§5.4) is the first real test.
  **Update (2026-09-07, §7.1): no longer true** — see below.

### 5.7 ✅ Build hygiene + search scale — DONE (2026-08-28, one fixed now / one deferred with a stated trigger)

- **Fixed: `lastBuildDate` churned every feed on every build**, regardless of whether content
  changed — `scripts/build-search-index.mjs`'s RSS builder used `new Date().toUTCString()`
  unconditionally. Confirmed before the fix: rerunning the build with zero content changes still
  dirtied 7 files under `public/feeds/`. Now derives it from the newest doc's `date` in that feed's
  own scope (`docs[0].date`, since `docs` is already sorted newest-first) instead of wall-clock
  time — confirmed deterministic by diffing two consecutive builds byte-for-byte with no content
  changes. Makes `chore(build)` commits actually diff-clean when nothing changed, which is the whole
  point of Decision 3's commit-separation rule.

- **Deferred, with a stated trigger (not urgent): `search-index.json` scale.** Measured at 187 KB /
  38 docs (~4.9 KB/doc) as of this pass, projecting to ~490 KB at 100 articles — not worth acting on
  at the "deep, not wide" pace this phase commits to. Revisit if/when the corpus crosses ~100
  articles or the file crosses ~500 KB, per the same measure-before-acting discipline as
  `.ai/audit-followups.md` item 7.

### 5.8 ✅ Real benchmark harnesses — DONE (2026-08-27, closed the largest remaining credibility gap)

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

**3/3 done: `go-vs-ts-concurrency`.** Real harness at `benchmarks/go-vs-ts-concurrency/` (Go +
Node, no external services, `./run.sh` runs in well under a minute). This one **reversed the
finding's direction, not just its magnitude**: the old claim said the memory gap widens with scale
("balloons to nearly 500MB"); the real, measured result is that it narrows (10.3x at 1k tasks -> 1.2x
at 50k), because Node's footprint is dominated by a roughly fixed ~50MB runtime baseline while Go
scales closer to linearly per task. The article's "Key Observations" section was rewritten, not
just its numbers updated, since the old narrative was directionally wrong.

All three harnesses closed the exact gap Phase 4 flagged: every `measured` lab now imports a
committed `results.json` from a real, runnable harness instead of a hardcoded `DATASET`.
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

---

## 🟢 Phase 6 — Post-Growth Hygiene (2026-08-28)

After Phase 5 grew the corpus from 34 to 45 articles and 9 to 12 labs, this pass audited what that
growth left stale or untested — not new content, but keeping the infrastructure honest about itself,
the same discipline Phase 4 applied to benchmark provenance and this phase applies to its own prior
output.

**Findings and fixes, each verified rather than assumed:**

1. **`/graph` and `.ai/knowledge-graph.md` were stale.** Every Phase 5 addition (3 labs, 2 research
   pieces, 1 system-design piece) was invisible on the Ecosystem Graph page — confirmed by reading
   the actual `graphDefinition` string, not inferred. Fixed: two new concept nodes (API Gateway /
   Rate Limiting, Observability) linked to Aegis; the "High-Performance Go Backend" reading path
   extended with the new ADR/gateway/lab steps; a new "HFT Research Platform" reading path added for
   QuantAlpha, which previously had a graph node but no reading path at all.
2. **A real bug: `related:` could reference the article that declares it.** Writing a test for
   `getRelatedArticles` (see finding 3) surfaced that curated links were filtered for validity and
   draft status but never for `slug !== currentSlug` — an accidental self-reference would render an
   article in its own "Read Next" section. Fixed at both layers: `getRelatedArticles` now excludes
   it defensively, and `build-search-index.mjs` rejects it outright, same fail-the-build precedent
   as every other `related:`/tag/series validation.
3. **`getRelatedArticles` and `routeForCollection` had no tests**, despite `getRelatedArticles`'s
   curated-then-scored ordering being named explicitly in the original Phase 4 cross-cutting-track
   plan as worth testing. Added `content-service.test.ts` (6 tests, including the self-reference fix
   above) and `format.test.ts` (8 tests).
4. **`.ai/audit-followups.md` item 8 (Card/Badge dedup) re-checked against its own bar, not
   eyeballed.** Grepped for the exact tag-pill `className`, found it byte-identical in three files —
   crossing the item's own "3+ occurrences, genuinely shared" threshold — and extracted
   `src/components/TagPill.tsx`. Three other similar-looking badges were deliberately left alone:
   each has a different padding/weight/casing treatment, and forcing them into one component would
   have added the complexity item 8 warns against, not removed it.
5. **Item 7 (build-time Markdown rendering) re-measured, not re-guessed.** The markdown/mermaid
   pipeline chunk grew only 509→521 KB (2.4%) while the corpus grew 33→45 articles (36%) — confirming
   this is a fixed library cost, not a per-article one. Corrected the item's own stated trigger so a
   future pass doesn't act on the assumption that corpus growth alone should move this number.
6. **`todo.md`'s open "add project screenshots" item marked blocked, not left silently stale.**
   Aegis, Core Banking, and QuantAlpha are separate repositories that don't exist as local checkouts
   in this environment (unlike PFM) — there is no running system here to screenshot without first
   cloning and standing up each one from scratch. Same class of blocker as §5.2's PFM screenshots,
   documented with the same honesty rather than left as an unexplained stale checkbox.

**Verification:** typecheck, lint, vitest (7 files / 71 tests, up from 5 files / 57), build+prerender
(105 pages), check-contrast (104 routes × 2 themes, PASS), check-responsive (105 routes × 7
viewports + dark pass, 0 failures — a handful of `ERR_NETWORK_CHANGED` retries along the way,
consistent with the flaky-WSL2-network pattern `check-responsive.mjs`'s own comments already
document, not a real regression; confirmed by re-running clean).

**Deliberately not touched, with reasons already on record:** WebKit/Safari validation (item 6 —
still requires root-level system deps unavailable non-interactively in this environment);
`rehype-sanitize` (item 3 — content trust model unchanged); custom domain (original Phase 4 Batch
6 — depends on the user actually purchasing a domain); PFM/Aegis/Core Banking/QuantAlpha deepening
(§5.2 — blocked, see that section).

**No further work is queued.** Phase 6 was a hygiene pass triggered by Phase 5's growth, not a new
content plan — the next content-shaped decision (whether to shift from "deep, not wide" toward more
cadence now that the §5.5–§5.7 infrastructure exists to support it) is a strategic call for Khoa to
make, not one this session should decide unilaterally.

## 🟢 Phase 7 — Deep-Not-Wide, Picked Up Item by Item (2026-09-07)

Khoa answered Phase 6's open pace question directly: **stay deep-before-wide**, not shift to cadence.
Work in this phase comes one at a time from `future.md`'s Track B, cheapest/lowest-risk first, each
verified in full before the next is picked up — no batch commitment, per that file's own rules.

### 7.1 ✅ First real use of `series:` — DONE (2026-09-07)
§5.6 shipped `series:`/`seriesOrder:` and `SeriesNav` on 2026-08-28 with zero content exercising it.
Retrofitted the three benchmark-harness rewrites (§5.8) as a series — `redis-vs-bullmq` (part 1),
`db-event-replay-benchmark` (part 2), `go-vs-ts-concurrency` (part 3) — named "The Benchmark
Rewrites", matching the actual re-measurement order documented in §5.8, not publish-date order.
Metadata-only change; no article prose touched.

Verified rather than assumed: build-time `series`/`seriesOrder` validation passed; the prerendered
HTML for all three articles was grepped directly and shows the correct "Part N of 3 in The Benchmark
Rewrites" badge; full gate (typecheck, lint, 77 tests, build+prerender 106 pages, `check:contrast`
105×2 themes, `check:responsive` 106×7 viewports+dark) all green. `check:responsive` needed a
concurrency drop to 1 to complete under unusually heavy host CPU contention this session (multiple
concurrent Claude Code sessions on the same sandbox) — not a code issue, and the same mitigation this
project has used before for WSL2 network flakiness.

Also fixed in service of this item's own verification, not part of the feature itself: see
`.ai/decision-log.md` Decision 22 — `check-contrast.mjs` was found to print a false "PASS" when the
preview server was unreachable.

`future.md`'s Track B entry for this is removed; the "PFM as a content source" entry was already
removed in Decision 22.

### 7.2 ✅ New lab: Leader Election (Bully algorithm) — DONE (2026-09-07)
Track B's other cheap candidate after §7.1 — a self-contained lab needing no Docker harness, same
"pure algorithm + interactive visualization" shape as the rate-limiting and gossip labs.

**Shipped:** `src/labs/leaderElection.ts` implements the real Bully algorithm (Garcia-Molina,
1982) — crashing the leader in `/labs/leader-election` sends real ELECTION/ALIVE/COORDINATOR
messages, computed as a breadth-first wave so concurrent sub-elections (multiple alive nodes each
independently challenging ids above them) are modelled correctly, not simplified into one linear
chain. 9 unit tests, including one asserting the algorithm's well-known O(n²) worst-case message
cost more than doubles when node count doubles — a real property of the simulation's own output,
not a number asserted only in the companion article's prose. Companion article
(`content/experiments/2026-09-07-leader-election-bully-algorithm.md`) contrasts Bully's
unconditional-highest-id-wins rule and lack of split-brain protection against Raft/ZAB, per
`.ai/writing-style-guide.md`'s comparison-table convention.

Registered as the 13th lab (`src/labs/registry.ts` + `lab-ids.json`, parity enforced by
`registry.test.ts`), provenance `implementation`.

Verified: build-time tag/related validation clean; typecheck/lint/86 tests green; full
build+prerender (108 pages) confirmed correct title/og:image/canonical for both the new lab and
article routes and the article's CTA link resolves; `check:contrast` (107×2 themes) and
`check:responsive` (108×7 viewports+dark) both real PASS against a live preview server — both
needed `--concurrency=1` this session due to unusually severe, fluctuating host CPU contention
(load average observed as high as ~25, later dropping to ~2 on the same host with no code change),
confirmed by direct `uptime`/`ps` inspection to be other concurrent processes, not a regression.

`future.md`'s Track B entry for this is removed.

### 7.3 ✅ 4th real benchmark harness: PgBouncer vs Direct Postgres — DONE (2026-09-07)
The last concretely-scoped Track B candidate. Chosen over the gRPC-vs-REST alternative because it
needed no protobuf toolchain — just standard Postgres/PgBouncer Docker images plus a Go client,
lower setup risk in this sandbox.

**Shipped:** `benchmarks/pgbouncer-vs-direct/` — Postgres 16 + PgBouncer 1.16 (built from source via
apt, not a third-party Docker Hub image, to avoid depending on one), one Go client measuring two
connection lifecycles (`churn`: a fresh connection per query; `persistent`: one connection reused
per client) at client concurrency 10/25/50. `./run.sh` reproduces the full 12-run matrix.

**The finding is genuinely two-sided, not a flat "add a pooler" answer:** in `churn` mode
PgBouncer's throughput advantage *widens* with concurrency (3.9x -> 5.1x -> 7.2x), because every
direct connection forces Postgres to fork a new backend process and PgBouncer's fixed pool absorbs
that cost; in `persistent` mode the result *reverses* between low and high concurrency (PgBouncer
edges out direct on throughput at 10/25 clients despite worse latency, then direct wins both
cleanly at 50 clients), because PgBouncer's own single event loop becomes the bottleneck once there
is no setup cost left to amortize. Both directions were verified by direct execution, not assumed.

**Two real bugs found and fixed while building the harness, before any number was trusted:**
1. PgBouncer refused to run as the container's root user (`FATAL PgBouncer should not run as root`)
   — fixed by running as the `postgres` system user the `postgresql-client` package provides, with
   config files explicitly `chown`'d to it.
2. Every PgBouncer-target run crashed with `pq: unsupported startup parameter: extra_float_digits`
   — `lib/pq` always sends that startup parameter and PgBouncer only forwards a fixed whitelist by
   default; fixed with `ignore_startup_parameters = extra_float_digits` in `pgbouncer.ini`. Neither
   bug was guessable from documentation; both were found by actually running the harness.

Also bumped this harness's Postgres healthcheck budget (30s -> 90s) after a real, reproducible
failure: the official Postgres image's two-phase startup (temp start for initdb, shutdown, real
restart) exceeded the 30s budget other harnesses in this repo use, under this session's confirmed
heavy host CPU contention.

Registered as the 14th lab (`pgbouncer-vs-direct`, provenance `measured`, `caveat` naming the same
host-contention caveat as the README). Companion article contrasts churn vs persistent guidance and
names PgBouncer's real, distinct connection-limit-protection benefit that this harness doesn't
measure (a reliability property, not a throughput one).

Verified: build-time validation clean; typecheck/lint/86 tests green; full build+prerender (110
pages) confirmed correct metadata for both new routes; `check:contrast` (109×2 themes) and
`check:responsive` (110×7 viewports+dark) both real PASS at `--concurrency=1` against a live preview
server.

`future.md`'s Track B "4th real benchmark harness" entry is removed — Track B is now empty of
concretely-scoped items; only the not-yet-scoped distributed-systems gaps (distributed locks,
backpressure, CDN/edge caching, canary deploys) remain, and picking any of those up should start
with scoping, not assuming leader-election's or this harness's shape fits automatically.

### 7.4 ✅ New lab: Distributed Locks (Redlock) — DONE (2026-09-07)

Picked up "distributed locks (Redlock)" from the residual, not-yet-scoped candidates §7.3 left
open — the first of that list to actually get scoped and built, chosen over backpressure/CDN/canary
because it's the closest sibling to §7.2's leader-election shape (simulate a real, debated
distributed-systems algorithm) and needs no new tooling, unlike gRPC-vs-REST.

`src/labs/redlock.ts` (13 tests) runs the actual Redlock arithmetic, not a description of it, in
two stages:

1. `attemptRedlockAcquisition` — real majority-quorum math (`floor(n/2)+1`), real elapsed-time
   accounting across every node attempt (a down node costs a fixed acquire timeout, an alive one
   its own latency), and a lock only counts as acquired if quorum is met *and* there's TTL validity
   left over once acquiring it is paid for.
2. `simulatePauseAfterAcquire` — the specific flaw Martin Kleppmann's 2016 critique centers on: a
   client pause (GC, slow disk, descheduled VM) between acquiring the lock and finishing the work it
   guards can run past the TTL, and the lock expires on the storage side while the client still
   believes it holds it. The lab ties `secondClientCanAcquire` to `lockExpiredDuringPause` as an
   exact equality, not a probabilistic hedge — nothing about "client A is still running" keeps a key
   held once the storage nodes' own clock lapses.

**The finding is genuinely two-sided, same as §7.1-7.3's pattern of not settling for a flat
answer:** Stage 1 confirms Redlock's quorum-plus-TTL math is real and works as specified — a
minority of down nodes doesn't block acquisition, and a majority reached too slowly correctly fails
even with every node alive. Stage 2 confirms Kleppmann's critique is also real, as an exact,
testable equality rather than an assertion. The article's own resolution: Antirez's rebuttal to
Kleppmann doesn't actually dispute the pause scenario — it disputes what Redlock ever claimed to
guarantee (efficiency locking, not correctness locking), and his own fix is the same one Kleppmann
proposes independently: a fencing token checked by the *protected resource*, not the lock layer,
since the lock layer's own clock is exactly what a long pause defeats.

One incidental bug fixed along the way, found by reading the registry rather than by a failing
check: `leader-election` and `pgbouncer-vs-direct` both had `collidesWithArticleSlug: true` despite
their lab id *not* matching their article's slug (only `id === relatedArticle` should ever set this
flag — see the field's own doc comment). The likely cause was copy-paste from `websockets-vs-sse`,
where the flag is correctly true. Effect was silent, not broken: the field only suppresses the
`/experiments/<id>` -> `/labs/<id>` redirect stub, and neither lab had ever had that route exist
before, so nothing was actually unreachable. Fixed in `e6adf0d`, and confirmed fixed in the
prerendered output — `/experiments/redlock` (this session's third lab to get the correct flag from
the start) now genuinely produces the redirect stub the field's doc comment describes.

Registered as the 15th lab (`redlock`, provenance `implementation`). Verified: build-time
validation clean (49 docs); typecheck/lint/99 tests green; full build+prerender (112 pages)
confirmed correct title/og:image/canonical for both new routes, including the redirect stub;
`check:contrast` (111×2 themes) and `check:responsive` (112×7 viewports+dark) both real PASS. Build
was killed once by a real, severe spike in this session's already-documented host CPU contention
(load average 39 on 8 cores, from concurrent unrelated Go compiles) — re-ran once load dropped
rather than retrying into the same contention, consistent with this project's existing mitigation
pattern rather than a new one.

`future.md`'s "distributed systems gaps" residual note is narrowed to drop distributed locks —
backpressure, CDN/edge caching, and canary/blue-green deploys remain open, not-yet-scoped
candidates, alongside gRPC-vs-REST as a possible 5th harness.

### 7.5 ✅ New lab: Backpressure Strategies — DONE (2026-09-07)

Picked up "backpressure" from §7.4's remaining candidates — chosen over CDN/edge-caching and
canary/blue-green because it's algorithm-shaped rather than process-shaped, same reason redlock was
chosen over those two the round before.

`src/labs/backpressure.ts` (14 tests) runs four real policies for a bounded queue between a
producer and a slower consumer: `block`, `drop-new`, `drop-old`, `circuit-breaker`. The key design
choice: every queued item carries the tick it arrived on, instead of the simulation just tracking
counts. That turns out to be necessary, not decorative — under sustained overload, `drop-new` and
`drop-old` discard the exact same *number* of items every time, so counts alone can't distinguish
them. Tracking identity proves the real difference directly: every item `drop-new` discards has
`arrivedTick === tick` (it can only ever reject its own newest arrivals), every item `drop-old`
discards has `arrivedTick < tick` (it can only ever evict something already resident) —
`backpressure.test.ts` asserts both as exact per-tick properties, not just a final count.

**Two real bugs found while building this, neither guessable from reading the code once:**
1. A curly apostrophe (`’`) pasted into the new registry provenance string broke out of a
   single-quoted JS string literal — caught immediately by `typecheck`, fixed by matching this
   codebase's existing convention (switch the specific segment to double quotes rather than escape).
2. The circuit-breaker's state machine mutated `circuitState` *before* recording which state
   governed the current tick's admission decision, so the tick that actually tripped the breaker
   (admitting a full batch right up until threshold) was mislabeled as already "open" in its own
   output — a one-tick-out-of-sync bug between the transition and its own recorded label. Found
   while writing `backpressure.test.ts`'s "rejects everything while open" assertion, which failed
   against real output rather than being written to match whatever the code happened to do. Fixed
   by deciding each tick's admission strictly from the state it *entered* with (`stateAtStart`), and
   only mutating `circuitState` for the *next* tick afterward.

Registered as the 16th lab (`backpressure`, provenance `implementation`). Verified: build-time
validation clean (50 docs); typecheck/lint/113 tests green; full build+prerender (114 pages)
confirmed correct title/og:image/canonical for both new routes, including the redirect stub;
`check:contrast` (113×2 themes) and `check:responsive` (114×7 viewports+dark) both real PASS at
`--concurrency=1`.

`future.md`'s "distributed systems gaps" residual note is narrowed again — CDN/edge caching and
canary/blue-green deploys remain open, not-yet-scoped candidates, alongside gRPC-vs-REST as a
possible 5th harness.
