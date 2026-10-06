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

This closed the post-Phase-7 Track B set entirely (§8.1-8.3). `future.md` was repopulated
immediately after with a fresh set (CRDTs, Bloom filters, Merkle trees) — Khoa asked to continue
step by step through it right away rather than pausing after the repopulation.

### 8.4 ✅ New lab: CRDTs (Conflict-Free Replicated Data Types) — DONE (2026-09-08)

First pick from the newest Track B set. The deliberate sequel to 8.3, not a duplicate: vector
clocks *detect* that two writes are concurrent; this lab is about what a system actually does once
it knows that.

`src/labs/crdt.ts` (30 tests) implements two real CRDTs, each run against the naive design it
replaces on the identical scenario. **G-Counter vs. a naive LWW register:** two nodes independently
apply real local increments with no knowledge of each other; the G-Counter's merged total (sum of
every node's slot) always equals the true total, while the naive register — keep whichever node's
write has the later timestamp, discard the rest — measurably loses the losing node's increments
every time (`lwwLostUpdates`, counted directly). **OR-Set vs. a naive 2P-Set:** a real
add-remove-add sequence for one value is run through both; OR-Set's per-tag tombstoning lets the
re-add survive (`orSetHasElement: true`), while the 2P-Set's value-level (not tag-level) removal
makes the value unrecoverable *permanently*, even after a genuine later re-add
(`twoPhaseSetHasElement: false`) — the textbook 2P-Set limitation, proven as a test assertion, not
described in prose. Both structures' merge functions are also asserted directly against the actual
CRDT laws — commutative, associative, idempotent, and idempotent under duplicate delivery — not
just shown to converge on one demo scenario.

**A sharper finding than the one the test was written to check, found while writing it:** a test
asserting "only one node contributed, so nothing should be lost" initially failed — with a
timestamp *tie*, the register's deterministic nodeId tiebreak can pick the zero-contribution node
as the winner, discarding the sole real contributor's entire work. Fixed by splitting it into two
tests: one confirming the intended case (the real contributor's write also has the later
timestamp, nothing lost) and a new one asserting the sharper fact directly (a tie can lose 100% of
one node's real work to a tiebreak rule that has nothing to do with who did the work) — the same
"the test itself surfaces a truer version of the finding" pattern as consistent-hashing's
hash-mixing bug and backpressure's off-by-one in earlier phases.

Registered as the 23rd lab (`crdt`, provenance `implementation`). Companion article:
`content/experiments/2026-09-08-crdts-what-to-do-once-you-know-two-writes-are-concurrent.md`, with
a reciprocal `related:` link added to `vector-clocks-and-the-clock-skew-that-fools-last-write-wins`.
Verified: typecheck/lint/224 tests green; `npm run build` + prerender clean on the first attempt
(127 pages, including the `/experiments/crdt` → `/labs/crdt` redirect stub confirmed with correct
title/canonical/og:image); `check:responsive` (127×7 viewports+dark, concurrency=1) came back a
clean **PASS — 0 failures** (one transient network blip on an unrelated, pre-existing route
auto-retried successfully).

### 8.5 ✅ New lab: Bloom Filters — DONE (2026-09-08)

Second pick from the current Track B set, continued straight through per Khoa's "step by step"
instruction (no re-ask between items for this set — see the pace note in `future.md`).

`src/labs/bloomFilter.ts` (19 tests) implements a real bit-array Bloom filter using the standard
Kirsch-Mitzenmacher construction (`k` hash-function outputs derived from exactly two real hash
computations, `h1(x) + i·h2(x) mod m`) rather than genuinely running `k` separate hash algorithms —
the actual technique real implementations use. **The finding, both halves measured:** the
false-negative guarantee is absolute (asserted at 0 across every configuration tested — inserting
an item can only ever make future lookups for it *more* likely to hit, never less); the
false-positive rate is a real, measured number that tracks the closed-form estimate
`(1 - e^(-kn/m))^k` closely at designed capacity (both around 1%) and climbs together with it,
sharply, once the filter is loaded past that capacity — both landing around 80% at 5x overload,
measured against 5,000 genuinely-not-inserted test items, not asserted from the formula alone.

Registered as the 24th lab (`bloom-filter`, provenance `implementation`). Companion article:
`content/experiments/2026-09-08-bloom-filters-and-the-capacity-you-cant-see-coming.md`, with a
reciprocal `related:` link added to `consistent-hashing-and-the-rebalancing-nobody-notices` (both
are probabilistic space/accuracy trade-offs over hashing, without covering the same ground).
Verified: typecheck/lint/243 tests green; `npm run build` + prerender clean on the first attempt
(129 pages, including the `/experiments/bloom-filter` → `/labs/bloom-filter` redirect stub
confirmed with correct title/canonical/og:image); `check:responsive` (129×7 viewports+dark,
concurrency=1) came back a clean **PASS — 0 failures** (five transient network blips across
unrelated, pre-existing routes, all auto-retried successfully).

### 8.6 ✅ New lab: Merkle Trees (Anti-Entropy Reconciliation) — DONE (2026-09-08)

Third and final pick from the current Track B set, closing it out entirely.

`src/labs/merkleTree.ts` (16 tests) builds a real Merkle tree over two 1,024-entry datasets and
runs a real targeted walk that only descends into a subtree whose hash actually differs, against a
naive full-scan baseline on the identical pair. **The finding, measured at every point on the
spectrum:** two identical datasets cost the targeted walk exactly 1 node visit — an O(1) proof of
full equality — versus the naive scan's fixed 1,024; a single differing key costs ~21 visits; five
scattered differences cost ~80. The honest fourth case, deliberately included rather than omitted:
when **every** key differs, the targeted walk visits ~2,047 nodes, genuinely *more* than the naive
scan's 1,024 — proof that the win is specific to sparse differences (the case anti-entropy repair
actually expects), not a universal speedup, asserted directly as a test rather than left as an
unstated caveat.

Registered as the 25th lab (`merkle-tree`, provenance `implementation`). Companion article:
`content/experiments/2026-09-08-merkle-trees-and-the-diff-nobody-has-to-compute.md`, with a
reciprocal `related:` link added to `consistent-hashing-and-the-rebalancing-nobody-notices` (now
linking gossip-protocol-visualizer, bloom filters, and Merkle trees — its three natural pairings,
all real Dynamo-style mechanisms viewed from different angles). Verified: typecheck/lint/259 tests
green; `npm run build` + prerender clean on the first attempt (131 pages, including the
`/experiments/merkle-tree` → `/labs/merkle-tree` redirect stub confirmed with correct
title/canonical/og:image); `check:responsive` (131×7 viewports+dark, concurrency=1) needed one
rerun — the first attempt failed on `/tags/security` (`ERR_NETWORK_CHANGED`, exhausted 3 retries)
alongside an unusually high rate of transient blips across unrelated routes throughout that same
run; investigated rather than accepted (both the route and its asset chunk confirmed serving
cleanly via direct `curl` immediately after), and the rerun came back a clean **PASS — 0 failures**.

This closes the current Track B set entirely (§8.4-8.6: CRDTs, Bloom filters, Merkle trees) — see
`future.md` for what's next. Per Khoa's explicit instruction, no new Track B set was invented
unprompted after this one closed out.

### 8.7 ✅ New lab: Raft Consensus — DONE (2026-09-09)

Asked "what is the next action?" with Track B and Track A both empty of ready work, a fresh scan
(lab registry, 25 entries; grep across `content/`) turned up three unexplored candidates presented
directly rather than pre-added to `future.md` first — Khoa picked Raft.

`src/labs/raft.ts` (11 tests) implements two real Raft mechanisms, the algorithm the
leader-election article's own comparison table names as what production systems actually reach for
over Bully. **Election restriction:** a candidate's log is compared against every alive peer's
(higher last-log term wins outright; equal term falls back to log length), and a stale candidate
loses even when every peer is alive and willing — the direct fix for what Bully's pure id-based
election can't rule out. **Commit-index safety**, the subtler rule the Raft paper's own Figure 8
exists to justify: an entry replicated to a majority is asserted as genuinely *not* committed
unless it's also from the leader's current term (`wouldBeUnsafeWithoutTermCheck`, tested directly
against the exact shape of that scenario), and correctly commits — together with everything before
it — once a current-term entry also reaches that majority.

Registered as the 26th lab (`raft`, provenance `implementation`). Companion article:
`content/experiments/2026-09-09-raft-and-the-commit-rule-replica-count-alone-cant-prove.md`, with a
reciprocal `related:` link added to `leader-election-bully-algorithm` (now linking
gossip-protocol-visualizer, Redlock, and Raft — the three pieces it most directly sets up or
contrasts with). Verified: typecheck/lint/270 tests green (one real lint warning caught and fixed
— a `useMemo` missing the `leaderLog` dependency — before it shipped); `npm run build` + prerender
clean on the first attempt (133 pages, including the `/experiments/raft` → `/labs/raft` redirect
stub confirmed with correct title/canonical/og:image); `check:responsive` (133×7 viewports+dark,
concurrency=1) came back a clean **PASS — 0 failures**, first attempt, no reruns needed.

### 8.8 ✅ New lab: Two-Phase Commit vs. Saga — DONE (2026-09-09)

Track B was empty again after 8.7; asked directly, a fresh scan (grep across `content/` for
"two-phase commit", "saga", and related terms) turned up three fresh candidates presented directly
— Khoa picked this one. Saga itself already had a lab (`saga-state-machine-visualizer`) and a deep
system-design write-up (`implementing-the-saga-pattern-for-distributed-transfers`, Core Banking's
real orchestrator), but **2PC had never been implemented anywhere on the site** — every prior
mention was a name in a comparison table, never run. This lab runs both, on the same kind of
transaction, so the trade-off is a measured contrast rather than two write-ups that never meet.

`src/labs/twoPhaseCommitVsSaga.ts` (11 tests) implements both protocols' real failure modes.
**2PC's actual cost:** a participant that votes yes enters the "prepared" state and cannot resolve
itself — it needs the coordinator's broadcast decision. If the coordinator crashes after collecting
all-yes votes but before broadcasting, every yes-voter is left blocked indefinitely
(`blockedParticipants`), regardless of cluster size — there's no quorum to fall back on the way
Raft's commit rule has one. A no-voter, by contrast, is never at risk: it aborts locally the instant
it votes, so it's never blocked by anything that happens to the coordinator afterward — asserted
directly as a test, not just described. **Saga's actual cost, made a first-class case rather than a
table row:** `simulateSaga` accepts a `compensationSucceeds` flag per step; when a compensation
itself fails partway through unwind, the saga has no equivalent of 2PC's held locks to fall back
on — the earlier step's committed side effect is just left standing, uncompensated, and the unwind
correctly stops there rather than compensating still-earlier steps out of their real dependency
order (`compensationsFailed`, `fullyCompensated: false`, tested directly). The saga result type
carries no `blockedParticipants`-equivalent field at all — asserted directly in a test — because
nothing in the model ever waits on anyone; that absence is the actual point of the comparison.

Registered as the 27th lab (`two-phase-commit-vs-saga`, provenance `implementation`). Companion
article: `content/experiments/2026-09-09-two-phase-commit-vs-saga-what-atomicity-actually-costs.md`,
with reciprocal `related:` links added to three articles: `leader-election-bully-algorithm` (2PC's
single-coordinator blocking is the same single-point-of-failure shape as Bully's leader, contrasted
with Raft's quorum fallback), `implementing-the-saga-pattern-for-distributed-transfers` (the Core
Banking real-orchestrator piece this lab's Saga side is the abstract companion to), and
`saga-state-machine-visualizer` (the existing Saga lab, which this one extends with the
compensation-failure case it didn't cover).

**A real bug caught by `check:responsive`, not by the test suite — the first time this session a
shipped lab's own responsive check caught a genuine regression rather than transient host
flakiness.** The first `check:responsive` run reported an actual overflow FAIL (not a retry-then-
pass) on `/labs/two-phase-commit-vs-saga` at 320px: `scrollWidth 325 > clientWidth 320`. Investigated
directly with a throwaway Playwright script rather than assumed transient, per this session's
established discipline — the offending element was the shared `ProvenanceNote` component's basis
text, which embeds each lab's source path (`src/labs/twoPhaseCommitVsSaga.ts`, the longest lab
filename yet) as a single unbreakable token with no spaces. `min-w-0` on the ancestor lets the flex
item shrink, but doesn't make an unbreakable word wrap, so a long enough path forces real horizontal
overflow — every prior lab's path just happened to be short enough not to trip it. Fixed in the
shared component (`break-words` added to every text branch of `ProvenanceNote`'s `Body`), not
patched only in this lab's own file, since any future lab's path is exactly as unbreakable. Verified
directly: a throwaway script confirmed `scrollWidth === clientWidth` at 320px after the fix, and the
full gate (typecheck/lint/281 tests) stayed green.

Verified: typecheck/lint/281 tests green; `npm run build` + prerender needed several retries to get
a clean run — the host was under heavy, well-documented-this-session load (uptime showed load
average 15+ at one point) and threw `ERR_NETWORK_CHANGED` on a different random, unrelated route
each attempt (never the same route twice, never this lab's own routes) — confirmed transient by
direct `curl` against each reported route immediately after, consistent with every other instance of
this host-level flakiness this session; a clean prerender (135 pages + 21 redirects, including the
`/experiments/two-phase-commit-vs-saga` → `/labs/two-phase-commit-vs-saga` redirect stub confirmed
correct, and the article's own dedicated OG image confirmed against the lab page's `og-default.png`
fallback — the same split as every other lab) was reached on a later attempt. `check:responsive`
(135×7 viewports+dark, concurrency=1), rerun against the fixed build, came back a clean
**PASS — 0 failures**.

### 8.9 ✅ New lab: HyperLogLog — DONE (2026-09-09)

Track B was empty again after 8.8; a fresh scan turned up HyperLogLog, LSM Tree, and Skip List —
Khoa picked HyperLogLog, which had already surfaced twice in prior scans (§8.7, §8.8) without being
picked. The Bloom filter lab (§8.5) answers "have I seen this exact item"; this one answers the
genuinely different, adjacent question — "how many *distinct* items have I seen" — in fixed space,
without storing a single item either. Neither structure answers the other's question.

`src/labs/hyperLogLog.ts` (7 tests) implements the real algorithm (Flajolet et al., 2007): hash each
item, keep the longest leading-zero run per register, estimate cardinality from the harmonic mean
across registers. **The finding, measured against ground truth, not asserted:** `runCardinalityTrial`
builds a sketch from a known true count and reports the actual estimation error; the test suite
checks that error against `theoreticalStandardError` (`1.04/√m`) across cardinalities from 100 to
100,000 — a real relationship between register count and accuracy. **The sharper finding, the same
"caught by writing the test, not designed into it" pattern as this session's other labs:** below
roughly `2.5m` true items, most registers are still untouched zeros, and the raw harmonic-mean
formula doesn't account for that — at 50 true items against 1,024 registers, the uncorrected formula
overestimates by more than 10×. The paper's own fix (linear counting, `m·ln(m/zeroRegisters)`) is
implemented as `estimateCardinality`'s small-range branch and asserted directly against the raw,
uncorrected version (`estimateCardinalityRaw`, exported specifically so the difference is a real
before/after comparison, not prose). **The second real feature, not just an accuracy exercise:**
`mergeHyperLogLog` (elementwise max per register) is asserted to correctly estimate a true union
cardinality even under heavy overlap between two independently-built sketches, while naively summing
their two individual estimates is asserted to be measurably wrong — it double-counts the overlap,
by a margin the test checks directly (>20% off at 500/1500 overlap/union in the calibration run).

Registered as the 28th lab (`hyperloglog`, provenance `implementation`). Companion article:
`content/experiments/2026-09-09-hyperloglog-and-the-question-bloom-filters-cant-answer.md`, with
reciprocal `related:` links added to `bloom-filters-and-the-capacity-you-cant-see-coming` (the
direct "answers a different question" pairing) and `merkle-trees-and-the-diff-nobody-has-to-compute`
(both are "aggregate first, coordinate never" mechanisms, applied to counting vs. reconciliation).
Verified: typecheck/lint/288 tests green; `npm run build` + prerender clean on the first attempt
(137 pages + 22 redirects, including the `/experiments/hyperloglog` → `/labs/hyperloglog` redirect
stub confirmed correct); given the ProvenanceNote overflow bug §8.8 just caught, the new page was
checked directly for horizontal overflow at 320px with a throwaway Playwright script *before*
running the full sweep this time (both the lab page and its article page confirmed
`scrollWidth === clientWidth`); `check:responsive` (137×7 viewports+dark, concurrency=1) came back a
clean **PASS — 0 failures**.

### 8.10 ✅ New lab: LSM Trees — DONE (2026-09-09)

Track B was empty again after 8.9; asked directly, a fresh scan turned up LSM Tree, Skip List, and
MVCC & Write Skew — Khoa picked LSM Tree, which had surfaced once before (§8.9's scan) without
being picked. The site's B-Tree vs. BRIN research piece already covers the in-place-update index
PostgreSQL defaults to; this lab runs the structurally different design most write-heavy real-world
key-value stores (LevelDB, RocksDB, Cassandra) actually ship — one that never updates in place at
all.

`src/labs/lsmTree.ts` (7 tests) implements a real memtable + immutable sorted-run structure, with an
explicit `compact` step. **The finding, measured on both sides, at two different write volumes:**
with no compaction, `writeAmplification` is asserted to be exactly `1.0` (every write operation
lands on disk exactly once, ever) — but `runCount` and the cost of a missing-key lookup
(`runsProbed`) are asserted to grow in exact proportion to total writes (100 runs at 5,000
operations, 400 runs at 20,000 — a real 4× for a real 4×, not an estimate). With compaction, run
count and read amplification are asserted to stay bounded at a small constant regardless of write
volume — but write amplification is asserted to rise above `1.0` (measured `3.42×` at one
compaction cadence), and to rise *further* when compaction runs more often (`5.8×` at double the
cadence, with read amplification unchanged — it was already at the floor of 1). A separate test
asserts the correctness properties underneath the trade-off: a newer run's value correctly shadows
an older run's for the same key, and a tombstone correctly shadows a deleted key until compaction,
at which point it — and the key it hid — are dropped entirely, not left behind as dead weight.

Registered as the 29th lab (`lsm-tree`, provenance `implementation`). Companion article:
`content/experiments/2026-09-09-lsm-trees-and-the-write-youll-pay-for-later.md`, with reciprocal
`related:` links added to `database-indexing-btree-vs-brin-for-time-series` (the direct
in-place-vs-never-in-place contrast) and `bloom-filters-and-the-capacity-you-cant-see-coming` (named
in an honest scope note as the real mitigation this lab deliberately doesn't model — per-run Bloom
filters, which soften but don't eliminate the read-amplification side of the trade-off). Verified:
typecheck/lint/295 tests green; `npm run build` + prerender clean on the first attempt (139 pages +
23 redirects, including the `/experiments/lsm-tree` → `/labs/lsm-tree` redirect stub confirmed
correct); following the discipline established after §8.8's ProvenanceNote bug, both new pages were
checked directly for horizontal overflow at 320px with a throwaway Playwright script *before*
running the full sweep (both confirmed `scrollWidth === clientWidth`); `check:responsive` (139×7
viewports+dark, concurrency=1) came back a clean **PASS — 0 failures**.

---

Next: none yet — see `future.md` for what's still in Track B.
