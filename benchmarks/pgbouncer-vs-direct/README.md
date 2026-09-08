# pgbouncer-vs-direct benchmark harness

Backs [`/labs/pgbouncer-vs-direct`](https://khoahotran.github.io/portfolio/labs/pgbouncer-vs-direct)
and the [Connection Pooling: When PgBouncer Actually Helps](https://khoahotran.github.io/portfolio/experiments/pgbouncer-vs-direct-connection-pooling)
article. Written before the article's numbers, same discipline `.ai/phases/phase-5.md` §5.8
established for this repo's other benchmarks: every claim on the site should trace to a runnable
harness, not a number typed in from memory.

## What it measures

One Go binary (`-target=direct` / `-target=pgbouncer`), so the only variable between a run against
Postgres directly and a run through [PgBouncer](https://www.pgbouncer.org/) (in `transaction`
pooling mode) is the connection path — same query, same client code, same Docker network.

Two connection *lifecycles* are measured, deliberately, because they produce opposite answers:

- **`churn`** — every single query opens a brand new physical connection (full TCP handshake +
  Postgres auth), runs the query, and closes it immediately. This is the pattern a naively-written
  serverless function, or any short-lived script that opens a fresh connection per invocation,
  actually produces — exactly the case a pooler exists to help with, because a direct Postgres
  connection is expensive to establish (each one forks a new backend *process*), while PgBouncer
  keeps a small set of real backend connections open and hands them out from a pool.
- **`persistent`** — each of the `clients` concurrent goroutines opens **one** connection and reuses
  it for all of its queries. This is what a long-lived application server with its own connection
  pool already looks like from Postgres's side — there is no repeated setup cost left for a pooler
  in front of it to amortize, only an extra network hop to pay for.

The query itself is `SELECT 1` — deliberately trivial, so what's measured is connection-path
overhead, not query execution time.

## Reproducing it

Requires Docker and Docker Compose.

```bash
cd benchmarks/pgbouncer-vs-direct
./run.sh
```

Builds the harness image and runs all 12 combinations (client concurrency 10 / 25 / 50, for both
modes and both targets), writing `results.json` — the exact file the interactive lab imports (a
copy lives at `src/pages/experiments/pgbouncer-vs-direct-results.json`; keep the two in sync after a
re-run).

To run one combination manually:

```bash
docker compose up -d postgres pgbouncer
docker compose build go-harness

docker compose run --rm go-harness -target direct    -host postgres   -port 5432 -mode churn -clients 50 -queries 30
docker compose run --rm go-harness -target pgbouncer -host pgbouncer -port 6432 -mode churn -clients 50 -queries 30
```

## The finding: it depends entirely on which lifecycle you're actually running

**In `churn` mode, PgBouncer's advantage doesn't just exist — it widens as concurrency rises:**

| Clients | Direct throughput | PgBouncer throughput | PgBouncer's multiple |
|---|---|---|---|
| 10 | 61.8 q/s | 242.3 q/s | 3.9x |
| 25 | 67.6 q/s | 348.2 q/s | 5.1x |
| 50 | 55.4 q/s | 397.9 q/s | 7.2x |

Direct throughput doesn't scale with concurrency at all here — it's roughly flat-to-declining (61.8
→ 67.6 → 55.4 q/s) while average latency climbs from 153ms to 856ms, because every one of those
concurrent connection attempts is forcing Postgres to fork a fresh backend process, and forking N of
those concurrently is real contention, not free parallelism. PgBouncer's fixed pool of 20 real
backend connections absorbs the same rising client concurrency without paying that fork cost per
query, so its throughput keeps climbing where direct's doesn't.

**In `persistent` mode, the result is genuinely mixed, not a clean win either way:**

| Clients | Direct throughput / avg latency | PgBouncer throughput / avg latency |
|---|---|---|
| 10 | 816 q/s / 1.9ms | 1461 q/s / 4.6ms |
| 25 | 1571 q/s / 3.8ms | 1683 q/s / 11.9ms |
| 50 | 2246 q/s / 6.3ms | 1251 q/s / 34.4ms |

At 10 and 25 clients, PgBouncer's *throughput* is actually slightly higher than direct's, despite its
*latency* being consistently worse — the extra hop's cost shows up per-query but not, at this
concurrency, in aggregate throughput. At 50 clients that reverses cleanly: direct wins both
throughput (1.8x) and latency (5.5x lower) by a clear margin. The most plausible explanation,
consistent with the mechanism above: a single PgBouncer process serializes all client I/O through its
own event loop, so it becomes the bottleneck as concurrency rises, while 50 direct connections are
each handled by their own independent Postgres backend process with its own OS scheduling slice —
the same fork cost that hurt direct in `churn` mode is a one-time cost here, paid once per goroutine,
not per query, so it stops being the deciding factor.

> [!NOTE]
> Read this the way the harness's own `churn` vs `persistent` split intends: **"does PgBouncer help?"
> is not a yes/no question — it's "what does your application's connection lifecycle actually look
> like?"** A workload that opens a fresh connection per unit of work should expect PgBouncer's gap to
> *widen* under load, not shrink. A workload that already holds long-lived, pooled connections gets a
> mixed-to-negative result depending on scale, because there's no setup cost left to amortize and
> only a proxy hop's cost to pay.

## Honesty about the environment

Both targets ran on the same local host, one at a time, on a Docker Compose network — not a
production topology, and not tuned: PgBouncer's `default_pool_size` (20) and Postgres's own
`max_connections` (the image's untouched default of 100) were left at their out-of-the-box values
rather than hand-tuned to flatter either side. This session's host was also under confirmed, heavy,
fluctuating CPU contention from unrelated concurrent processes while this matrix ran (see the
portfolio's own `.ai/decision-log.md` for other benchmarks' notes on the same host); the *tail*
latencies (p95 in `results.json`) are almost certainly inflated by that noise, which is why this
write-up leans on throughput and average latency — the more stable of the numbers this harness
produces — for its comparisons, and states the trend (widening in `churn`, reversing in
`persistent`) rather than quoting any single run's figures as exact.

Re-run `./run.sh` before quoting an exact number if it matters to you — the *direction* of both
findings reproduced consistently across the manual smoke-test runs during this harness's development
and the full committed matrix; the exact multiples did not, and shouldn't be expected to on a
different host.
