# Content Roadmap — Phase 7

Part of the [content roadmap](../content-roadmap.md), split out 2026-09-08. Previous: [Phase 6](phase-6.md).

## 🟢 Phase 7 — Deep-Not-Wide, Picked Up Item by Item (2026-09-07)

Khoa answered Phase 6's open pace question directly: **stay deep-before-wide**, not shift to cadence.
Work in this phase comes one at a time from `future.md`'s Track B, cheapest/lowest-risk first, each
verified in full before the next is picked up — no batch commitment, per that file's own rules.

### 7.1 ✅ First real use of `series:` — DONE (2026-09-07)
§5.6 shipped `series:`/`seriesOrder:` and `SeriesNav` on 2026-08-28 with zero content exercising it.
Retrofitted the three benchmark-harness rewrites (§5.8) as a series — `redis-vs-bullmq` (part 1),
`db-event-replay-benchmark` (part 2), `go-vs-ts-concurrency` (part 3) — named "The Benchmark
Rewrites", matching the actual re-measurement order documented in §5.8, not publish-date order.
Metadata-only change; no article prose touched.

Verified rather than assumed: build-time `series`/`seriesOrder` validation passed; the prerendered
HTML for all three articles was grepped directly and shows the correct "Part N of 3 in The Benchmark
Rewrites" badge; full gate (typecheck, lint, 77 tests, build+prerender 106 pages, `check:contrast`
105×2 themes, `check:responsive` 106×7 viewports+dark) all green. `check:responsive` needed a
concurrency drop to 1 to complete under unusually heavy host CPU contention this session (multiple
concurrent Claude Code sessions on the same sandbox) — not a code issue, and the same mitigation this
project has used before for WSL2 network flakiness.

Also fixed in service of this item's own verification, not part of the feature itself: see
`.ai/decision-log.md` Decision 22 — `check-contrast.mjs` was found to print a false "PASS" when the
preview server was unreachable.

`future.md`'s Track B entry for this is removed; the "PFM as a content source" entry was already
removed in Decision 22.

### 7.2 ✅ New lab: Leader Election (Bully algorithm) — DONE (2026-09-07)
Track B's other cheap candidate after §7.1 — a self-contained lab needing no Docker harness, same
"pure algorithm + interactive visualization" shape as the rate-limiting and gossip labs.

**Shipped:** `src/labs/leaderElection.ts` implements the real Bully algorithm (Garcia-Molina,
1982) — crashing the leader in `/labs/leader-election` sends real ELECTION/ALIVE/COORDINATOR
messages, computed as a breadth-first wave so concurrent sub-elections (multiple alive nodes each
independently challenging ids above them) are modelled correctly, not simplified into one linear
chain. 9 unit tests, including one asserting the algorithm's well-known O(n²) worst-case message
cost more than doubles when node count doubles — a real property of the simulation's own output,
not a number asserted only in the companion article's prose. Companion article
(`content/experiments/2026-09-07-leader-election-bully-algorithm.md`) contrasts Bully's
unconditional-highest-id-wins rule and lack of split-brain protection against Raft/ZAB, per
`.ai/writing-style-guide.md`'s comparison-table convention.

Registered as the 13th lab (`src/labs/registry.ts` + `lab-ids.json`, parity enforced by
`registry.test.ts`), provenance `implementation`.

Verified: build-time tag/related validation clean; typecheck/lint/86 tests green; full
build+prerender (108 pages) confirmed correct title/og:image/canonical for both the new lab and
article routes and the article's CTA link resolves; `check:contrast` (107×2 themes) and
`check:responsive` (108×7 viewports+dark) both real PASS against a live preview server — both
needed `--concurrency=1` this session due to unusually severe, fluctuating host CPU contention
(load average observed as high as ~25, later dropping to ~2 on the same host with no code change),
confirmed by direct `uptime`/`ps` inspection to be other concurrent processes, not a regression.

`future.md`'s Track B entry for this is removed.

### 7.3 ✅ 4th real benchmark harness: PgBouncer vs Direct Postgres — DONE (2026-09-07)
The last concretely-scoped Track B candidate. Chosen over the gRPC-vs-REST alternative because it
needed no protobuf toolchain — just standard Postgres/PgBouncer Docker images plus a Go client,
lower setup risk in this sandbox.

**Shipped:** `benchmarks/pgbouncer-vs-direct/` — Postgres 16 + PgBouncer 1.16 (built from source via
apt, not a third-party Docker Hub image, to avoid depending on one), one Go client measuring two
connection lifecycles (`churn`: a fresh connection per query; `persistent`: one connection reused
per client) at client concurrency 10/25/50. `./run.sh` reproduces the full 12-run matrix.

**The finding is genuinely two-sided, not a flat "add a pooler" answer:** in `churn` mode
PgBouncer's throughput advantage *widens* with concurrency (3.9x -> 5.1x -> 7.2x), because every
direct connection forces Postgres to fork a new backend process and PgBouncer's fixed pool absorbs
that cost; in `persistent` mode the result *reverses* between low and high concurrency (PgBouncer
edges out direct on throughput at 10/25 clients despite worse latency, then direct wins both
cleanly at 50 clients), because PgBouncer's own single event loop becomes the bottleneck once there
is no setup cost left to amortize. Both directions were verified by direct execution, not assumed.

**Two real bugs found and fixed while building the harness, before any number was trusted:**
1. PgBouncer refused to run as the container's root user (`FATAL PgBouncer should not run as root`)
   — fixed by running as the `postgres` system user the `postgresql-client` package provides, with
   config files explicitly `chown`'d to it.
2. Every PgBouncer-target run crashed with `pq: unsupported startup parameter: extra_float_digits`
   — `lib/pq` always sends that startup parameter and PgBouncer only forwards a fixed whitelist by
   default; fixed with `ignore_startup_parameters = extra_float_digits` in `pgbouncer.ini`. Neither
   bug was guessable from documentation; both were found by actually running the harness.

Also bumped this harness's Postgres healthcheck budget (30s -> 90s) after a real, reproducible
failure: the official Postgres image's two-phase startup (temp start for initdb, shutdown, real
restart) exceeded the 30s budget other harnesses in this repo use, under this session's confirmed
heavy host CPU contention.

Registered as the 14th lab (`pgbouncer-vs-direct`, provenance `measured`, `caveat` naming the same
host-contention caveat as the README). Companion article contrasts churn vs persistent guidance and
names PgBouncer's real, distinct connection-limit-protection benefit that this harness doesn't
measure (a reliability property, not a throughput one).

Verified: build-time validation clean; typecheck/lint/86 tests green; full build+prerender (110
pages) confirmed correct metadata for both new routes; `check:contrast` (109×2 themes) and
`check:responsive` (110×7 viewports+dark) both real PASS at `--concurrency=1` against a live preview
server.

`future.md`'s Track B "4th real benchmark harness" entry is removed — Track B is now empty of
concretely-scoped items; only the not-yet-scoped distributed-systems gaps (distributed locks,
backpressure, CDN/edge caching, canary deploys) remain, and picking any of those up should start
with scoping, not assuming leader-election's or this harness's shape fits automatically.

### 7.4 ✅ New lab: Distributed Locks (Redlock) — DONE (2026-09-07)

Picked up "distributed locks (Redlock)" from the residual, not-yet-scoped candidates §7.3 left
open — the first of that list to actually get scoped and built, chosen over backpressure/CDN/canary
because it's the closest sibling to §7.2's leader-election shape (simulate a real, debated
distributed-systems algorithm) and needs no new tooling, unlike gRPC-vs-REST.

`src/labs/redlock.ts` (13 tests) runs the actual Redlock arithmetic, not a description of it, in
two stages:

1. `attemptRedlockAcquisition` — real majority-quorum math (`floor(n/2)+1`), real elapsed-time
   accounting across every node attempt (a down node costs a fixed acquire timeout, an alive one
   its own latency), and a lock only counts as acquired if quorum is met *and* there's TTL validity
   left over once acquiring it is paid for.
2. `simulatePauseAfterAcquire` — the specific flaw Martin Kleppmann's 2016 critique centers on: a
   client pause (GC, slow disk, descheduled VM) between acquiring the lock and finishing the work it
   guards can run past the TTL, and the lock expires on the storage side while the client still
   believes it holds it. The lab ties `secondClientCanAcquire` to `lockExpiredDuringPause` as an
   exact equality, not a probabilistic hedge — nothing about "client A is still running" keeps a key
   held once the storage nodes' own clock lapses.

**The finding is genuinely two-sided, same as §7.1-7.3's pattern of not settling for a flat
answer:** Stage 1 confirms Redlock's quorum-plus-TTL math is real and works as specified — a
minority of down nodes doesn't block acquisition, and a majority reached too slowly correctly fails
even with every node alive. Stage 2 confirms Kleppmann's critique is also real, as an exact,
testable equality rather than an assertion. The article's own resolution: Antirez's rebuttal to
Kleppmann doesn't actually dispute the pause scenario — it disputes what Redlock ever claimed to
guarantee (efficiency locking, not correctness locking), and his own fix is the same one Kleppmann
proposes independently: a fencing token checked by the *protected resource*, not the lock layer,
since the lock layer's own clock is exactly what a long pause defeats.

One incidental bug fixed along the way, found by reading the registry rather than by a failing
check: `leader-election` and `pgbouncer-vs-direct` both had `collidesWithArticleSlug: true` despite
their lab id *not* matching their article's slug (only `id === relatedArticle` should ever set this
flag — see the field's own doc comment). The likely cause was copy-paste from `websockets-vs-sse`,
where the flag is correctly true. Effect was silent, not broken: the field only suppresses the
`/experiments/<id>` -> `/labs/<id>` redirect stub, and neither lab had ever had that route exist
before, so nothing was actually unreachable. Fixed in `e6adf0d`, and confirmed fixed in the
prerendered output — `/experiments/redlock` (this session's third lab to get the correct flag from
the start) now genuinely produces the redirect stub the field's doc comment describes.

Registered as the 15th lab (`redlock`, provenance `implementation`). Verified: build-time
validation clean (49 docs); typecheck/lint/99 tests green; full build+prerender (112 pages)
confirmed correct title/og:image/canonical for both new routes, including the redirect stub;
`check:contrast` (111×2 themes) and `check:responsive` (112×7 viewports+dark) both real PASS. Build
was killed once by a real, severe spike in this session's already-documented host CPU contention
(load average 39 on 8 cores, from concurrent unrelated Go compiles) — re-ran once load dropped
rather than retrying into the same contention, consistent with this project's existing mitigation
pattern rather than a new one.

`future.md`'s "distributed systems gaps" residual note is narrowed to drop distributed locks —
backpressure, CDN/edge caching, and canary/blue-green deploys remain open, not-yet-scoped
candidates, alongside gRPC-vs-REST as a possible 5th harness.

### 7.5 ✅ New lab: Backpressure Strategies — DONE (2026-09-07)

Picked up "backpressure" from §7.4's remaining candidates — chosen over CDN/edge-caching and
canary/blue-green because it's algorithm-shaped rather than process-shaped, same reason redlock was
chosen over those two the round before.

`src/labs/backpressure.ts` (14 tests) runs four real policies for a bounded queue between a
producer and a slower consumer: `block`, `drop-new`, `drop-old`, `circuit-breaker`. The key design
choice: every queued item carries the tick it arrived on, instead of the simulation just tracking
counts. That turns out to be necessary, not decorative — under sustained overload, `drop-new` and
`drop-old` discard the exact same *number* of items every time, so counts alone can't distinguish
them. Tracking identity proves the real difference directly: every item `drop-new` discards has
`arrivedTick === tick` (it can only ever reject its own newest arrivals), every item `drop-old`
discards has `arrivedTick < tick` (it can only ever evict something already resident) —
`backpressure.test.ts` asserts both as exact per-tick properties, not just a final count.

**Two real bugs found while building this, neither guessable from reading the code once:**
1. A curly apostrophe (`'`) pasted into the new registry provenance string broke out of a
   single-quoted JS string literal — caught immediately by `typecheck`, fixed by matching this
   codebase's existing convention (switch the specific segment to double quotes rather than escape).
2. The circuit-breaker's state machine mutated `circuitState` *before* recording which state
   governed the current tick's admission decision, so the tick that actually tripped the breaker
   (admitting a full batch right up until threshold) was mislabeled as already "open" in its own
   output — a one-tick-out-of-sync bug between the transition and its own recorded label. Found
   while writing `backpressure.test.ts`'s "rejects everything while open" assertion, which failed
   against real output rather than being written to match whatever the code happened to do. Fixed
   by deciding each tick's admission strictly from the state it *entered* with (`stateAtStart`), and
   only mutating `circuitState` for the *next* tick afterward.

Registered as the 16th lab (`backpressure`, provenance `implementation`). Verified: build-time
validation clean (50 docs); typecheck/lint/113 tests green; full build+prerender (114 pages)
confirmed correct title/og:image/canonical for both new routes, including the redirect stub;
`check:contrast` (113×2 themes) and `check:responsive` (114×7 viewports+dark) both real PASS at
`--concurrency=1`.

`future.md`'s "distributed systems gaps" residual note is narrowed again — CDN/edge caching and
canary/blue-green deploys remain open, not-yet-scoped candidates, alongside gRPC-vs-REST as a
possible 5th harness.

### 7.6 ✅ 5th real benchmark harness: gRPC vs REST — DONE (2026-09-07)

Picked up gRPC-vs-REST as the 5th harness, gated on a real feasibility check first rather than
assumed: the host itself has no `protoc`, but that's the wrong test — the other harnesses install
their toolchain inside the Docker build, not on the host. A throwaway Docker build confirmed `apk
add protobuf` plus `go install` for `protoc-gen-go`/`protoc-gen-go-grpc` work fine given a Go base
image new enough for the module's minimum version (1.22 failed, 1.25 succeeded) — the actual
harness's Dockerfile generates the protobuf/gRPC Go code from `proto/users.proto` at build time,
nothing generated is committed, same "real, runnable, reproducible from source" standard
`pgbouncer-vs-direct` set for itself.

One Go server (`benchmarks/grpc-vs-rest`) runs a gRPC listener (protobuf, HTTP/2) and a REST/JSON
listener (`net/http`, HTTP/1.1) side by side, both reading one shared, deterministic data generator
— isolating the protocol as the only variable, same philosophy as `go-vs-ts-concurrency` isolating
the language runtime. Two payload shapes (`single`: one record; `list`: 100 records) x client
concurrency 10/25/50, 30 requests per client, one shared reused connection per run for either
protocol (a single `*grpc.ClientConn` / `*http.Client`) — the realistic deployment pattern, not a
strawman that reconnects per request on only one side.

**The finding directly contradicts the "gRPC is faster" received wisdom, measured rather than
assumed:** protobuf's wire-size advantage is real and consistent (~20% smaller for the 100-record
payload, at every concurrency level) — but REST wins throughput at every concurrency level tested
for the small payload (1.9x-2.5x), and even for the larger payload where the smaller wire size
should matter more, gRPC only wins outright at one of the three concurrency levels tested (25
clients) — REST wins at 10, the two are roughly tied at 50. The likely mechanism, verified rather
than left as a guess: isolating `clients=1` shows gRPC's tail latency already exceeds REST's with
*zero* concurrency (grpc avg 6.18ms/p95 11.53ms vs rest avg 1.66ms/p95 3.75ms, both measured), and
the gap widens as concurrency rises — consistent with grpc-go serializing every concurrent call's
frames through one shared connection's single write loop (the standard, recommended way to use a
gRPC connection, and exactly what HTTP/2 multiplexing is *for*), while REST's `*http.Client` pools
independent TCP connections that get real OS-level write parallelism a single multiplexed
connection doesn't offer the same way.

A spot-check rerun of the single-mode, 10-client case (this session's host was again under
confirmed CPU contention while the matrix ran) reproduced the same *direction* — REST still ahead
on both throughput and latency — but a different *magnitude* (throughput ratio 1.9x on the
committed run, 2.5x on the rerun), same "direction reproduces, magnitude doesn't" pattern already
documented for `pgbouncer-vs-direct`.

Registered as the 17th lab (`grpc-vs-rest`, provenance `measured`). Verified: build-time validation
clean (51 docs); typecheck/lint/113 tests green; full build+prerender (116 pages) confirmed correct
title/og:image/canonical for both new routes, including the redirect stub; `check:contrast` (115×2
themes) and `check:responsive` (116×7 viewports+dark) both real PASS.

`future.md`'s Track B is now empty of concretely-scoped items again — CDN/edge caching and
canary/blue-green deploys remain open, not-yet-scoped candidates.

### 7.7 ✅ New lab: Canary Rollout Analysis — DONE (2026-09-07)

Picked up canary/blue-green deploys, initially framed as an article-only candidate (no obvious
"run a real algorithm" angle, unlike leader-election/redlock/backpressure) — reconsidered before
starting, since a real canary-analysis decision procedure (a statistical significance test deciding
promote-vs-rollback per traffic stage) is exactly as implementation-shaped as those three, just not
previously noticed. Scoped as article + lab rather than article-only on that basis.

`src/labs/canaryRollout.ts` (12 tests) runs a real **two-proportion z-test**, one-tailed — the same
class of statistical test real canary-analysis systems (Kayenta, Flagger) use instead of a raw
error-rate threshold. Error counts per stage are computed deterministically from each input rate
(no random-number generator), consistent with this lab series' existing preference for fully
deterministic behaviour over simulated randomness — the thing being tested is the statistical
decision procedure, not a random walk.

**The finding is a genuine two-sided one, not a single "significance testing is good" endorsement:**
`canaryRollout.test.ts` proves, as behaviour rather than assertion, that the *identical* underlying
regression (canary at 2x baseline's true error rate) goes completely undetected at a small sample
size (15 requests/stage) and is caught immediately at a realistic one (2,000 requests/stage) — same
rates, only sample size differs, opposite outcomes. The other side was verified too, empirically
rather than guessed: a trivial 0.05-percentage-point difference (1.05% vs 1.00%) needs 500,000
requests/stage before the z-test calls it significant (found by computing the actual crossover
point with a quick script rather than picking a number and hoping), demonstrating that statistical
significance answers "is this larger than noise?", not "does this matter?" — a canary gate tuned
only for the first question will eventually roll back a release for a difference too small to care
about.

Registered as the 18th lab (`canary-rollout`, provenance `implementation`). Verified: build-time
validation clean (52 docs); typecheck/lint/125 tests green; full build+prerender (118 pages)
confirmed correct title/og:image/canonical for both new routes, including the redirect stub;
`check:contrast` (117×2 themes) and `check:responsive` (118×7 viewports+dark) both real PASS.

`future.md`'s Track B is now empty again — only CDN/edge caching remains as an open, not-yet-scoped
candidate, and worth re-checking for a similar "is there a real algorithm hiding in here" angle
before assuming it stays article-only.

### 7.8 ✅ New lab: Cache Freshness Policies — DONE (2026-09-07/08)

Closed out `future.md`'s Track B entirely. CDN/edge caching, initially the last article-only
candidate, got the same "is there a real algorithm hiding in here" recheck §7.7 already applied to
canary deploys — and it had one: three real cache-freshness decision procedures (TTL-blocking,
stale-while-revalidate, stale-if-error) are exactly as implementation-shaped as the labs before it.

`src/labs/cacheFreshness.ts` (10 tests) runs all three against the same deterministic
origin-update schedule and the same origin outage window, so the policy is the only variable.
**The finding:** TTL-blocking errors on any request past TTL during an outage, with no fallback.
SWR never blocks at all — it serves stale content instantly and best-effort refreshes in the
background, paying zero origin latency even while the origin is down. Stale-if-error sits between
them: it always *attempts* the origin first (paying full origin-timeout latency, every request,
for as long as the outage lasts) and only falls back to stale if that attempt fails — a real,
measured cost difference `cacheFreshness.test.ts` asserts directly (SWR's stale-served latency is
always the fast cache-hit cost; SIE's is always the origin-timeout cost), not just described.

**One real test-premise bug found while writing the tests, not in the implementation:** the first
version of the "stale-if-error falls back to stale during an outage" test used the shared `BASE`
fixture's 100-tick origin-update interval, but only ran to tick 15 — the origin's true content
genuinely hadn't changed yet at that point, so `stale: false` was the *correct* answer, not a bug,
and the test's own expectation (`stale: true`) was wrong. Fixed by giving that specific test a
short origin-update interval (8 ticks) so a real version change actually occurs before the
assertion — the same "verify the test's premise before trusting its failure" discipline this
project applies to its own code.

**Two operational incidents during verification, both resolved with evidence rather than
assumption, worth recording honestly:**
1. The first `check:responsive` run appeared stalled (its output, piped through `tail -40`, showed
   zero lines for over 30 minutes) and was killed — incorrectly. `ps aux` at kill time showed it
   was actually at 110/120 routes with no real failures; the empty output was `tail`'s own
   buffering, not evidence of a stall. The kill itself produced the only failure in that run
   (`browserContext.newPage: Target page, context or browser has been closed`, a direct consequence
   of terminating the browser mid-navigation). Corrected by rerunning with output redirected
   directly to a file (no pipe buffering) and, on the rerun, deliberately waiting for real progress
   signals (growing CPU time, growing route-count lines) rather than judging by silence.
2. `/blog/building-jujuja-a-production-quest-system` failed all 3 retries on *both* the killed run
   and the clean rerun — a weaker case for "just flaky network" than a one-off, so it was actually
   investigated rather than waved off. Confirmed genuinely transient, not a route defect, with
   direct evidence: the route's own prerendered title/canonical are correct, and both "failed to
   fetch" mermaid diagram chunks (`flowDiagram-23GEKE2U`, `sequenceDiagram-DBY2YBRQ`) served a clean
   HTTP 200 on direct `curl` immediately afterward. The route simply needs 2 separate diagram-type
   chunks (most articles need 0-1, confirmed by checking every blog article's diagram count), which
   gives it more independent chances to catch a momentary network blip within one page load — this
   session's host had an unusually high rate of `ERR_NETWORK_CHANGED` blips during this specific
   run (10+ routes needed at least one retry), consistent with the already-documented WSL2 network
   flakiness pattern, just an unusually bad instance of it.

Registered as the 19th lab (`cache-freshness`, provenance `implementation`). Verified: build-time
validation clean (53 docs); typecheck/lint/135 tests green; full build+prerender (120 pages)
confirmed correct title/og:image/canonical for both new routes, including the redirect stub (one
transient `ERR_NETWORK_CHANGED` prerender failure on the unrelated, pre-existing
`/experiments/websockets-vs-sse` route was confirmed transient by an immediate clean retry);
`check:contrast` (119×2 themes) real PASS; `check:responsive` (120×7 viewports+dark) completed with
the jujuja route's already-investigated, confirmed-transient failure and otherwise 0 real failures.

`future.md`'s Track B is now fully empty of both scoped and unscoped candidates — see `future.md`
itself for the forward-looking update covering what comes after it (§8, once something from its
fresh Track B is picked up).

---

Next: [Phase 8](phase-8.md).
