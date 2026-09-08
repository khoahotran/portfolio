---
title: "Consistent Hashing and the Rebalancing Nobody Notices"
date: "2026-09-08"
tags: ["distributed-systems", "trade-offs", "system-design"]
related: ["experiments/gossip-protocol-visualizer", "experiments/bloom-filters-and-the-capacity-you-cant-see-coming"]
summary: "Run the real hash-ring placement algorithm against naive modulo hashing on the same key set — see how little of the keyspace a ring actually moves when a node joins or leaves, and what happens without enough virtual nodes to spread the luck around."
---

Shard a cache or a partitioned datastore across N nodes and the obvious placement scheme is
`hash(key) % N` — simple, uniform, and fine right up until N changes. The moment a node joins or
leaves, **every key's owner depends on the current node count**, so almost the entire keyspace
gets reassigned at once. For a cache, that's every client missing simultaneously against a cold
node. For a partitioned datastore, it's every replica moving data at the same time, for a change
that only actually affected one node's worth of keys. **Consistent hashing** (Karger et al., 1997)
is the fix Dynamo, Cassandra, and most sharded-cache clients ship instead. The [interactive
lab](/labs/consistent-hashing) runs both schemes against the identical key set, so the comparison
is a measurement, not two numbers asserted next to each other.

<div class="mt-8 mb-12">
  <a href="/labs/consistent-hashing" class="lab-cta-inverse">
    Try the Interactive Consistent Hashing Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Ring

Instead of hashing a key against the *node count*, consistent hashing hashes both nodes and keys
onto the same fixed-size ring (a hash space, not a count), and assigns each key to the first node
found walking clockwise from its own position (`src/labs/consistentHashing.ts`):

```
ring = sorted positions of every node (and its virtual nodes) on a fixed hash space
key's owner = first ring entry at or after hash(key), wrapping around if none is found
```

A node joining or leaving only changes the ring in one place — the arc immediately after where
that node sat. Every key elsewhere on the ring keeps the owner it already had. Run the lab's
"add a node" / "remove a node" toggle against 5,000 keys and the same comparison appears every
time: naive modulo remaps the large majority of the keyspace, while the ring remaps a figure close
to `1/N` of it — both computed against the exact same key set in the same run, not sampled
separately.

> [!NOTE]
> "Roughly `1/N`" is deliberately not "exactly `1/N`" here. The lab shows the real figure, which
> lands in a band around the theoretical ideal rather than hitting it precisely — hashing has
> irreducible per-key noise at any finite sample size. The point isn't the exact percentage; it's
> that it stays in the same order of magnitude as `1/N` while naive modulo does not, for the
> identical change.

## Virtual Nodes: The Trade-off Nobody Skips For Free

A ring with exactly one position per physical node has an obvious problem: five real hash
positions, scattered by chance across the ring, are not going to divide the keyspace evenly. One
node might own 5% of the ring, another 45%, purely from where their single hashed position
happened to land. The fix used everywhere consistent hashing ships in practice is **virtual
nodes** — give each physical node many positions on the ring instead of one, so its total share
of the keyspace is the sum of many small, uncorrelated arcs rather than one large accidental one.

The lab's load-distribution panel makes this a real, measured curve instead of a claim: drag
virtual-nodes-per-node from 1 up, and the coefficient of variation across nodes' key counts drops
from a visibly lopsided ~0.8 down toward ~0.05 by the time each node has enough virtual positions.
There is no free lunch here — more virtual nodes means more ring entries to store and search
through — but the trade-off is legible and tunable, not a fixed cost paid once.

> [!NOTE]
> Building this lab's hash function surfaced a real bug worth naming, not just the intended
> finding. The first version used plain FNV-1a on strings like `node-3#41` — differing only in a
> trailing digit — and the load-imbalance figure came out **non-monotonic** as virtual-node count
> rose: worse at 60 virtual nodes per node than at 40, for instance. FNV-1a under-mixes short
> strings that differ only near the end; a MurmurHash3-style finalizer (three xor/multiply passes
> after the FNV-1a loop) fixed it, and the fix is asserted directly in the test suite as a
> monotonically decreasing staircase, not just spot-checked at the two extremes.

## Why This Matters More Than It Looks

The naive scheme isn't a strawman nobody actually uses — `hash(key) % N` is genuinely the first
thing most engineers reach for, because it *is* uniform for a fixed N. The failure mode only shows
up under change, which is exactly the condition production systems are in constantly: autoscaling
adds and removes nodes, a node crashes and gets replaced, capacity gets added ahead of a launch.
Every one of those events, under naive modulo, is a full-keyspace reshuffle disguised as a routine
operational event — the kind of thing that looks fine in a demo with a fixed cluster size and only
shows its cost once the cluster actually changes shape in production.

Consistent hashing doesn't remove the cost of rebalancing — a node joining still has to receive
the roughly `1/N` share of keys it now owns, and that data genuinely has to move. What it removes
is the *multiplier*: the difference between moving `1/N` of the keyspace and moving nearly all of
it, for the identical operational event. That's the whole trade the ring is buying, and the lab
runs both sides of it long enough to make the multiplier a number you watch happen, not one you
take on faith.
