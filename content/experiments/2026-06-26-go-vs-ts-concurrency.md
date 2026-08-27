---
title: "Benchmark: Go vs TypeScript Concurrency"
date: "2026-06-26"
tags: ["benchmark", "go", "typescript"]
related: ["blog/grpc-service-mesh-in-go-aegis-architecture", "field-notes/go-vs-typescript-for-backend-services"]
summary: "An interactive benchmark visualizing memory footprint and execution time for handling tens of thousands of concurrent network-bound tasks."
---

A common debate in backend engineering is whether to use Node.js (TypeScript) or Go for highly concurrent workloads (like web scraping, proxying, or heavy API orchestrations).

While both utilize non-blocking I/O, their underlying concurrency models are fundamentally different: Go uses **Goroutines** (lightweight threads managed by the Go runtime), while Node.js uses an **Event Loop** with Promises.

### Methodology

- **Task:** Spawning N concurrent workers, each performing a mock 50ms network request (a sleep, not a real network call — isolates each concurrency model's own overhead from actual I/O variance).
- **Go Implementation:** A `sync.WaitGroup` and one `go func()` per task, matching what the previous version of this article claimed.
- **Node.js Implementation:** `Promise.all()` over an array of `setTimeout`-based async functions.
- **Metrics:** Peak Resident Set Size, read from `/proc/self/status`'s `VmHWM` (the OS's own peak-memory accounting, not a periodic sample that could miss the actual peak) — identical methodology for both languages, so neither gets an accuracy advantage. Total wall-clock time for all tasks to complete.

> [!IMPORTANT]
> **This section previously claimed a different result.** The original version of this article said
> Node "balloons to nearly 500MB" at 50,000 tasks while Go "remains extremely lean at under 50MB" —
> a claim from a harness that no longer existed, describing an order-of-magnitude gap that *widens*
> with scale. The real, measured result — from a runnable harness, reproducible below — is the
> opposite pattern: the gap *narrows* as task count grows. Read on for why, and see
> [`benchmarks/go-vs-ts-concurrency/`](https://github.com/khoahotran/portfolio/tree/main/benchmarks/go-vs-ts-concurrency)
> to check it yourself.

### Key Observations

| Tasks | Go (MB) | Node (MB) | Ratio |
| ---: | ---: | ---: | ---: |
| 1,000 | 4.9 | 50.1 | 10.3x |
| 10,000 | 27.9 | 57.9 | 2.1x |
| 50,000 | 71.2 | 84.6 | 1.2x |

At 1,000 tasks, Go's real advantage looks enormous — 10x less memory. By 50,000 tasks, that gap has
nearly closed to 1.2x. Neither number is wrong; they're measuring two different things that both
happened to be true at once.

**Node's memory is dominated by a fixed baseline, not by task count.** V8's runtime, the event loop,
and Node's own module machinery cost roughly 45-50MB before a single task runs — that cost is paid
once, not per-task. Going from 1,000 to 50,000 concurrent `setTimeout` calls only adds about 35MB on
top of that baseline: a real per-task cost, but a small one next to the fixed floor underneath it.

**Go's memory is closer to genuinely linear with task count.** A goroutine really does start with a
tiny stack (2KB, growing on demand) and the Go runtime's own baseline is a few megabytes — so at
1,000 tasks, Go's total is almost all baseline and almost no per-task cost, which is why the gap to
Node looks so large there. At 50,000 tasks, that per-task cost has accumulated into a real number
(71MB total), closing most of the distance to Node's now-relatively-fixed 84.6MB.

**The practical conclusion survives the correction, even though the numbers don't:** Go's per-task
memory overhead is genuinely lower than Node's, and that's the durable, structural difference — a
goroutine's stack against a Promise-plus-timer object. What doesn't survive is the specific claim
that this gap *widens* at scale. It doesn't. It's largest exactly where it matters least — a handful
of concurrent tasks — and smallest exactly where high concurrency is actually the point.

<a href="/labs/go-vs-ts-concurrency" class="lab-cta">
  View Interactive Benchmark
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</a>
