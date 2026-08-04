const e=`---
title: "Benchmark: Redis Streams (Go) vs BullMQ (TS)"
date: "2026-06-25"
tags: ["benchmark", "redis", "go", "typescript", "queues"]
summary: "An interactive benchmark visualizing queue throughput and latency between native Redis Streams in Go vs BullMQ in TypeScript."
reading_time: "5 min"
---

Queueing is the backbone of any asynchronous architecture. The two most popular choices I've used are **BullMQ** (running on Node.js/TypeScript) and **Redis Streams** (accessed natively via Go).

While both use Redis as the underlying datastore, their performance characteristics are vastly different.

### Methodology

- **Hardware:** Dedicated 4-core AWS EC2 instance (c6g.xlarge).
- **Network:** Redis and the workers were hosted on the same VPC.
- **BullMQ:** Node.js v20. Used the standard \`Worker\` class.
- **Redis Streams:** Go 1.22. Used the \`go-redis\` client with \`XADD\` and \`XREADGROUP\` commands.

### Key Observations

BullMQ is an incredible piece of software with built-in retries, backoff, and repeatable jobs. However, to achieve these features, it relies on complex Lua scripts that run atomically inside Redis for every single job state transition (Waiting -> Active -> Completed). 

Native Redis Streams via Go, on the other hand, just appends and reads from a log. 

If your system requires raw, unadulterated throughput (e.g., passing millions of tiny websocket events or tick data), Redis Streams in Go completely annihilates BullMQ, offering up to **4-5x higher throughput** and significantly lower P99 latency. However, if you need complex job management (e.g., pausing queues, rate limiting, parent/child jobs), BullMQ's overhead is well worth it.

<a href="/experiments/redis-vs-bullmq" class="not-prose inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 hover:shadow-md transition-all mt-4 mb-8">
  View Interactive Benchmark
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
</a>
`;export{e as default};
