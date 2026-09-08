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

---

Next: none yet — see `future.md` for what's still in Track B.
