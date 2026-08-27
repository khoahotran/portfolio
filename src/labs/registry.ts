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
   * Slug of the companion write-up in content/experiments/, if one exists.
   * Lets the lab page link back to its article — previously every lab's
   * only way out was a generic link to the /experiments list, a dead end
   * for a reader who arrived from the article and wants to return to it.
   * `retry-strategy` and `failure-injection` have no companion article and
   * are left without this field rather than inventing one.
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
        'N concurrent workers each performing a 50 ms mock network call. Go spawns one goroutine per ' +
        'task under a sync.WaitGroup; Node.js uses Promise.all over the equivalent async functions. ' +
        'Peak resident set size and total wall-clock time were recorded.',
      measuredOn: 'June 2026',
      caveat:
        'Host hardware was not recorded at the time, and the harness is not published — so the ' +
        'absolute memory and time figures are not reproducible and should not be quoted. The ' +
        'order-of-magnitude gap in memory footprint is the durable finding here, not the exact MB.',
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
];

export function getLabById(id: string): LabDefinition | undefined {
  return labs.find((lab) => lab.id === id);
}
