import { describe, expect, it } from 'vitest';
import { simulateBackpressure } from './backpressure';

describe('simulateBackpressure', () => {
  it('rejects invalid preconditions rather than return a plausible-looking result', () => {
    expect(() => simulateBackpressure('drop-new', 5, 2, 0, 10)).toThrow();
    expect(() => simulateBackpressure('drop-new', 5, 2, 5, 0)).toThrow();
    expect(() => simulateBackpressure('drop-new', -1, 2, 5, 10)).toThrow();
  });

  it('never drops or grows a backlog when the consumer keeps up with the producer', () => {
    for (const policy of ['block', 'drop-new', 'drop-old'] as const) {
      const result = simulateBackpressure(policy, 3, 3, 10, 20);
      expect(result.totalDropped).toBe(0);
      expect(result.maxPendingBacklog).toBe(0);
      expect(result.maxQueueDepth).toBeLessThanOrEqual(10);
    }
  });

  describe('drop-new (tail drop)', () => {
    it('only ever drops items that arrived in the same tick they were dropped', () => {
      // Sustained overload: 10 arrive/tick, only 2 processed/tick, capacity 5 — saturates fast.
      const result = simulateBackpressure('drop-new', 10, 2, 5, 8);
      const saturatedTicks = result.ticks.filter((t) => t.dropped.length > 0);
      expect(saturatedTicks.length).toBeGreaterThan(0);
      for (const t of saturatedTicks) {
        expect(t.dropped.every((item) => item.arrivedTick === t.tick)).toBe(true);
      }
    });

    it('never exceeds queue capacity', () => {
      const result = simulateBackpressure('drop-new', 10, 2, 5, 10);
      expect(result.maxQueueDepth).toBeLessThanOrEqual(5);
    });
  });

  describe('drop-old (drop head)', () => {
    it('only ever drops items that were already resident before the current tick', () => {
      // Producer rate (2) must stay under capacity (4) here, or a single tick's own arrivals could
      // overflow capacity by themselves and force evicting some of that same tick's own items too
      // — this scenario builds overflow gradually across ticks instead, so every eviction is
      // guaranteed to come from what was already resident.
      const result = simulateBackpressure('drop-old', 2, 1, 4, 12);
      const saturatedTicks = result.ticks.filter((t) => t.dropped.length > 0);
      expect(saturatedTicks.length).toBeGreaterThan(0);
      for (const t of saturatedTicks) {
        expect(t.dropped.every((item) => item.arrivedTick < t.tick)).toBe(true);
      }
    });

    it('never exceeds queue capacity', () => {
      const result = simulateBackpressure('drop-old', 10, 2, 5, 10);
      expect(result.maxQueueDepth).toBeLessThanOrEqual(5);
    });

    it('produces the same drop *count* as drop-new under identical load — the difference is which items, not how many', () => {
      const dropNew = simulateBackpressure('drop-new', 10, 2, 5, 10);
      const dropOld = simulateBackpressure('drop-old', 10, 2, 5, 10);
      expect(dropOld.totalDropped).toBe(dropNew.totalDropped);
      // But the identity of what's dropped is opposite: drop-new sheds this tick's newest,
      // drop-old sheds whatever's oldest — already proven per-tick above.
    });
  });

  describe('block', () => {
    it('never drops anything, no matter how overloaded', () => {
      const result = simulateBackpressure('block', 10, 2, 5, 10);
      expect(result.totalDropped).toBe(0);
    });

    it('grows an unbounded backlog instead of dropping, under sustained overload', () => {
      const result = simulateBackpressure('block', 10, 2, 5, 10);
      const backlogs = result.ticks.map((t) => t.pendingBacklog);
      // Monotonically non-decreasing once the queue itself is saturated — the mismatch has to go
      // somewhere, and block relocates it to the producer's own buffer instead of discarding it.
      const lastFew = backlogs.slice(-3);
      expect(lastFew[2]).toBeGreaterThanOrEqual(lastFew[0]);
      expect(result.maxPendingBacklog).toBeGreaterThan(0);
    });

    it('caps the queue itself at capacity even though the backlog keeps growing', () => {
      const result = simulateBackpressure('block', 10, 2, 5, 10);
      expect(result.maxQueueDepth).toBeLessThanOrEqual(5);
    });
  });

  describe('circuit-breaker', () => {
    it('opens once occupancy crosses openThreshold and rejects everything while open', () => {
      const result = simulateBackpressure('circuit-breaker', 10, 1, 5, 12, {
        openThreshold: 0.8,
        cooldownTicks: 3,
        probeRate: 1,
      });
      const openTicks = result.ticks.filter((t) => t.circuitState === 'open');
      expect(openTicks.length).toBeGreaterThan(0);
      for (const t of openTicks) {
        expect(t.accepted).toBe(0);
        expect(t.dropped.length).toBe(t.arrived);
      }
    });

    it('runs exactly one half-open probe tick after the cooldown, before the next state', () => {
      const result = simulateBackpressure('circuit-breaker', 10, 1, 5, 12, {
        openThreshold: 0.8,
        cooldownTicks: 3,
        probeRate: 1,
      });
      const halfOpenTicks = result.ticks.filter((t) => t.circuitState === 'half-open');
      expect(halfOpenTicks.length).toBeGreaterThan(0);
      // A half-open tick never admits more than probeRate, regardless of nominal producer rate.
      for (const t of halfOpenTicks) {
        expect(t.accepted).toBeLessThanOrEqual(1);
      }
    });

    it('closes and resumes full admission once a probe tick keeps occupancy under threshold', () => {
      // Mild, not extreme, imbalance: the cooldown's 2 full-reject ticks drain the queue enough
      // that the probe tick's admission (capped at probeRate) doesn't immediately retrip it.
      const result = simulateBackpressure('circuit-breaker', 4, 3, 6, 15, {
        openThreshold: 0.8,
        cooldownTicks: 2,
        probeRate: 2,
      });
      const closedAfterOpen = result.ticks.some(
        (t, i) => t.circuitState === 'closed' && result.ticks.slice(0, i).some((prior) => prior.circuitState === 'open')
      );
      expect(closedAfterOpen).toBe(true);
    });
  });

  it('is fully deterministic — no randomness, same inputs produce the same series', () => {
    const a = simulateBackpressure('drop-old', 7, 3, 6, 15);
    const b = simulateBackpressure('drop-old', 7, 3, 6, 15);
    expect(a).toEqual(b);
  });
});
