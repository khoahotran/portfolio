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
