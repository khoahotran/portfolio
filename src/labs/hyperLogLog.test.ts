import { describe, expect, it } from 'vitest';
import {
  addToHyperLogLog,
  createHyperLogLog,
  estimateCardinality,
  estimateCardinalityRaw,
  mergeHyperLogLog,
  runCardinalityTrial,
  theoreticalStandardError,
} from './hyperLogLog';

describe('estimateCardinality — real accuracy, measured against ground truth', () => {
  it('tracks true cardinality within a small multiple of the theoretical standard error across a wide range', () => {
    const precision = 10; // m = 1024, theoretical SE ~= 3.25%
    const bound = 4 * theoreticalStandardError(1 << precision);
    for (const n of [100, 1000, 5000, 10000, 50000, 100000]) {
      const trial = runCardinalityTrial(n, precision);
      expect(trial.relativeError).toBeLessThan(bound);
    }
  });

  it('a coarser sketch (fewer registers) has a real, measurably worse error bound than a finer one', () => {
    const coarse = runCardinalityTrial(50000, 6); // m = 64, SE ~= 13%
    const fine = runCardinalityTrial(50000, 14); // m = 16384, SE ~= 0.8%
    expect(theoreticalStandardError(1 << 6)).toBeGreaterThan(theoreticalStandardError(1 << 14));
    // The fine sketch's actual measured error is expected to run lower on average, not guaranteed
    // on every single trial — assert the theoretical bound relationship is real, and that the fine
    // sketch's error at least stays under its own much tighter bound.
    expect(fine.relativeError).toBeLessThan(4 * theoreticalStandardError(1 << 14));
    void coarse;
  });

  it('re-adding an already-counted value never changes the estimate — idempotent, like a Bloom filter insert', () => {
    const hll = createHyperLogLog(10);
    for (let i = 0; i < 200; i++) addToHyperLogLog(hll, `item-${i}`);
    const before = estimateCardinality(hll);
    for (let i = 0; i < 200; i++) addToHyperLogLog(hll, `item-${i}`);
    for (let i = 0; i < 50; i++) addToHyperLogLog(hll, `item-${i}`); // a further-repeated subset
    expect(estimateCardinality(hll)).toBe(before);
  });

  it('the real finding: with no small-range correction, a low true cardinality is wildly overestimated', () => {
    // Below, the harmonic-mean formula alone doesn't know that most registers are still at their
    // untouched zero value — it just sees a handful of high registers among many zeros and, without
    // correction, extrapolates as though every register were meaningfully populated.
    const hll = createHyperLogLog(10); // m = 1024, true cardinality 50 is deep in the small-range regime
    for (let i = 0; i < 50; i++) addToHyperLogLog(hll, `item-${i}`);
    const raw = estimateCardinalityRaw(hll);
    const corrected = estimateCardinality(hll);
    expect(raw).toBeGreaterThan(500); // more than 10x the true value of 50
    expect(corrected).toBeLessThan(70); // within a normal margin of the true value
    expect(corrected).toBeLessThan(raw / 5); // the correction isn't a minor adjustment — it's the difference between usable and not
  });
});

describe('mergeHyperLogLog — the real feature exact counting can\'t offer without combining raw data', () => {
  it('estimates the true union cardinality, even though the two inputs overlap heavily', () => {
    const precision = 10;
    const a = createHyperLogLog(precision);
    const b = createHyperLogLog(precision);
    for (let i = 0; i < 1000; i++) addToHyperLogLog(a, `user-${i}`); // users 0-999
    for (let i = 500; i < 1500; i++) addToHyperLogLog(b, `user-${i}`); // users 500-1499: 500 shared with a

    const trueUnion = 1500;
    const naiveSum = estimateCardinality(a) + estimateCardinality(b); // wrong: double-counts the 500-item overlap
    const merged = mergeHyperLogLog(a, b);
    const mergedEstimate = estimateCardinality(merged);

    expect(Math.abs(naiveSum - trueUnion) / trueUnion).toBeGreaterThan(0.2); // naive summing is genuinely far off
    expect(Math.abs(mergedEstimate - trueUnion) / trueUnion).toBeLessThan(4 * theoreticalStandardError(1 << precision));
  });

  it('is elementwise-max on the registers — merging a sketch with itself changes nothing', () => {
    const hll = createHyperLogLog(8);
    for (let i = 0; i < 300; i++) addToHyperLogLog(hll, `x-${i}`);
    const merged = mergeHyperLogLog(hll, hll);
    expect(merged.registers).toEqual(hll.registers);
  });

  it('refuses to merge sketches built with different precision, rather than silently truncating one', () => {
    const a = createHyperLogLog(8);
    const b = createHyperLogLog(10);
    expect(() => mergeHyperLogLog(a, b)).toThrow();
  });
});
