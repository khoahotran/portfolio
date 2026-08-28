import { describe, expect, it } from 'vitest';
import {
  buildArrivalTimeline,
  simulateFixedWindow,
  simulateLeakyBucket,
  simulateTokenBucket,
} from './rateLimiting';

describe('simulateTokenBucket', () => {
  it('admits up to capacity instantly, then rejects until refill', () => {
    // capacity 5, no refill within this window: exactly 5 simultaneous arrivals admitted, the 6th rejected.
    const arrivals = [0, 0, 0, 0, 0, 0];
    const steps = simulateTokenBucket(arrivals, 5, 0);
    expect(steps.map((s) => s.allowed)).toEqual([true, true, true, true, true, false]);
  });

  it('refills proportionally to real elapsed time', () => {
    // capacity 1, refill 1/sec, drained at t=0; by t=1 exactly one token has regenerated.
    const steps = simulateTokenBucket([0, 1], 1, 1);
    expect(steps[0]).toMatchObject({ allowed: true, state: 0 });
    expect(steps[1]).toMatchObject({ allowed: true, state: 0 });
  });

  it('does not refill past capacity', () => {
    const steps = simulateTokenBucket([0, 100], 3, 10);
    expect(steps[1].state).toBeLessThanOrEqual(3);
  });

  it('absorbs a burst up to capacity, then rejects the overflow', () => {
    const burst = Array.from({ length: 10 }, () => 2);
    const steps = simulateTokenBucket(burst, 4, 0);
    expect(steps.filter((s) => s.allowed)).toHaveLength(4);
    expect(steps.filter((s) => !s.allowed)).toHaveLength(6);
  });
});

describe('simulateLeakyBucket', () => {
  it('queues up to capacity, then overflows', () => {
    const arrivals = [0, 0, 0, 0, 0, 0];
    const steps = simulateLeakyBucket(arrivals, 5, 0);
    expect(steps.map((s) => s.allowed)).toEqual([true, true, true, true, true, false]);
  });

  it('drains proportionally to real elapsed time before admitting the next arrival', () => {
    // capacity 1, leak 1/sec: queued at t=0 (level -> 1), fully drained by t=1, so t=1 is admitted too.
    const steps = simulateLeakyBucket([0, 1], 1, 1);
    expect(steps[0].allowed).toBe(true);
    expect(steps[1].allowed).toBe(true);
  });

  it('never reports a negative queue level', () => {
    const steps = simulateLeakyBucket([0, 50], 2, 1);
    expect(steps[1].state).toBeGreaterThanOrEqual(0);
  });
});

describe('simulateFixedWindow', () => {
  it('admits up to the limit within one window, rejects the rest', () => {
    const arrivals = [0.1, 0.2, 0.3, 0.4, 0.5];
    const steps = simulateFixedWindow(arrivals, 1, 3);
    expect(steps.map((s) => s.allowed)).toEqual([true, true, true, false, false]);
  });

  it('resets the counter at a window boundary', () => {
    const steps = simulateFixedWindow([0.9, 1.1], 1, 1);
    expect(steps[0].allowed).toBe(true);
    expect(steps[1].allowed).toBe(true); // new window (t=1.1 falls in window index 1), counter reset
  });

  it('demonstrates the boundary-burst flaw: ~2x limit can land either side of an edge', () => {
    // limit 2 per 1s window: 2 requests just before the t=1 boundary, 2 more just after —
    // all 4 admitted inside a ~0.2s span, because they fall in two different windows.
    const steps = simulateFixedWindow([0.9, 0.95, 1.0, 1.05], 1, 2);
    expect(steps.every((s) => s.allowed)).toBe(true);
  });

  it('degrades to one window for the whole run instead of NaN chaos when windowSeconds is 0', () => {
    // Regression test: `t / 0` is NaN/Infinity, and NaN !== currentWindow is always true, which
    // would otherwise reset the counter on every arrival and bypass `limit` entirely.
    const steps = simulateFixedWindow([0, 1, 2, 3, 4], 0, 3);
    expect(steps.map((s) => s.allowed)).toEqual([true, true, true, false, false]);
  });
});

describe('buildArrivalTimeline', () => {
  it('generates a sustained stream at the requested rate', () => {
    const timeline = buildArrivalTimeline(2, 3, 0, 0);
    // 2 req/sec for 3 seconds -> arrivals at 0.5, 1.0, 1.5, ..., 3.0 (6 arrivals)
    expect(timeline).toHaveLength(6);
  });

  it('injects the burst at the requested second, sorted into the timeline', () => {
    // burstAtSecond (1.5) deliberately falls between sustained ticks (rate 1 -> ticks at 1, 2)
    // so the burst's 3 arrivals can be isolated by filtering, with no collision to disambiguate.
    const timeline = buildArrivalTimeline(1, 2, 3, 1.5);
    const burstArrivals = timeline.filter((t) => t >= 1.5 && t < 1.501);
    expect(burstArrivals).toHaveLength(3);
    expect(timeline).toEqual([...timeline].sort((a, b) => a - b));
  });

  it('produces no arrivals when both rate and burst are zero', () => {
    expect(buildArrivalTimeline(0, 5, 0, 1)).toEqual([]);
  });

  it('produces the exact expected tick count at rates where accumulating `t += step` loses the last tick', () => {
    // Regression test: 4.5, 5, 9, and 10 req/s over a 4s duration all previously dropped their
    // final arrival, because summing `step` repeatedly (1/4.5, 1/5, ...) accumulates binary
    // floating-point error that pushes the final sum fractionally past 4, failing the loop's
    // `<= durationSeconds` check one tick early. All four are reachable via the lab's own
    // "Sustained rate" slider (0-10, step 0.5).
    for (const rate of [4.5, 5, 9, 10]) {
      const timeline = buildArrivalTimeline(rate, 4, 0, 0);
      expect(timeline, `rate=${rate}`).toHaveLength(Math.round(rate * 4));
      expect(timeline[timeline.length - 1], `rate=${rate} last arrival`).toBeCloseTo(4, 9);
    }
  });
});
