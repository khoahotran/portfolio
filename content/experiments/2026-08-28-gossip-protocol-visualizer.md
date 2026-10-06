---
title: "Gossip Protocol Visualizer: How Cluster Membership Actually Spreads"
date: "2026-08-28"
tags: ["distributed-systems", "benchmark"]
related: ["experiments/consistent-hashing-and-the-rebalancing-nobody-notices", "experiments/vector-clocks-and-the-clock-skew-that-fools-last-write-wins"]
summary: "A real push-based epidemic broadcast, run and scrubbed round by round, showing why gossip converges in O(log n) rounds instead of O(n)."
---

Cluster membership — "which nodes are alive right now, and what do they know about each other" —
doesn't scale as a central registry every node polls. Cassandra, Consul, and Serf's SWIM protocol
all solve it the same underlying way: **gossip**. One node learns something, and spreads it to a
few random peers each round, who spread it to a few more. The [interactive lab](/labs/gossip-protocol-visualizer)
runs this for real — the exact push-based epidemic broadcast, not a hand-drawn diagram of the idea.

<div class="mt-8 mb-12">
  <a href="/labs/gossip-protocol-visualizer" class="lab-cta-inverse">
    Try the Interactive Gossip Protocol Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Algorithm

Push-based gossip, exactly as implemented (`src/labs/gossipProtocol.ts`):

```
infected = { node 0 }
for each round, until every node is infected:
  for each currently infected node:
    pick `fanout` random distinct peers
    push the message to them — they become infected
```

That's the whole protocol. No coordinator, no central list of who's been told — every node's
decision is local (pick some random peers, tell them), and global convergence is an emergent
property of enough of those local decisions happening in parallel.

## Why O(log n), Not O(n)

The reason this scales is the same reason an actual epidemic spreads faster than one infection at a
time: **the number of nodes that can spread the message doubles roughly every round**, not
increments by one. Round 1: 1 node tells `fanout` others. Round 2: however many got told in round 1
*each* tell `fanout` more. The infected population grows multiplicatively, not additively, which is
exactly the shape that produces logarithmic — not linear — convergence time.

The lab's test suite asserts this as a concrete number, not just a shape: 50 nodes at fanout 3
converge in well under 15 rounds (`rounds.length).toBeLessThan(15)` in
[`gossipProtocol.test.ts`](https://github.com/khoahotran/portfolio/blob/main/src/labs/gossipProtocol.test.ts)) —
worth checking against your own intuition for how long "50 nodes, 3 random calls each round" should
take to reach everyone.

## What Fanout Actually Controls

Turn fanout to 0 in the lab and the message never leaves node 0 — an infected node that never
pushes obviously can't spread anything, which sounds trivial stated directly but is easy to miss
when tuning a real system's gossip interval and fanout together, since it's the *product* of
"how often" and "to how many" that determines effective spread rate, not either alone.

Turn fanout up toward `nodeCount - 1` and convergence collapses to a single round — every infected
node contacts literally everyone else at once. Real systems don't run at that extreme because the
cost isn't free: `fanout` messages per infected node per round is real network traffic, and a
gossip protocol's actual design problem is finding the smallest fanout that still converges
acceptably fast, not making it as large as possible.

## What This Deliberately Doesn't Model

This lab simulates message *spread*, not membership *health* — there's no failure detection, no
node ever goes down mid-simulation, and there's no anti-entropy repair for a node that missed a
round. Real systems (SWIM in particular) layer failure detection on top of the same gossip
substrate — a node that doesn't respond to a few gossip rounds gets marked suspect, then dead, and
*that* verdict gets gossiped using the identical mechanism this lab shows. The spread mechanic here
is the real, shared foundation; the failure-detection state machine on top of it is a distinct
piece of complexity this lab doesn't claim to cover.
