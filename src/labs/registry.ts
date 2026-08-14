import { lazy } from 'react';
import type { ComponentType } from 'react';

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
    title: 'Throughput Simulation',
    description: 'Interactive throughput and latency simulation for worker systems.',
    component: ThroughputSimulationPage,
    relatedArticle: 'throughput-simulation-notes',
  },
  {
    id: 'retry-strategy',
    title: 'Retry Strategy Visualizer',
    description: 'Compare linear, exponential, and jitter backoff retry strategies.',
    component: RetryStrategyVisualizerPage,
  },
  {
    id: 'failure-injection',
    title: 'Failure Injection Demo',
    description: 'Inject controlled failure and observe circuit breaker behavior.',
    component: FailureInjectionDemoPage,
  },
  {
    id: 'queue-vs-pubsub',
    title: 'Queue vs Pub/Sub Comparison',
    description: 'Interactive comparison between queue and pub-sub delivery patterns.',
    component: QueueVsPubSubPage,
    relatedArticle: 'queue-vs-pub-sub-comparison-notes',
  },
  {
    id: 'saga-state-machine',
    title: 'Saga State Machine',
    description: 'Interactive visualization of the Saga distributed transaction pattern.',
    component: SagaStateMachinePage,
    relatedArticle: 'saga-state-machine-visualizer',
  },
  {
    id: 'event-sourcing-replay',
    title: 'Event Sourcing Replay',
    description: 'Interactive visualization of Event Sourcing and read projections.',
    component: EventSourcingReplayPage,
    collidesWithArticleSlug: true, // content/experiments/2026-06-28-event-sourcing-replay.md
    relatedArticle: 'event-sourcing-replay',
  },
  {
    id: 'redis-vs-bullmq',
    title: 'Benchmark: Redis Streams vs BullMQ',
    description: 'Interactive benchmark visualizing queue throughput and latency.',
    component: RedisVsBullMQPage,
    relatedArticle: 'redis-streams-vs-bullmq-job-queue-comparison',
  },
  {
    id: 'go-vs-ts-concurrency',
    title: 'Benchmark: Go vs TS Concurrency',
    description: 'Interactive benchmark visualizing memory and execution time for concurrent tasks.',
    component: GoVsTsConcurrencyPage,
    collidesWithArticleSlug: true, // content/experiments/go-vs-ts-concurrency.md
    relatedArticle: 'go-vs-ts-concurrency',
  },
  {
    id: 'db-event-replay-benchmark',
    title: 'Benchmark: DB Event Replay',
    description: 'Interactive benchmark visualizing event sourcing replay times across databases.',
    component: DbEventReplayBenchmarkPage,
    collidesWithArticleSlug: true, // content/experiments/db-event-replay-benchmark.md
    relatedArticle: 'db-event-replay-benchmark',
  },
];

export function getLabById(id: string): LabDefinition | undefined {
  return labs.find((lab) => lab.id === id);
}
