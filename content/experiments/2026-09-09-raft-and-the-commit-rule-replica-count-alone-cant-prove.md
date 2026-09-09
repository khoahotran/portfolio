---
title: "Raft and the Commit Rule Replica Count Alone Can't Prove"
date: "2026-09-09"
tags: ["distributed-systems", "trade-offs", "benchmark"]
related: ["experiments/leader-election-bully-algorithm", "experiments/distributed-locks-redlock-and-the-pause-that-breaks-it"]
summary: "Run Raft's real election restriction and commit-index safety rule — see why a stale node can't win an election no matter how many peers are alive, and why a majority of replicas alone still can't prove a log entry is safely committed."
---

The [Bully algorithm lab](/labs/leader-election) elects a leader by one rule only: highest surviving
id wins. It says nothing about which node actually holds the most data — a node that's badly
behind can still become leader, purely by having the right number. That article's own comparison
table names the actual fix production systems reach for: **Raft** (Ongaro & Ousterhout, 2014). This
lab delivers on that setup — two real Raft mechanisms, run for real, each demonstrating a property
Bully simply doesn't have.

<div class="mt-8 mb-12">
  <a href="/labs/raft" class="lab-cta-inverse">
    Try the Interactive Raft Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## The Election Restriction

A Raft candidate doesn't just ask for votes — every peer checks the candidate's log against its
own before granting one (`src/labs/raft.ts`):

```
grant vote iff: candidate's last-log term > voter's last-log term
             OR (equal last-log term AND candidate's log is at least as long)
```

Stage 1 of the lab makes this a real, adjustable comparison: drag the candidate's log length down
and every peer holding more data simply refuses, no matter how many of them are alive. This is the
direct fix for exactly what Bully can't rule out — a node missing committed entries winning an
election purely on id. Raft's restriction isn't a courtesy check; it's what makes the *"a raft
leader always has every committed entry"* guarantee true by construction, not by convention.

## The Subtler Rule: Commit-Index Safety

Getting elected isn't the interesting part. The Raft paper's own Figure 8 exists specifically to
justify a rule most explanations skip past: **a leader must not conclude a log entry is committed
just because a majority of nodes have replicated it.** It must also have replicated at least one
entry from its own *current* term to that same majority first.

Stage 2 runs the exact shape of that scenario. The leader's log has two entries: an old-term entry
at index 1, a current-term entry at index 2. Set every follower's replication progress to "only
index 1" — a majority of the cluster (4 of 5, leader included) now holds that entry. **Nothing
commits.** `advanceCommitIndex` flags this directly (`wouldBeUnsafeWithoutTermCheck: true`): a
naive resolver counting replicas alone would have called index 1 committed, and it would have been
wrong to. The entry's term doesn't match the leader's current term, so Raft withholds it. Move any
two followers up to "index 2," and the current-term entry itself reaches a majority — at which
point **both** indexes commit together, safely.

> [!NOTE]
> Why does an old-term entry on a majority need this extra check at all? Because "majority" is a
> snapshot, not a guarantee about the future. A leader can crash after replicating an entry to a
> majority but before it (or any later leader) confirms that majority is *stable* under its own
> current term — a different node, elected in a later term with a different history, could still
> overwrite that entry, precisely because nothing about "on a majority" alone proves it survived
> into the term that's actually running the cluster now. Requiring a current-term entry to also
> reach that majority is what closes the gap: it proves the current leader's own history — not
> just some past leader's — has taken hold.

## Two Real Mechanisms, One Comparison Table Delivered On

Neither of these properties is unique to the lab's specific scenario — they're the actual reason
Raft, not Bully, is what gets deployed. The election restriction is testable directly (a stale
candidate loses every time, regardless of alive-peer count); the commit rule is testable directly
(`wouldBeUnsafeWithoutTermCheck` is `true` exactly when a naive count-only resolver would have been
wrong, and only then). Both together are what let a Raft cluster promise that anything a client was
ever told is committed stays committed, through however many leader changes follow — a guarantee
Bully, by design, never made in the first place.
