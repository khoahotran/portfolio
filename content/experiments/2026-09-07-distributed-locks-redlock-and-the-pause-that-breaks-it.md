---
title: "Distributed Locks: Redlock and the Pause That Breaks It"
date: "2026-09-07"
tags: ["distributed-systems", "redis", "trade-offs"]
related: ["experiments/leader-election-bully-algorithm"]
summary: "Run the real Redlock quorum algorithm against nodes you crash yourself, then simulate the exact pause Martin Kleppmann's 2016 critique is about — and see why Antirez's own rebuttal doesn't actually disagree with it."
---

Mutual exclusion across a distributed system — "only one worker should ever process this job,
only one writer should ever touch this row" — sounds like a problem a single Redis `SET key value
NX PX 30000` should solve. It does, until that one Redis instance is the thing that's down.
**Redlock** (Antirez, 2014) is the proposed fix: acquire the same lock across N independent
instances and require a majority. The [interactive lab](/labs/redlock) runs the actual quorum
arithmetic, not a description of it — and then runs the specific scenario the algorithm's most
cited critique is about.

<div class="mt-8 mb-12">
  <a href="/labs/redlock" class="lab-cta-inverse">
    Try the Interactive Redlock Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Algorithm

A client trying to acquire a lock talks to all N nodes, one at a time, with a per-node acquire
timeout much shorter than the lock's TTL — so a single down node costs the attempt a bounded
amount, never the whole budget. Two independent conditions have to hold for the lock to actually
count as acquired (`src/labs/redlock.ts`):

```
acquire on every node in turn (down nodes cost the fixed timeout, alive ones their own latency)
acquired_count = nodes that responded
elapsed = sum of every attempt's cost
remaining_validity = ttl - elapsed

LOCK ACQUIRED only if:
  acquired_count >= floor(n/2) + 1   (majority quorum)
  AND remaining_validity > 0          (there's still TTL left to use)
```

Both conditions are real arithmetic in the lab, not a single pass/fail flag. Drag the node count
to 5 and crash two nodes: quorum (3) is still reachable, so acquisition still succeeds — Redlock's
whole point is surviving a minority failure. Now instead push the per-node latency slider up while
keeping the TTL low: quorum gets reached with every node alive, and the lock **still fails to
acquire**, because the time spent acquiring it ate the entire TTL. A quorum met too slowly is not a
usable lock — there's nothing left of it by the time you'd start using it.

> [!NOTE]
> The acquire timeout in the lab is fixed, not a slider, on purpose. Antirez's spec requires it to
> be small relative to the TTL — that's what bounds a down node's cost — so exposing it as a knob
> would let a reader build a case against a configuration Redlock's own design already rules out,
> rather than the one it's actually vulnerable to.

## The Pause Kleppmann's Critique Is About

Getting the lock is not where the interesting failure is. Martin Kleppmann's 2016 post ["How to do
distributed locking"](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
argues Redlock's real weakness shows up *after* acquisition: the lock's TTL is a clock running on
the storage nodes, completely decoupled from what the client holding the lock is actually doing.
Stop the client's process for any reason — a garbage-collection pause, a slow disk write, a
descheduled VM, a long GC pause during exactly the operation the lock was supposed to protect — and
if that stall outlasts the remaining TTL, the lock **expires on the storage side while the client
still believes it holds it.**

Stage 2 of the lab makes this a testable equality instead of a hypothetical: acquire the lock, then
drag the pause slider. `simulatePauseAfterAcquire` ties `secondClientCanAcquire` to
`lockExpiredDuringPause` **exactly** — because nothing about "client A is still running" keeps the
key held. The storage nodes only know the TTL. The instant it lapses, the key is free, regardless
of what the first client believes about its own state.

> [!NOTE]
> This equality — a second client can acquire *iff* the pause outlasts what was left of the TTL —
> is the whole finding. It is deliberately not "usually" or "under contention": Redlock offers no
> partial protection against this once the TTL has actually lapsed. The only lever a client has is
> keeping the pause shorter than the validity window, which is a property of the client's own
> runtime (GC pauses, scheduler fairness, disk latency), not something Redlock can enforce.

## Antirez's Rebuttal, and Where It Actually Lands

Antirez's response to Kleppmann does not dispute the pause scenario — it disputes what Redlock was
ever claimed to guarantee. His position: Redlock is meant for *efficiency* locking (avoid doing the
same expensive work twice, tolerable if it occasionally fails), not *correctness* locking (data
would actually be corrupted if two clients ever believed they held the lock simultaneously). For
the correctness case, his own recommendation is the same one Kleppmann proposes independently: a
**fencing token** — a strictly increasing number handed out with the lock, which the *protected
resource itself* checks and rejects if a newer token has already been seen. That check has to live
on the resource being protected, not in the locking layer, because — as Stage 2 demonstrates — the
locking layer's own clock is exactly what a long enough pause defeats.

| | Redlock alone | Redlock + fencing tokens |
|---|---|---|
| **Protects against** | A single down node stranding the lock | Same, plus a paused client racing a second holder |
| **Where the check happens** | The lock's storage nodes (TTL only) | The resource being protected (token ordering) |
| **What a long pause causes** | A second client can acquire and act, undetected | The paused client's write is rejected — the resource itself saw a newer token already |
| **Right for** | "Don't do this expensive work twice" — occasional duplication is a cost, not corruption | "Don't let two clients corrupt this row" — duplication would be a real bug |

The practical read: **the algorithm the lab runs and the critique it also runs are not actually in
conflict.** Redlock's quorum-plus-TTL arithmetic is real and does what it says — Stage 1 shows
that faithfully. Stage 2 shows exactly the gap Antirez agrees exists, and exactly why he never
claimed Redlock alone closes it. The mistake this lab is built to prevent is reaching for Redlock
by name and assuming "distributed lock" means "safe against concurrent access" — it means that only
once a fencing check exists somewhere the two racing clients' writes actually meet.
