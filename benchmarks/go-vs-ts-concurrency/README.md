# go-vs-ts-concurrency benchmark harness

Backs [`/labs/go-vs-ts-concurrency`](https://khoahotran.github.io/portfolio/labs/go-vs-ts-concurrency)
and the [Go vs TypeScript Concurrency](https://khoahotran.github.io/portfolio/experiments/go-vs-ts-concurrency)
article. Third and last of the three `measured` labs whose original harness had been lost — see
`../redis-vs-bullmq/` and `../db-event-replay-benchmark/` for the same pattern applied twice already.

## What it measures

N concurrent workers, each performing a mock 50ms network request — a `sleep`/`setTimeout`, not a
real network call, so what's measured is each concurrency model's own overhead rather than network
variance. Go spawns one goroutine per task under a `sync.WaitGroup`; Node.js runs `Promise.all()`
over N `setTimeout`-based async functions — the exact implementations the article already described,
now actually executed rather than described from memory.

**Peak memory** is read from `/proc/self/status`'s `VmHWM` field — the Linux kernel's own
"high water mark" accounting of the process's peak resident set size — for *both* languages. This
matters: a periodic sample of `process.memoryUsage().rss` (Node) or `runtime.MemStats` (Go) can miss
the actual peak between samples, and using a different measurement method per language would bias
the comparison before either program does anything. Reading the OS's own peak-tracking gives both
languages the same, unbiased yardstick.

**Wall-clock time** is measured from just before workers are spawned to just after every worker
completes.

## Reproducing it

Requires Docker and Docker Compose. No external services (no database, no queue) — just two
standalone containers.

```bash
cd benchmarks/go-vs-ts-concurrency
./run.sh
```

Builds both harness images and runs all 6 combinations (task counts 1,000 / 10,000 / 50,000, for
both languages), writing `results.json` — the exact file the interactive lab imports (a copy lives
at `src/pages/experiments/go-vs-ts-concurrency-results.json`; keep the two in sync after a re-run).
Total runtime is well under a minute — this is the fastest of the three harnesses in this repository.

To run one combination manually:

```bash
docker compose build go-harness node-harness
docker compose run --rm go-harness -tasks 50000
docker compose run --rm node-harness --tasks 50000
```

## The finding reverses, not just refines

This is the most consequential of the three harness rewrites in this repository, because the real
numbers don't just correct the old ones — they point in a different direction. The article this
harness backs previously claimed Node "balloons to nearly 500MB" at 50,000 tasks against Go's "under
50MB," describing a gap that *widens* with scale. The real, measured result is the opposite: the gap
is largest at 1,000 tasks (10.3x) and smallest at 50,000 (1.2x) — it *narrows* as task count grows.

The reason survives the correction even though the specific numbers don't: Node's memory is
dominated by a roughly fixed ~45-50MB baseline (V8's runtime and module machinery, paid once, not
per task), while Go's baseline is a few megabytes and its per-task cost is close to genuinely linear
(a goroutine's small, growing stack). At low task counts, Go looks dramatically leaner because it's
mostly *not paying* Node's fixed cost. At high task counts, Go's own accumulating per-task cost has
closed most of that gap — while the structural claim (goroutines are cheaper per-task than Promises)
remains true throughout.

## Honesty about the environment

Both containers ran on the same local host, one at a time (not concurrently with each other), so
neither competed with the other for CPU during its own measurement. Host hardware is whatever
machine runs `./run.sh` — re-run it before quoting an exact figure if the number matters to you; the
*shape* of the result (fixed Node baseline vs. near-linear Go scaling) is the part expected to
reproduce across hosts, not the specific megabytes.
