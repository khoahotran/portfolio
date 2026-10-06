import { describe, expect, it } from 'vitest';
import { simulateIdempotencyStore } from './idempotencyStore';
import type { IdempotencyRequestInput } from './idempotencyStore';

describe('simulateIdempotencyStore — validation', () => {
  it('rejects processingTicks < 1', () => {
    expect(() => simulateIdempotencyStore('atomic-claim', [], 0, 10)).toThrow();
  });

  it('rejects ttlTicks < 1', () => {
    expect(() => simulateIdempotencyStore('atomic-claim', [], 5, 0)).toThrow();
  });
});

describe('simulateIdempotencyStore — a single request, either mode', () => {
  for (const mode of ['check-then-set', 'atomic-claim'] as const) {
    it(`processes a lone request under ${mode}`, () => {
      const sim = simulateIdempotencyStore(mode, [{ key: 'order-1', arrivalTick: 0 }], 5, 100);
      expect(sim.results).toHaveLength(1);
      expect(sim.results[0].outcome).toBe('processed');
      expect(sim.results[0].resolvedTick).toBe(5);
      expect(sim.totalExecutions).toBe(1);
    });
  }
});

describe('simulateIdempotencyStore — sequential requests (no overlap)', () => {
  it('a request after completion, within TTL, is a cache-hit sharing the same resultId', () => {
    const requests: IdempotencyRequestInput[] = [
      { key: 'order-1', arrivalTick: 0 }, // completes at tick 5
      { key: 'order-1', arrivalTick: 10 }, // well within TTL 100
    ];
    const sim = simulateIdempotencyStore('atomic-claim', requests, 5, 100);
    expect(sim.results[0].outcome).toBe('processed');
    expect(sim.results[1].outcome).toBe('cache-hit');
    expect(sim.results[1].resultId).toBe(sim.results[0].resultId);
    expect(sim.results[1].resolvedTick).toBe(10); // instant — no processing wait
    expect(sim.totalExecutions).toBe(1);
    expect(sim.totalCacheHits).toBe(1);
  });

  it('a request after TTL expiry starts a genuinely fresh execution, not a stale cache-hit', () => {
    const requests: IdempotencyRequestInput[] = [
      { key: 'order-1', arrivalTick: 0 }, // completes at tick 5, ttl expires at tick 15
      { key: 'order-1', arrivalTick: 20 }, // after ttlExpiresTick (15)
    ];
    const sim = simulateIdempotencyStore('atomic-claim', requests, 5, 10);
    expect(sim.results[1].outcome).toBe('processed');
    expect(sim.results[1].resultId).not.toBe(sim.results[0].resultId);
    expect(sim.totalExecutions).toBe(2);
  });
});

describe('simulateIdempotencyStore — the actual finding: a concurrent duplicate', () => {
  // Both arrive at tick 0 for the same key; processing takes 10 ticks, so the second arrives
  // while the first is still in flight — a genuine concurrent duplicate, not a replay.
  const concurrentPair: IdempotencyRequestInput[] = [
    { key: 'charge-1', arrivalTick: 0 },
    { key: 'charge-1', arrivalTick: 0 },
  ];

  it('check-then-set double-processes it — the race is real, not hypothetical', () => {
    const sim = simulateIdempotencyStore('check-then-set', concurrentPair, 10, 1000);
    expect(sim.results[0].outcome).toBe('processed');
    expect(sim.results[1].outcome).toBe('duplicate-processed');
    // Each did its own real work — different resultIds, not sharing one.
    expect(sim.results[1].resultId).not.toBe(sim.results[0].resultId);
    expect(sim.totalExecutions).toBe(2);
    expect(sim.totalDuplicateProcessed).toBe(1);
  });

  it('atomic-claim coalesces it onto the in-flight run instead — the fix', () => {
    const sim = simulateIdempotencyStore('atomic-claim', concurrentPair, 10, 1000);
    expect(sim.results[0].outcome).toBe('processed');
    expect(sim.results[1].outcome).toBe('coalesced');
    // Both share the same resultId — proof they got the same result, not double work.
    expect(sim.results[1].resultId).toBe(sim.results[0].resultId);
    expect(sim.results[1].resolvedTick).toBe(sim.results[0].resolvedTick);
    expect(sim.totalExecutions).toBe(1);
    expect(sim.totalDuplicateProcessed).toBe(0);
  });

  it('a duplicate arriving mid-flight (not just at the same tick) still races under check-then-set', () => {
    // First arrives at 0 (completes at 10); second arrives at 4 — after the first started, well
    // before it finishes. check-then-set's completed-cache check still finds nothing.
    const requests: IdempotencyRequestInput[] = [
      { key: 'charge-1', arrivalTick: 0 },
      { key: 'charge-1', arrivalTick: 4 },
    ];
    const sim = simulateIdempotencyStore('check-then-set', requests, 10, 1000);
    expect(sim.results[1].outcome).toBe('duplicate-processed');
    expect(sim.totalDuplicateProcessed).toBe(1);
  });

  it('atomic-claim never double-processes no matter how many duplicates pile up mid-flight', () => {
    const requests: IdempotencyRequestInput[] = [
      { key: 'charge-1', arrivalTick: 0 },
      { key: 'charge-1', arrivalTick: 1 },
      { key: 'charge-1', arrivalTick: 2 },
      { key: 'charge-1', arrivalTick: 3 },
      { key: 'charge-1', arrivalTick: 4 },
    ];
    const sim = simulateIdempotencyStore('atomic-claim', requests, 10, 1000);
    expect(sim.totalExecutions).toBe(1);
    expect(sim.totalCoalesced).toBe(4);
    expect(sim.totalDuplicateProcessed).toBe(0);
    // Every request resolves to the same result.
    const resultIds = new Set(sim.results.map((r) => r.resultId));
    expect(resultIds.size).toBe(1);
  });

  it('the same pile-up under check-then-set produces five independent executions', () => {
    const requests: IdempotencyRequestInput[] = [
      { key: 'charge-1', arrivalTick: 0 },
      { key: 'charge-1', arrivalTick: 1 },
      { key: 'charge-1', arrivalTick: 2 },
      { key: 'charge-1', arrivalTick: 3 },
      { key: 'charge-1', arrivalTick: 4 },
    ];
    const sim = simulateIdempotencyStore('check-then-set', requests, 10, 1000);
    expect(sim.totalExecutions).toBe(5);
    expect(sim.totalDuplicateProcessed).toBe(4);
    const resultIds = new Set(sim.results.map((r) => r.resultId));
    expect(resultIds.size).toBe(5);
  });
});

describe('simulateIdempotencyStore — independent keys never interact', () => {
  it('two different keys arriving concurrently each get their own execution under both modes', () => {
    const requests: IdempotencyRequestInput[] = [
      { key: 'order-1', arrivalTick: 0 },
      { key: 'order-2', arrivalTick: 0 },
    ];
    for (const mode of ['check-then-set', 'atomic-claim'] as const) {
      const sim = simulateIdempotencyStore(mode, requests, 10, 100);
      expect(sim.totalExecutions).toBe(2);
      expect(sim.totalDuplicateProcessed).toBe(0);
      expect(sim.totalCoalesced).toBe(0);
    }
  });
});

describe('simulateIdempotencyStore — result ordering', () => {
  it('returns results in the same order as the input requests, not grouped by key', () => {
    const requests: IdempotencyRequestInput[] = [
      { key: 'a', arrivalTick: 0 },
      { key: 'b', arrivalTick: 0 },
      { key: 'a', arrivalTick: 1 },
    ];
    const sim = simulateIdempotencyStore('atomic-claim', requests, 10, 100);
    expect(sim.results.map((r) => r.key)).toEqual(['a', 'b', 'a']);
  });

  it('is insensitive to the input array\'s own ordering — arrival tick order is what matters', () => {
    const inOrder: IdempotencyRequestInput[] = [
      { key: 'charge-1', arrivalTick: 0 },
      { key: 'charge-1', arrivalTick: 4 },
    ];
    const reversed: IdempotencyRequestInput[] = [...inOrder].reverse();

    const simInOrder = simulateIdempotencyStore('check-then-set', inOrder, 10, 1000);
    const simReversed = simulateIdempotencyStore('check-then-set', reversed, 10, 1000);

    // Same outcomes keyed by arrivalTick, regardless of array position.
    const byTick = (sim: ReturnType<typeof simulateIdempotencyStore>) =>
      new Map(sim.results.map((r) => [r.arrivalTick, r.outcome]));
    expect(byTick(simReversed)).toEqual(byTick(simInOrder));
  });
});
