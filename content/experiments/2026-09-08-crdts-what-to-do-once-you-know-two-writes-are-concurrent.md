---
title: "CRDTs: What to Do Once You Know Two Writes Are Concurrent"
date: "2026-09-08"
tags: ["distributed-systems", "trade-offs", "benchmark"]
related: ["experiments/vector-clocks-and-the-clock-skew-that-fools-last-write-wins"]
summary: "Run a real G-Counter against a naive LWW register, and a real OR-Set against a naive 2P-Set — see exactly which concurrent updates the naive designs silently lose, and why detecting concurrency is only half the problem."
---

[Vector clocks](/experiments/vector-clocks-and-the-clock-skew-that-fools-last-write-wins) answer
one question: given two writes, is there a causal link between them, or are they genuinely
concurrent? That's real, useful information — but it's still only a diagnosis. Knowing two writes
are concurrent doesn't tell a replicated system what value to actually converge on. **CRDTs**
(Conflict-Free Replicated Data Types) are one principled answer: data structures whose merge
function is designed so every replica converges to the same value, no matter what order updates
arrive in and no matter how many times the same update is delivered twice — without silently
discarding anyone's concurrent contribution the way a naive last-write-wins resolver does. The
[interactive lab](/labs/crdt) runs two real CRDTs against the naive design each one replaces, on
the identical scenario, so the difference is a measured count, not a claim.

<div class="mt-8 mb-12">
  <a href="/labs/crdt" class="lab-cta-inverse">
    Try the Interactive CRDTs Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## G-Counter: Counting Without Losing Anyone's Increments

A **G-Counter** (grow-only counter) gives every node its own slot in a shared vector. A node can
only increment its own slot; the counter's value is the sum of every slot; merging two replicas is
component-wise max — the same operation `mergeClocks` used for vector clocks, repurposed here
(`src/labs/crdt.ts`):

```
increment(state, node):        state[node] += 1
value(state):                  sum(state[*])
merge(a, b):                   componentwise_max(a, b)
```

Contrast that against the naive alternative most systems reach for by default: an **LWW register**
holding one value and one timestamp, where "merging" means keeping whichever replica's write has
the later timestamp and throwing the other away entirely. The lab runs both against the identical
scenario — two nodes, each applying some number of real local increments with no knowledge of the
other — and the G-Counter's total is always correct, because every real increment landed in its
own node's slot and summing slots can't lose anything. The naive register's total is whichever
single node's count happened to have the later timestamp; every increment from the losing node is
gone, silently, with no error and no trace.

> [!NOTE]
> Writing the test for "only one node contributed, so nothing should be lost" turned up a sharper
> version of the finding than the one it was written to check. With a **timestamp tie**, the
> register's deterministic tiebreak (nodeId comparison) can pick the *zero-contribution* node as
> the winner — discarding the other node's entire real work even though it did all of it. The
> lesson isn't "ties are rare, don't worry about it" — it's that **LWW's "winner" is a property of
> the resolver's tiebreak rule, not of who actually did the work**, and a tie is exactly the
> condition where that gap is most visible.

## OR-Set: Surviving a Concurrent Remove

An **OR-Set** (observed-remove set) tags every `add` with a unique identity. A `remove` tombstones
only the specific tags it has actually observed for that value — not the value itself. An element
is present if it has at least one surviving, non-tombstoned tag. The lab runs one concrete
sequence through both an OR-Set and a naive **2P-Set** (a plain "ever added" set plus a plain
"ever removed" set, no per-operation identity at all): add "x", remove "x" (observing that add),
then add "x" again with a fresh tag — a genuine re-add, not a replay of the same operation.

Under the OR-Set, "x" survives: the re-add's tag was never tombstoned, because the remove only ever
tombstoned the tag it had actually seen. Under the 2P-Set, "x" is gone **permanently** — once a
value has ever been removed, the 2P-Set has no way to distinguish a fresh add of that same value
from the one that was already removed, so it stays removed forever, even after a real add happens
later. This is the textbook 2P-Set limitation, and the lab's test suite proves it as an actual
assertion rather than a description: `compareReAddAfterRemove` returns `orSetHasElement: true` and
`twoPhaseSetHasElement: false` for the identical sequence of operations.

The lab's default scenario runs sequentially for legibility, but the property that actually
matters is genuinely concurrent: two replicas, each evolving independently, one removing an
element while the other is simultaneously re-adding it with no knowledge of the removal. The test
suite covers that case directly too — merging two such replicas, in either order, leaves the
element present, because the remove could only ever tombstone the one tag it had actually observed.

## Both Structures Obey the Same Underlying Laws

What makes something a CRDT isn't "has a merge function" — plenty of naive designs have one of
those, including both naive contrasts above. It's that merge forms a genuine mathematical
semilattice: **commutative** (`merge(a,b) == merge(b,a)`, so arrival order can't matter),
**associative** (`merge(merge(a,b),c) == merge(a,merge(b,c))`, so it doesn't matter how merges get
batched or pipelined across a cluster), and **idempotent** (`merge(a,a) == a`, and merging the same
update twice has no additional effect — the property that makes at-least-once delivery safe to
build on). `crdt.test.ts` asserts all three directly for both structures, not just that a specific
demo scenario happens to converge. That's the actual guarantee: not "this example worked out," but
"no matter how the network reorders, duplicates, or batches these merges, every replica ends up in
the same place."
