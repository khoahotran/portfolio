---
title: "Rate Limiting Algorithms: Token Bucket vs Leaky Bucket vs Fixed Window"
date: "2026-08-28"
tags: ["api-design", "distributed-systems", "benchmark"]
related: ["projects/aegis", "system-design/designing-a-global-api-gateway"]
summary: "Three rate limiting algorithms, run for real against the same burst scenario, to show what each one actually does differently — not just what it's named."
---

Every API gateway eventually needs to answer the same question: *how many requests is one client
allowed to make, and what happens when they go over?* Three algorithms answer it differently enough
that picking the wrong one is a real operational mistake, not a stylistic preference. The
[interactive lab](/labs/rate-limiting-algorithms) runs the actual algorithms — not modelled
approximations — against an identical arrival timeline, so the differences below come from the
algorithms, not from cherry-picked inputs.

<div class="mt-8 mb-12">
  <a href="/labs/rate-limiting-algorithms" class="lab-cta-inverse">
    Try the Interactive Rate Limiting Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Shared Scenario

Every request in this write-up (and in the lab) arrives on the same timeline: a sustained rate well
under the limit, plus one burst injected at a single instant. A pure sustained rate below the limit
doesn't distinguish anything — all three algorithms admit it identically. The burst is where they
disagree.

## Token Bucket

A bucket holds up to `capacity` tokens and refills continuously at `refillPerSec` tokens/second.
Each request consumes one token; an empty bucket rejects the request outright.

```
tokens = min(capacity, tokens + elapsed_seconds * refillPerSec)
if tokens >= 1: allow, tokens -= 1
else: reject
```

**What this means for the burst:** Token Bucket *absorbs* a burst up to `capacity`, admitting it
immediately, then rejects the overflow. If the bucket had been idle long enough to refill fully
before the burst, the entire burst up to capacity gets through in one instant — this is a
deliberate design property (bursty traffic that's still within budget shouldn't be smoothed out
artificially), not a leak.

## Leaky Bucket (as a Queue)

A bucket holds up to `capacity` requests and drains at `leakPerSec` requests/second. An arriving
request is queued if there's room after the elapsed drain; otherwise it overflows.

```
queue_level = max(0, queue_level - elapsed_seconds * leakPerSec)
if queue_level < capacity: allow, queue_level += 1
else: reject
```

**What this means for the burst:** Leaky Bucket queues the burst up to capacity and then rejects
the rest — structurally similar to Token Bucket's admission boundary, but the *output* rate it
implies is steady (bounded by `leakPerSec`), which is the property that matters when the thing on
the other side of the limiter is a fixed-capacity downstream worker rather than a client that can
simply retry.

## Fixed Window Counter

Time is divided into consecutive windows of `windowSeconds`; each window allows up to `limit`
requests, and the counter resets hard at every window boundary.

```
window = floor(t / windowSeconds)
if window changed: count = 0
if count < limit: allow, count += 1
else: reject
```

**What this means for the burst — the algorithm's actual flaw, not a hypothetical one:** a burst
split across a window edge can be admitted *twice*. Two requests at `limit` each, one just before
a boundary and one just after, both get through in full — up to ~2x `limit` in a span far shorter
than `windowSeconds`. The [lab's test suite](https://github.com/khoahotran/portfolio/blob/main/src/labs/rateLimiting.test.ts)
asserts this directly (`demonstrates the boundary-burst flaw`) rather than describing it only in
prose — it's the one behavior in this article that's genuinely worth distrusting until you've seen
it reproduce.

## Choosing One

| | Absorbs a legitimate burst | Smooths output rate | Boundary flaw |
|---|---|---|---|
| **Token Bucket** | Yes, up to capacity | No — bursty by design | None |
| **Leaky Bucket** | Yes, up to capacity | Yes — output is steady | None |
| **Fixed Window** | Only within one window | No | Yes — up to ~2x at an edge |

Fixed Window is the cheapest to implement (a counter and a timestamp) and the easiest to reason
about — which is exactly why it's still common in practice despite the flaw, for limits generous
enough that occasionally admitting 2x for a few hundred milliseconds isn't worth the extra state a
sliding window or token bucket requires. For anything where the limit is protecting a resource that
actually breaks under 2x load — a downstream connection pool, a per-key quota with real cost behind
it — Token Bucket or Leaky Bucket is the correct default, not Fixed Window with a "we'll tune the
limit down" patch.

**Where this fits Aegis:** the [Aegis](/projects/aegis) API Gateway is the natural place a rate
limiter belongs in this portfolio's own architecture, ahead of the Identity and Policy services it
fronts — sitting between an untrusted client and a sub-5ms RBAC evaluation is exactly the position
where absorbing a legitimate burst without amplifying a hostile one matters. That guard is not yet
implemented in the Aegis repository; this write-up is the algorithm groundwork for it, not a
description of code that ships there today.
