# Future Plan

This file is deliberately separate from [`.ai/content-roadmap.md`](.ai/content-roadmap.md) and
[`todo.md`](todo.md). Those two are **logs** — completed phases, resolved decisions, the record of
what happened. This one is **pre-commitment scratch space** — candidates for what could happen next,
none of them started, none of them owed to anyone. When a candidate here actually gets picked up, it
graduates into a real `Phase N` section (in `.ai/phases/phase-N.md` — see `content-roadmap.md`'s
index) with its own verification section, and gets deleted from this file. Nothing in this file
should be read as "planned" — only "considered."

Snapshot at time of writing (2026-09-08, updated after repopulating Track B post-Phase-8):
55 articles across 6 collections, 22 interactive labs, 5 real Docker benchmark harnesses,
Phases 5-8 in progress (Phase 8 has shipped all three items it picked up — consistent hashing,
the idempotency-key store, and vector clocks — see `.ai/phases/phase-8.md` §8.1-8.3). One item
(§5.2, flagship deepening) genuinely blocked rather than deferred by choice — see Track A. Track B
has a fresh set of three candidates (CRDTs, Bloom filters, Merkle trees) — nothing started yet.

---

## The one decision that isn't mine to make

`.ai/content-roadmap.md`'s Phase 5 opened with "deep before wide" as the deliberate growth model —
fewer, stronger pieces over cadence, until the series/tag/build infrastructure existed to support
volume without sprawl. That infrastructure (§5.5 tag taxonomy, §5.6 series support, §5.7 build
hygiene) now exists and has shipped; `series:` has since been used once (§7.1, three benchmark
articles), and the tag taxonomy has only been exercised at 53 articles, still not the ~100
where `search-index.json` size was flagged as worth revisiting.

So the real open question is: **stay deep-before-wide, or start treating cadence as a first-class
goal now that the infra is there?** This genuinely changes what Phase 8 should be (one or two more
heavily-evidenced pieces vs. a faster-cadence backlog of shorter posts), and it's a product/career
positioning call, not an engineering one — flagging it here rather than picking a direction
unilaterally, same as Phase 6 left it.

**Update after Phase 7, decided 2026-09-08:** Phase 7 shipped 5 labs, 1 harness, and 1 field-note in
rapid succession (2026-09-07/08) — closer to "wide" in raw count than any prior phase, though every
item still shipped at full depth (real algorithm/harness, not a diagram or dataset), so *cadence*
increased without *depth-per-item* dropping. Asked directly whether to keep that pace or treat it as
an outlier: **Khoa chose to slow down deliberately** — Phase 7 was an unusually productive stretch,
not a new baseline to assume going forward. Phase 8 should not default to picking Track B items
back-to-back the way Phase 7 did; space them out.

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
| `search-index.json` scale (§5.7) | Re-measured 2026-09-08: 281 KB / 55 docs (up from 187 KB / 38 docs) — growing, but still well under the trigger | Corpus crosses ~100 articles or the file crosses ~500 KB |

---

## Track B — Content candidates (unstarted, unordered — not a queue)

Repopulated 2026-09-08 immediately after the post-Phase-7 set closed out (§8.1-8.3: consistent
hashing, the idempotency-key store, vector clocks) — see `.ai/phases/phase-7.md` §7.1-7.8 and
`.ai/phases/phase-8.md` for the full record of everything shipped so far. This fresh set is
grounded the same way every prior one was: checked against the actual lab registry
(`src/labs/lab-ids.json`, 22 entries at the time) and a `grep` across `content/`, not assumed:

- **CRDTs (Conflict-Free Replicated Data Types)** — not covered anywhere in `content/` (confirmed
  by grep). The natural sequel to vector clocks, not a duplicate of it: vector clocks let you
  *detect* that two writes are concurrent, but the vector-clocks article explicitly stops there —
  it doesn't say what to do once you know. A G-Counter (and ideally a PN-Counter or OR-Set)
  implemented with a real merge function has a genuine, testable two-sided finding: a naive
  LWW-style merge silently loses one side's concurrent increments, while a real CRDT merge is
  provably commutative, associative, and idempotent — the actual correctness properties, testable
  directly (merge(a,b) == merge(b,a); merging the same message twice is a no-op) — so it converges
  to the same value regardless of message order or duplication, which is the whole reason
  Dynamo-style stores and offline-first apps (Automerge, Yjs) use them.
- **Bloom filters** — not covered anywhere in `content/` (confirmed by grep). A real bit-array
  filter with k real hash functions, not a formula described in prose. Two-sided finding: the
  empirically measured false-positive rate should track the closed-form estimate
  `(1 - e^(-kn/m))^k` closely while the filter is within its designed capacity, and visibly exceed
  it once it's overloaded past that capacity — a genuine, measurable space-vs-accuracy trade-off,
  not just a formula to take on faith. Pairs with consistent-hashing thematically (both are
  probabilistic space/accuracy trade-offs over hashing) without covering the same ground.
- **Merkle trees (anti-entropy reconciliation)** — not covered anywhere in `content/` (confirmed by
  grep). The mechanism Dynamo, Cassandra, and git all use to compare two replicas efficiently: build
  a real Merkle tree over each dataset, compare root hashes to detect *any* difference in O(1), then
  walk down only the subtrees whose hashes actually disagree to find exactly which keys differ —
  real, measurable O(log n) targeted diffing against a naive O(n) full-dataset compare for the
  identical two datasets, the same "both sides run for real, against the same input" comparison
  shape as consistent-hashing's naive-modulo-vs-ring contrast.

Do not start any of these without first re-confirming the deep-vs-wide question above (now updated
for Phase 7's pace) — a short field-note and a full lab+article pair still cost very different
amounts of the same budget, and per the "slow down deliberately" decision, repopulating this list
is not itself a decision to start picking through it.

---

## Track C — Small infra items noticed but not worth a phase on their own

- ~~`.ai/content-roadmap.md` split into per-phase files~~ — done 2026-09-08: it had grown from 29 KB
  / 6 phases to 54 KB / 7 phases in one session, nearly doubling, which was itself the signal to
  split before Phase 8 added more rather than after it became unreadable. `.ai/content-roadmap.md`
  is now a short index; full history lives under `.ai/phases/` (`early-history.md`, `phase-5.md`,
  `phase-6.md`, `phase-7.md`), each linking to the next. Every cross-reference elsewhere in the repo
  that cited a specific section (`§5.x`, `§7.x`) was updated to point at the right phase file
  directly, not just the index — checked with a repo-wide grep, not assumed.
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
up, move it into a `.ai/phases/phase-N.md` as a real phase (adding it to `content-roadmap.md`'s
index) and delete it from here, so this file never accumulates completed work alongside genuinely
open candidates.
