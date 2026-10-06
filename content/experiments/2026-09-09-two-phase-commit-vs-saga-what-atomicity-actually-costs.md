---
title: "Two-Phase Commit vs. Saga: What Atomicity Actually Costs"
date: "2026-09-09"
tags: ["distributed-systems", "trade-offs", "saga-pattern", "benchmark"]
related: ["experiments/leader-election-bully-algorithm", "system-design/implementing-the-saga-pattern-for-distributed-transfers", "experiments/saga-state-machine-visualizer"]
summary: "Run the real 2PC blocking failure and the real Saga compensation-failure gap on the same kind of transaction — see exactly what atomicity costs, and exactly what giving it up costs instead."
---

The [Core Banking Saga write-up](/system-design/implementing-the-saga-pattern-for-distributed-transfers)
already covers, in real Go, why cross-aggregate money transfers give up atomicity for liveness. What
it doesn't cover is the protocol Sagas exist specifically to avoid: **Two-Phase Commit**, the
textbook way to get atomicity across participants that a single database transaction can't reach.
Nobody on this site had actually run 2PC's failure mode before — every prior mention of it was a
name in a comparison table. This lab runs it for real, on the same kind of scenario the Saga lab
already uses, so the trade-off is a measured contrast rather than two separate write-ups that never
meet.

<div class="mt-8 mb-12">
  <a href="/labs/two-phase-commit-vs-saga" class="lab-cta-inverse">
    Try the Interactive 2PC vs. Saga Lab
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  </a>
</div>

## What 2PC Actually Guarantees, and What It Costs to Guarantee It

Two-Phase Commit has one coordinator and any number of participants. Phase one: the coordinator
asks everyone to *prepare* — lock whatever resources the transaction touches, then vote yes or no.
Phase two: if everyone voted yes, the coordinator broadcasts `COMMIT`; if anyone voted no, it
broadcasts `ABORT`. Every participant that voted yes obeys whichever it's told.

That's the whole protocol, and it's genuinely atomic — every yes-voter really does end up either
all committed or all aborted, never a mix. The cost is where Stage 1 of the lab points directly:
**a participant that votes yes enters the *prepared* state and cannot leave it on its own.** It has
locked its resources and is waiting for the coordinator's decision message. If the coordinator
crashes after collecting all-yes votes but before broadcasting the decision, every one of those
participants is stuck — not for a little while, but indefinitely, because 2PC gives a prepared
participant no rule for deciding alone. Toggle the "coordinator crashes" switch in the lab with four
yes-votes and watch all four participants land on "blocked, holding locks," regardless of how many
there are — there's no majority to fall back on here the way [Raft's commit rule](/experiments/raft-and-the-commit-rule-replica-count-alone-cant-prove)
falls back on a quorum. 2PC has exactly one coordinator, and its decision is the only thing that can
unblock anyone. This is the same single-point-of-failure shape as [Bully's leader](/experiments/leader-election-bully-algorithm) —
one node's outage stalls everyone downstream of it — except Bully's failure mode is *no leader at
all* until a new election finishes, while 2PC's failure mode is *every prepared participant frozen*
until the old coordinator, specifically, comes back or a human intervenes.

A participant that voted no, by contrast, is never at risk here — it aborts locally the instant it
casts that vote, because it never entered the prepared state waiting on anyone. The lab shows this
directly: mix in a no-vote alongside three yes-votes and crash the coordinator, and only the
yes-voters end up blocked.

## What Saga Actually Guarantees, and What It Costs to Guarantee It

The Saga side runs the mirror image: a sequence of local transactions, each one really committed
the moment it succeeds — no prepared state, no lock held pending anyone's decision. If a step
fails, the saga walks backward through every step that already committed and runs its
**compensating transaction**, undoing the effect. Nothing here ever blocks; that's the entire
appeal.

The Core Banking write-up already names the cost in its failure table: a compensation that itself
fails leaves a `COMPENSATION_FAILED` state requiring manual intervention. Stage 2 of this lab makes
that failure a first-class, adjustable case instead of a table row: pick a step to fail, then
separately pick whether *unwinding* an earlier step also fails. When it does, the lab shows exactly
what a saga has instead of 2PC's held locks — nothing. The step's committed side effect is just
still out there, uncompensated, and the unwind stops at that point rather than compensating earlier
steps out of their real dependency order. There is no equivalent of `blockedParticipants` in
`simulateSaga`'s result type at all, and that absence is the point: a saga can't get stuck waiting,
but it can get stuck *wrong* — a real, standing side effect with no built-in path back to
consistency, something 2PC's design specifically rules out by holding the locks until a decision
is certain.

## The Actual Trade-off, Not a Verdict

| | 2PC | Saga |
|---|---|---|
| **Failure mode this lab runs** | Coordinator crash after all-yes votes, before broadcast | A compensation that itself fails partway through unwind |
| **What gets stuck** | Every prepared participant, holding locks, indefinitely | One committed side effect, permanently, with no fallback |
| **Ever blocks?** | Yes — that's the mechanism, not a bug | Never — that's the mechanism, not a feature that erases the cost |
| **What restores consistency** | The original coordinator recovering (or manual unblock) | Nothing automatic — the same manual intervention 2PC needs, just for a different reason |

Neither protocol actually escapes needing a human on the worst day; they just fail differently while
waiting for one. 2PC trades liveness for a guarantee that nothing is ever half-done — the price is
every prepared participant frozen the moment the one coordinator that could unblock them disappears.
Saga trades that guarantee for liveness — nothing ever blocks, but the system's only real safety net
is compensations succeeding, and this lab asserts directly (not just states) what happens the one
time that assumption doesn't hold.
