# Implementation Plan: UX walkthrough fixes (2026-10-21)

## Overview

Fix every issue found in the 2026-10-21 end-user walkthrough (desktop 1440px, mobile 390px, production
on Slow 4G + 4x CPU). Design and behaviour only: no copy changes (the redesign-before-content rule).
Nothing is pushed. Changes are left uncommitted for review.

## Verification order (what the user asked for)

1. **Baseline first**, on the current build, before any code change:
   - all CI gates;
   - a per-route record of every sitemap route: `#main-content` text hash, title, h1 count, meta,
     console errors;
   - screenshots of a fixed page set;
   - local throttled performance.
2. After all slices: **regression check first**:
   - every gate is green;
   - every stable route still has zero console errors;
   - text differs only on the routes a change intended to touch;
   - untouched pages look the same.
3. **Only then issue verification**: re-measure each acceptance criterion below with the same scripts
   that found the issue.

## Architecture decisions

- **Boot: keep the prerendered page visible.** Today the page is hidden until React mounts. Instead,
  `main.tsx` preloads the current route's code and data, and React's first commit renders the
  complete page, replacing the snapshot in one commit:
  - no blank screen;
  - no `hydrateRoot`, so the #418/#423 mismatch that motivated the curtain cannot occur;
  - no duplicate DOM.

  Entrance animations are disabled for the initial view only. That disabled replay was the
  "double fade" the old overlay attempt hit.
- **Scroll: a small ScrollManager.** PUSH scrolls to the top (or to the hash). POP restores the saved
  position once the page is tall enough. `history.scrollRestoration = 'manual'`. Kept on
  `BrowserRouter`; moving to a data router is a bigger change for the same result.
- **Shell: flex column, `main` grows.** The footer can then never sit inside the first viewport
  while a page loads. That one rule caused the CLS on 72/138 routes and the floating 404 footer.
- **Search: one pure, unit-tested scorer**, used by both Cmd-K and `/search`:
  - tokenized, every token must match;
  - word-prefix matching;
  - one typo allowed on tokens of 5+ characters;
  - field weights.

  Labs are searchable in both.
- **Sync-first data:** add `peek*` accessors over the cached content index, article detail and
  related list. Pages initialise from them, so a cached route renders complete on the first commit.

## Task list

### Phase 0: Baseline
- [ ] T0. Capture the baseline: CI gates (Node 20), route records, screenshots, local throttled perf.

### Phase 1: Foundation
- [ ] T1. **App shell flex column.**
  - AC: article CLS ≤ 0.1 on direct load and on SPA navigation (was ~0.77); the 404 footer sits at
    the bottom; no new overflow.
- [ ] T2. **Sync peeks** for content index, detail and related. Home, Writing, ContentList, Tags,
  TagDetail, SeriesNav, ArticleNav and ContentDetail initialise from them.
  - AC: no Loading state when moving between pages once the index is cached; unit tests for the peeks.
- [ ] T3. **ScrollManager** (pure position store + component).
  - AC: PUSH lands at y=0 with warm and cold chunks; a hash deep link lands on its heading; Back
    restores within ±10px (home → lab → back, desktop and mobile); unit tests for the store.

### Checkpoint A: typecheck, lint, test, build; the nav/CLS scripts pass

### Phase 2: Boot (highest risk, isolated so it can be reverted alone)
- [ ] T4. **`lazyRoute()` with `.preload()`** for App pages and the lab registry, plus a
  `preloadRoute(path)` table.
  - AC: a unit test proves every sitemap route resolves to a preload plan.
- [ ] T5. **Boot handover:**
  - `main.tsx` awaits the preload;
  - the `js-booting` curtain becomes a `boot-handover` animation guard, removed on the first
    navigation;
  - remove `BootReveal`/`boot-reveal.ts`;
  - DOM enhancement passes move to `useLayoutEffect`.

  AC:
  - on local Slow 4G + 4x CPU, first content paint ≈ HTML-only paint on home, article, lab and writing;
  - a filmstrip shows no blank or "Loading…" frame at the swap;
  - zero console errors;
  - the snapshots carry no `boot-handover` class;
  - dark mode still paints dark first.

### Checkpoint B: all gates; perf and filmstrip compared with the baseline

### Phase 3: Features
- [ ] T6. **Unified search** (pure module + tests) for Cmd-K and `/search`, with labs in both and a
  "Search full text for …" row in the palette.
  - AC: "kafka" finds articles in Cmd-K;
  - "consensus raft" finds Raft;
  - "raftt" finds Raft;
  - "go" no longer matches "algorithms" or "gossip";
  - "raft" no longer returns the permission-system article;
  - "Aegis" still ranks the Aegis project first.
- [ ] T7. **Palette accessibility:**
  - the highlighted row stays visible;
  - combobox/listbox semantics;
  - focus is trapped;
  - background scroll is locked;
  - focus returns to the trigger.
- [ ] T8. **Mobile reading:**
  - collapsible TOC below md;
  - progress bar at `top-14`, visible while scrolled;
  - diagrams get a readable minimum width (text ≥ 11px at 390px, horizontal scroll inside the box);
  - Ecosystem graph laid out LR, labels ≥ 11px at 1440px.
- [ ] T9. **Lab jank:** `useDeferredValue` in Rate Limiting and LSM Tree.
  - AC: on mobile with 4x CPU, slider drag blocked time at least halved; the value label updates on
    every input.
- [ ] T10. **IA:**
  - the lab back link goes to "/labs" and reads "Back to Labs";
  - `/writing` gets an h1;
  - internal links use → instead of ↗;
  - How-I-think rows wrap instead of truncating.

  AC: crawl shows exactly one h1 on every route.

### Phase 4: Polish
- [ ] T11. **Homepage edges:** the hero aligns with the section edge.
  - AC: hero and section headings share one left edge at 1440px.
- [ ] T12. **Project cards:**
  - neutral stack chips;
  - sentence-case highlight pills;
  - `p-5` on mobile;
  - architecture list collapsible on mobile.

  AC: mobile card ≤ ~700px tall (was 1005px); contrast gate green.
- [ ] T13. **Tap targets:**
  - header links and icon buttons ≥ 44px hit area;
  - hero social icons ≥ 40px;
  - Raft peer toggles ≥ 32px;
  - Redlock / Leader Election node labels larger.

  AC: no control under 24px; header controls ≥ 44px.

### Checkpoint C (final)
- [ ] Regression check (gates, route records, screenshots), then issue verification against every AC.
- [ ] `.ai/decision-log.md` Decision 25 (boot handover, scroll, search) and the comments the change
  makes stale.

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| The snapshot-to-React swap shows a flash (animations, post-paint DOM passes) | High | Animation guard; layout effects for DOM passes; filmstrip check; T5 revertable alone |
| The preload table drifts from App routes | Med | Unit test over every sitemap route |
| Scroll restore fights the reader | Med | Cancel on wheel, touch or key input; give up after 2s |
| Search relevance regresses on queries that worked | Med | Tests pin the existing good queries ("Aegis" first, "rate limit", "idempotency") |
| Gates pass locally but not on CI | Med | Run the gates under Node 20 (`npx -y node@20`), as `.ai/quality-gates.md` says |
| A style change trips the type-scale ratchet | Low | Only existing tokens; no arbitrary text sizes |

## Deliberately not changed

- Header width. It follows the wider article layout, which needs room for the TOC sidebar. Aligning
  it to the 5xl content edge would move every page's container. The visible zigzag was hero vs
  sections, and T11 fixes that.
- Content and copy (redesign before content).
- TBT from the main bundle's evaluation. T5 removes the blank screen, not the JS cost.
