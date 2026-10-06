---
title: "Backpressure: Four Policies, One Overload"
date: "2026-09-07"
tags: ["distributed-systems", "queues", "trade-offs"]
related: ["experiments/rate-limiting-algorithms"]
summary: "Block, drop-new, drop-old, and circuit breaker, run against the same producer that outruns its consumer — including proof that drop-new and drop-old discard the same number of items, but never the same ones."
---

A producer that outruns its consumer is not a bug to fix — sometimes it's just Tuesday: a spike in
upstream traffic, a slow downstream dependency, a batch job that briefly floods a queue faster than
a worker can drain it. **Backpressure** is what a bounded queue does about that moment, and there
isn't one right answer — there are four different policies with genuinely different failure modes.
The [interactive lab](/labs/backpressure) runs all four against the same sustained overload, item by
item, not as a diagram of the idea.

<div class="mt-8 mb-12">
  <a href="/labs/backpressure" class="lab-cta-inverse">
    Try the Interactive Backpressure Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## Four Policies, Not Four Names for the Same Thing

| Policy | What happens when the queue is full | Ever loses data? |
|---|---|---|
| **Block** | Producer is slowed to match the consumer | No — relocated, not lost |
| **Drop-new** (tail drop) | Newly arriving items are discarded on arrival | Yes — newest work |
| **Drop-old** (drop head) | Oldest queued items are evicted to make room | Yes — oldest work |
| **Circuit breaker** | Everything is rejected once occupancy crosses a threshold, for a fixed cooldown | Yes — everything, temporarily |

The lab's simulation (`src/labs/backpressure.ts`) doesn't just count items in and out — every item
carries the tick it arrived on. That turns out to matter, because two of these four policies produce
**identical drop counts** under the same sustained overload. Counting alone can't tell them apart.

## Drop-New and Drop-Old Drop the Same Number, Never the Same Items

Run the lab with the producer well ahead of the consumer and watch the "Total dropped" counter under
**Drop New** and then under **Drop Old**, same rates: it's the same number. That's arithmetically
inevitable — both policies are absorbing the same excess. What differs is *which* items survive:

- **Drop-new** never touches what's already queued. Every item it discards has an arrival tick equal
  to the tick it was dropped in — it can only ever reject its own newest work, never evict something
  already resident. Right for "every item matters, but the ones queued longest have priority" —
  order-processing, financial events, anything where losing the *newest* request under load is safer
  than losing something already accepted.
- **Drop-old** never refuses a new arrival. It always makes room by evicting whatever's oldest in the
  queue instead — every item it discards was already sitting there, arrived on a strictly earlier
  tick than the one it's dropped on. Right for "only the latest value matters" — a live position
  update, a sensor reading, a price tick, where a stale queued item is actively wrong the moment a
  newer one exists.

> [!NOTE]
> `backpressure.test.ts` asserts this distinction directly, not just the count: under sustained
> overload, every item drop-new discards has `arrivedTick === tick`, and every item drop-old discards
> has `arrivedTick < tick`. The two policies are proven opposite in which data they keep, not just
> described as such.

## Block: The Only Policy That Doesn't Lose Anything — It Just Moves the Problem

Toggle to **Block** under the same overload and the drop counter stays at zero, permanently. Nothing
is being discarded. Instead, watch the "Producer backlog" chart underneath: it climbs without bound.
Block relocates the mismatch to the producer's own outbound buffer rather than resolving it — which
is exactly what "backpressure" means in the literal, protocol sense (a slow consumer's fullness
propagates *backward* through the pipeline instead of the queue silently discarding work). But it is
not a fix for a **sustained** rate mismatch, only a **transient** one: if the producer is faster than
the consumer forever, block just means the unprocessed work now lives somewhere else, still growing.

## Circuit Breaker: Load Shedding Driven by Occupancy, Not by Item

The fourth policy doesn't decide per item at all — it decides per *state*. Once queue occupancy
crosses a threshold, the circuit **opens** and rejects everything, no exceptions, for a fixed
cooldown — giving the consumer a clear runway to drain without new arrivals competing for its
attention. After the cooldown, it allows exactly one **half-open** probe tick at a sharply reduced
rate; if occupancy stays under threshold through that probe, the circuit **closes** and resumes
normal admission, otherwise it reopens and the cooldown restarts.

This was also where the lab's own build caught a real bug in itself before the numbers could be
trusted: the first implementation mutated the breaker's state *before* recording which state governed
the current tick's behavior, so the tick that actually tripped the breaker was mislabeled as already
"open" even though it had just admitted a full batch — the state transition and the tick's own
recorded label were one tick out of sync with each other. Fixed by deciding each tick's admission
strictly from the state it *entered* with, and only mutating state for the *next* tick afterward —
now the tick labelled "open" is provably the same tick that rejected everything, verified in
`backpressure.test.ts` rather than assumed from reading the code once.

## Picking One

None of these four is "the right one" independent of what's actually queued:

- **Block** when losing data is unacceptable and the mismatch is expected to be transient — a burst,
  not a sustained overload — and something upstream can actually tolerate being slowed.
- **Drop-new** when older queued work has priority and losing the newest request under pressure is
  the safer failure.
- **Drop-old** when only the latest value is ever meaningful and a stale queued item is actively
  wrong the moment a fresher one exists.
- **Circuit breaker** when the goal isn't picking which items survive at all, but giving an
  overwhelmed consumer a guaranteed recovery window — the cost is a burst of *total* rejection during
  that window, not a steady trickle of partial loss.

The wrong move is picking one of these by convention rather than by what the queue actually holds —
"just add a circuit breaker" is exactly as underspecified as "just add a pooler" was for
[PgBouncer](/experiments/pgbouncer-vs-direct-connection-pooling).
