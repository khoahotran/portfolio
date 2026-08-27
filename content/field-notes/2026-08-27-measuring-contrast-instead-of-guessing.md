---
title: "Field Note: Measuring Contrast Instead of Guessing at It"
date: "2026-08-27"
tags: ["accessibility", "wcag", "tailwind", "testing", "trade-offs"]
related: ["blog/the-spa-google-never-saw"]
summary: "A prior audit flagged 44 text-slate-400 occurrences as 'potentially borderline' and correctly refused to fix them blind. Building a real contrast checker turned that judgment call into a number — and found two unrelated bugs on the way."
---

A production audit I ran a while back flagged something and then explicitly declined to act on it: roughly 44 uses of `text-slate-400` across the site, "potentially borderline for WCAG contrast." The write-up was honest about why it stopped there — not every occurrence was confirmed to fail, many were secondary or metadata text where a slightly lower contrast is acceptable, and changing the color globally without evidence would have been an unauthorized design-token change dressed up as an accessibility fix. That was the right call at the time. It also left the question open indefinitely, because "probably fine" isn't a state that resolves itself.

Adding a dark theme forced the issue. I hand-tuned a new neutral color ramp for the dark background, and "I think these values are legible" is not something to ship without checking.

## Building the checker

`scripts/check-contrast.mjs` walks every visible text node on every route, in both themes, and computes the real WCAG 2.1 contrast ratio — not by reading class names, but by asking the browser what it actually painted:

- Resolve the element's `color`.
- Walk up the ancestor chain to find the effective background, compositing any translucent layers on the way (`bg-surface/90`, `text-slate-500/70`) rather than assuming the nearest solid color is the only one that matters.
- Apply the correct threshold — 4.5:1 normally, 3:1 for WCAG "large text" (≥24px, or ≥18.66px bold) — and flag anything below it.

## What it actually found

The first run reported 26 light-mode failures and 10 dark-mode failures. That ratio is the finding: **most of these were pre-existing light-mode defects, not dark-mode regressions.** `text-teal-600` — the site's accent color, used in the footer, the back-link, tag pills, and article metadata — measured 3.58:1 against the page background. It had been failing AA since long before dark mode existed. Nobody had checked, because "it works" and "it's measured" are different claims and I'd only ever made the first one.

The more interesting bug hid inside the worst reading in the whole report: a set of "View the Interactive Benchmark" buttons that measured **1:1 contrast** — the label indistinguishable from its own background. Chasing that down surfaced something with nothing to do with color values at all:

```bash
$ grep -c '\.bg-teal-600' dist/assets/*.css
0
```

`tailwind.config.js`'s `content` globs scanned `./index.html` and `./src/**/*.tsx` — never `content/`. But those CTA buttons are raw HTML embedded directly in eight Markdown articles, and their `bg-teal-600` class name existed nowhere Tailwind was told to look. It generated **zero** CSS for it. The button had been rendering as unstyled text with no background at all — invisible — since the day those articles were written, completely independent of anything I was doing with dark mode. The contrast checker didn't just measure a known problem more precisely; it found a defect no prior manual review had ever caught, because nobody thinks to open dev tools on a button that's clearly right there on the screen.

> [!NOTE]
> Fixing the background wasn't the end of it, either. Once Tailwind generated the class,
> `.markdown-body a` (a CSS selector with specificity 0,1,1) still beat the utility class's 0,1,0
> and kept overriding the label color — so the button went from invisible to visible-but-still-wrong
> in one step, and the checker caught that too on the next run. Two independent bugs, stacked, both
> silent, both only surfaced by measuring the rendered page rather than reading the source.

## A bug in the checker itself

The first version of the tool had its own defect, worth naming because it's the kind of mistake that erodes trust in exactly the sort of measurement this whole effort was meant to build. It grouped failures by color-plus-font-size to avoid printing the same defect 40 times, but reported the *first* matching element's class name next to the *worst* ratio in that group — two different elements, attributed as if they were one. That sent an early pass chasing a `1:1` reading on markup that, once traced individually, actually measured a perfectly explainable `3.58:1`. The fix was small — track the worst node's own class alongside its own ratio — but the lesson generalizes: a script that measures something for you is not automatically more trustworthy than the manual judgment it replaces. It just fails differently, and its failures need the same skepticism.

## Where it landed

Every genuine failure got a real fix — not a blanket color swap, but the same case-by-case reasoning the original audit asked for, now backed by a number instead of a guess: `text-slate-400` moved to `text-slate-500` where it carried real information (which was everywhere it was measured, so the original hedge — "many are secondary content" — didn't hold up under actual measurement), except inside a couple of fixed-dark panels, where that exact bump made contrast *worse* (`slate-500` measures 3.75:1 on a dark panel; `slate-400` was closer to 6:1) and the real fix was giving that panel its own muted token instead of following the page-wide ramp.

The script now runs in CI on every push, across every route, in both themes. The corpus measures clean today. What matters more is that "clean" is now a claim I can point at, not one I'm asking to be taken on faith — including the parts of it a prior audit was right to leave unverified rather than guess at.
