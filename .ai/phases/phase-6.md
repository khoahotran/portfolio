# Content Roadmap — Phase 6

Part of the [content roadmap](../content-roadmap.md), split out 2026-09-08. Previous: [Phase 5](phase-5.md).

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

---

Next: [Phase 7](phase-7.md).
