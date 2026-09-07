# Future Plan

This file is deliberately separate from [`.ai/content-roadmap.md`](.ai/content-roadmap.md) and
[`todo.md`](todo.md). Those two are **logs** — completed phases, resolved decisions, the record of
what happened. This one is **pre-commitment scratch space** — candidates for what could happen next,
none of them started, none of them owed to anyone. When a candidate here actually gets picked up, it
graduates into a real `Phase N` section in `content-roadmap.md` with its own verification section,
and gets deleted from this file. Nothing in this file should be read as "planned" — only "considered."

Snapshot at time of writing: 45 articles across 6 collections, 12 interactive labs, 3 real Docker
benchmark harnesses, Phase 5 (evidence depth) and Phase 6 (post-growth hygiene) both complete, one
item (§5.2, flagship deepening) genuinely blocked rather than deferred by choice.

---

## The one decision that isn't mine to make

`.ai/content-roadmap.md`'s Phase 5 opened with "deep before wide" as the deliberate growth model —
fewer, stronger pieces over cadence, until the series/tag/build infrastructure existed to support
volume without sprawl. That infrastructure (§5.5 tag taxonomy, §5.6 series support, §5.7 build
hygiene) now exists and has shipped, but nothing has tested it under actual volume yet — no article
has ever set `series:`, and the tag taxonomy has only been exercised at 45 articles, not the ~100
where `search-index.json` size was flagged as worth revisiting.

So the real open question is: **stay deep-before-wide, or start treating cadence as a first-class
goal now that the infra is there?** This genuinely changes what Phase 7 should be (one or two more
heavily-evidenced pieces vs. a faster-cadence backlog of shorter posts), and it's a product/career
positioning call, not an engineering one — flagging it here rather than picking a direction
unilaterally, same as Phase 6 left it.

---

## Track A — Carry-forward blockers (re-check trigger, don't re-attempt blindly)

These were tried, hit a real external blocker, and documented as such. Re-checking them costs
nothing; re-attempting them without the blocker having changed just re-produces the same failure.

| Item | Blocker | Re-check trigger |
|---|---|---|
| §5.2 — deepen Aegis / Core Banking / QuantAlpha case studies | No local checkout for any of the three; PFM's own screenshot attempt was independently blocked by the safety classifier | Any of the three repos becomes locally cloneable in this environment, or Khoa supplies screenshots/detail directly |
| `todo.md` — project screenshots (Aegis/Core Banking/QuantAlpha) | Same as above — no running system to screenshot | Same trigger as above |
| WebKit/Safari validation (`.ai/audit-followups.md` item 6) | Playwright's WebKit needs root-level system deps, unavailable non-interactively here | A session with interactive sudo, or a CI runner added that carries WebKit |
| Custom domain (Phase 4 Batch 6) | Depends on Khoa buying a domain | Khoa says a domain exists — `site.config.mjs` already centralizes the URL, so this is mechanical once triggered |
| `rehype-sanitize` (`.ai/audit-followups.md` item 3) | Content is still 100% author-controlled, no XSS surface today | Any move toward CMS input, comments, or user-generated content |
| Build-time Markdown rendering (`.ai/audit-followups.md` item 7) | Re-measured 2026-08-28: chunk cost is dominated by the library, not corpus size (2.4% growth vs. 36% article growth) | A *library* change (new rehype/remark plugin), not further corpus growth |
| `search-index.json` scale (§5.7) | Measured 187 KB / 38 docs; not worth acting on at 45 | Corpus crosses ~100 articles or the file crosses ~500 KB |

---

## Track B — Content candidates (unstarted, unordered — not a queue)

None of these are committed. Listed so a future session doesn't have to re-derive "what's an
interesting gap" from scratch, and so picking one doesn't require re-reading the whole `.ai/` corpus
first.

- **First real use of `series:`.** The infrastructure (`SeriesNav`, build-time validation) has
  shipped since 2026-08-28 with zero content using it. The three benchmark-harness rewrites
  (`redis-vs-bullmq`, `db-event-replay-benchmark`, `go-vs-ts-concurrency` — all "we re-measured and
  the old number was wrong, here's why") are the most natural retroactive fit if a `series:` field
  were added to their existing articles rather than requiring new writing. Cheapest way to prove the
  feature works under real content, not just its own build-time validation tests.
- **Distributed systems gaps not yet covered:** leader election (Raft/Bully), distributed locks
  (Redlock and its criticisms), backpressure strategies, CDN/edge caching trade-offs, canary/blue-green
  deployment mechanics. The gossip protocol lab (§5.4) already covers epidemic broadcast; leader
  election would be a natural, evidence-consistent next lab (same "pure algorithm + interactive
  visualization" shape as gossip/rate-limiting).
- **A 4th real benchmark harness**, if one is wanted: candidates raised but not committed during
  §5.4 scoping — connection-pooling overhead (pgbouncer vs. direct), or gRPC vs REST for
  service-to-service calls (ties into the existing Aegis gRPC content).
- ~~PFM itself as a content source~~ — done 2026-09-07:
  [What My Own Git Log Proves About Spec-Driven Development](/field-notes/what-git-log-proves-about-spec-driven-development),
  using PFM's real git history and `documents/roadmap.md` as evidence rather than restating the
  existing architecture case study. See `.ai/decision-log.md` Decision 22 — verifying this article's
  own build also found and fixed an unrelated, pre-existing false-PASS bug in `check-contrast.mjs`.

None of these should be started without first re-confirming the deep-vs-wide question above — a
short field-note and a full harness+lab+article triple cost very different amounts of the same
"deep, not wide" budget.

---

## Track C — Small infra items noticed but not worth a phase on their own

- `.ai/content-roadmap.md` is now 29 KB and covers 6 phases in one linear file. Worth splitting into
  per-phase files (`.ai/phases/phase-5.md` etc.) once it becomes hard to navigate — not yet; noting
  it before it becomes a real problem, per this project's own "measure before acting" convention.
- ~~`slugify()` parity test~~ — checked while writing this file and found already done:
  `src/content-engine/slugify.test.ts` asserts `content-source.ts` and `scripts/lib/content.mjs`
  agree, including over every real content filename and title, not just synthetic cases. The
  original Phase 4 plan named this as worth adding; it was, just never crossed off here. Correcting
  the record rather than leaving a stale "still needed" item next to work that already shipped.

---

## How to use this file

Before starting any Track B item: re-ask the deep-vs-wide question above rather than assuming the
answer from this file's existence. Before starting any Track A item: confirm the stated trigger
actually fired — don't re-attempt a blocked item speculatively. When something here does get picked
up, move it into `.ai/content-roadmap.md` as a real phase and delete it from here, so this file never
accumulates completed work alongside genuinely open candidates.
