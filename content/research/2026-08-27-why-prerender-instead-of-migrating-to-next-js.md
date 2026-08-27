---
title: "ADR: Why Prerender Instead of Migrating to Next.js"
date: "2026-08-27"
tags: ["adr", "frontend-architecture", "react", "seo", "architecture"]
related: ["blog/the-spa-google-never-saw", "field-notes/measuring-contrast-instead-of-guessing"]
summary: "This portfolio's original decision to build a custom JAMstack instead of using Next.js still held once a crawler-visibility bug surfaced. Here's why the fix was a build step, not a framework migration."
---

## Context and Problem Statement

This portfolio is a client-rendered SPA: Vite, React Router, and a custom content engine that parses Markdown via `import.meta.glob` at runtime (see the original ADR: a custom JAMstack was chosen over Next.js specifically to avoid a Node server and Next's SSR/static-export configuration for a site with no requirement beyond client-side routing).

That decision was made before it was clear what it would cost. A production audit later found that every deep link on the site returned a 404 to any client that doesn't execute JavaScript — verified with `curl -sI` against the live site, not inferred. 51 of 52 sitemap URLs were unreachable to a crawler's first fetch; 33 generated Open Graph images were unreachable to every social platform's link-preview fetcher. The full story, with the evidence, is in [The SPA Google Never Saw](/blog/the-spa-google-never-saw).

The question this ADR answers: does that bug mean the original decision was wrong, and the site should now migrate to Next.js for SSR — or does the fix belong somewhere narrower?

## Considered Options

### Option 1: Migrate to Next.js (App Router, SSR)
Rebuild the site on Next.js, replacing React Router with file-based routing and getting server-rendered HTML on every request by default.

**Pros:**
- SSR is the framework's default behavior — crawler visibility stops being a problem class you have to solve yourself.
- Built-in `generateMetadata` replaces the hand-rolled `useSeo` hook's imperative `document.head` mutation.
- A large, well-trodden ecosystem for exactly this kind of content site.

**Cons:**
- **This is a rewrite, not a migration.** The content engine (`src/content-engine/*` — the frontmatter parser, the unified/remark/rehype Markdown pipeline, the Mermaid renderer, the lean/full search-index split) all assumes client-side execution. None of it ports as-is to a server-rendering framework.
- The repository's own constitution requires an explicit ADR and approval before ripping out the custom content engine, Vite, or React configuration. A framework migration is exactly that action, undertaken to fix a problem that isn't actually about the framework.
- Needs either a persistent Node server (abandoning the "no server" rationale from the original ADR) or Next's static export mode, which has its own constraints on what App Router features remain available.

### Option 2: Server-render with `react-dom/server` directly
Keep React and the existing component tree, but add a Node-side render step using `react-dom/server` instead of adopting a full framework.

**Pros:**
- No new framework — same React, same components.
- More control over exactly what gets server-rendered and when.

**Cons:**
- **Every runtime assumption in the content engine breaks anyway.** `useSeo` mutates `document.head` imperatively — that has no meaning on the server and needs an SSR-safe rewrite. `content-index.ts` calls `fetch()` against static JSON files at runtime — that needs Node-side handling of what was a browser-only code path. `BrowserRouter` needs to become `StaticRouter` for the server pass. Mermaid needs a browser environment it doesn't have server-side, so diagram rendering needs a shim or a different strategy entirely.
- This is the effort of Option 1's rewrite, without the benefit of Next's ecosystem absorbing any of it. Worst of both: framework-migration-sized effort, hand-rolled-framework-sized support.

### Option 3: Snapshot prerendering (headless browser, post-build)
Keep the SPA exactly as it is. After `vite build`, load every route in headless Chromium, wait for it to fully render client-side — including async Markdown compilation and Mermaid diagrams — and serialize the resulting DOM to a static `.html` file per route.

**Pros:**
- **Zero changes to the app.** `useSeo`, `content-index.ts`, `BrowserRouter`, the Mermaid renderer — none of it needs to know prerendering exists. The snapshot is the same DOM a real browser would produce; the crawler just gets it eight seconds earlier than the browser would take to fetch and render it live.
- Gets 100% of the crawler-visibility and social-card benefit — a crawler that fetches `dist/blog/foo.html` sees byte-identical markup to what a browser renders after mount.
- The React app still boots normally after first paint (a plain `createRoot` re-render over the snapshot), so client-side routing, search, and every interactive feature work exactly as before.

**Cons:**
- Does not reduce the client-side JavaScript payload — the ~159 KB gzip Markdown-rendering chunk still ships and still runs after mount, because the snapshot is an output artifact, not a change to what the browser does.
- Adds Chromium as a build dependency and a real, measurable amount of build time (the full 54-route site adds under a minute).
- A second rendering pass to keep in sync if the app's markup changes in a way that affects prerendering assumptions (e.g. a new async-loading pattern the "wait until settled" logic doesn't yet detect).

## Decision Outcome

**Decision:** Option 3 — snapshot prerendering via `scripts/prerender.mjs`, run as the last step of `npm run build`.

### Rationale

The original ADR's reasoning was never about SEO — it was about not needing a server for a site with no requirement beyond client-side routing and static Markdown parsing. That reasoning is still true. What changed is that "static Markdown parsing" turned out to have a real cost the original ADR didn't anticipate: a crawler that never runs JavaScript sees none of it. That's a distribution problem, and prerendering is a distribution fix — it doesn't touch a single assumption the content engine makes about running in a browser, because by the time prerendering runs, a browser (headless Chromium) already ran it.

Migrating to Next.js would trade a real, narrow, fully-solved problem for a large, open-ended rewrite of working code, on the theory that the rewrite would prevent a different class of bug from existing. It might. It would also spend weeks rebuilding a Markdown pipeline, a search index split, and a Mermaid renderer that already work, to fix something a 300-line build script fixes in an afternoon.

> [!IMPORTANT]
> The interesting failure here wasn't architectural — it was that a real bug went unnoticed for months
> because the site was only ever tested the way a browser sees it. The fix that mattered most was
> `curl -sI` against the live site, not a framework decision. See
> [The SPA Google Never Saw](/blog/the-spa-google-never-saw) for that half of the story.

## Consequences

- CI now installs Chromium before `npm run build`, not just before the separate responsive-regression check — the prerender step drives it too.
- The prerender script fails the whole build if any route ships without its own `<title>`, canonical URL, `og:image`, or if a Mermaid diagram renders an error box in the snapshot. This is the same philosophy the build already applied to `related:` frontmatter references: a metadata regression should be a build failure, not a silent gap discovered later by `curl`.
- `public/404.html`'s client-side redirect script is retained as a fallback for a bare `vite build` run without the prerender step, but the shipped `dist/404.html` is now itself a real prerendered "not found" page — an actually-wrong URL gets a real 404 document instead of bouncing through the SPA shell.
- This does not close the separate, larger question of whether the client should recompile Markdown after every page load, or receive precompiled HTML as data. That remains open, tracked as its own item rather than folded into this decision.
