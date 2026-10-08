/**
 * The three capability claims the homepage makes, and the proof sitting next to each one.
 *
 * This file is the mechanism behind the whole redesign. The previous homepage carried a section of
 * six pill buttons — Blog, Projects, Research, Experiments, Labs, System Design — that duplicated
 * the navigation verbatim, so labs and write-ups appeared as *places to go*. Here they appear as
 * *evidence cited in place*: a claim about what someone can do, with the thing that lets a reader
 * check it immediately underneath.
 *
 * That is the difference between saying you understand consensus and letting someone run the
 * election restriction themselves. It is also the one move a portfolio with 29 working labs can
 * make that a portfolio without them cannot.
 *
 * Every `to` is verified by a unit test against the lab registry and the content index, because a
 * claim pointing at a 404 is worse than no claim.
 */

export interface ProofLink {
  label: string;
  to: string;
  kind: 'lab' | 'read';
}

export interface ExpertisePillar {
  title: string;
  summary: string;
  proof: ProofLink[];
}

export const expertisePillars: ExpertisePillar[] = [
  {
    title: 'Consensus and data consistency',
    summary:
      'Agreeing on state across machines that fail independently, and knowing precisely what each consistency model costs when they do.',
    proof: [
      { label: 'Run Raft log replication', to: '/labs/raft', kind: 'lab' },
      { label: 'Run 2PC against Saga', to: '/labs/two-phase-commit-vs-saga', kind: 'lab' },
      { label: 'Run vector clocks', to: '/labs/vector-clocks', kind: 'lab' },
      {
        label: 'Read: what atomicity actually costs',
        to: '/experiments/two-phase-commit-vs-saga-what-atomicity-actually-costs',
        kind: 'read',
      },
    ],
  },
  {
    title: 'Data structures that hold at scale',
    summary:
      'Choosing the structure whose failure mode you can live with — probabilistic counting, bounded reads, rebalancing that does not move everything.',
    proof: [
      { label: 'Run consistent hashing', to: '/labs/consistent-hashing', kind: 'lab' },
      { label: 'Run an LSM tree', to: '/labs/lsm-tree', kind: 'lab' },
      { label: 'Run HyperLogLog', to: '/labs/hyperloglog', kind: 'lab' },
      {
        label: "Read: the write you'll pay for later",
        to: '/experiments/lsm-trees-and-the-write-youll-pay-for-later',
        kind: 'read',
      },
    ],
  },
  {
    title: 'Staying up when things fail',
    summary:
      'Backpressure, retries, rollout safety and cache staleness — the parts that decide whether a correct system is also an operable one.',
    proof: [
      { label: 'Run backpressure', to: '/labs/backpressure', kind: 'lab' },
      { label: 'Run retry strategies', to: '/labs/retry-strategy', kind: 'lab' },
      { label: 'Run a canary rollout', to: '/labs/canary-rollout', kind: 'lab' },
      { label: 'Run failure injection', to: '/labs/failure-injection', kind: 'lab' },
    ],
  },
];

/**
 * The three numbers the hero leads with. Drawn from `metricsData`, but narrowed: six numbers in a
 * row is a dashboard, and a reader scanning a homepage reads three. Each names the system it was
 * measured on, which is the rule `.ai/portfolio-context.md` sets for every metric on this site.
 */
export const proofPoints = [
  {
    value: '150 - 300 ms',
    label: 'Store lookup latency',
    source: 'SeensioGO, Algolia geo-search',
    to: '/research/algolia-geo-search-for-store-discovery',
  },
  {
    value: '500 - 1,500',
    label: 'Quest users / minute at peak',
    source: 'Jujuja daily quest jobs',
    to: '/blog/building-jujuja-a-production-quest-system',
  },
  {
    value: '< 1%',
    label: 'Transaction consistency errors',
    source: 'SeensioGO transactions',
    to: null,
  },
];
