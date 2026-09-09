---
title: "Leader Election: Running the Actual Bully Algorithm, Not a Diagram of It"
date: "2026-09-07"
tags: ["distributed-systems", "benchmark"]
related: ["experiments/gossip-protocol-visualizer", "experiments/distributed-locks-redlock-and-the-pause-that-breaks-it", "experiments/raft-and-the-commit-rule-replica-count-alone-cant-prove"]
summary: "Crash the leader and watch the real Bully algorithm elect a new one, message by message — including the O(n^2) worst case the protocol is criticized for."
---

Almost every distributed system that needs exactly one node to do something (issue transaction
IDs, own a partition, act as the write path for a replica set) needs a way to pick that one node,
and to re-pick it when it disappears. **Leader election** is the general problem, and the **Bully
algorithm** (Garcia-Molina, 1982) is one of its oldest, simplest solutions — simple enough that it's
usually taught as a diagram of arrows on a whiteboard. The [interactive lab](/labs/leader-election)
runs the real thing instead: crash any node, and every ELECTION, ALIVE, and COORDINATOR message you
see is one the simulation actually sent, in the order the protocol actually sends them.

<div class="mt-8 mb-12">
  <a href="/labs/leader-election" class="lab-cta-inverse">
    Try the Interactive Leader Election Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Algorithm

Every node has a unique, comparable id, and every node knows the full membership list — who
*exists*, not who's currently alive. The rule (`src/labs/leaderElection.ts`):

```
a node that notices the leader is unreachable sends ELECTION to every higher id
  if no higher id replies ALIVE:
    it declares itself leader and sends COORDINATOR to every alive lower id
  if a higher id replies ALIVE:
    that higher node starts its own election against ids above it
    (recursively, until someone gets no reply)
```

The name comes from the outcome, not the mechanism: whoever is the biggest ("bulliest") id still
standing always wins, unconditionally — there's no voting, no term numbers, no quorum. That's also
exactly what makes it fully deterministic and simulatable: given a fixed alive/down set, the winner
is always `max(aliveIds)`, so the lab can compute the entire message trace up front and let you
scrub through it, the same way the [gossip protocol lab](/experiments/gossip-protocol-visualizer)
lets you scrub through rounds of spread.

## Why This Costs O(n²) Messages in the Worst Case

Crash node 1's leader in the lab when every other node is alive, and watch what node 1 (the lowest
surviving id, and therefore the one that "notices" first in this lab) actually triggers: it sends
ELECTION to *every* higher node at once, not just the next one up. Every one of those replies
ALIVE — and, per the algorithm, **each of them also starts its own election** against the ids above
it, whether or not that election can possibly change the outcome. Node 2 challenges 3 through *n*.
Node 3 challenges 4 through *n*. This keeps happening all the way up, and only the single highest
node ever gets silence instead of a reply.

That redundant work is real, not a simulation artifact — it's the concrete thing behind Bully's
textbook criticism of being message-expensive: `leaderElection.test.ts` asserts total message
volume more than doubles when node count doubles under this worst case, the signature of quadratic,
not linear, cost. The lab's "Total messages" counter is reading that number directly off the same
simulation the visualization animates, not a separate illustrative estimate.

> [!NOTE]
> The lab always has the *lowest* surviving id start the election, deliberately — that's the worst
> case for message volume (every other alive node ends up running a redundant sub-election), and
> showing the worst case is more informative than showing a lucky one. A real system doesn't get to
> choose who notices first; whichever node's health check fires first is the one that starts.

## What Bully Deliberately Doesn't Solve

This lab, like the algorithm itself, assumes perfect failure detection — a node is either cleanly
"alive" or "down," discovered instantly and unambiguously. Real networks don't offer that: a
message can be slow rather than lost, which is exactly the scenario that produces a **split
brain** — two nodes each concluding *they* are the highest alive id, because each one's messages to
the other are delayed rather than dropped. Bully has no mechanism to detect or resolve that; it
simply assumes the failure model it needs is true.

This is the practical reason production systems reach for **Raft** or **ZAB** (ZooKeeper's atomic
broadcast) instead of textbook Bully for anything that actually matters:

| | Bully | Raft |
|---|---|---|
| **Decision rule** | Highest id always wins, unconditionally | Majority vote; any node with enough votes wins |
| **Split-brain handling** | None — assumes perfect failure detection | Quorum requirement makes two simultaneous leaders provably impossible |
| **Worst-case messages** | O(n²) (this lab's own measured worst case) | O(n) per election |
| **What it needs from the network** | Accurate alive/down status | Nothing stronger than eventual message delivery |

Bully's appeal is that it's trivial to reason about and implement — which is exactly why it's still
the right choice for a small, low-stakes cluster where perfect failure detection is a reasonable
assumption (a fixed set of worker processes on one host, say), and exactly why it's the wrong choice
for anything a real outage could split-brain.
