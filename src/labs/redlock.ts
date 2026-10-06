/**
 * Redlock (Antirez, 2014) — a distributed-lock algorithm meant to work with N independent Redis
 * masters instead of one, so a single node's crash can't strand a lock. A client tries to acquire
 * the same key on all N instances, one at a time, using a short per-node timeout so a down node
 * can't stall the whole attempt. It considers the lock acquired only if it won on a *majority*
 * (quorum) of instances, and only if the time it took to do so leaves enough of the lock's TTL
 * remaining to be worth anything — trying every node, even after quorum, still costs real time.
 *
 * This models both halves of the actual argument, not just the acquisition step:
 *
 * 1. `attemptRedlockAcquisition` — the algorithm as specified. Real quorum arithmetic, real
 *    elapsed-time accounting against a real TTL budget.
 * 2. `simulatePauseAfterAcquire` — the specific flaw Martin Kleppmann's 2016 critique centers on
 *    ("How to do distributed locking"): the lock's expiry is a clock on the *storage* nodes,
 *    completely decoupled from what the client that "holds" it is actually doing. A GC pause, a
 *    slow disk write, a descheduled VM — any stall between acquiring the lock and finishing the
 *    guarded work — can run past the TTL. The lock then expires on the storage side while the
 *    client still believes it holds it, and a second client can win a fresh quorum in the gap.
 *    Antirez's rebuttal is that Redlock was never meant to guarantee this without an additional
 *    fencing token checked by the resource being protected — Redlock alone only bounds *how
 *    quickly* that can happen, it doesn't prevent it. Both halves are testable outputs here, not
 *    prose asserting one side of the debate.
 */

export interface NodeAcquireAttempt {
  nodeId: number;
  alive: boolean;
  /** Time this attempt cost: the node's latency if alive, `acquireTimeoutMs` if down. */
  costMs: number;
  acquired: boolean;
}

export interface RedlockAcquisition {
  attempts: NodeAcquireAttempt[];
  /** Majority of nodeCount — floor(n/2) + 1. */
  quorum: number;
  acquiredCount: number;
  /** Sum of every attempt's cost — Redlock tries every node in sequence, even after quorum, since a
   * later unlock needs to reach every node it might have locked. */
  elapsedMs: number;
  /** ttlMs - elapsedMs, clamped to 0. What's left of the lock's validity once acquisition itself is paid for. */
  remainingValidityMs: number;
  /** Reached quorum AND remainingValidityMs > 0 — the two independent conditions Redlock actually requires. */
  acquired: boolean;
}

/**
 * `nodeLatenciesMs[i]` is the round-trip cost (ms) of talking to node `i + 1` were it alive;
 * ignored for nodes in `downNodeIds`, which instead cost `acquireTimeoutMs` (the point of the
 * short per-node timeout: a down node can't stall the attempt past a bounded cost).
 */
export function attemptRedlockAcquisition(
  nodeCount: number,
  downNodeIds: ReadonlySet<number>,
  nodeLatenciesMs: number[],
  ttlMs: number,
  acquireTimeoutMs: number
): RedlockAcquisition {
  if (nodeCount < 1) {
    throw new Error('attemptRedlockAcquisition requires at least one node');
  }

  const quorum = Math.floor(nodeCount / 2) + 1;
  const attempts: NodeAcquireAttempt[] = [];
  let elapsedMs = 0;
  let acquiredCount = 0;

  for (let i = 0; i < nodeCount; i++) {
    const nodeId = i + 1;
    const alive = !downNodeIds.has(nodeId);
    const costMs = alive ? nodeLatenciesMs[i] : acquireTimeoutMs;
    elapsedMs += costMs;
    if (alive) acquiredCount++;
    attempts.push({ nodeId, alive, costMs, acquired: alive });
  }

  const remainingValidityMs = Math.max(0, ttlMs - elapsedMs);
  const acquired = acquiredCount >= quorum && remainingValidityMs > 0;

  return { attempts, quorum, acquiredCount, elapsedMs, remainingValidityMs, acquired };
}

export interface PauseVulnerability {
  remainingValidityMsAtPauseStart: number;
  pauseMs: number;
  /** True once `pauseMs` runs past what was left of the TTL when the pause started. */
  lockExpiredDuringPause: boolean;
  /**
   * Whether a second client racing for the same key could win a fresh quorum before the first
   * client resumes. Identical to `lockExpiredDuringPause` here — the storage nodes have no idea
   * a pause is happening, so the instant the TTL lapses, the key is simply free again. This
   * equality *is* the finding: nothing about "client A is still running" holds the lock open.
   */
  secondClientCanAcquire: boolean;
}

/**
 * `remainingValidityMs` must come from an already-`acquired` `RedlockAcquisition` (there is nothing
 * to pause after a failed acquisition) — callers that violate this get a thrown error, not a
 * plausible-looking result for a state that can't occur, same precondition-rejection convention as
 * `simulateBullyElection`'s dead-initiator guard.
 */
export function simulatePauseAfterAcquire(remainingValidityMs: number, pauseMs: number): PauseVulnerability {
  if (remainingValidityMs <= 0) {
    throw new Error('simulatePauseAfterAcquire requires a successful acquisition with validity remaining');
  }
  const lockExpiredDuringPause = pauseMs >= remainingValidityMs;
  return {
    remainingValidityMsAtPauseStart: remainingValidityMs,
    pauseMs,
    lockExpiredDuringPause,
    secondClientCanAcquire: lockExpiredDuringPause,
  };
}
