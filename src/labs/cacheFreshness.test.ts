import { describe, expect, it } from 'vitest';
import { simulateCachePolicy } from './cacheFreshness';
import type { CacheSimOptions } from './cacheFreshness';

const BASE: CacheSimOptions = {
  ttlTicks: 10,
  originUpdateIntervalTicks: 100, // origin content is stable for the whole test window
  requestTicks: [0, 5, 15, 25],
};

describe('simulateCachePolicy', () => {
  it('rejects invalid preconditions rather than return a plausible-looking result', () => {
    expect(() => simulateCachePolicy('ttl-blocking', { ...BASE, ttlTicks: 0 })).toThrow();
    expect(() => simulateCachePolicy('ttl-blocking', { ...BASE, originUpdateIntervalTicks: 0 })).toThrow();
    expect(() => simulateCachePolicy('ttl-blocking', { ...BASE, requestTicks: [] })).toThrow();
  });

  it('all three policies serve identical fresh content at fast latency while within TTL', () => {
    const opts = { ...BASE, requestTicks: [0, 5, 9] };
    for (const policy of ['ttl-blocking', 'stale-while-revalidate', 'stale-if-error'] as const) {
      const result = simulateCachePolicy(policy, opts);
      expect(result.requests.every((r) => !r.stale && !r.error && r.latencyMs === 1)).toBe(true);
    }
  });

  describe('ttl-blocking', () => {
    it('errors once TTL expires if the origin is down at that moment — no fallback exists', () => {
      const result = simulateCachePolicy('ttl-blocking', {
        ...BASE,
        outageStartTick: 0,
        outageEndTick: 50,
        requestTicks: [0, 15],
      });
      const expired = result.requests.find((r) => r.tick === 15)!;
      expect(expired.error).toBe(true);
      expect(expired.servedVersion).toBeNull();
    });
  });

  describe('stale-while-revalidate', () => {
    it('never blocks the request — latency stays fast even while serving stale content in the grace window', () => {
      const result = simulateCachePolicy('stale-while-revalidate', {
        ...BASE,
        swrWindowTicks: 20,
        outageStartTick: 0,
        outageEndTick: 50, // origin down for the whole window, so it can never refresh
        requestTicks: [0, 15],
      });
      const inGraceWindow = result.requests.find((r) => r.tick === 15)!;
      expect(inGraceWindow.error).toBe(false);
      expect(inGraceWindow.latencyMs).toBe(1); // fast — SWR never pays origin latency to serve stale
    });

    it('does not error during an outage that ttl-blocking would error on, given the same timeline', () => {
      const opts: CacheSimOptions = { ...BASE, swrWindowTicks: 20, outageStartTick: 0, outageEndTick: 50, requestTicks: [0, 15] };
      const swr = simulateCachePolicy('stale-while-revalidate', opts);
      const blocking = simulateCachePolicy('ttl-blocking', opts);
      expect(swr.errorCount).toBe(0);
      expect(blocking.errorCount).toBeGreaterThan(0);
    });

    it('falls back to blocking once the grace window itself elapses', () => {
      const result = simulateCachePolicy('stale-while-revalidate', {
        ...BASE,
        swrWindowTicks: 5, // ttl(10) + swr(5) = 15, so tick 20 is past the grace window
        outageStartTick: 0,
        outageEndTick: 50,
        requestTicks: [0, 20],
      });
      const pastGrace = result.requests.find((r) => r.tick === 20)!;
      expect(pastGrace.error).toBe(true);
    });

    it('self-heals: once the origin comes back, the next request within TTL of the background refresh gets fresh content', () => {
      // Origin updates at tick 10 (version 0 -> 1); no outage, so SWR's background refresh succeeds
      // on the first stale-serving request.
      const result = simulateCachePolicy('stale-while-revalidate', {
        ttlTicks: 10,
        swrWindowTicks: 20,
        originUpdateIntervalTicks: 10,
        requestTicks: [0, 12, 13],
      });
      const firstStale = result.requests.find((r) => r.tick === 12)!;
      const afterBackgroundRefresh = result.requests.find((r) => r.tick === 13)!;
      expect(firstStale.stale).toBe(true); // served the pre-refresh (version 0) content
      expect(afterBackgroundRefresh.stale).toBe(false); // background refresh already caught it up
    });
  });

  describe('stale-if-error', () => {
    it('always attempts the origin once expired — pays origin latency even when it falls back to stale', () => {
      const result = simulateCachePolicy('stale-if-error', {
        ...BASE,
        originUpdateIntervalTicks: 8, // short enough that the origin's true content actually
        // changes between tick 0 (when the cache was warmed) and tick 15 (the fallback request) —
        // without a real version change, "served stale" and "served fresh" would be indistinguishable.
        sieWindowTicks: 20,
        outageStartTick: 0,
        outageEndTick: 50,
        requestTicks: [0, 15],
      });
      const fallback = result.requests.find((r) => r.tick === 15)!;
      expect(fallback.error).toBe(false);
      expect(fallback.stale).toBe(true);
      expect(fallback.originAttempted).toBe(true);
      expect(fallback.latencyMs).toBeGreaterThan(1); // unlike SWR, this cost real origin latency
    });

    it('errors once its own grace window elapses, same as the other two policies eventually do', () => {
      const result = simulateCachePolicy('stale-if-error', {
        ...BASE,
        sieWindowTicks: 5,
        outageStartTick: 0,
        outageEndTick: 50,
        requestTicks: [0, 20],
      });
      const pastGrace = result.requests.find((r) => r.tick === 20)!;
      expect(pastGrace.error).toBe(true);
    });
  });

  it('is fully deterministic — same inputs, same result, no randomness', () => {
    const opts: CacheSimOptions = { ...BASE, swrWindowTicks: 10, sieWindowTicks: 10 };
    const a = simulateCachePolicy('stale-while-revalidate', opts);
    const b = simulateCachePolicy('stale-while-revalidate', opts);
    expect(a).toEqual(b);
  });
});
