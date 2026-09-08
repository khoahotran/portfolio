/**
 * Bloom filters — a probabilistic set-membership structure (Bloom, 1970) traded off deliberately:
 * a fixed-size bit array can answer "have I seen this before?" for an unbounded number of items,
 * in O(k) time and O(m) space regardless of how many items are inserted, at the cost of sometimes
 * answering "maybe" when the real answer is "no." It never does the reverse — an item that was
 * actually inserted is *never* reported absent. That asymmetry (perfect recall, imperfect
 * precision) is the entire design, and this lab makes both halves measurable rather than assumed:
 * the "never a false negative" half as a hard guarantee tested directly, and the "sometimes a
 * false positive" half as a real, measured rate that tracks a closed-form formula — closely within
 * the filter's designed capacity, and badly once it's overloaded past that capacity.
 *
 * Real implementation (`src/labs/bloomFilter.ts`), not a formula described in prose: a plain
 * boolean bit array, and the standard Kirsch-Mitzenmacher optimization for deriving k independent
 * hash functions from exactly two real hash computations — `h_i(x) = h1(x) + i*h2(x) mod m` — so a
 * filter with, say, 12 hash functions still only computes 2 real hashes per operation, the actual
 * technique real Bloom filter implementations use rather than genuinely running k separate hash
 * algorithms.
 */

/** FNV-1a, 32-bit, plus a MurmurHash3-style finalizer — same technique as `consistentHashing.ts`'s
 * `hashString`, reimplemented locally (each lab module stays self-contained) with a distinct seed
 * so `hash1` and `hash2` genuinely diverge rather than being the same function twice. */
function hashWithSeed(input: string, seed: number): number {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function hash1(input: string): number {
  return hashWithSeed(input, 0x811c9dc5);
}

function hash2(input: string): number {
  return hashWithSeed(input, 0x1000193);
}

/** The k bit positions `item` maps to, via `h1(x) + i*h2(x) mod m` for i in [0, k) — the
 * Kirsch-Mitzenmacher construction. Deterministic: the same item always yields the same positions. */
function bitPositions(item: string, k: number, m: number): number[] {
  const h1 = hash1(item);
  const h2 = hash2(item);
  return Array.from({ length: k }, (_, i) => (h1 + i * h2) % m);
}

export interface BloomFilterState {
  bits: boolean[];
  m: number;
  k: number;
  insertedCount: number;
}

export function createBloomFilter(m: number, k: number): BloomFilterState {
  if (m < 1) {
    throw new Error('createBloomFilter requires m >= 1');
  }
  if (k < 1) {
    throw new Error('createBloomFilter requires k >= 1');
  }
  return { bits: new Array(m).fill(false), m, k, insertedCount: 0 };
}

/** Sets all k bit positions for `item`. Pure: returns a new state, never mutates `state`. */
export function addToBloomFilter(state: BloomFilterState, item: string): BloomFilterState {
  const bits = [...state.bits];
  for (const pos of bitPositions(item, state.k, state.m)) {
    bits[pos] = true;
  }
  return { ...state, bits, insertedCount: state.insertedCount + 1 };
}

/** True means "maybe present" (could be a false positive); false means "definitely absent" — the
 * one answer a Bloom filter is never wrong about. */
export function mightContain(state: BloomFilterState, item: string): boolean {
  return bitPositions(item, state.k, state.m).every((pos) => state.bits[pos]);
}

export function bitsSetCount(state: BloomFilterState): number {
  return state.bits.filter(Boolean).length;
}

/** The standard closed-form estimate: `(1 - e^(-kn/m))^k`, for a filter of size `m`, `k` hash
 * functions, and `n` items inserted so far. */
export function theoreticalFalsePositiveRate(m: number, k: number, n: number): number {
  if (n === 0) return 0;
  return Math.pow(1 - Math.exp((-k * n) / m), k);
}

/** The hash-function count that minimizes the false-positive rate for a filter of size `m`
 * expected to hold `n` items: `round((m/n) * ln 2)`, clamped to at least 1. */
export function optimalK(m: number, n: number): number {
  if (n <= 0) return 1;
  return Math.max(1, Math.round((m / n) * Math.LN2));
}

export interface BloomFilterTrial {
  m: number;
  k: number;
  insertedCount: number;
  bitsSet: number;
  fillRatio: number;
  theoreticalFalsePositiveRate: number;
  measuredFalsePositiveRate: number;
  falsePositiveCount: number;
  testedCount: number;
  /** Must always be 0 — the hard guarantee. A nonzero value here would mean the implementation is
   * actually broken, not just imprecise. */
  falseNegativeCount: number;
}

/**
 * Inserts every item in `insertedItems`, then checks two things for real: every inserted item
 * really does test as present (the false-negative guarantee), and how many of
 * `testItemsNotInserted` — filtered down to only those genuinely never inserted, so a caller
 * accidentally including a duplicate can't inflate the false-positive count — wrongly test as
 * present (the measured false-positive rate, compared directly against the closed-form estimate
 * for the identical m/k/n).
 */
export function runBloomFilterTrial(
  m: number,
  k: number,
  insertedItems: string[],
  testItemsNotInserted: string[]
): BloomFilterTrial {
  let state = createBloomFilter(m, k);
  for (const item of insertedItems) {
    state = addToBloomFilter(state, item);
  }

  const falseNegativeCount = insertedItems.filter((item) => !mightContain(state, item)).length;

  const insertedSet = new Set(insertedItems);
  const genuinelyNotInserted = testItemsNotInserted.filter((item) => !insertedSet.has(item));
  const falsePositiveCount = genuinelyNotInserted.filter((item) => mightContain(state, item)).length;

  return {
    m,
    k,
    insertedCount: insertedItems.length,
    bitsSet: bitsSetCount(state),
    fillRatio: bitsSetCount(state) / m,
    theoreticalFalsePositiveRate: theoreticalFalsePositiveRate(m, k, insertedItems.length),
    measuredFalsePositiveRate: genuinelyNotInserted.length > 0 ? falsePositiveCount / genuinelyNotInserted.length : 0,
    falsePositiveCount,
    testedCount: genuinelyNotInserted.length,
    falseNegativeCount,
  };
}
