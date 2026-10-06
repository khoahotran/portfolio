---
title: "Connection Pooling: When PgBouncer Actually Helps"
date: "2026-09-07"
tags: ["postgresql", "benchmark", "trade-offs"]
related: ["research/database-indexing-btree-vs-brin-for-time-series"]
summary: "A real harness measuring PgBouncer against direct Postgres across two connection lifecycles — the advantage widens under one and reverses under the other, so 'add a pooler' isn't a universal answer."
---

"Put PgBouncer in front of Postgres" is close to reflexive advice for anything that talks to a
database under load. This harness tests it directly, across the one variable that actually decides
the answer: whether your application opens a fresh connection per unit of work, or holds a small
number of connections open and reuses them.

<div class="mt-8 mb-12">
  <a href="/labs/pgbouncer-vs-direct" class="lab-cta-inverse">
    Try the Interactive PgBouncer vs Direct Postgres Benchmark
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Setup

One Go binary runs the same `SELECT 1` query against Postgres, either directly or through
[PgBouncer](https://www.pgbouncer.org/) in transaction-pooling mode, on the same Docker Compose
network. Two connection lifecycles are measured, because they're the whole story:

- **Churn** — every query opens a brand-new physical connection and closes it right after. This is
  what a naively-written serverless function, or any short-lived script that connects once per
  invocation, actually does.
- **Persistent** — each concurrent client opens one connection and reuses it for every query. This
  is what a long-lived application server with its own connection pool already looks like from
  Postgres's side.

## The Finding: PgBouncer's Advantage Widens Under Churn, and Reverses Under Persistence

| Clients | Direct (churn) | PgBouncer (churn) | PgBouncer's multiple |
|---|---|---|---|
| 10 | 61.8 q/s | 242.3 q/s | 3.9x |
| 25 | 67.6 q/s | 348.2 q/s | 5.1x |
| 50 | 55.4 q/s | 397.9 q/s | 7.2x |

Under churn, direct Postgres throughput doesn't scale with client count at all — it's flat to
slightly declining, because every one of those concurrent connection attempts forces Postgres to
fork a brand-new backend *process*, and forking N of those at once is real contention, not free
parallelism. PgBouncer's fixed pool of 20 real backend connections absorbs the same rising client
load without paying that cost per query, so its lead over direct grows rather than shrinks as
concurrency rises — the opposite of what "pooling helps a little" would predict.

| Clients | Direct (persistent) | PgBouncer (persistent) |
|---|---|---|
| 10 | 816 q/s / 1.9ms | 1461 q/s / 4.6ms |
| 25 | 1571 q/s / 3.8ms | 1683 q/s / 11.9ms |
| 50 | **2246 q/s / 6.3ms** | 1251 q/s / 34.4ms |

Under persistence, the result is genuinely mixed, not a clean win either way. At 10 and 25 clients,
PgBouncer's throughput is actually slightly *higher* than direct's, despite its latency being
consistently worse the whole time — the extra network hop's cost shows up per query but doesn't
dominate aggregate throughput yet. At 50 clients that reverses cleanly: direct wins both throughput
(1.8x) and latency (5.5x lower). The most plausible reason, consistent with the churn result's own
mechanism: a single PgBouncer process serializes all client I/O through one event loop, so *it*
becomes the bottleneck as concurrency rises — while 50 direct connections are each served by their
own independent Postgres backend process, and the fork cost that hurt direct under churn is here
paid once per client, not once per query, so it stops being the deciding factor.

> [!NOTE]
> Read this as the harness's own two-mode split intends: **"should I add a pooler?" isn't a yes/no
> question — it's "what does my application's connection lifecycle actually look like?"** A workload
> that opens a fresh connection per unit of work should expect a pooler's advantage to *widen* under
> load, not shrink. A workload that already holds long-lived, pooled connections gets a mixed-to-
> negative result depending on scale, because there's no setup cost left to amortize and only a
> proxy hop's cost to pay.

## What Actually Decides It

- **You're the churn case if:** each request/invocation opens its own connection — serverless
  functions with no connection reuse across invocations, short-lived scripts, or any framework
  default that doesn't hold a pool open between requests. PgBouncer is close to a free win here, and
  the win gets *larger*, not smaller, as your traffic grows.
- **You're the persistent case if:** your application server already maintains its own connection
  pool (most ORMs and web frameworks default to this). Adding PgBouncer in front of an
  already-pooled application adds a hop for comparatively little benefit at low-to-medium
  concurrency, and can become its own bottleneck at high concurrency — the opposite of the outcome
  "add a pooler" advice usually implies.
- **PgBouncer's real, distinct benefit this harness doesn't measure:** protecting Postgres's own
  `max_connections` ceiling from being exhausted by a client-side connection storm. That's a
  reliability property, not a throughput one, and it's the reason PgBouncer is still worth having in
  front of a churn-shaped workload even once you've fixed the workload to pool its own connections —
  this harness measures speed, not what happens at the connection limit.

## Honesty About the Environment

Both targets ran on the same local host under confirmed, heavy, fluctuating CPU contention from
unrelated concurrent processes — the [harness README](https://github.com/khoahotran/portfolio/blob/main/benchmarks/pgbouncer-vs-direct/README.md)
says so directly. That noise most plausibly inflates the tail-latency figures committed in
`results.json`; the throughput and average-latency trends this article's finding rests on —
PgBouncer's churn-mode lead widening, and its persistent-mode result reversing between low and high
concurrency — reproduced consistently across every manual and full-matrix run during this harness's
development. The exact multiples should not be expected to reproduce on a different host; the
direction of both findings should.
