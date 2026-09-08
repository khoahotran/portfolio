# Content Roadmap — Early History (Phases 1-4)

Part of the [content roadmap](../content-roadmap.md), split out 2026-09-08 (see that file's own
note on why). Covers Phases 1-2, 3, 2.5, and 4, in the same order they originally appeared —
not renumbered or reordered retroactively.

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
      **Open follow-up, carried into Phase 5:** `github.com/khoahotran/PFM` still 404s (repo
      is private) — verify the link before calling this fully done.
- [ ] **Custom domain.** `site.config.mjs` now centralises the site URL, so this is a small change
      once a domain is bought. Not part of Phase 4 or 5 — genuinely "whenever," no dependency on
      either.
