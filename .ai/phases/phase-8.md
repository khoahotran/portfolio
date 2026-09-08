# Content Roadmap — Phase 8

Part of the [content roadmap](../content-roadmap.md), split out 2026-09-08. Previous: [Phase 7](phase-7.md).

## 🟢 Phase 8 — Deliberately Slower, Picked Up One at a Time (2026-09-08)

Phase 7 shipped 8 items in rapid succession; asked directly whether to keep that pace, Khoa chose
to slow down deliberately (recorded in `future.md`) — Phase 8 items are picked up one at a time
from `future.md`'s Track B, not back-to-back, the same "one item, fully verified, before the next"
discipline as Phase 7 just without Phase 7's compressed timeline.

### 8.1 ✅ New lab: Consistent Hashing / Hash Ring — DONE (2026-09-08)

First pick from Track B's fresh (post-Phase-7) candidate set. A genuinely unexplored topic —
confirmed by grep, no prior mention of "consistent hashing" anywhere in `content/` — with the
same two-sided, implementation-shaped finding as the labs before it, not a diagram.

`src/labs/consistentHashing.ts` (22 tests) implements the real hash-ring placement algorithm
(FNV-1a plus a MurmurHash3 finalizer) and runs it side by side with naive `hash(key) % nodeCount`
against the identical key set for a node-count change. **The finding, measured not asserted:**
naive modulo remaps the large majority of the keyspace on any node-count change; the ring remaps a
figure in the same order of magnitude as the theoretical `1/N` ideal, for the identical change,
computed against the same 5,000-key set in the same run. The ring's own trade-off is the second
half: with too few virtual nodes per physical node, load across nodes is visibly uneven (measured
coefficient of variation ~0.78 at 1 virtual node/node over 5 nodes), and it drops sharply as
virtual-node count rises — the lab's live slider makes this a real, watched curve rather than a
claim.

**A real bug caught by writing the test suite, not designed into it:** the first hash
implementation used plain FNV-1a on strings like `node-3#41` — differing only in a trailing
digit, exactly the `nodeId#virtualIndex` virtual-node naming scheme. That under-mixes short
strings enough that load imbalance came out **non-monotonic** as virtual-node count rose (worse at
60 virtual nodes/node than at 40, measured directly while calibrating the test). Fixed by adding a
MurmurHash3-style `fmix32` finalizer (three xor/multiply passes) after the FNV-1a loop; the fix is
asserted directly as a decreasing staircase across virtual-node counts in `consistentHashing.test.ts`,
the same "the test itself would have failed against the old implementation" discipline as
backpressure's off-by-one bug in Phase 7.

Registered as the 20th lab (`consistent-hashing`, provenance `implementation`). Companion article:
`content/experiments/2026-09-08-consistent-hashing-and-the-rebalancing-nobody-notices.md`, with a
reciprocal `related:` link added to `gossip-protocol-visualizer` (both are about information
placement/propagation across an unreliable network, without duplicating each other). Verified:
typecheck/lint/157 tests green; `npm run build` + prerender clean (122 pages, both new routes
including the `/experiments/consistent-hashing` → `/labs/consistent-hashing` redirect stub
confirmed with correct title/canonical/og:image); `check:responsive` (122×7 viewports+dark)
completed with exactly one failure, `/projects/quant-alpha` at the 1440px dark viewport,
exhausting 3 retries on plain `ERR_NETWORK_CHANGED` — confirmed unrelated to this work (the route
is untouched by this phase, and a direct fetch against the running preview server returned 200
with the correct title) and consistent with this session's already-repeatedly-documented host
network flakiness, not a route defect. Prerender itself also needed a `--concurrency=1` retry to
get a clean run (the default concurrency of 4 produced 6-8 transient failures per attempt on this
run's unusually loaded host, load average 8-10 vs the more typical 4-5) — the lower-concurrency
run was diagnostic only and not committed, since CI and a calmer host don't need it.

### 8.2 ✅ New lab: Idempotency-Key Store — DONE (2026-09-08)

Second pick from Track B. Unlike 8.1, this one explicitly extends an existing article
(`content/blog/2026-03-21-system-design-notes-idempotency.md`) rather than starting a new one —
`future.md`'s own framing for this candidate — because the article already had a real bug worth
surfacing, not just a gap worth filling.

`src/labs/idempotencyStore.ts` (14 tests) implements two idempotency-key store designs and runs
both against the identical burst of concurrent duplicate requests for one key. **The finding:**
`check-then-set` — the exact GET-then-SET shape of the article's own NestJS interceptor sample —
genuinely double-processes a concurrent duplicate that arrives while the first request is still in
flight, because the completed-results cache it checks has nothing written yet; the interceptor's
own `IN_PROGRESS` marker doesn't close this, since the check and the claim are two separate Redis
round-trips, not one atomic operation. `atomic-claim` (the equivalent of a single `SET key val NX
EX ttl`) closes it: every concurrent duplicate coalesces onto the in-flight run and shares its
result — measured directly as matching `resultId`s, not asserted.

The article itself was edited, not just linked from: a new "The Race the Interceptor Below Doesn't
Close" section walks through exactly where the sample code's GET and SET are non-atomic, links the
lab, and is explicit that the interceptor's `409 Conflict` response is a legitimate alternative to
coalescing *given* an atomic claim — the atomicity is what the sample is actually missing, not its
choice of rejection over waiting.

**An infra fix this lab needed, not itself the finding:** every lab's companion article before
this one lived in `content/experiments/`, so `LabDefinition.relatedArticle` and `LabBackLink` both
hardcoded that collection into the URL. This lab's companion is a `content/blog/` post, so
`relatedArticle` now accepts a `"collection/slug"` string (falling back to `experiments/` for a
bare slug, so all 19 existing entries are unaffected) — the same shape `related:` frontmatter
already uses, not a new convention invented for this one case.

Registered as the 21st lab (`idempotency-store`, provenance `implementation`). Verified:
typecheck/lint/171 tests green; `npm run build` + prerender clean on the first attempt (123 pages,
including the `/experiments/idempotency-store` → `/labs/idempotency-store` redirect stub and the
`LabBackLink` collection-aware fix confirmed resolving to `/blog/system-design-notes-idempotency`,
not a broken `/experiments/blog/...` path); `check:responsive` (123×7 viewports+dark, concurrency=1
given this session's already-documented host network flakiness) came back a clean **PASS — 0
failures**, not even a transient one this time.

### 8.3 ✅ New lab: Vector Clocks / Causal Ordering — DONE (2026-09-08)

Third pick from Track B, closing it out entirely. A genuinely unexplored topic — confirmed by grep,
no prior mention of "vector clock" anywhere in `content/` — deliberately paired with (not
duplicating) the existing `gossip-protocol-visualizer` lab: gossip is about *reach* (how many
rounds until everyone has the message), vector clocks are about *order* (what can be proven about
when things happened relative to each other once information arrives out of sequence).

`src/labs/vectorClocks.ts` (23 tests) implements the real Fidge/Mattern algorithm — increment on
every local/send event, component-wise-max merge plus increment on receive — and runs it over a
real nine-event scripted history across three nodes, so every clock in the lab's event log is
computed, not hand-typed. `compareClocks` is the actual happens-before/happens-after/concurrent
test; the tests assert its one foundational guarantee directly (a send's clock always
happens-before its matching receive's).

**The finding, measured as test behavior, not asserted in prose:** every event also carries a
simulated physical timestamp with adjustable per-node clock skew, and `pickLastWriteWinner` picks
a "winner" by that timestamp alone — a naive last-write-wins resolver's whole decision procedure.
For a pair of events `compareClocks` calls **concurrent** (genuinely, provably no causal link),
dragging clock skew in opposite directions **flips which one `pickLastWriteWinner` picks** — while
`compareClocks`'s "concurrent" verdict for the identical pair never moves, in either direction,
because it depends only on the logical clocks, which physical clock skew cannot touch at all.

Registered as the 22nd lab (`vector-clocks`, provenance `implementation`). Companion article:
`content/experiments/2026-09-08-vector-clocks-and-the-clock-skew-that-fools-last-write-wins.md`,
with a reciprocal `related:` link added to `gossip-protocol-visualizer` (now linking both
consistent-hashing and vector-clocks, its two natural pairings). Verified: typecheck/lint/194 tests
green; `npm run build` + prerender clean on the first attempt (125 pages, including the
`/experiments/vector-clocks` → `/labs/vector-clocks` redirect stub confirmed with correct
title/canonical/og:image); `check:responsive` (125×7 viewports+dark, concurrency=1) came back a
clean **PASS — 0 failures**, same as 8.2.

This closes Track B entirely — every candidate from the post-Phase-7 set (§8.1-8.3) has shipped.
See `future.md` for what comes after it.

---

Next: none yet — see `future.md` for what's still in Track B.
