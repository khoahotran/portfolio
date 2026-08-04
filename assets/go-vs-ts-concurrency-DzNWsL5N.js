const e=`---
title: "Benchmark: Go vs TypeScript Concurrency"
date: "2026-06-26"
tags: ["benchmark", "go", "typescript", "concurrency"]
summary: "An interactive benchmark visualizing memory footprint and execution time for handling tens of thousands of concurrent network-bound tasks."
reading_time: "4 min"
---

A common debate in backend engineering is whether to use Node.js (TypeScript) or Go for highly concurrent workloads (like web scraping, proxying, or heavy API orchestrations).

While both utilize non-blocking I/O, their underlying concurrency models are fundamentally different: Go uses **Goroutines** (lightweight threads managed by the Go runtime), while Node.js uses an **Event Loop** with Promises.

### Methodology

- **Task:** Spawning N concurrent workers, each performing a mock 50ms network request (sleep/timeout).
- **Go Implementation:** Uses a \`sync.WaitGroup\` and spawns a new \`go worker()\` for each task.
- **Node.js Implementation:** Uses \`Promise.all()\` over an array of asynchronous functions.
- **Metrics:** We measured Peak Resident Set Size (RSS) memory and total wall-clock execution time.

### Key Observations

Node.js handles concurrency remarkably well given its single-threaded nature. The execution time is comparable to Go for smaller workloads. 

However, the major differentiator is **Memory Overhead**. A Goroutine starts with a tiny 2KB stack that grows dynamically. A JavaScript Promise carries significant V8 object overhead. When spawning 50,000 concurrent tasks, the Node.js process balloons to nearly 500MB of memory just to track the Promises, whereas the Go binary remains extremely lean at under 50MB.

<a href="/experiments/go-vs-ts-concurrency" class="not-prose inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 hover:shadow-md transition-all mt-4 mb-8">
  View Interactive Benchmark
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</a>
`;export{e as default};
