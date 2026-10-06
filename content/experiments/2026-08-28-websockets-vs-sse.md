---
title: "WebSockets vs Server-Sent Events: What Holding 5,000 Connections Open Actually Costs"
date: "2026-08-28"
tags: ["go", "benchmark", "architecture"]
related: ["system-design/designing-a-global-api-gateway"]
summary: "A real harness measuring server memory for thousands of concurrent WebSocket vs SSE connections — written before the article, per the lesson from three prior benchmark rewrites."
---

"WebSockets are heavier than SSE" is common advice for choosing a server-push transport. This
harness tests that directly: one Go server exposing both `/ws` and `/sse`, broadcasting the same
tick to however many connections are held open, measuring the server's own peak memory as that
count scales to 5,000.

<div class="mt-8 mb-12">
  <a href="/labs/websockets-vs-sse" class="lab-cta-inverse">
    Try the Interactive WebSockets vs SSE Benchmark
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Setup

Both transports are implemented in the same Go binary and process model — one `-role=server` /
`-role=client` program, not two separate implementations in two languages. That's deliberate: the
question here is what the *transport* costs, and mixing in a language difference would be measuring
[what `go-vs-ts-concurrency`](/experiments/go-vs-ts-concurrency) already isolates, not this.

The server holds connections open and pushes a tick every 200ms to everyone currently connected. The
client opens N connections, waits for a steady state, then reads the server's own
`/proc/self/status` VmHWM — the same peak-memory technique the Go-vs-TS harness uses — restarting
the server fresh before every single data point, because that figure is a monotonic high-water mark
for the life of a process.

## The Finding: They're Close, and SSE Isn't the Cheap One

| Connections | WebSocket | SSE |
|---|---|---|
| 100 | 8.7 MB | 9.1 MB |
| 1,000 | 31.6 MB | 34.1 MB |
| 5,000 | 122.2 MB | 137.5 MB |

At every connection count measured, the two transports track within single-digit percent of each
other — and SSE is consistently the *slightly heavier* one, not the lighter one the "simpler
protocol, less overhead" intuition predicts. The most plausible reason, specific to this harness:
the SSE handler carries a `bufio.Reader` and manual HTTP-header-parsing state per connection that the
WebSocket path — handled entirely inside `gorilla/websocket` — doesn't. That's a property of *this
implementation choice*, not a law about the wire protocols; a production SSE library tuned for
exactly this case could plausibly close or reverse the gap. The honest takeaway is narrower than "WS
is lighter than SSE": **at the scale tested, neither transport's baseline connection cost is the
thing that should decide this choice** — the difference is small enough that it's very unlikely to
be why a real system picks one over the other, once you've built one of these to check.

## What Actually Should Decide It, Then

Given memory is close, the real decision drivers are protocol-shape ones this benchmark doesn't
measure, because they aren't quantities — they're capabilities:

- **Directionality.** SSE is server-to-client only. If the client ever needs to send anything after
  the initial request (not just receive), that's WebSocket's job by default, full stop.
- **Reconnection semantics.** SSE has built-in last-event-id reconnection in every browser's
  `EventSource` — free infrastructure for "resume where the client left off" that a WebSocket
  implementation has to build by hand.
- **Infrastructure friendliness.** SSE is plain HTTP — the [edge gateway layer](/system-design/designing-a-global-api-gateway)
  in front of a real deployment (proxies, load balancers, CDNs) already understands it. WebSocket
  requires `Upgrade: websocket` support all the way through that chain, which is a real, if usually
  solvable, operational dependency SSE doesn't have.

## Honesty About What This Harness Doesn't Settle

This measured connect time too, and that number does **not** get a table here on purpose — a manual
re-run at 5,000 connections reversed which transport was faster, twice, on the same host. That's a
real, measured instability, not a rounding difference, and the
[harness README](https://github.com/khoahotran/portfolio/blob/main/benchmarks/websockets-vs-sse/README.md)
says so directly rather than picking whichever run looked cleaner. Opening 5,000 concurrent
connections from one client process is sensitive to host scheduling and file-descriptor pressure in
ways this harness doesn't isolate from the number it reports — which is exactly the kind of
limitation worth stating instead of quietly omitting the metric altogether.
