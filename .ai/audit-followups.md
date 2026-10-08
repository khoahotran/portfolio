# Audit Follow-ups - UI/UX, Accessibility, Performance & Reliability

> Source: Production UI/UX, Accessibility & Performance Audit (2026-08-12)
> Status: Audit passed. No P0/P1 issues outstanding.
>
> These items are intentionally deferred. Do not implement automatically unless explicitly requested.

## P2 - Should Fix

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

**Resolution.** The computed value already satisfied every acceptance criterion above - `estimateReading()`
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

**Status:** ✅ CLOSED (2026-08-26) - resolved by measurement, see `.ai/decision-log.md` Decision 9.

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

- Every flagged `text-slate-400` node carried real information - section labels, the footer
  copyright, employment dates - not decoration. So the classification this item asked for came out
  one-sided, and all 33 moved to `slate-500`.
- **Except inside `bg-panel`**, where that same bump made things *worse*: `slate-500` measures
  3.75:1 on the dark panel while `slate-400` was around 6:1. Those use the panel's own muted token
  instead. This is exactly the trap the "no blind global replacement" instruction was guarding
  against, and it was only visible because the check measures the effective background rather than
  the class name.
- The bigger finding was that `text-slate-400` was not the worst offender. `text-teal-600` failed at
  3.58:1 across 53 routes, and white-on-`teal-600` buttons at 3.74:1. Both are fixed.

Two defects surfaced that no other check would have caught - see `.ai/decision-log.md` Decision 10.
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

**Status:** ✅ CLOSED - `scripts/check-responsive.mjs` covers all 54 routes x 7 viewports, plus a
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

## P2 - Engineering Convention

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

## Future - Browser Validation

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

## Future - Architecture

### 7. Evaluate build-time Markdown rendering

**Status:** Architecture backlog - NOT urgent

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

**Re-measured 2026-08-28 (Phase 6), corpus now 45 articles (was 33 at the original measurement):**
521 KB raw / 159.4 KB gzip - a 2.4% increase in raw size against a 36% increase in article count.
This confirms this chunk is dominated by the markdown/unified/remark/rehype *library* cost, which is
paid once regardless of corpus size, not a per-article cost that scales with content volume - the
trigger this item names ("article count... justify it") was based on an assumption that doesn't
hold. The real trigger, if this is ever revisited, is a *library* change (e.g. adding a new rehype
plugin), not corpus growth. Still not urgent; noted so a future pass doesn't re-measure expecting
growth to have moved this and act on a false read.

## Future - Design System

### 8. Evaluate repeated Card / Badge components

**Status:** Partially closed (2026-08-28, Phase 6) - one real match found and extracted; the rest
correctly left alone.

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

**Resolution.** Grepped for the exact tag/badge `className` string rather than eyeballing "looks
similar" - found `rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600` byte-identical
(not just visually close) in three places: `ContentListPage.tsx`'s and `ArticleHeader.tsx`'s tag
pills, and `Projects.tsx`'s tech-stack badge. That crosses this item's own 3+/genuinely-shared bar
cleanly - extracted as `src/components/TagPill.tsx`.

Three *other* rounded-pill badges (the `/tags` count badge, `TagDetailPage`'s collection label,
`SeriesNav`'s "Part N of M") were deliberately left as their own one-off spans: each carries a
different padding/weight/casing treatment, so folding them into `TagPill` would need a handful of
variant props to reproduce three barely-related shapes - the "increases complexity" case this item
explicitly says not to force. This is the item working as designed: it found one real extraction and
correctly rejected three fake ones that only *looked* similar.

---

## P2 - Should Fix (continued)

### 9. Gates only verify a page's default state on load

**Status:** ✅ CLOSED (2026-10-07) - `scripts/check-interactions.mjs`, wired into CI. The gap is
narrowed, not eliminated; see the resolution at the end of this item for what is still uncovered.

Three separate defects shipped or nearly shipped during Phase 8 and the boot-flash work. All three
passed every gate. They share one root cause, which is the point of this item: **`check:contrast`
and `check:responsive` both navigate to a route, wait for load, and measure the page as it first
renders.** Neither hovers, focuses, clicks, toggles, or drags anything. Any defect that only exists
after an interaction is invisible to both.

The three instances:

1. **Interaction-state contrast.** `check:contrast` measures resting colours only. Hover, focus,
   `aria-selected` and active states are never sampled, so a failing combination in any of them is
   unreported. (This is separate from the Phase 8 process failure where `check:contrast` simply was
   not run at all for ten labs - that one was fixed by running it; this one survives running it.)

2. **Interactive lab states.** Every lab is a simulator whose whole purpose is the states you reach
   by moving a slider or flipping a toggle. The gates only ever see the initial `useState` values.
   A lab that renders correctly at defaults and breaks at one slider extreme passes cleanly.

3. **Post-click navigation.** `wireGraphLinks` in `KnowledgeGraphPage.tsx` was made non-idempotent
   by the mermaid-reuse change: the prerendered SVG already carries the base-prefixed `href`, so
   re-prefixing produced `/portfolio/portfolio/...` and every graph node 404'd on click. **Both
   gates passed with this bug in the code**, because they load the graph page and never click a
   node. It was caught by review, not by automation.

What this costs: the gates give real and well-earned confidence about first paint across 139 routes
x 7 viewports x 2 themes, and that confidence then gets silently generalised to "the site works."
It does not cover the interactive surface, which on a portfolio built around interactive labs is a
large share of what the site *is*.

Do not fix this by bolting interaction scripting onto the existing gates indiscriminately - a
per-route click matrix would be slow and brittle for little return on static pages. Worth evaluating
instead:

- a small set of interaction smoke checks on the highest-risk surfaces only (graph node click,
  one slider at each extreme per lab, nav strip scrolled to both edges);
- extending `check:contrast` to force `:hover`/`:focus-visible` states via CDP rather than
  navigating, which is cheap because the page is already loaded;
- accepting the gap explicitly for the rest, and relying on review - which is what actually caught
  instance 3.

Acceptance criteria if picked up:

- at least one gate exercises a state that is only reachable after a user interaction;
- the `wireGraphLinks` regression specifically would have been caught;
- gate runtime does not grow so much that it stops being run.

---

**Resolution.** Added `scripts/check-interactions.mjs` (`npm run check:interactions`), running in CI
after the contrast check. It takes the middle option this item proposed - a small set of probes on
the highest-risk surfaces - and deliberately not the per-route click matrix, for the reason given
above.

Three probes:

- **graph** - every SVG anchor's href is checked for a doubled base prefix, and one node is actually
  clicked and required to land on its own route with content rather than the 404 page;
- **labs** - for all 29 labs, every slider is driven to both ends, every button clicked, every select
  option selected, asserting no console/page error and no horizontal overflow after each;
- **nav-strip** - at 360px the strip must overflow, must not surrender layout height to a visible
  scrollbar, and must carry exactly the right `data-scroll-start` / `data-scroll-end` pair at the
  left edge, the right edge and mid-scroll.

Against the acceptance criteria:

- *exercises post-interaction state* - yes, all three probes do;
- *would have caught `wireGraphLinks`* - **verified, not assumed.** The bug was reintroduced into
  `KnowledgeGraphPage.tsx`, the site rebuilt with prerender, and the gate run: it exited 1 on both
  independent assertions (four doubled hrefs, plus the clicked node rendering the 404 page). The
  source was then restored and rebuilt. Writing this down because the claim "this would have been
  caught" is worthless unproven, and item 9 exists precisely because a gate that looks green
  without looking at anything is the failure mode.
- *runtime* - one browser context reused across all probes, ~3 min, well under the existing checks.

Writing the gate found three faults in the gate itself on its first run, all of the same shape -
not looking hard enough. `button[type="button"]` missed every control on `SagaStateMachinePage` and
`EventSourcingReplayPage`, which do not set the type; holding Playwright locator handles across a
re-render made `/labs/redlock` time out; and `<select>` was not covered at all, which on the Saga
and 2PC labs is the control that selects the entire simulated outcome. The "no controls found"
assertion is what surfaced the first of these, which is why it is kept as a hard failure rather
than a skip.

**Still uncovered, consciously.** Hover and focus-visible contrast - bullet one of this item's
three instances - is *not* addressed. `check:contrast` still measures resting colours only. The CDP
approach sketched above remains the right fix and remains unimplemented. Articles and list pages get
no interaction coverage either; the judgement is that their interactive surface is links, and links
are what the graph probe already exercises the risky version of.

---

## Mental notes for future AI sessions

1. **`min-w-0`** - pay special attention with Grid/Flex + code/tag/badge/URL/dynamic content (see item 5 above). This bug class caused two real production overflow bugs in one audit pass; it's cheap to prevent and easy to reintroduce.
2. **`rehype-raw`** - acceptable today because content is author-controlled; if a CMS or user-generated content is introduced later, re-evaluate XSS/sanitization (see item 3 above) before shipping.
3. **Markdown chunk ~159 KB gzip** - acceptable today because it's lazy-loaded per article; if content volume grows substantially, re-measure and consider build-time Markdown rendering (see item 7 above).

4. **Gates measure first paint; `check:interactions` covers part of the rest** - `check:contrast`
   and `check:responsive` say the page renders correctly on load and nothing more.
   `check:interactions` adds graph clicks, lab control extremes and nav-strip scroll edges (item 9).
   **Hover and focus-visible contrast are still unmeasured by anything.** Do not report a green run
   as "the site works"; three real defects passed both original gates for exactly this reason.

No large UI refactor is needed right now. The audit passed; items 1-8 above are backlog/follow-up,
not existing bugs. Item 9 is closed by `check:interactions`, but only partly - hover/focus contrast
is still unmeasured, which is written up in that item rather than quietly dropped.
