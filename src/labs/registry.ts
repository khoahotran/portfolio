import { lazy } from 'react';
import type { ComponentType } from 'react';
import type { LabProvenance } from './provenance';

export interface LabDefinition {
  id: string;
  title: string;
  description: string;
  component: ComponentType;
  /**
   * True when this lab's id is also the slug of a real /experiments article
   * (after the filename's date prefix is stripped) — e.g. `go-vs-ts-concurrency`
   * names both the lab and its companion write-up. For these, App.tsx must NOT
   * register an `/experiments/<id>` -> `/labs/<id>` redirect: that literal route
   * would out-rank `/experiments/:slug` and make the article unreachable at its
   * own URL again, which is the exact bug this whole /labs split was fixing.
   * The lab is still reachable from the article's own CTA link and from /labs.
   */
  collidesWithArticleSlug?: boolean;
  /**
   * Slug of the companion write-up, if one exists — either a bare slug (assumed to live in
   * content/experiments/, true for every lab so far) or a `"collection/slug"` string for a
   * companion elsewhere (e.g. `idempotency-store`'s companion is a content/blog/ post it extends
   * rather than a new content/experiments/ article), the same "collection/slug" shape `related:`
   * frontmatter already uses. Lets the lab page link back to its article — previously every lab's
   * only way out was a generic link to the /experiments list, a dead end for a reader who arrived
   * from the article and wants to return to it. `retry-strategy` and `failure-injection` have no
   * companion article and are left without this field rather than inventing one.
   */
  relatedArticle?: string;
  /**
   * What kind of interaction this lab actually offers — shown as a badge on
   * LabsIndexPage so a visitor knows what to expect before opening it,
   * instead of every card looking identical regardless of depth:
   * - 'live': sliders/toggles recompute the visualization instantly, no run step.
   * - 'run': has an explicit start (and stop/pause/reset) for a timed sequence.
   * - 'preset': switches between a small fixed set of precomputed data points.
   */
  interaction: 'live' | 'run' | 'preset';
  /**
   * Where this lab's numbers come from — see `./provenance.ts`. Required, so a new lab cannot be
   * registered without answering the question a reader will ask first. Rendered by
   * `ProvenanceNote` at the top of the lab page and badged on `/labs`.
   *
   * Note that `interaction` and `provenance` are independent: 'live' describes how the reader
   * drives the lab, 'implementation'/'model' describes whether the output means anything.
   * Three of the 'live' labs compute chosen formulas, and saying so is the point.
   */
  provenance: LabProvenance;
}

const ThroughputSimulationPage = lazy(() => import('../pages/experiments/ThroughputSimulationPage'));
const RetryStrategyVisualizerPage = lazy(() => import('../pages/experiments/RetryStrategyVisualizerPage'));
const FailureInjectionDemoPage = lazy(() => import('../pages/experiments/FailureInjectionDemoPage'));
const QueueVsPubSubPage = lazy(() => import('../pages/experiments/QueueVsPubSubPage'));
const SagaStateMachinePage = lazy(() => import('../pages/experiments/SagaStateMachinePage'));
const EventSourcingReplayPage = lazy(() => import('../pages/experiments/EventSourcingReplayPage'));
const RedisVsBullMQPage = lazy(() => import('../pages/experiments/RedisVsBullMQPage'));
const GoVsTsConcurrencyPage = lazy(() => import('../pages/experiments/GoVsTsConcurrencyPage'));
const DbEventReplayBenchmarkPage = lazy(() => import('../pages/experiments/DbEventReplayBenchmarkPage'));
const RateLimitingAlgorithmsPage = lazy(() => import('../pages/experiments/RateLimitingAlgorithmsPage'));
const GossipProtocolVisualizerPage = lazy(() => import('../pages/experiments/GossipProtocolVisualizerPage'));
const WebSocketsVsSsePage = lazy(() => import('../pages/experiments/WebSocketsVsSsePage'));
const LeaderElectionPage = lazy(() => import('../pages/experiments/LeaderElectionPage'));
const PgbouncerVsDirectPage = lazy(() => import('../pages/experiments/PgbouncerVsDirectPage'));
const RedlockPage = lazy(() => import('../pages/experiments/RedlockPage'));
const BackpressurePage = lazy(() => import('../pages/experiments/BackpressurePage'));
const GrpcVsRestPage = lazy(() => import('../pages/experiments/GrpcVsRestPage'));
const CanaryRolloutPage = lazy(() => import('../pages/experiments/CanaryRolloutPage'));
const CacheFreshnessPage = lazy(() => import('../pages/experiments/CacheFreshnessPage'));
const ConsistentHashingPage = lazy(() => import('../pages/experiments/ConsistentHashingPage'));
const IdempotencyStorePage = lazy(() => import('../pages/experiments/IdempotencyStorePage'));

/**
 * Single source of truth for the interactive lab routes. Each lab lives at
 * `/labs/:id`. App.tsx maps over this list to register routes and redirects;
 * LabsIndexPage maps over it to render the lab directory. Adding a new lab
 * is one entry here instead of touching App.tsx in three places.
 */
export const labs: LabDefinition[] = [
  {
    id: 'throughput-simulation',
    provenance: {
      kind: 'model',
      basis:
        'Closed-form arithmetic, not a measurement of any queue: capacity = workers x 1000 / processing_ms, ' +
        'and effective throughput multiplies that by (1 - failure_rate). p95 latency is modelled as ' +
        'processing_ms x (1 + failure_rate / 50). The moving chart adds sinusoidal and random noise for ' +
        'legibility only — it carries no information. The relationship between the sliders is the point; ' +
        'the absolute numbers are not.',
    },
    title: 'Throughput Simulation',
    description: 'Interactive throughput and latency simulation for worker systems.',
    component: ThroughputSimulationPage,
    interaction: 'live',
    relatedArticle: 'throughput-simulation-notes',
  },
  {
    id: 'retry-strategy',
    provenance: {
      kind: 'implementation',
      basis:
        'The real backoff schedules, computed in your browser from your inputs: linear is base x attempt, ' +
        'exponential is base x 2^attempt, and full jitter replaces each delay with a uniform random value ' +
        'in [0, delay) — the AWS "Exponential Backoff and Jitter" formulation. The cumulative timeline is ' +
        'the actual sum of those delays, so what you see is what a client using this policy would wait.',
    },
    title: 'Retry Strategy Visualizer',
    description: 'Compare linear, exponential, and jitter backoff retry strategies.',
    component: RetryStrategyVisualizerPage,
    interaction: 'live',
  },
  {
    id: 'failure-injection',
    provenance: {
      kind: 'model',
      basis:
        'A static illustration of the circuit-breaker idea, not a breaker implementation. Failures are ' +
        'failure_rate x request_count and the breaker is shown as open whenever failure_rate reaches the ' +
        'threshold. There is no time dimension, no rolling window, and no half-open probe state — the ' +
        'three things that make a real breaker interesting. Read it as a diagram you can move, and see ' +
        'the retry-strategy lab for a policy that is genuinely computed.',
    },
    title: 'Failure Injection Demo',
    description: 'Inject controlled failure and observe circuit breaker behavior.',
    component: FailureInjectionDemoPage,
    interaction: 'live',
  },
  {
    id: 'queue-vs-pubsub',
    provenance: {
      kind: 'model',
      basis:
        'Illustrative formulas chosen to show the shape of the difference, not measurements: latency is ' +
        'message_rate / consumers for the queue and 0.8x that for pub/sub, and delivery rates are ' +
        '92 + 1.1 x consumers and 90 + 1.5 x subscribers. Those coefficients are picked, not derived from ' +
        'a benchmark. Use this to reason about fan-out versus work-sharing semantics; do not quote the numbers.',
    },
    title: 'Queue vs Pub/Sub Comparison',
    description: 'Interactive comparison between queue and pub-sub delivery patterns.',
    component: QueueVsPubSubPage,
    interaction: 'live',
    relatedArticle: 'queue-vs-pub-sub-comparison-notes',
  },
  {
    id: 'saga-state-machine',
    provenance: {
      kind: 'implementation',
      basis:
        'A real orchestrator-style saga state machine executing in your browser. Each step transitions, ' +
        'awaits, and on the failure you select runs the compensating transactions for the steps that had ' +
        'already committed — including the COMPENSATION_FAILED terminal state, which is the case that ' +
        'actually matters in production. The transitions are the same ones described in the write-up.',
    },
    title: 'Saga State Machine',
    description: 'Interactive visualization of the Saga distributed transaction pattern.',
    component: SagaStateMachinePage,
    interaction: 'run',
    relatedArticle: 'saga-state-machine-visualizer',
  },
  {
    id: 'event-sourcing-replay',
    provenance: {
      kind: 'implementation',
      basis:
        'A real left fold over an event log: the projection you see is computed by reducing the sample ' +
        'events up to the version you scrub to, exactly as a projection rebuild does. The event set is a ' +
        'small fixed sample so the fold is followable by eye; the fold itself is not faked.',
    },
    title: 'Event Sourcing Replay',
    description: 'Interactive visualization of Event Sourcing and read projections.',
    component: EventSourcingReplayPage,
    interaction: 'run',
    collidesWithArticleSlug: true, // content/experiments/2026-06-28-event-sourcing-replay.md
    relatedArticle: 'event-sourcing-replay',
  },
  {
    id: 'redis-vs-bullmq',
    provenance: {
      kind: 'measured',
      environment:
        'A local x86_64 host (AMD Ryzen AI 5, Docker Compose network — not the AWS c6g.xlarge cited ' +
        'in the June 2026 run this replaced, since that machine and harness were gone). ' +
        'Producer/consumer on Go 1.22 using go-redis (XADD / XREADGROUP), one goroutine per worker, ' +
        'sharing a consumer group. BullMQ on Node.js 20, one Worker instance per worker, concurrency 1. ' +
        'Redis 7. Same enqueue-then-drain methodology and job counts for both engines. ' +
        'See benchmarks/redis-vs-bullmq/README.md for the exact protocol.',
      measuredOn: 'August 2026',
      harness: 'https://github.com/khoahotran/portfolio/tree/main/benchmarks/redis-vs-bullmq',
    },
    title: 'Benchmark: Redis Streams vs BullMQ',
    description: 'Interactive benchmark visualizing queue throughput and latency.',
    component: RedisVsBullMQPage,
    interaction: 'preset',
    relatedArticle: 'redis-streams-vs-bullmq-job-queue-comparison',
  },
  {
    id: 'go-vs-ts-concurrency',
    provenance: {
      kind: 'measured',
      environment:
        'N concurrent workers each performing a 50 ms mock network call, on the same local Docker ' +
        'host, one language at a time. Go spawns one goroutine per task under a sync.WaitGroup; ' +
        'Node.js uses Promise.all over setTimeout-based async functions. Peak resident set size read ' +
        "from /proc/self/status's VmHWM — the OS's own peak-memory accounting, identical method for " +
        'both languages — and total wall-clock time.',
      measuredOn: 'August 2026',
      harness: 'https://github.com/khoahotran/portfolio/tree/main/benchmarks/go-vs-ts-concurrency',
      caveat:
        'The re-measurement reverses the direction of the original claim, not just its magnitude — ' +
        "see this lab's article for why: the memory gap narrows with scale (10.3x at 1k tasks, 1.2x " +
        'at 50k), because Node pays a roughly fixed ~50MB runtime baseline once while Go scales ' +
        'closer to linearly per task.',
    },
    title: 'Benchmark: Go vs TS Concurrency',
    description: 'Interactive benchmark visualizing memory and execution time for concurrent tasks.',
    component: GoVsTsConcurrencyPage,
    interaction: 'preset',
    collidesWithArticleSlug: true, // content/experiments/2026-06-26-go-vs-ts-concurrency.md
    relatedArticle: 'go-vs-ts-concurrency',
  },
  {
    id: 'db-event-replay-benchmark',
    provenance: {
      kind: 'measured',
      environment:
        'PostgreSQL 16 and the official Firestore emulator, each populated with 10k/50k/100k mock ' +
        'events for one aggregate, queried by a Go application on the same Docker Compose network ' +
        'as both. Not a real Cloud Firestore instance — see benchmarks/db-event-replay-benchmark/ ' +
        'README.md for why the relative shape of the result still holds against production Firestore ' +
        'even though the emulator has no real network latency to model.',
      measuredOn: 'August 2026',
      harness: 'https://github.com/khoahotran/portfolio/tree/main/benchmarks/db-event-replay-benchmark',
      caveat:
        'The comparison is structurally lopsided by design — one indexed range scan against N ' +
        'individual document reads — which is the architectural point being demonstrated, not a ' +
        'like-for-like database benchmark or a Firestore configuration problem.',
    },
    title: 'Benchmark: DB Event Replay',
    description: 'Interactive benchmark visualizing event sourcing replay times across databases.',
    component: DbEventReplayBenchmarkPage,
    interaction: 'preset',
    collidesWithArticleSlug: true, // content/experiments/2026-06-27-db-event-replay-benchmark.md
    relatedArticle: 'db-event-replay-benchmark',
  },
  {
    id: 'rate-limiting-algorithms',
    provenance: {
      kind: 'implementation',
      basis:
        'The real Token Bucket, Leaky Bucket, and Fixed Window Counter algorithms (src/labs/rateLimiting.ts, ' +
        'unit-tested), run against an identical arrival timeline built from your rate/burst sliders — not three ' +
        'formulas tuned to look different. Refill/leak amounts are computed from real elapsed time between ' +
        "arrivals, and Fixed Window's boundary-reset flaw (a burst split across a window edge can double- " +
        'admit) is the actual algorithm, not a dramatized bug.',
    },
    title: 'Rate Limiting Algorithms',
    description: 'Token Bucket vs Leaky Bucket vs Fixed Window Counter, run on a shared burst scenario.',
    component: RateLimitingAlgorithmsPage,
    interaction: 'live',
    collidesWithArticleSlug: true, // content/experiments/2026-08-28-rate-limiting-algorithms.md
    relatedArticle: 'rate-limiting-algorithms',
  },
  {
    id: 'gossip-protocol-visualizer',
    provenance: {
      kind: 'implementation',
      basis:
        'A real push-based epidemic broadcast (src/labs/gossipProtocol.ts, unit-tested): every infected ' +
        'node picks real random peers each round via Fisher-Yates shuffling and pushes to them, exactly the ' +
        'rumor-mongering protocol underlying real cluster membership systems (Cassandra, Consul, SWIM). The ' +
        "round-by-round spread you scrub through is the actual simulation's output, not a smoothed curve — " +
        'the O(log n) convergence claim is asserted directly in the test suite, not just described in prose.',
    },
    title: 'Gossip Protocol Visualizer',
    description: 'A push-based epidemic broadcast simulation — watch a message spread node by node.',
    component: GossipProtocolVisualizerPage,
    interaction: 'run',
    collidesWithArticleSlug: true, // content/experiments/2026-08-28-gossip-protocol-visualizer.md
    relatedArticle: 'gossip-protocol-visualizer',
  },
  {
    id: 'websockets-vs-sse',
    provenance: {
      kind: 'measured',
      environment:
        'One Go binary, two roles (server/client), both transports implemented in the same language and ' +
        'process model to isolate the transport from any language/runtime confound. Server holds N ' +
        'connections open on a local Docker host, broadcasting a tick every 200ms; peak RSS read from ' +
        "the server's own /proc/self/status VmHWM after a 3s hold, same technique as the go-vs-ts-concurrency " +
        'harness. Restarted fresh before every data point since VmHWM is a monotonic high-water mark.',
      measuredOn: 'August 2026',
      harness: 'https://github.com/khoahotran/portfolio/tree/main/benchmarks/websockets-vs-sse',
      caveat:
        'Peak-memory figures reproduced closely on a manual re-run (see the harness README); connect-time ' +
        'did not — it reversed direction between two consecutive runs at 5,000 connections, most plausibly ' +
        'host scheduling/FD-pressure noise from opening that many connections from one client process in a ' +
        'short window. Connect-time is committed for transparency but is not treated as a reliable finding.',
    },
    title: 'Benchmark: WebSockets vs SSE',
    description: 'Interactive benchmark visualizing server memory cost for holding open thousands of concurrent connections.',
    component: WebSocketsVsSsePage,
    interaction: 'preset',
    collidesWithArticleSlug: true, // content/experiments/2026-08-28-websockets-vs-sse.md
    relatedArticle: 'websockets-vs-sse',
  },
  {
    id: 'leader-election',
    provenance: {
      kind: 'implementation',
      basis:
        'The real Bully algorithm (src/labs/leaderElection.ts, unit-tested): crashing the leader sends ' +
        'an actual ELECTION message from the lowest surviving node to every higher id, each alive one ' +
        'replies ALIVE and starts its own election above itself, and the eventual winner broadcasts a ' +
        'real COORDINATOR message to everyone below it. The step-by-step message count is the real O(n^2) ' +
        "worst-case cost this algorithm is criticized for, not a number asserted in the article's prose.",
    },
    title: 'Leader Election (Bully Algorithm)',
    description: 'Crash the leader and watch the real Bully election protocol pick a new one, message by message.',
    component: LeaderElectionPage,
    interaction: 'run',
    relatedArticle: 'leader-election-bully-algorithm',
  },
  {
    id: 'pgbouncer-vs-direct',
    provenance: {
      kind: 'measured',
      environment:
        'One Go binary (-target=direct / -target=pgbouncer) against Postgres 16 and PgBouncer 1.16 ' +
        '(transaction pooling, default_pool_size=20), both on the same local Docker Compose network. ' +
        'Two connection lifecycles measured: "churn" opens a fresh connection per query; "persistent" ' +
        'opens one connection per client goroutine and reuses it. Client concurrency 10/25/50, 30 ' +
        'SELECT-1 queries per client. See benchmarks/pgbouncer-vs-direct/README.md for the exact protocol.',
      measuredOn: 'September 2026',
      harness: 'https://github.com/khoahotran/portfolio/tree/main/benchmarks/pgbouncer-vs-direct',
      caveat:
        'Host was under confirmed heavy, fluctuating CPU contention from unrelated processes while ' +
        'this matrix ran, which most plausibly inflates the p95 tail-latency figures in results.json ' +
        "beyond what an idle host would show — the throughput/avg-latency trend this lab's finding " +
        'rests on reproduced consistently across manual smoke-test runs and the full committed matrix; ' +
        'the exact multiples should not be expected to reproduce on a different host.',
    },
    title: 'Benchmark: PgBouncer vs Direct Postgres',
    description: 'Interactive benchmark visualizing connection-pooling overhead across two connection lifecycles.',
    component: PgbouncerVsDirectPage,
    interaction: 'preset',
    relatedArticle: 'pgbouncer-vs-direct-connection-pooling',
  },
  {
    id: 'redlock',
    provenance: {
      kind: 'implementation',
      basis:
        'The real Redlock quorum arithmetic (src/labs/redlock.ts, unit-tested): majority quorum is ' +
        'floor(n/2)+1, elapsed acquisition time is the real sum of every node attempt (down nodes cost ' +
        'a fixed acquire timeout, alive nodes their own latency), and acquisition only succeeds if that ' +
        "quorum is met with TTL validity left over. Stage 2 runs Kleppmann's pause critique as an actual " +
        'equality (a second client can acquire iff the simulated pause outlasts the remaining validity), ' +
        "not prose asserting one side of the Antirez/Kleppmann debate.",
    },
    title: 'Distributed Locks: Redlock',
    description: "Run the real Redlock quorum algorithm, then simulate the pause that Kleppmann's critique is about.",
    component: RedlockPage,
    interaction: 'live',
    relatedArticle: 'distributed-locks-redlock-and-the-pause-that-breaks-it',
  },
  {
    id: 'backpressure',
    provenance: {
      kind: 'implementation',
      basis:
        'The real per-item admission logic for all four policies (src/labs/backpressure.ts, unit-tested): ' +
        'each queued item carries the tick it arrived on, so drop-new and drop-old are proven to drop the ' +
        "same count but different items (drop-new only ever discards its own tick's newest arrivals, " +
        "drop-old only ever evicts already-resident older ones), block's producer backlog is a real " +
        "unbounded array that's never discarded, and the circuit breaker's open/half-open/closed " +
        'transitions are decided from the state each tick actually entered with, not asserted in prose.',
    },
    title: 'Backpressure Strategies',
    description: 'Run four real backpressure policies against the same overload — block, drop-new, drop-old, circuit breaker.',
    component: BackpressurePage,
    interaction: 'live',
    relatedArticle: 'backpressure-four-policies-one-overload',
  },
  {
    id: 'grpc-vs-rest',
    provenance: {
      kind: 'measured',
      environment:
        'One Go server (benchmarks/grpc-vs-rest) running a gRPC listener (protobuf, HTTP/2, ' +
        ':50051) and a REST/JSON listener (net/http, HTTP/1.1, :8080) side by side, both reading the ' +
        'same deterministic data generator so a given id returns byte-identical content on either ' +
        "protocol. Two payload shapes measured: 'single' (one User record) and 'list' (100 records). " +
        'Client concurrency 10/25/50, 30 requests per client, one shared reused connection per run ' +
        '(a single *grpc.ClientConn / *http.Client) — the realistic deployment pattern for either ' +
        'protocol, not a strawman that reconnects per request on only one side.',
      measuredOn: 'September 2026',
      harness: 'https://github.com/khoahotran/portfolio/tree/main/benchmarks/grpc-vs-rest',
      caveat:
        'Host was under this session\'s already-documented fluctuating CPU contention while this ' +
        'matrix ran; a spot-check rerun of the single-mode, 10-client case reproduced the same ' +
        'direction (REST ahead on both throughput and latency) but not the same magnitude — read the ' +
        "direction of each result as reliable, the exact multiples as this run's, not a universal constant.",
    },
    title: 'Benchmark: gRPC vs REST',
    description: 'Interactive benchmark visualizing gRPC vs REST throughput, latency, and payload size across two payload shapes.',
    component: GrpcVsRestPage,
    interaction: 'preset',
    relatedArticle: 'grpc-vs-rest-when-the-smaller-payload-loses',
  },
  {
    id: 'canary-rollout',
    provenance: {
      kind: 'implementation',
      basis:
        'A real two-proportion z-test (src/labs/canaryRollout.ts, unit-tested), the same class of ' +
        'statistical test real canary-analysis systems (Kayenta, Flagger) run instead of a raw ' +
        'threshold comparison. Error counts per stage are computed deterministically from each ' +
        'input rate, not drawn from a random-number generator — the thing being tested is the ' +
        'statistical decision procedure itself. Tests prove the actual two-sided finding as ' +
        'behaviour: a real regression can go undetected at a small sample size, and the identical ' +
        'regression is caught once the sample size is realistic.',
    },
    title: 'Canary Rollout Analysis',
    description: 'Run a real two-proportion z-test canary analysis through traffic stages — see how sample size decides whether a regression is even detectable.',
    component: CanaryRolloutPage,
    interaction: 'live',
    relatedArticle: 'canary-deploys-and-the-sample-size-nobody-checks',
  },
  {
    id: 'cache-freshness',
    provenance: {
      kind: 'implementation',
      basis:
        'Three real cache-freshness decision procedures (src/labs/cacheFreshness.ts, unit-tested), ' +
        'run against the same deterministic origin-update schedule and the same origin outage window ' +
        'so the policy is the only variable. TTL-blocking errors on an outage past TTL with no ' +
        'fallback; stale-while-revalidate never blocks the request at all, serving stale content and ' +
        'best-effort refreshing in the background; stale-if-error always attempts the origin first ' +
        'and only falls back to stale if that attempt fails within its own grace window. Each ' +
        "policy's served content is compared against the origin's real true version at that tick to " +
        'determine staleness, not assumed from which branch ran.',
    },
    title: 'Cache Freshness Policies',
    description: 'Run three real cache-freshness policies against the same origin outage — TTL-blocking, stale-while-revalidate, and stale-if-error.',
    component: CacheFreshnessPage,
    interaction: 'live',
    relatedArticle: 'cache-freshness-what-stale-while-revalidate-actually-buys-you',
  },
  {
    id: 'consistent-hashing',
    provenance: {
      kind: 'implementation',
      basis:
        'The real hash-ring placement algorithm (src/labs/consistentHashing.ts, unit-tested): ' +
        'FNV-1a plus a MurmurHash3 finalizer places every virtual node and every key on the same ' +
        'ring, and a node-count change is run through both this scheme and naive hash(key) % ' +
        'nodeCount against the identical key set, so the remapped-fraction comparison is measured, ' +
        'not asserted. The load-imbalance figure at low virtual-node counts is the real output of ' +
        "that same ring, not a separate illustration — it's also what caught a genuine under-mixing " +
        'bug in the first hash implementation, fixed before this lab shipped.',
    },
    title: 'Consistent Hashing',
    description: 'Compare naive modulo hashing against a real hash ring — see how little of the keyspace moves on a node-count change, and what happens without enough virtual nodes.',
    component: ConsistentHashingPage,
    interaction: 'live',
    relatedArticle: 'consistent-hashing-and-the-rebalancing-nobody-notices',
  },
  {
    id: 'idempotency-store',
    provenance: {
      kind: 'implementation',
      basis:
        'Two real idempotency-key store designs (src/labs/idempotencyStore.ts, unit-tested), run ' +
        'against the identical concurrent-duplicate arrival pattern. check-then-set mirrors the ' +
        "companion article's own NestJS sample (a GET of the completed-results cache, followed " +
        "later by a SET once processing finishes) — two non-atomic steps, so a duplicate that " +
        "arrives while the first is still in flight finds nothing cached and genuinely reprocesses, " +
        'not a hypothetical. atomic-claim replaces that with one atomic check-and-claim, so a ' +
        'concurrent duplicate coalesces onto the in-flight run and shares its result instead — both ' +
        'counted directly, not asserted.',
    },
    title: 'Idempotency-Key Store',
    description: 'Run the real race between a concurrent duplicate and an in-flight request — see it double-process under check-then-set, then get coalesced under atomic-claim.',
    component: IdempotencyStorePage,
    interaction: 'live',
    relatedArticle: 'blog/system-design-notes-idempotency',
  },
];

export function getLabById(id: string): LabDefinition | undefined {
  return labs.find((lab) => lab.id === id);
}
