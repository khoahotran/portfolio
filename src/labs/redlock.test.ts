import { describe, expect, it } from 'vitest';
import { attemptRedlockAcquisition, simulatePauseAfterAcquire } from './redlock';

describe('attemptRedlockAcquisition', () => {
  it('rejects nodeCount < 1 rather than return a plausible-looking result', () => {
    expect(() => attemptRedlockAcquisition(0, new Set(), [], 1000, 50)).toThrow();
  });

  it('computes majority quorum as floor(n/2) + 1, not a strict half', () => {
    expect(attemptRedlockAcquisition(5, new Set(), [1, 1, 1, 1, 1], 1000, 50).quorum).toBe(3);
    expect(attemptRedlockAcquisition(4, new Set(), [1, 1, 1, 1], 1000, 50).quorum).toBe(3);
    expect(attemptRedlockAcquisition(1, new Set(), [1], 1000, 50).quorum).toBe(1);
  });

  it('acquires when every node is alive and well within the TTL budget', () => {
    const result = attemptRedlockAcquisition(5, new Set(), [5, 5, 5, 5, 5], 1000, 50);
    expect(result.acquiredCount).toBe(5);
    expect(result.acquired).toBe(true);
    expect(result.elapsedMs).toBe(25);
    expect(result.remainingValidityMs).toBe(975);
  });

  it('still acquires with a minority of nodes down, at the down nodes\' timeout cost', () => {
    // 5 nodes, 2 down: quorum is 3, so 3 alive nodes is still a majority.
    const result = attemptRedlockAcquisition(5, new Set([1, 2]), [10, 10, 10, 10, 10], 1000, 50);
    expect(result.acquiredCount).toBe(3);
    expect(result.acquired).toBe(true);
    // Down nodes cost the full acquireTimeoutMs each, alive ones their own latency.
    expect(result.elapsedMs).toBe(50 + 50 + 10 + 10 + 10);
  });

  it('fails on quorum alone when a majority of nodes are down', () => {
    const result = attemptRedlockAcquisition(5, new Set([1, 2, 3]), [10, 10], 1000, 50);
    expect(result.acquiredCount).toBe(2);
    expect(result.acquired).toBe(false);
  });

  it('fails on the TTL budget even when every node responds, if they were too slow', () => {
    // 5 nodes all alive (quorum trivially met) but slow enough that acquiring ate the whole TTL.
    const result = attemptRedlockAcquisition(5, new Set(), [300, 300, 300, 300, 300], 1000, 50);
    expect(result.acquiredCount).toBe(5);
    expect(result.remainingValidityMs).toBe(0);
    expect(result.acquired).toBe(false);
  });

  it('clamps remainingValidityMs at 0 rather than going negative', () => {
    const result = attemptRedlockAcquisition(3, new Set(), [1000, 1000, 1000], 500, 50);
    expect(result.remainingValidityMs).toBe(0);
  });

  it('every down node attempt costs exactly acquireTimeoutMs, regardless of its would-be latency', () => {
    const result = attemptRedlockAcquisition(3, new Set([2]), [10, 999, 10], 1000, 75);
    const downAttempt = result.attempts.find((a) => a.nodeId === 2)!;
    expect(downAttempt.alive).toBe(false);
    expect(downAttempt.costMs).toBe(75);
    expect(downAttempt.acquired).toBe(false);
  });

  it('is fully deterministic — same inputs, same result', () => {
    const a = attemptRedlockAcquisition(5, new Set([3]), [5, 5, 5, 5, 5], 1000, 50);
    const b = attemptRedlockAcquisition(5, new Set([3]), [5, 5, 5, 5, 5], 1000, 50);
    expect(a).toEqual(b);
  });
});

describe('simulatePauseAfterAcquire', () => {
  it('rejects a pause simulated on top of a non-acquisition', () => {
    expect(() => simulatePauseAfterAcquire(0, 100)).toThrow();
    expect(() => simulatePauseAfterAcquire(-5, 100)).toThrow();
  });

  it('reports no vulnerability when the pause is shorter than the remaining validity', () => {
    const result = simulatePauseAfterAcquire(500, 200);
    expect(result.lockExpiredDuringPause).toBe(false);
    expect(result.secondClientCanAcquire).toBe(false);
  });

  it('reports the vulnerability once the pause reaches the remaining validity — the boundary is inclusive', () => {
    // A pause exactly equal to the remaining validity is treated as expiring the lock, not
    // surviving it — TTL expiry is a "this instant or later" condition on the real storage node,
    // not a strict "later than" one.
    const atBoundary = simulatePauseAfterAcquire(500, 500);
    expect(atBoundary.lockExpiredDuringPause).toBe(true);

    const pastBoundary = simulatePauseAfterAcquire(500, 501);
    expect(pastBoundary.lockExpiredDuringPause).toBe(true);
  });

  it('ties secondClientCanAcquire to lockExpiredDuringPause exactly — that equality is the finding', () => {
    // Nothing about client A "still running" keeps the key held; the storage nodes only know the
    // TTL. This is Kleppmann's core point rendered as a testable equality rather than prose.
    const short = simulatePauseAfterAcquire(300, 100);
    expect(short.secondClientCanAcquire).toBe(short.lockExpiredDuringPause);
    const long = simulatePauseAfterAcquire(300, 400);
    expect(long.secondClientCanAcquire).toBe(long.lockExpiredDuringPause);
  });
});
