---
title: "Benchmark: Go vs TypeScript Concurrency"
date: "2026-06-26"
tags: ["benchmark", "go", "typescript", "concurrency"]
related: ["blog/grpc-service-mesh-in-go-aegis-architecture", "field-notes/go-vs-typescript-for-backend-services"]
summary: "An interactive benchmark visualizing memory footprint and execution time for handling tens of thousands of concurrent network-bound tasks."
---

A common debate in backend engineering is whether to use Node.js (TypeScript) or Go for highly concurrent workloads (like web scraping, proxying, or heavy API orchestrations).

While both utilize non-blocking I/O, their underlying concurrency models are fundamentally different: Go uses **Goroutines** (lightweight threads managed by the Go runtime), while Node.js uses an **Event Loop** with Promises.

### Methodology

- **Task:** Spawning N concurrent workers, each performing a mock 50ms network request (sleep/timeout).
- **Go Implementation:** Uses a `sync.WaitGroup` and spawns a new `go worker()` for each task.
- **Node.js Implementation:** Uses `Promise.all()` over an array of asynchronous functions.
- **Metrics:** We measured Peak Resident Set Size (RSS) memory and total wall-clock execution time.

> [!NOTE]
> **Limits of this measurement.** The host hardware was not recorded at the time and the harness is
> not published, so the absolute MB and millisecond figures are not reproducible and shouldn't be
> quoted. The order-of-magnitude difference in memory footprint is the finding that survives — a
> 2 KB goroutine stack versus a V8 promise object is a structural difference, not a tuning artifact.

### Key Observations

Node.js handles concurrency remarkably well given its single-threaded nature. The execution time is comparable to Go for smaller workloads. 

However, the major differentiator is **Memory Overhead**. A Goroutine starts with a tiny 2KB stack that grows dynamically. A JavaScript Promise carries significant V8 object overhead. When spawning 50,000 concurrent tasks, the Node.js process balloons to nearly 500MB of memory just to track the Promises, whereas the Go binary remains extremely lean at under 50MB.

<a href="/labs/go-vs-ts-concurrency" class="lab-cta">
  View Interactive Benchmark
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</a>
