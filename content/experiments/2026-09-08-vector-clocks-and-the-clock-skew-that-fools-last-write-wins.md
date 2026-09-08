---
title: "Vector Clocks and the Clock Skew That Fools Last-Write-Wins"
date: "2026-09-08"
tags: ["distributed-systems", "trade-offs", "benchmark"]
related: ["experiments/gossip-protocol-visualizer"]
summary: "Run the real happens-before/happens-after/concurrent test on a scripted causal history, then watch a naive last-write-wins resolver flip its answer under clock skew alone — while the causal verdict never moves."
---

Two nodes each write a value for the same key, neither one having seen the other's write yet. Which
one is "the real" value? A naive conflict resolver answers with **last-write-wins**: compare each
write's timestamp, keep the later one. It always produces an answer — that's exactly the problem.
Machine clocks are never perfectly synchronized, so "later" here means "whichever machine's clock
happened to read a bigger number," not "whichever write actually came after the other." **Vector
clocks** (Fidge/Mattern, 1988 — the mechanism behind conflict detection in Riak, Voldemort, and
Dynamo-style stores) answer a different, provable question instead: did either write have any
causal knowledge of the other at all? The [interactive lab](/labs/vector-clocks) runs both answers
side by side on the same scripted event history, so the contrast is a measurement, not a claim.

<div class="mt-8 mb-12">
  <a href="/labs/vector-clocks" class="lab-cta-inverse">
    Try the Interactive Vector Clocks Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Algorithm

Every node keeps its own counter inside one shared vector, one slot per node (`src/labs/vectorClocks.ts`):

```
on any local event at node N:        clock[N] += 1
on send at node N:                   clock[N] += 1; attach clock to the message
on receive at node N of msg.clock:   clock = componentwise_max(clock, msg.clock); clock[N] += 1

compare(a, b):
  a happened-before b   if every component of a <= the matching component of b, and a != b
  a happened-after b    if the reverse holds
  otherwise: concurrent — provably no causal link in either direction
```

The lab runs a real nine-event script across three nodes — some purely local writes, two messages
sent and received — and every clock shown is the actual output of that algorithm, not a hand-typed
illustration. One guarantee falls straight out of the definition and is exactly what the tests
assert directly: **a send's clock always happens-before its matching receive's clock.** That's the
whole mechanism in one sentence — causality, made checkable.

> [!NOTE]
> The lab's default comparison pair is deliberately the two events that never exchange a message
> at all: node C's independent write, and node B's write immediately after receiving node A's
> update. B knows about A's write; neither B nor A ever hears from C. `compareClocks` reports that
> pair as **concurrent**, correctly, no matter how the rest of the script plays out.

## The Finding: Clock Skew Can Flip an Answer That Was Never Really There

Every event in the lab also carries a **physical timestamp** — script position times a fixed
interval, plus a per-node clock-skew offset you control with a slider, modelling the same
imperfectly-synchronized machine clocks every real cluster has (NTP drift, VM scheduling jitter, a
host that's simply wrong). `pickLastWriteWinner` picks whichever of two events has the larger
physical timestamp — a naive resolver's whole decision procedure, and it never refuses to answer.

Take the concurrent pair from the note above and push their clock-skew sliders in opposite
directions. The naive winner **flips** — first C's write wins, then B's does, purely because of
which slider you moved, nothing about what either node had actually observed. Now look at the
causal verdict directly above it: it does not move. `compareClocks` never once changes its answer
for that pair, in either skew direction, because it operates entirely on the logical clocks —
integers counting real events — which clock skew cannot touch at all. This is the exact behavior
`vectorClocks.test.ts` asserts (`aAheadOfB` and `bAheadOfA` producing opposite naive winners for
the identical logical event pair, with the causal comparison held constant), not a hypothetical
described in prose.

> [!NOTE]
> This isn't an argument that last-write-wins is always wrong to use — for genuinely low-stakes,
> low-conflict-rate data it's a defensible, simple choice, and plenty of real systems (Cassandra's
> default, for one) ship it deliberately. The finding is narrower and sharper: **for a concurrent
> pair specifically, LWW's "winner" carries no causal meaning at all** — it's an artifact of
> whichever clock happened to read later, and that artifact is trivially adjustable by clock skew
> alone. A system that needs to *know* whether it has a real conflict on its hands — not just
> silently pick a survivor — needs vector clocks or something equivalent, because LWW cannot
> distinguish "these two writes are unrelated and both matter" from "this write genuinely came
> after that one." It always looks like the second case from the inside.

## Why This Pairs With Gossip, Not Duplicates It

The [gossip protocol lab](/labs/gossip-protocol-visualizer) is also about information moving
through an unreliable network — but it's about *reach*: how many rounds until a message has spread
to everyone. Vector clocks are about *order*: once information has reached somewhere, what can you
actually prove about when it arrived relative to everything else. A real system typically needs
both — gossip (or any other propagation mechanism) to spread the data, and something like a vector
clock riding along with it to make the resulting order legible once it arrives out of sequence,
which distributed delivery guarantees essentially never rule out.
