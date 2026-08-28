# Decision Log

This log captures major repository-level decisions that dictate the architecture of the portfolio itself (not the projects it showcases).

## Decision 1: Custom JAMstack over Next.js
**Date:** 2026-06-25
**Decision:** Built a custom static site generator using Vite, React, and `import.meta.glob` instead of using a heavy framework like Next.js or Astro.
**Rationale:** The portfolio only needs client-side routing and static markdown parsing. Introducing Next.js SSR would require a Node server or complex static export configurations. Vite offers lightning-fast HMR and a minimal footprint.
**Consequences:** We must manually manage SEO (via `react-helmet-async` or similar) and we had to write our own `build-search-index.mjs` script to generate sitemaps and search indexes.

## Decision 2: Mermaid for Architecture Diagrams
**Date:** 2026-06-26
**Decision:** Standardized on Mermaid.js embedded within Markdown code blocks for all architecture diagrams.
**Rationale:** Traditional images (PNG/SVG exported from Draw.io or Excalidraw) are impossible to version control natively and difficult for AI agents to update. Mermaid charts are pure text, making them trivial to diff, update, and maintain.
**Consequences:** We are constrained by Mermaid's layout engine, which can sometimes be finicky with spacing or complex nested subgraphs.

## Decision 3: Separation of Generated Artifacts in Git
**Date:** 2026-06-28
**Decision:** Generated assets (`public/search-index.json`, `public/og/`, `public/feeds/`, `public/sitemap.xml`) must be committed separately from feature code, typically in a `chore(build)` commit.
**Rationale:** Bundling thousands of lines of auto-generated JSON or XML changes into a `feat(content)` commit obscures the actual Markdown changes, making code reviews and history tracking impossible.
**Consequences:** AI agents must explicitly exclude these files from feature commits and follow up with a dedicated chore commit.

## Decision 4: Split the Generated Index into a Lean and a Full Artifact
**Date:** 2026-08-11
**Decision:** `build-search-index.mjs` now emits `content-index.json` (every field except `searchableText`) alongside the original `search-index.json` (which also includes `searchableText`, i.e. the full article body). List pages, detail pages, related-articles, and prev/next all fetch the lean file; only `/search` fetches the full one.
**Rationale:** `search-index.json` embeds every article's full body so Fuse.js can full-text search it. Measured on the 33-document corpus: 252 KB whole vs 24 KB without `searchableText`. Every route other than `/search` was downloading that whole 252 KB just to render title/date/summary cards.
**Consequences:** Two generated JSON files now need pruning/regenerating together — `build-search-index.mjs` writes both in one pass, so this is automatic. Any future consumer that only needs list-page fields should fetch `content-index.json`, not `search-index.json`.

## Decision 5: Interactive Labs Moved to `/labs/*`
**Date:** 2026-08-11
**Decision:** The nine interactive lab pages (`src/pages/experiments/*Page.tsx`) now route at `/labs/<id>` (registered from `src/labs/registry.ts`), not `/experiments/<id>`. Old `/experiments/<id>` URLs redirect to `/labs/<id>`, except for the three ids that are also a real article slug (`event-sourcing-replay`, `go-vs-ts-concurrency`, `db-event-replay-benchmark`), which have no redirect so `/experiments/:slug` can render the article.
**Rationale:** `/experiments/<lab-id>` and `/experiments/:slug` (the markdown article route) occupied the same path shape. Because React Router ranks a literal path above a dynamic `:param` regardless of declaration order, the lab route always won — four experiment articles with a lab-matching slug were permanently unreachable, present in the search index and sitemap but never rendered.
**Consequences:** A new lab's id must not collide with an existing `/experiments` article slug unless it's flagged `collidesWithArticleSlug: true` in the registry (which also skips its redirect). `scripts/build-search-index.mjs` keeps a hardcoded copy of the lab id list (`labIds`) for the sitemap, since a plain Node script can't import `registry.ts` — keep the two in sync when labs are added or removed.

## Decision 6: Snapshot Prerendering Instead of a Client-Only SPA
**Date:** 2026-08-26
**Decision:** `npm run build` now ends with `scripts/prerender.mjs`, which loads every route in
headless Chromium and writes the rendered DOM to `dist/<route>.html`. `dist/404.html` becomes a real
prerendered "Page not found" page, and the six legacy `/experiments/<labId>` paths get static
redirect documents (canonical + meta refresh) instead of relying on React Router's `<Navigate>`.
**Rationale:** As a client-rendered SPA on GitHub Pages, every deep link was served by
`public/404.html`. Verified against production before the change:

```
$ curl -sI  .../portfolio/blog/grpc-service-mesh-in-go-aegis-architecture   ->  HTTP/2 404
$ curl -s   .../portfolio/blog/grpc-service-mesh-in-go-aegis-architecture   ->  <title>Redirecting…</title>
```

51 of the 52 URLs in `sitemap.xml` answered **404** with no description, no canonical, and no
`og:image`. Social crawlers do not execute JavaScript, so every shared article produced a blank,
title-less card, and the site was effectively one indexable page. The 33 OG images generated by
`build-search-index.mjs` were unreachable dead weight.

Snapshotting was chosen over `react-dom/server`: SSR would require `StaticRouter`, an SSR-safe
replacement for `useSeo`'s imperative `document.head` mutation, Node-side handling of
`content-index.ts`'s runtime `fetch()`, and a browser shim for mermaid — i.e. rewriting the content
engine, which Decision 1 and the constitution require a separate ADR for. Snapshotting delivers the
same crawler-visible result with no change to the app.

Output is `<route>.html`, not `<route>/index.html`: GitHub Pages resolves an extensionless request
to the sibling `.html` file with a 200 and no redirect (verified: `/portfolio/404` -> 200), so
existing canonical URLs and sitemap entries needed no trailing-slash migration.
**Consequences:**
- Chromium must be installed before `npm run build`, not just before the responsive check — CI
  installs it earlier in the job for this reason.
- Prerender **fails the build** if any route ships without its own title, canonical, `og:image`, or
  meta description, or if a mermaid error box is present. Same philosophy as the existing `related:`
  validation: a silent metadata regression is exactly what this prevents.
- Absolute URLs are built at runtime from `window.location.origin`, so the script rewrites the local
  server origin to the real one before writing. Shipping a canonical tag pointing at localhost would
  be worse than the 404s this replaces; the script hard-errors if any `127.0.0.1` survives.
- This does **not** close `.ai/audit-followups.md` item 7. The ~159 KB gzip markdown pipeline still
  ships, because the client still recompiles the article after first paint. Serving precompiled HTML
  as data is a separate, later change.

## Decision 7: One Source of Truth for Site URL and Lab Ids
**Date:** 2026-08-26
**Decision:** `site.config.mjs` (origin, base path, title, description) and
`scripts/lib/site-routes.mjs` (collections, lab ids, static routes, article routes) are now the only
places those values live. The nine lab ids moved to `src/labs/lab-ids.json`.
**Rationale:** `siteUrl` was hardcoded in four files and the lab-id list was hand-mirrored in three,
each with a comment acknowledging the duplication. `scripts/prerender.mjs` would have been the
fourth copy of the lab list — and unlike the others, a missing id there means an article silently
ships without prerendered metadata.
**Consequences:**
- `registry.ts` still owns the lab *definitions* (title, description, lazy component), which can't
  live in JSON. Parity with `lab-ids.json` is enforced by a unit test rather than a runtime check,
  so nothing extra ships to the browser.
- `basePath` in `site.config.mjs` must stay in sync with `base` in `vite.config.ts`. Vite bakes that
  value into asset URLs at bundle time, so it can't be imported from a `.mjs` module without making
  the TS config depend on one.
- Whether a legacy `/experiments/<labId>` path needs a redirect is now *derived* (a lab id collides
  exactly when `/experiments/<id>` is also a real article route) instead of being a second encoding
  of `collidesWithArticleSlug`.

## Decision 8: Theme via a Tokenised Palette, Not `dark:` Variants
**Date:** 2026-08-26
**Decision:** The Tailwind palettes (`slate`, `teal`, `emerald`, `sky`, `rose`, `amber`, `indigo`)
resolve to CSS variables defined under `:root` and `.dark` in `src/index.css`. Existing classes like
`bg-slate-50` and `text-slate-900` keep their names and become theme-aware. Alongside them sit role
tokens — `surface`, `inverse`, `panel`, `accent`, `danger`, and the `code-*` family — for the cases
one reversible ramp cannot express. `darkMode: 'class'`, with an inline bootstrap in `index.html`
setting the class before first paint.
**Rationale:** There were 885 colour classes across 43 files and zero `dark:` variants, despite the
constitution listing dark mode as a thing not to break. Hand-adding a variant to each was not
realistic, and would have doubled the size of every className. Making the palette itself the
variable layer inverts the cost: one file defines the theme.

Light values are the literal Tailwind v3 ramps, so light mode is unchanged — that equivalence is the
safety net for a change this wide. The neutral dark ramp is hand-tuned rather than mirrored, because
a naive mirror sends `slate-400` (34 uses) to `#475569`, unreadable on a `#020617` page.
**Consequences:**
- Some steps carry two different roles and cannot both invert. `bg-slate-900 text-white` is a
  primary button in one place and a dark display panel in another; inverting the ramp turns the
  first into white-on-white. Those ~30 call sites were rewritten to role tokens instead.
- **The code and diagram surfaces deliberately do not follow the theme.** The syntax palette is One
  Dark, tuned for a dark background, so `pre` is pinned dark in both themes. Conversely 20 Mermaid
  `classDef` rules across 12 content files hardcode light fills like `fill:#f0fdf4`, so the diagram
  card is pinned light — switching Mermaid to its dark theme would pair its light label colour with
  those light fills. A reader sees the same diagram in either theme.
- `scripts/prerender.mjs` snapshots with `colorScheme: 'light'` forced and asserts no `dark` class
  is baked in, since the theme is a per-visitor preference and the bootstrap applies it before paint.

## Decision 9: Contrast Is Measured in CI, Not Asserted
**Date:** 2026-08-26
**Decision:** `scripts/check-contrast.mjs` walks every visible text node on every route in both
themes, resolves the effective background through translucent ancestors, and fails on anything below
WCAG AA. Wired into CI after the responsive check.
**Rationale:** `.ai/audit-followups.md` item 2 flagged ~44 `text-slate-400` occurrences as
"potentially borderline" and correctly refused to change them blind — but that left the question
open, and adding a hand-tuned dark ramp made "these values look legible" an untenable position.

The first run found 26 light and 10 dark failures. Most were **pre-existing light-mode defects**,
not dark-mode regressions: `text-teal-600` at 3.58:1 on 53 routes, the footer at 2.51:1, white on
`teal-600` buttons at 3.74:1. It also surfaced two bugs nothing else had caught — see Decision 10.
All are now fixed; the corpus measures clean in both themes.
**Consequences:**
- Item 2 of `.ai/audit-followups.md` is closed with data. The classification it asked for was done
  by measurement: every flagged `text-slate-400` node carried real information, so all 33 moved to
  `slate-500` — except inside `bg-panel`, where that bump made contrast *worse* and the fix was the
  panel's own muted token.
- The script excludes SVG and Mermaid subtrees. SVG text paints with `fill` on shapes rather than
  CSS backgrounds, so the ancestor walk reports a meaningless 1:1 and floods the report.
- Report grouping keys on colour + size but must print the **worst** node's class, not the first
  one seen. An earlier version did the latter and attributed a 1:1 reading to markup that actually
  measured 3.58:1, which nearly sent a fix at the wrong file.

## Decision 10: Tailwind Scans `content/`
**Date:** 2026-08-26
**Decision:** `tailwind.config.js` now includes `./content/**/*.md`, and the article CTA buttons are
a component class (`.lab-cta`) rather than an inline utility string.
**Rationale:** The articles embed raw HTML for their "View the Interactive … Lab" buttons, so those
class names existed only in Markdown. Tailwind never scanned `content/`, so `bg-teal-600` — used in
8 content files — generated **zero** CSS rules. Every article's primary call to action had been
rendering as white text on the page background: invisible. Verified against the built CSS.

Adding the glob fixed the background but exposed a second layer: `.markdown-body a` (specificity
0,1,1) beats the `.text-accent-fg` utility (0,1,0), so the label kept the link colour and measured
1:1. A component class resolves the specificity properly and collapses eleven copies of an
unmaintainable class string into one name per variant.
**Consequences:** Class names used in Markdown are now live code. Renaming a utility used in an
article will change what the article renders, and the contrast check is what catches it.

## Decision 11: Origin Leak Check Matches the Exact Server Origin, Not "127.0.0.1"
**Date:** 2026-08-27
**Decision:** `scripts/prerender.mjs`'s post-rewrite safety check now asserts the snapshot doesn't
contain the exact server origin string (`http://127.0.0.1:<port>`), not the bare substring
`127.0.0.1`.
**Rationale:** Found by the prerender build itself, on the article that explains this exact
mechanism (`content/blog/2026-08-27-the-spa-google-never-saw.md`). That article's prose mentions
"127.0.0.1" as a topic — describing what `window.location.origin` resolves to during prerendering —
without that being a real leak; `rewriteOrigin()` had already correctly replaced every occurrence of
the actual port-qualified origin. The old check (`html.includes('127.0.0.1')`) couldn't distinguish
"this page discusses the string 127.0.0.1" from "this page leaked an unrewritten URL," and failed
the build on the former.
**Consequences:** A future article that mentions a raw IP, a port number, or any other string this
tooling treats as a safety signal needs the same scrutiny — a build-time assertion is only as
precise as what it actually compares, and "contains a suspicious substring" is weaker than "contains
the exact value that would indicate the real failure." This is now documented as its own field note
([A Diagram That Wouldn't Render](/field-notes/a-diagram-that-wouldnt-render) covers a sibling case —
Mermaid's HTML-entity parsing bug), and the pattern generalizes: prefer asserting against a known
exact value over a substring guess whenever one is available.

## Decision 12: First Real Benchmark Harness — redis-vs-bullmq
**Date:** 2026-08-27
**Decision:** `benchmarks/redis-vs-bullmq/` is a real, runnable Docker Compose harness (Go
producer/consumer using Redis Streams, Node.js/BullMQ worker, both driven by `run.sh`) that
reproduces the `redis-vs-bullmq` lab's dataset from a cold start. The lab
(`src/pages/experiments/RedisVsBullMQPage.tsx`) and the companion article now both derive their
numbers from the committed `results.json`, not a hardcoded `DATASET` constant.
**Rationale:** First of the three `measured` labs flagged in Phase 4 as running on a lost harness.
Per `.ai/prompts/benchmark-study.md`'s updated workflow: commit the harness before the visualizer.
**Consequences:**
- **The re-measurement doesn't reproduce the old numbers, and that's the honest outcome.** The
  original claim was a flat "4-5x" throughput advantage for Redis Streams. The real, measured result
  is payload-dependent: ~2.2-3x at 1-10 KB, widening to ~5.1-5.5x at 100 KB — because BullMQ's
  per-job Lua-script overhead is roughly fixed regardless of payload size, so it matters
  proportionally less as the payload itself gets more expensive to move. This is a more interesting
  finding than the flat multiplier it replaced, and it only exists because the harness is now real.
- **The environment is disclosed as different from the original, not silently substituted.** This
  run is a local x86_64 Docker Compose stack, not the AWS c6g.xlarge cited in the June 2026 version
  of the article — that machine and harness were gone. `benchmarks/redis-vs-bullmq/README.md` says
  so explicitly rather than implying continuity with a number that can no longer be checked.
- `src/labs/registry.ts`'s provenance entry gained a `harness` link and lost its `caveat` — the gap
  it named is closed. `db-event-replay-benchmark` and `go-vs-ts-concurrency` still carry theirs.

## Decision 13: Second Real Benchmark Harness — db-event-replay-benchmark
**Date:** 2026-08-27
**Decision:** `benchmarks/db-event-replay-benchmark/` is a real, runnable Docker Compose harness
(PostgreSQL 16 + the official Firestore emulator, driven by a Go harness and `run.sh`) that
reproduces the `db-event-replay-benchmark` lab's dataset from a cold start. Same pattern as Decision
12 — lab and article both now derive their numbers from committed `results.json`.
**Rationale:** Second of the three `measured` labs flagged in Phase 4. Uses Google's official
Firestore emulator (`google/cloud-sdk:emulators`) rather than a real Cloud Firestore project, which
needs no GCP credentials and is fully reproducible offline.
**Consequences:**
- **The re-measurement found a much larger gap than the old claim, not a similar one.** The old
  figures implied a flat ~7-8x Firestore penalty at every event count. The real, measured gap is
  19.6x-30.1x, and it scales with document count rather than staying flat — Postgres pays one
  per-query cost for its indexed range scan; Firestore pays a real per-document cost that grows with
  N. Both databases fold to the identical final balance at every event count (asserted implicitly:
  `finalBalance` and `eventsProcessed` match across databases in the committed `results.json`),
  which is the strongest evidence available that both measured paths are actually reading the same
  data rather than diverging on a bug.
- **The emulator-vs-production distinction is stated explicitly**, in both
  `benchmarks/db-event-replay-benchmark/README.md` and the article itself: the emulator has no real
  network latency to a Google data center, so the *absolute* milliseconds are "measured against the
  emulator," not a production SLA — but the *relative* shape (Firestore's cost scaling with document
  count, Postgres's not) is the actual architectural property being demonstrated, and that holds
  regardless of emulator vs. production.
- A Docker Compose healthcheck bug surfaced immediately on first run: the Firestore emulator image
  doesn't ship `wget`, only `curl`, so a `wget`-based healthcheck reported the service unhealthy
  despite the emulator running correctly (confirmed via its own logs). Fixed before any measurement
  was taken — worth naming because it's the same class of "the tool doesn't have the tool you
  assumed" mistake as Decision 11, just caught before it produced a bad number rather than after.
- Fixed two stale filename comments in `src/labs/registry.ts` while in this area:
  `collidesWithArticleSlug` comments for `db-event-replay-benchmark` and `go-vs-ts-concurrency`
  still referenced their pre-Phase-4 filenames (before the `YYYY-MM-DD-` prefix rename).

## Decision 14: Third Real Benchmark Harness — go-vs-ts-concurrency, and It Reverses the Finding
**Date:** 2026-08-27
**Decision:** `benchmarks/go-vs-ts-concurrency/` is a real, runnable harness (Go + Node.js, no
external services) that reproduces the `go-vs-ts-concurrency` lab's dataset. Same pattern as
Decisions 12-13. This closes all three `measured` labs flagged in Phase 4 — every one now imports a
committed `results.json` from a real harness instead of a hardcoded `DATASET`.
**Rationale:** Peak memory is read from `/proc/self/status`'s `VmHWM` — the Linux kernel's own
peak-RSS accounting — identically for both languages, rather than a periodic sample of
`process.memoryUsage().rss` (Node) or `runtime.MemStats` (Go) that could miss the true peak between
samples and bias the comparison before either program does anything.
**Consequences:**
- **This is the one harness rewrite that reversed the finding's direction, not just its magnitude.**
  The original article claimed Node "balloons to nearly 500MB" at 50,000 tasks against Go's "under
  50MB" — a gap that widens with scale. The real, measured result is the opposite: 10.3x at 1,000
  tasks, narrowing to 1.2x at 50,000. Node's memory is dominated by a roughly fixed ~45-50MB runtime
  baseline paid once regardless of task count; Go's baseline is a few megabytes with a per-task cost
  close to linear, so Go looks dramatically leaner at low concurrency and much less so at high
  concurrency — the opposite of where the old claim placed the gap.
- The structural explanation survives even though the specific numbers and their trend don't: a
  goroutine's small stack is still genuinely cheaper per-task than a Promise-plus-timer object. What
  doesn't survive is that this made the *absolute* gap larger at scale — it doesn't; it's smallest
  exactly where high concurrency is the actual point of choosing Go.
- The article's "Key Observations" section was rewritten, not patched — a direction-reversing
  finding can't be represented by swapping numbers into the old prose, since the old prose's own
  causal claim (Promises get proportionally worse at scale) is what the data contradicts.

## Decision 15: Tag Taxonomy, Enforced at Build Time
**Date:** 2026-08-27
**Decision:** `.ai/tag-taxonomy.md` and `scripts/lib/tag-taxonomy.mjs` define a canonical ~35-tag
vocabulary for `content/**/*.md`'s `tags:` frontmatter. `scripts/build-search-index.mjs` fails the
build if any article uses a tag outside it — the same enforcement pattern already used for `related:`
references. `/tags` and `/tags/:tag` (`TagsIndexPage`, `TagDetailPage`) give the corpus a
cross-collection browse surface for the first time.
**Rationale:** Measured, not assumed: 92 distinct tags across 38 articles, 56 (61%) used exactly
once. A tag used once cannot group anything, and tags were additionally only ever filterable within
a single collection (`ContentListPage`'s `selectedTag`) — there was no way to see everything tagged
`go` across `blog` + `research` + `system-design` at once. Building `/tags` on top of that vocabulary
without fixing it first would have shipped a browse page over noise.
**Consequences:**
- Migration was mechanical once the mapping was designed: a script applied a 90-entry mapping table
  across all 38 files, deduping per-article and printing every change for review. Confirmed
  idempotent (a second run reported 0 changes) before committing.
- Landed at 35 canonical tags, not the ~20-25 the roadmap's original note guessed at — real content
  breadth (`go`/`typescript`/`python` as genuinely distinct languages, `hft` vs `fintech` as
  genuinely distinct domains) justified not force-merging further into buckets too broad to mean
  anything. `.ai/tag-taxonomy.md` states this explicitly rather than silently missing its own target.
- Only 5 tags remain singletons, and each is a stated exception under rule 1 (a load-bearing concept
  the portfolio is actively building toward, e.g. `spec-driven-development`), not an oversight.
- The canonical list lives in code (`scripts/lib/tag-taxonomy.mjs`), not only in the prose doc — a
  duplicated list between a `.md` file and a script is exactly the kind of drift this decision exists
  to prevent elsewhere in the corpus.
- `/tags/:tag` routes are generated dynamically from whatever tags are actually in use (via
  `readTagRoutes()` in `scripts/lib/site-routes.mjs`, mirroring `readArticleRoutes()`), not from a
  fixed list — so the sitemap, prerender, and responsive/contrast checks all stay correct as tags are
  added or removed, the same self-maintaining property `lab-ids.json` already has for labs.

## Decision 16: Series Is Cross-Collection, Not Scoped Like `collection`

**Context:** §5.6 added optional `series`/`seriesOrder` frontmatter so a future multi-part
deep-dive (e.g. a 3-part Rate Limiting series, or a benchmark-harness rewrite spanning one
`experiments` post and one `blog` retrospective) has somewhere to declare itself as one part of a
whole. `ArticleNav.tsx`'s existing prev/next pattern is scoped to a single `collection` via
`getContentIndex(collection)` — reusing that scope for series would have silently broken the moment
a series' parts landed in different collections.

**Decision:** `SeriesNav.tsx` fetches the full cross-collection index (`getAllContentIndex`) and
filters by `series` client-side, rather than adding a `series`-scoped variant of
`getContentIndex`. `seriesOrder` is build-time enforced in `scripts/build-search-index.mjs`: a
`series` without a valid numeric `seriesOrder`, or two parts sharing an order, fails the build —
same fail-loud philosophy Decision 5's `related:` validation and Decision 15's tag validation
already established, rather than letting a typo render an empty or wrong badge silently.

**Consequences:**
- No content sets `series:` yet — this ships as infrastructure ahead of use, the same posture as
  `getLatestContent` before it was wired in (see §5.6). The build-time check has no series to
  validate today; it activates the first time a `series:` frontmatter field appears.
- `PortfolioHome.tsx` gained a "Recently Published" strip in the same pass, finally importing
  `getLatestContent(4)` — previously implemented, fully untested by any consumer.
- `scripts/build-search-index.mjs`'s `lastBuildDate` was also fixed in this pass (derived from the
  newest doc's date instead of `new Date()`), closing §5.7 — confirmed deterministic by diffing two
  consecutive builds with zero content changes.

## Decision 17: Corrected §5.3's Blog-Post Attribution Before Writing It

**Context:** `.ai/content-roadmap.md` §5.3 queued "Blog: The Hidden Costs of Cloud Functions —
cold starts and connection pooling from the Core Banking project on Firebase," written during an
earlier planning pass. Before drafting it, `content/projects/core-banking.md` was checked for the
Firebase Functions details the post would need — it has none. Core Banking is a Go service using
Firestore as an event store; nothing in that project's content ever describes it as deployed via
Firebase Cloud Functions. Writing the post as scoped would have fabricated a project fact this
phase has spent its entire length hardening against (the benchmark-provenance work in §5.8, the
positioning honesty in earlier phases) — inventing a specific incident on a project it never
happened on is a worse version of the same failure mode.

**Decision:** Retarget the post at the one real Firebase-Functions project in the corpus —
SeensioGO, via `content/field-notes/2026-06-03-why-i-chose-firebase-functions-over-cloud-run.md`
— and write it as an explicit, cross-linked follow-up rather than a standalone claim. Both of its
two "hidden costs" (stacked cold start, connection-pool arithmetic under Gen 2's `concurrency: 80`
model) are derived directly from that field note's own published code sample, not from a new,
unverifiable claim about a system that never ran this way.

**Consequences:**
- The roadmap entry itself was corrected in the same edit that marked §5.3 done, rather than
  silently writing around the error — same transparency convention as marking §5.2 blocked instead
  of skipped.
- The post explicitly states it is *not* a reversal of the original Firebase-Functions-over-
  Cloud-Run decision — deepening an existing decision's cost model is a different, and lower-risk,
  claim than "this decision was wrong," and conflating the two would have overstated the finding.
- General pattern for the rest of Phase 5: a queued roadmap note is a starting point, not a
  license — the project it names still has to actually support the claim before it gets written.

## Decision 18: WebSockets-vs-SSE — Memory Is Close, Connect-Time Is Not Trusted

**Context:** `.ai/content-roadmap.md` §5.4 queued a WebSockets vs SSE benchmark with an explicit
instruction to write the harness *before* the article, per §5.8's lesson. The harness
(`benchmarks/websockets-vs-sse/`) is one Go binary in two roles (server/client) so both transports
share a language and process model — isolating the transport itself from the kind of
language/runtime confound `go-vs-ts-concurrency` measures separately.

**What the harness found:** peak server memory for holding N connections open is close between the
two transports at every point tested, and SSE is consistently the *slightly heavier* one (137.5MB
vs. WebSocket's 122.2MB at 5,000 connections, as re-measured 2026-08-28 after the harness fixes Decision 21 describes) — the opposite of the common "SSE is the lighter, simpler transport"
assumption. The likely cause is stated plainly rather than oversold: this
harness's SSE handler carries a `bufio.Reader` and manual header-parsing state per connection that
the `gorilla/websocket` path doesn't, which is a property of this implementation, not a proven
property of the wire protocols.

**A second, more consequential finding, about the harness's own connect-time metric:** a manual
re-run at the 5,000-connection point reversed which transport was faster, twice, on the same host.
Opening 5,000 concurrent connections from one client process is sensitive to scheduling and
file-descriptor pressure this harness doesn't isolate from what it reports.

**Decision:** commit `connectMs` in `results.json` for transparency, but do not draw any conclusion
from it in the article, the lab's copy, or this log. The lab UI itself carries an explicit
"unreliable at scale" caveat next to the number rather than omitting it silently or presenting it at
face value.

**Consequences:**
- This is a stronger form of the honesty discipline Decisions 12-14 established: those said "here is
  what we measured, and here is the environment's limits." This one says "we measured two things,
  and are actively withholding a conclusion from one of them because we checked it twice and it
  didn't hold up" — a higher bar than stating an environment caveat once and moving on.
- The harness README states the exact reproduction steps that produced the reversal, so a reader can
  verify the instability themselves rather than taking the claim on faith.

## Decision 19: A Confirmed 0px-Bar Bug, Found by Screenshotting the New Page in the Old Style

**Context:** While visually verifying the new WebSockets-vs-SSE lab page (built by copying the
existing bar-chart pattern from `GoVsTsConcurrencyPage.tsx`), a screenshot showed the numeric labels
rendering correctly but the colored bars themselves invisible — 0px tall regardless of the
underlying value. Screenshotting the *existing, already-shipped* `go-vs-ts-concurrency` lab to check
whether this was a bug in the new code or an inherited one confirmed: the bars have never rendered
in that lab either, nor in `RedisVsBullMQPage.tsx`'s two charts (same pattern, same bug) — three
existing charts across two already-published pages, invisible until this pass.

**Root cause:** each bar's `style={{ height: 'N%' }}` needs a definite-height ancestor to resolve a
percentage against. The immediate parent (a `flex-col` column wrapping the label, bar, and caption)
sits inside a row container styled `items-end`, not `stretch` — so that column is auto-height
(shrink-to-fit), not the row's fixed `h-64`. A percentage height inside an auto-height ancestor
resolves to 0 per the CSS spec; the row's own `h-64` never reaches the bar because of the
intermediate auto-height column.

**Decision:** wrap each bar in its own fixed-height track (`h-48`) with `items-end`, so the
percentage has a definite ancestor to resolve against and the bar still visually "grows from the
bottom." Fixed in the same pass, in all three affected charts across `GoVsTsConcurrencyPage.tsx`,
`RedisVsBullMQPage.tsx`, and the new `WebSocketsVsSsePage.tsx` — not just the new one — since leaving
a confirmed, reproduced defect in already-shipped pages after discovering it would have been the
exact kind of omission this whole phase has worked against.

**Consequences:**
- Verified visually (screenshot before/after) rather than assumed fixed from reading the CSS — the
  same discipline `check-contrast.mjs`/`check-responsive.mjs` already enforce mechanically, applied
  here to something neither script checks (a bar rendering at a wrong but layout-valid size doesn't
  trip an overflow or contrast failure).
- No user-facing regression window: both pre-existing pages were already live with invisible bars,
  so this is a pure improvement with no compatibility risk to reason about.

## Decision 20: A Missing Test Surfaced a Real Self-Reference Bug in `related:`

**Context:** Phase 6 audited test coverage against the original Phase 4 cross-cutting-track plan,
which had named `getRelatedArticles`'s curated-then-scored ordering as worth testing but never
actually got one. Writing that test required a fixture and a call with `curatedRelated` including
the article's own path — a case no existing test or manual QA pass had exercised — and it exposed
that `getRelatedArticles` filtered curated links for validity (`bySlugPath.get(ref)` existing) and
draft status (`shouldInclude`) but never for `item.slug !== currentSlug`. An accidentally
self-referential `related:` entry would have rendered an article inside its own "Read Next" section.

**Decision:** fix at both layers, not just one. `getRelatedArticles` now excludes `currentSlug` from
curated results directly (defense-in-depth, matching the same exclusion already applied to the
tag-scored and fallback-padding paths). `scripts/build-search-index.mjs` also now rejects a
self-referential `related:` entry outright, alongside its existing bad-reference and duplicate-tag
checks — the stronger fix, since it prevents the mistake from ever landing rather than only
suppressing its effect at render time.

**Consequences:**
- No content in the corpus currently has this mistake — this is a defect that never manifested, not
  one that was silently live. It was found because a test was finally written for a function
  identified as risky three phases ago, not because a reader reported it.
- Restates the same lesson as Decision 5 (slug/route mismatch) and Decision 15 (tag taxonomy): a
  content-authoring field with no build-time enforcement is a mistake waiting to happen, and the fix
  belongs at the point where the mistake is made, not only where its symptom would appear.

## Decision 21: A Full Re-Audit Found Four Real Bugs, None Previously Reported

**Context:** Asked to comprehensively re-check the whole project after Phase 6, two independent
review passes (one on content/docs/security, one re-deriving the correctness of every algorithm
added this session against its real-world definition) turned up four genuine defects — none of them
things a user had reported, all found by re-deriving expected behavior and checking it against the
code rather than reading the code and assuming it was right.

**1. `buildArrivalTimeline` (`src/labs/rateLimiting.ts`) silently dropped the last arrival at several
UI-reachable rates** (4.5, 5, 9, 10 req/s over a 4s duration, all selectable via the Rate Limiting
lab's own slider). `for (let t = step; t <= duration; t += step)` accumulates binary floating-point
error; at these exact rates, the final sum lands fractionally past `duration` and the loop's `<=`
check fails one tick early. Fixed by computing each tick as `i * step` from an integer tick count
(`Math.floor(duration * rate + 1e-9)`) instead of accumulating — confirmed by direct execution that
all four previously-broken rates now produce the exact expected count, and added a regression test
naming them explicitly.

**2. `pickRandomPeers` (`src/labs/gossipProtocol.ts`) treated a negative `fanout` as "gossip to
almost everyone" instead of "gossip to no one.**" `Array.prototype.slice(0, negativeNumber)` means
"everything except the last N elements" in JS, not "zero elements" — the opposite of what a negative
fanout should mean given `fanout=0` is correctly a no-op. Unreachable via the shipped lab (slider
minimum is 0) but a real defect in an exported, tested pure function. Fixed with
`Math.max(0, Math.min(fanout, candidates.length))`.

**3. `simulateFixedWindow` (`src/labs/rateLimiting.ts`) produced `NaN` window indices at
`windowSeconds <= 0`**, which — because `NaN !== currentWindow` is always true — reset the counter
on every single arrival and bypassed `limit` entirely. Unreachable via the shipped lab (slider
minimum is 0.5) but the same "exported pure function, real defect" shape as #2. Fixed by degrading to
one window for the whole run when `windowSeconds` isn't positive, rather than dividing by it.

**4. The `websockets-vs-sse` benchmark harness's hand-rolled SSE client
(`benchmarks/websockets-vs-sse/go/main.go`) had two real reliability gaps and one silent-miscount
gap** — all in the harness that *produces* the site's data, not in anything a site visitor can
reach: (a) no read deadline while parsing response headers, so an unresponsive server could hang the
connecting goroutine — and transitively `runClient`'s `wg.Wait()` — forever; (b) the `bufio.Reader`
used to parse headers was discarded in favor of the raw `net.Conn` for subsequent reads, silently
losing any body bytes it had already buffered past the header boundary; (c) an unrecognized `-mode`
value fell through the client's connection `switch` without connecting anything, yet still counted
toward `established`, so the tool would have misreported 100% success with zero real connections.
Fixed all three: a 5s read deadline around the header parse (cleared before the unbounded streaming
reads that follow), a small `sseConn` wrapper that routes subsequent reads through the same
`bufio.Reader`, and an explicit `default` case that logs and returns without incrementing
`established`.

**Systemic fix alongside these:** reviewing #4 also surfaced that `getRelatedArticles`'s
self-reference guard (Decision 20) — and several other consumers (`ArticleNav`, `prefetchNextArticle`,
`getIndexItem`) — compare articles by bare `slug` across the *entire* cross-collection corpus, an
assumption nothing enforced. Added `findCrossCollectionSlugCollisions` (`scripts/lib/content.mjs`,
unit-tested) and wired it into `build-search-index.mjs` to fail the build on any cross-collection
slug collision — cheaper and more robust than fixing every downstream bare-slug comparison
individually, and it would also have caught a silent OG-image clobber (two colliding docs writing the
same `og/<slug>.png`) that nothing previously guarded against either.

**The `websockets-vs-sse` benchmark was re-run in full after these fixes** (harness code changed;
committed data should reflect the code that's actually committed) — the memory finding held (SSE
still consistently ~10-13% heavier: 137.5MB vs. WebSocket's 122.2MB at 5,000 connections, close to
the original 137.1MB/124.8MB and a second manual check's 136.1MB/126.1MB), and connect-time varied
yet again (a *third* different WS-vs-SSE ordering at 5,000 connections across three total runs),
further reinforcing rather than undermining that specific metric's instability. All citing docs
(the article, the harness README, this log, `.ai/content-roadmap.md`) were updated to the
now-current committed numbers rather than left pointing at superseded ones.

**Consequences:**
- None of the four bugs were live/user-facing on the deployed site: #1-#3 are exported pure
  functions with real defects at inputs the shipped UI's own slider ranges don't reach, and #4 is
  entirely inside benchmark tooling, not the site itself. This is precisely why they survived
  initial review — "the UI never hits this" is not the same claim as "the function is correct," and
  only the latter is what a unit test actually asserts.
- All four fixes shipped with a regression test naming the specific input that used to be wrong,
  not just a description of the fix — matching every prior decision in this log that touched
  testable logic.
- This is the strongest evidence yet for the value of the "verify, don't assume" discipline this
  entire project has been built on: a second, adversarial reading of already-shipped, already-tested
  code — not new content, not a new feature — found four real defects zero prior pass had.
