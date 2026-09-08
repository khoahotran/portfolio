# Content Roadmap

This document prioritizes the future evolution of the portfolio. AI agents should consult this roadmap when asked to generate new content or labs.

Split into per-phase files under `.ai/phases/` on 2026-09-08 — this file grew from 29 KB / 6 phases
to 54 KB / 7 phases in one session (Phase 7 alone added 8 sub-items), which is exactly the growth
rate that made the split worth doing before Phase 8 adds more, rather than after it's unreadable.
Each phase file links to the next; start wherever is relevant, or read them in order for the full
history.

For **what's currently under consideration but not yet started**, see [`future.md`](../future.md)
in the repo root — that file is pre-commitment scratch space, this one is the completed-work log.

## Phases

- [Early history (Phases 1-2, 3, 2.5, 4)](phases/early-history.md) — initial build, three audit
  passes, the distribution/provenance/design-system phase.
- [Phase 5 — Evidence Depth & Discoverability](phases/phase-5.md) — tag taxonomy, series support,
  build hygiene, the first real benchmark harnesses (§5.8), flagship deepening (blocked, §5.2).
- [Phase 6 — Post-Growth Hygiene](phases/phase-6.md) — audited what Phase 5's growth left stale;
  no new content, infrastructure honesty only.
- [Phase 7 — Deep-Not-Wide, Picked Up Item by Item](phases/phase-7.md) — 8 items, one at a time
  from `future.md`'s Track B: series retrofit, 5 new implementation labs (leader election, Redlock,
  backpressure, canary rollout, cache freshness), 2 new benchmark harnesses (PgBouncer vs direct,
  gRPC vs REST). Closed Track B out entirely — see `future.md` for what's next.
- [Phase 8 — Deliberately Slower, Picked Up One at a Time](phases/phase-8.md) — Track B items
  picked up one at a time, spaced out rather than back-to-back: consistent hashing / hash ring,
  the idempotency-key store (extended an existing article rather than starting new), and vector
  clocks. Closed Track B out entirely — see `future.md` for what's next.
