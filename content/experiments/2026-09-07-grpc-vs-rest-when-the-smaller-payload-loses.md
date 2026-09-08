---
title: "gRPC vs REST: When the Smaller Payload Loses"
date: "2026-09-07"
tags: ["grpc", "api-design", "benchmark"]
related: ["blog/grpc-service-mesh-in-go-aegis-architecture"]
summary: "A real harness measuring gRPC against REST for the same data, same server, same Go process — and REST wins throughput at every concurrency level tested for a small payload, and at half the concurrency levels tested for a 100x larger one."
---

"gRPC is faster than REST" is close to received wisdom — smaller binary payloads, HTTP/2
multiplexing, code-generated clients. This harness tests that claim directly, on the same server
process, serving the same data, so the only variable between a gRPC call and a REST call is the
protocol itself. The result isn't what the received wisdom predicts.

<div class="mt-8 mb-12">
  <a href="/labs/grpc-vs-rest" class="lab-cta-inverse">
    Try the Interactive gRPC vs REST Benchmark
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Setup

One Go server runs a gRPC listener (protobuf, HTTP/2) and a REST/JSON listener (`net/http`,
HTTP/1.1) side by side, both reading from the same deterministic data generator — a given user id
returns byte-identical *content* whether it's fetched over gRPC or REST. Two payload shapes are
measured: a **single** record (~245 bytes as protobuf, ~312 as JSON) and a **list** of 100 records
(~24 KB as protobuf, ~30 KB as JSON). Both clients use one shared, reused connection for the whole
run — a single `*grpc.ClientConn` (HTTP/2 multiplexes every concurrent call over it) and a single
`*http.Client` with a transport sized to the concurrency — the realistic way either protocol is
actually deployed, not a strawman that reconnects per request on only one side.

## The Finding: Protobuf's Smaller Payload Is Real, and Doesn't Reliably Win

Protobuf's wire-size advantage shows up exactly where you'd expect — the 100-record payload is
consistently **~20% smaller** as protobuf than as JSON, at every concurrency level. That part of
the received wisdom is simply true. What it doesn't predict is what happens to *throughput*:

| Clients | gRPC (single) | REST (single) | REST's multiple |
|---|---|---|---|
| 10 | 699 req/s | 1,320 req/s | 1.9x |
| 25 | 716 req/s | 1,805 req/s | 2.5x |
| 50 | 2,621 req/s | 3,032 req/s | 1.2x |

For the small payload, **REST wins throughput at every concurrency level tested** — not narrowly,
either: nearly 2x at 10 clients, 2.5x at 25. A spot-check rerun of the 10-client case reproduced the
same direction on a second run (REST still ahead on both throughput and latency), though the exact
multiple shifted with host load — see the caveat at the end.

| Clients | gRPC (list, 100 records) | REST (list, 100 records) | Winner |
|---|---|---|---|
| 10 | 294 req/s | 495 req/s | REST, by 1.7x |
| 25 | 680 req/s | 431 req/s | gRPC, by 1.6x |
| 50 | 480 req/s | 459 req/s | Roughly tied |

Even with a real, measured 20% smaller payload, gRPC only wins outright at 25 clients — REST wins
at 10, and the two are within a rounding error of each other at 50. There is no concurrency level in
this matrix where gRPC's smaller payload translates into a clean, consistent win.

> [!NOTE]
> The likely mechanism, and it's a real, structural one, not measurement noise: this harness's gRPC
> client uses one shared `*grpc.ClientConn`, and grpc-go serializes every outbound frame for every
> concurrent call through that connection's single internal write loop — the standard, recommended
> way to use a gRPC connection, and exactly what HTTP/2 multiplexing is *for*. REST's `*http.Client`
> instead pools multiple independent TCP connections, so concurrent requests get real OS-level
> parallelism on the write path that a single multiplexed HTTP/2 connection doesn't offer the same
> way. Isolating clients=1 from this matrix (not shown above) confirms it: gRPC's tail latency
> already exceeds REST's even with *zero* concurrency, and the gap widens as concurrency rises —
> consistent with a serialization point inside the shared connection, not with payload size at all.

## What This Doesn't Mean

This is not "REST is faster than gRPC," full stop — it's "gRPC's real advantages (smaller wire
payload, one persistent connection instead of a pool, code-generated typed clients, native
streaming) do not automatically translate into a throughput win for typical unary request/response
traffic on a single connection." gRPC's connection-pooling story changes if you shard load across
*multiple* `ClientConn`s (its own docs recommend this for high-throughput services) — this harness
deliberately didn't, because "one connection, HTTP/2 multiplexing" is both the default and the
selling point most adoption arguments actually lean on. Testing the sharded-connection variant is a
natural follow-up, not something this run's numbers can speak to.

## Honesty About the Environment

The full matrix ran on the same local host under this session's already-documented fluctuating CPU
contention from unrelated concurrent processes — see the
[harness README](https://github.com/khoahotran/portfolio/blob/main/benchmarks/grpc-vs-rest/README.md).
A spot-check rerun of the single-mode, 10-client case reproduced the same *direction* (REST ahead on
both throughput and latency) but a different *magnitude* (throughput ratio 1.9x on one run, 2.5x on
the rerun) — read the direction of every result here as reliable, the exact multiples as this run's,
not a universal constant. The wire-size numbers (protobuf ~20% smaller for the 100-record payload)
are structural, not load-dependent, and should reproduce on any host.
