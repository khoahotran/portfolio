# Audit Follow-ups — UI/UX, Accessibility, Performance & Reliability

> Source: Production UI/UX, Accessibility & Performance Audit (2026-08-12)
> Status: Audit passed. No P0/P1 issues outstanding.
>
> These items are intentionally deferred. Do not implement automatically unless explicitly requested.

## P2 — Should Fix

### 1. Fix reading-time calculation

**Status:** ✅ CLOSED (2026-08-26)

Current reading-time calculation appears inflated on 32/33 articles.

Investigate whether the calculation is counting content that should not contribute to reading time, such as:

- code blocks
- Mermaid diagrams
- Markdown syntax
- metadata
- tables
- technical markup

Preferred definition:

> Reading time should primarily represent prose-reading time, rather than total rendered content size.

Acceptance criteria:

- prose-only word count is used where appropriate;
- code blocks do not significantly inflate reading time;
- Mermaid/diagram markup is excluded;
- existing articles display reasonable reading-time estimates;
- no unnecessary content files need to be rewritten.

---

**Resolution.** The computed value already satisfied every acceptance criterion above — `estimateReading()`
in `scripts/lib/content.mjs` counts prose at 220 wpm and charges a flat ~20s per code block and ~30s
per Mermaid diagram, excluding inline code, raw HTML, table rows and LaTeX. That is what the UI has
been showing.

What remained was the frontmatter field itself, which was still *required* by the schema while being
read by nothing and carrying values roughly 2.6x the real figure (305 declared minutes across the
corpus against ~118 computed). A required field that is simultaneously unread and wrong is worse
than no field: it costs every future author accuracy work for no benefit, and it invites a reader
who spots the discrepancy to distrust the rest of the metadata.

`reading_time` was therefore removed from all 33 articles, from `ContentFrontmatter`, from the
generated index, and from the authoring templates in `content/README.md`,
`.ai/writing-style-guide.md` and `.ai/quality-gates.md`. Reading time is computed, full stop.

### 2. Review borderline text contrast

**Status:** ✅ CLOSED (2026-08-26) — resolved by measurement, see `.ai/decision-log.md` Decision 9.

Approximately 44 `text-slate-400` occurrences were identified as potentially borderline for WCAG contrast.

Current audit did not modify them because:

- they are not all confirmed failures;
- many are secondary/muted content;
- globally changing the color would effectively become an unauthorized design-token change.

Future review should classify these occurrences by semantic importance:

- primary information;
- secondary information;
- metadata;
- decorative text.

Only adjust colors where the text carries meaningful information and the contrast is genuinely insufficient.

Do not perform a blind global replacement.

---

**Resolution.** `scripts/check-contrast.mjs` (`npm run check:contrast`) now measures every visible
text node on every route in both themes and fails CI below WCAG AA, so this stopped being a
judgement call. What the measurement showed:

- Every flagged `text-slate-400` node carried real information — section labels, the footer
  copyright, employment dates — not decoration. So the classification this item asked for came out
  one-sided, and all 33 moved to `slate-500`.
- **Except inside `bg-panel`**, where that same bump made things *worse*: `slate-500` measures
  3.75:1 on the dark panel while `slate-400` was around 6:1. Those use the panel's own muted token
  instead. This is exactly the trap the "no blind global replacement" instruction was guarding
  against, and it was only visible because the check measures the effective background rather than
  the class name.
- The bigger finding was that `text-slate-400` was not the worst offender. `text-teal-600` failed at
  3.58:1 across 53 routes, and white-on-`teal-600` buttons at 3.74:1. Both are fixed.

Two defects surfaced that no other check would have caught — see `.ai/decision-log.md` Decision 10.
The corpus now measures clean in both themes.

### 3. Evaluate Markdown HTML sanitization

**Status:** Open / Security Follow-up

The Markdown pipeline currently allows raw HTML through `rehype-raw`.

Current assumption:

> Content is trusted and author-controlled.

This is acceptable under the current content model, but becomes a security concern if content is later sourced from:

- CMS;
- user-generated content;
- external contributors;
- untrusted Markdown;
- dynamically imported content.

If the content trust model changes, evaluate adding:

- `rehype-sanitize`;
- an explicit HTML allowlist;
- or another appropriate sanitization layer.

Do not add sanitization blindly if it would break intentional HTML-based content components.

### 4. Add automated responsive regression checks

**Status:** ✅ CLOSED — `scripts/check-responsive.mjs` covers all 54 routes x 7 viewports, plus a
dark-theme pass at the widest viewport (added 2026-08-26).

The current audit verified 0/70 route × viewport combinations with horizontal overflow, but only 10 representative routes were tested manually.

Create an automated regression check for all important routes.

At minimum validate:

- 320px
- 375px
- 390px
- 768px
- 1024px
- 1280px
- 1440px

For each route measure:

- `clientWidth`
- `scrollWidth`
- horizontal overflow
- console errors
- page errors

Suggested acceptance criteria:

```text
scrollWidth <= clientWidth
console errors = 0
page errors = 0
```

This is particularly important because `min-w-0` issues can easily reappear when adding new Grid/Flex components.

## P2 — Engineering Convention

### 5. Treat `min-w-0` as a default consideration for Grid/Flex children

**Status:** Documentation / Convention

The audit discovered two independent mobile-overflow bugs caused by missing `min-w-0`.

Pattern:

```text
Grid/Flex child
    ↓
unbounded descendant
    ↓
item refuses to shrink
    ↓
horizontal overflow
```

For future components, explicitly consider:

```css
min-width: 0;
```

for Grid/Flex children that contain:

- long text;
- code;
- badges;
- tags;
- URLs;
- unbreakable content;
- dynamic content.

Do not blindly add `min-w-0` everywhere. Apply it where content may exceed the available width.

## Future — Browser Validation

### 6. WebKit / Safari validation

**Status:** Deferred

Chromium and Firefox were tested successfully.

WebKit/Safari could not be tested because the available Playwright environment requires a system dependency that cannot be installed without root access.

Future validation should include:

- Safari desktop;
- WebKit mobile-equivalent viewport;
- Mermaid;
- Markdown rendering;
- sticky elements;
- scrolling;
- copy buttons;
- responsive layouts.

Do not claim Safari compatibility until it has been tested.

## Future — Architecture

### 7. Evaluate build-time Markdown rendering

**Status:** Architecture backlog — NOT urgent

Current article rendering requires the Markdown processing pipeline in the browser.

Measured article-related chunk:

```text
~509 KB raw
~159 KB gzip
```

This is currently lazy-loaded and therefore does not affect the initial entry bundle.

Possible future architecture:

```text
Markdown
   ↓
Build time
   ↓
HTML / serialized representation
   ↓
Browser
```

Potential benefits:

- smaller article runtime;
- less client-side processing;
- faster article rendering;
- less JavaScript work.

Potential costs:

- more complex build pipeline;
- reduced runtime flexibility;
- additional build-time processing;
- architectural change.

Do not implement unless article count, performance measurements, or deployment requirements justify it.

## Future — Design System

### 8. Evaluate repeated Card / Badge components

**Status:** Observation

Repeated patterns exist across:

- list-page cards;
- related-content cards;
- badges;
- metadata blocks.

Do not extract components merely because markup looks similar.

Only extract when:

- the same pattern appears 3+ times;
- behavior is genuinely shared;
- visual consistency benefits;
- abstraction reduces rather than increases complexity.

Avoid premature design-system abstraction.

---

## Mental notes for future AI sessions

1. **`min-w-0`** — pay special attention with Grid/Flex + code/tag/badge/URL/dynamic content (see item 5 above). This bug class caused two real production overflow bugs in one audit pass; it's cheap to prevent and easy to reintroduce.
2. **`rehype-raw`** — acceptable today because content is author-controlled; if a CMS or user-generated content is introduced later, re-evaluate XSS/sanitization (see item 3 above) before shipping.
3. **Markdown chunk ~159 KB gzip** — acceptable today because it's lazy-loaded per article; if content volume grows substantially, re-measure and consider build-time Markdown rendering (see item 7 above).

No large UI refactor is needed right now. The audit passed; the items above are backlog/follow-up, not existing bugs.
