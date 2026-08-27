# redis-vs-bullmq benchmark harness

Backs [`/labs/redis-vs-bullmq`](https://khoahotran.github.io/portfolio/labs/redis-vs-bullmq) and the
[Redis Streams vs BullMQ](https://khoahotran.github.io/portfolio/experiments/redis-streams-vs-bullmq-job-queue-comparison)
article. Written to close a gap Phase 4 of the portfolio's own roadmap flagged: the lab's numbers
came from a run whose harness had been lost, so the figures couldn't be checked. This one can.

## What it measures

Raw queueing throughput and latency for two engines on the same job queue task, isolated from any
actual job processing:

- **Redis Streams (Go)** — `XADD` to enqueue, `XREADGROUP` against a shared consumer group to drain,
  one goroutine per configured worker.
- **BullMQ (Node.js)** — one `Worker` instance per configured worker, concurrency 1 each.

Both harnesses follow the identical protocol: enqueue every job first, only then start the
consumer(s), and time from "workers start" to "last job acknowledged." This measures **steady-state
drain throughput from a full backlog** — not production-and-consumption overlap — so the two engines
are compared on the same task under the same conditions. Neither harness does any real work in the
job handler; a job is acknowledged the instant it's received, so what's measured is each engine's own
queueing and dispatch overhead, not application logic.

## Reproducing it

Requires Docker and Docker Compose.

```bash
cd benchmarks/redis-vs-bullmq
./run.sh
```

This builds both harness images, runs all 12 combinations (payload sizes 1&nbsp;KB / 10&nbsp;KB /
100&nbsp;KB × worker counts 1 / 5, for both engines), and writes `results.json` — the exact file the
interactive lab imports (a copy lives at `src/pages/experiments/redis-vs-bullmq-results.json`; keep
the two in sync after a re-run). Total runtime is a couple of minutes.

To run one combination manually instead of the full matrix:

```bash
docker compose up -d redis
docker compose build go-harness node-harness

docker compose run --rm go-harness   -redis-addr redis:6379 -payload 1024 -workers 5 -jobs 3000
docker compose run --rm node-harness --redis-host redis --redis-port 6379 --payload 1024 --workers 5 --jobs 3000
```

Each harness prints one line of JSON to stdout (diagnostic progress goes to stderr, so stdout stays
parseable) — see either binary's flags with `-h` / `--help`-style inspection of `main.go` /
`harness.js`, both short enough to read directly.

## Honesty about the environment

This is **not** a rerun of the AWS c6g.xlarge instance an earlier version of the write-up cited —
that machine and its harness are gone, and reconstructing "the same hardware" isn't something a
Docker Compose stack on a different host can honestly claim. This measures both engines on whatever
machine runs `./run.sh`, which as of the run currently checked into `results.json` was a local
x86_64 host with Redis, the Go container, and the Node container all on the same Docker bridge
network — the closest local equivalent to "same VPC," not a substitute for it.

That's the actual point of committing a runnable harness instead of a fixed dataset: the numbers are
whatever your machine measures when you run it, not a claim about a specific cloud instance you have
to trust secondhand. Re-run it before quoting a number if the exact figure matters to you.

## Job counts

3,000 jobs for the 1 KB and 10 KB payload sizes, 1,000 for 100 KB — lower purely to bound total
runtime, not to favor either engine. The count is identical for both engines within a given payload
size, so the throughput comparison at each row of the results table is apples-to-apples.
