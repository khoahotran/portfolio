import { describe, expect, it } from 'vitest';
import {
  addToBloomFilter,
  bitsSetCount,
  createBloomFilter,
  mightContain,
  optimalK,
  runBloomFilterTrial,
  theoreticalFalsePositiveRate,
} from './bloomFilter';

function itemRange(count: number, prefix: string): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}

describe('createBloomFilter', () => {
  it('rejects m < 1', () => {
    expect(() => createBloomFilter(0, 3)).toThrow();
  });

  it('rejects k < 1', () => {
    expect(() => createBloomFilter(100, 0)).toThrow();
  });

  it('starts with every bit unset', () => {
    const state = createBloomFilter(50, 3);
    expect(bitsSetCount(state)).toBe(0);
  });
});

describe('addToBloomFilter / mightContain — the hard guarantee', () => {
  it('does not mutate the input state', () => {
    const state = createBloomFilter(100, 3);
    addToBloomFilter(state, 'x');
    expect(bitsSetCount(state)).toBe(0);
  });

  it('an inserted item always tests as present — never a false negative for a single item', () => {
    const state = addToBloomFilter(createBloomFilter(1000, 5), 'hello');
    expect(mightContain(state, 'hello')).toBe(true);
  });

  it('an empty filter reports every item absent', () => {
    const state = createBloomFilter(1000, 5);
    expect(mightContain(state, 'anything')).toBe(false);
  });

  it('every one of many inserted items always tests as present, with no exceptions', () => {
    let state = createBloomFilter(500, 4);
    const items = itemRange(50, 'k');
    for (const item of items) {
      state = addToBloomFilter(state, item);
    }
    for (const item of items) {
      expect(mightContain(state, item), item).toBe(true);
    }
  });

  it('inserting the same item twice increments insertedCount but changes nothing observable', () => {
    let state = createBloomFilter(200, 3);
    state = addToBloomFilter(state, 'x');
    const bitsAfterFirst = bitsSetCount(state);
    state = addToBloomFilter(state, 'x');
    expect(state.insertedCount).toBe(2);
    expect(bitsSetCount(state)).toBe(bitsAfterFirst);
  });
});

describe('theoreticalFalsePositiveRate', () => {
  it('is 0 with nothing inserted', () => {
    expect(theoreticalFalsePositiveRate(1000, 5, 0)).toBe(0);
  });

  it('increases as more items are inserted, for fixed m and k', () => {
    const low = theoreticalFalsePositiveRate(1000, 5, 50);
    const high = theoreticalFalsePositiveRate(1000, 5, 500);
    expect(high).toBeGreaterThan(low);
  });

  it('decreases as the bit array grows, for fixed k and n', () => {
    const small = theoreticalFalsePositiveRate(500, 5, 100);
    const large = theoreticalFalsePositiveRate(5000, 5, 100);
    expect(large).toBeLessThan(small);
  });
});

describe('optimalK', () => {
  it('matches the closed form round((m/n) * ln 2)', () => {
    expect(optimalK(2000, 200)).toBe(7); // (2000/200)*ln2 = 6.93 -> 7
  });

  it('never returns less than 1', () => {
    expect(optimalK(10, 1000)).toBeGreaterThanOrEqual(1);
  });

  it('returns 1 for n <= 0 rather than dividing by zero', () => {
    expect(optimalK(1000, 0)).toBe(1);
  });
});

describe('runBloomFilterTrial — the two-sided finding', () => {
  const m = 2000;
  const k = optimalK(m, 200); // 7

  it('never produces a false negative, at design capacity or heavily overloaded', () => {
    const designed = runBloomFilterTrial(m, k, itemRange(200, 'item'), itemRange(2000, 'test'));
    const overloaded = runBloomFilterTrial(m, k, itemRange(1000, 'item'), itemRange(2000, 'test'));
    expect(designed.falseNegativeCount).toBe(0);
    expect(overloaded.falseNegativeCount).toBe(0);
  });

  it('at designed capacity, the measured false-positive rate tracks the theoretical estimate closely', () => {
    const trial = runBloomFilterTrial(m, k, itemRange(200, 'item'), itemRange(5000, 'test'));
    // Measured ~1.0%, theoretical ~0.8% in practice — both comfortably under 3%, well within a
    // generous absolute tolerance band rather than an exact match (real hashing has sampling noise).
    expect(trial.theoreticalFalsePositiveRate).toBeLessThan(0.03);
    expect(trial.measuredFalsePositiveRate).toBeLessThan(0.03);
  });

  it('overloading the same filter to 5x its designed capacity makes the false-positive rate dramatically worse', () => {
    const designed = runBloomFilterTrial(m, k, itemRange(200, 'item'), itemRange(5000, 'test'));
    const overloaded = runBloomFilterTrial(m, k, itemRange(1000, 'item'), itemRange(5000, 'test'));
    // Measured jumps from ~1% to ~80% in practice — assert the order-of-magnitude difference
    // directly rather than pinning exact figures that would be brittle against hashing noise.
    expect(overloaded.measuredFalsePositiveRate).toBeGreaterThan(designed.measuredFalsePositiveRate * 10);
    expect(overloaded.measuredFalsePositiveRate).toBeGreaterThan(0.5);
  });

  it('the measured rate stays close to the theoretical one even under heavy overload, not just at design capacity', () => {
    const trial = runBloomFilterTrial(m, k, itemRange(1000, 'item'), itemRange(5000, 'test'));
    expect(Math.abs(trial.measuredFalsePositiveRate - trial.theoreticalFalsePositiveRate)).toBeLessThan(0.05);
  });

  it('a test item that was actually inserted is excluded from the false-positive count, not miscounted', () => {
    const inserted = itemRange(50, 'shared');
    // Deliberately include an already-inserted item in the "not inserted" test list.
    const testItems = [...itemRange(50, 'shared'), 'genuinely-new-1', 'genuinely-new-2'];
    const trial = runBloomFilterTrial(1000, 5, inserted, testItems);
    expect(trial.testedCount).toBe(2);
  });
});
