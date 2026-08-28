# Content System

This portfolio uses markdown as source of truth.

## Collections

- `content/blog`
- `content/research`
- `content/experiments` — write-ups pair with an interactive lab at `/labs/<id>` via
  `src/labs/registry.ts`; link to it with a CTA button (see any existing file in this
  folder for the markup) rather than linking to `/experiments/<id>` directly.
- `content/system-design`
- `content/field-notes`
- `content/projects` — flagship project deep dives, listed at `/projects`.

## Required metadata

```md
---
title: "Article title"
date: "2026-03-21"
tags: ["tag-a", "tag-b"]
summary: "One sentence summary"
---
```

Reading time is **computed**, not declared. `build-search-index.mjs` derives it from the prose word
count plus a fixed cost per code block and Mermaid diagram, and that is what the UI shows.

There used to be a required `reading_time` field. It was removed in 2026-08: nothing in `src/` ever
read it for display, and the hand-written values had drifted to roughly 2.6x reality (305 declared
minutes across the corpus against ~118 computed). A required field that is both unread and wrong is
worse than no field — it invites the next author to keep it accurate for no benefit. See
`.ai/audit-followups.md` item 1.

## Optional metadata

- `slug: "custom-slug"` — overrides the filename-derived slug.
- `draft: true` — excluded from production builds; still visible in `npm run dev`.
- `ogImage: "/path/to/image.png"` — overrides the auto-generated `/og/<slug>.png`.
- `related: ["collection/slug", ...]` — curated cross-links rendered ahead of the tag-scored
  algorithmic suggestions in the "Read Next" section. Use it for relationships that matter but
  don't happen to share enough tags to surface automatically (e.g. a project and the ADR that
  justifies one of its architecture decisions). Validated at build time — a reference to a
  nonexistent article fails the build rather than silently rendering nothing.
- `series: "Series Name"` + `seriesOrder: 1` — opt-in multi-part grouping, independent of
  collection (a series can span collections). Renders a "Part N of M" badge and prev/next-in-series
  links on the article header. Both build-time enforced: a `series` without a valid numeric
  `seriesOrder`, or two parts sharing the same order, fails the build.

## Callouts

GitHub-style Markdown alerts are supported:

```md
> [!NOTE]
> A succinct summary of the biggest takeaway.
```

Valid types: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`.

## Mermaid syntax hazards

Verified against the app's actual renderer (mermaid 11.16, `securityLevel: 'loose'` — see
`src/content-engine/mermaid.ts`). Two punctuation cases parse differently than you'd expect:

- **Parentheses in an unquoted piped edge label fail** — `` A -->|Query O(1)| B `` is a parse
  error, in both `-->` and `-.->` edges. **Quote the label instead of dropping the punctuation**:
  `` A -->|"Query O(1)"| B `` renders correctly. Parens are otherwise safe everywhere else
  (node labels, C4 `Rel(...)` calls, sequence messages) — this is specific to unquoted pipe labels.
- **A colon in a `timeline` diagram's period is a parse error, and quoting does not fix it**
  (`` 09:00 : Market Open `` and `` "09:00" : Market Open `` both fail). This is genuinely
  unescapable in the current renderer — use a non-colon separator instead (e.g. `09h00`), not a
  quoting workaround.

- **A semicolon in a `sequenceDiagram` message terminates it, even mid-sentence, and is NOT
  escapable by quoting** — `` Go->>PG: BEGIN; update balance; COMMIT `` fails to parse (the parser
  treats `;` as a statement separator here, unlike in a flowchart or C4 label). This is the one
  place a semicolon is unsafe; everywhere else (flowchart/C4 node and edge labels) it's fine.
- **An HTML entity (`&mdash;`, `&amp;`, ...) in a `sequenceDiagram` message is also a parse
  error, and unlike a Markdown-rendered node label, it is NOT decoded first** — a sequence message
  ships to Mermaid as the literal fenced-code-block text, so `` Go->>PG: A &mdash; B `` reaches the
  parser as the seven raw characters `&mdash;`, not an em dash, and the bare `&` breaks the grammar.
  Use a real word ("and", "then") or type the Unicode character itself (`—`) rather than its
  entity — both were verified against the real renderer. This bit an actual article
  (`content/projects/pfm.md`) before being documented here.

Semicolons (`;`) outside sequence-diagram messages, `\n` inside labels (renders as a real line
break, same as `<br/>`), and pipes, brackets, or braces inside a *quoted* label are all safe —
verified with the real renderer, not assumed. Don't "clean up" any of those on sight.

## Writing workflow

1. Add a markdown file with naming format: `YYYY-MM-DD-slug.md`.
2. Keep `npm run dev` running for hot reload.
3. Verify list page and detail page.
4. Run `npm run build:search-index` to regenerate `content-index.json`, `search-index.json`,
   the sitemap, feeds, and OG images before a production build — the dev server does not
   do this for you.
5. Push changes.
