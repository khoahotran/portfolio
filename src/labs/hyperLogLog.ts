/**
 * HyperLogLog (Flajolet et al., 2007) — cardinality estimation (how many *distinct* items were
 * seen) in a fixed, tiny amount of memory, regardless of how many items actually passed through.
 * The site's Bloom filter lab already covers "did I see this exact item" in fixed memory;
 * HyperLogLog answers the adjacent, genuinely different question — "how many *different* items did
 * I see" — without ever storing a single one of them.
 *
 * The trick: hash every item to a uniform bit string, split the hash into a `p`-bit register index
 * and a remaining tail, and for each register keep only the *longest run of leading zeros* seen in
 * any tail that hashed to it. A long run of leading zeros is rare — probability 2^-(k+1) for a run
 * of length k — so the longest run observed across many items is a (noisy but unbiased, once
 * corrected) signal for how many distinct items must have been hashed to produce it. Averaging that
 * signal across `m = 2^p` registers (the harmonic-mean-like `alpha * m^2 / sum(2^-register)` formula
 * below) is what turns "one noisy signal per bucket" into a standard error of roughly `1.04/sqrt(m)`
 * — a real, measurable number, not a claimed one (see hyperLogLog.test.ts).
 */

/** Same FNV-1a + MurmurHash3 `fmix32` finalizer as consistentHashing.ts and bloomFilter.ts, for the
 * same reason: plain FNV-1a under-mixes short strings differing only in a trailing digit
 * ("item-1" vs "item-2" vs "item-10"), which would visibly skew which register each item lands in. */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
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

function registerIndex(hash: number, precision: number): number {
  return hash >>> (32 - precision);
}

/** Position of the leftmost 1-bit among the `32 - precision` bits left after the index bits are
 * taken, counting from 1 (a leading 1 in the very first remaining bit scores rank 1). All-zero
 * remaining bits — vanishingly rare for real hashes — scores the maximum possible rank. */
function rank(hash: number, precision: number): number {
  const remainingBits = 32 - precision;
  const mask = remainingBits >= 32 ? 0xffffffff : (1 << remainingBits) - 1;
  const remaining = hash & mask;
  if (remaining === 0) return remainingBits + 1;
  let leadingZeros = 0;
  for (let i = remainingBits - 1; i >= 0; i--) {
    if ((remaining >>> i) & 1) break;
    leadingZeros++;
  }
  return leadingZeros + 1;
}

export interface HyperLogLog {
  precision: number;
  registerCount: number;
  registers: number[];
}

export function createHyperLogLog(precision: number): HyperLogLog {
  const registerCount = 1 << precision;
  return { precision, registerCount, registers: new Array(registerCount).fill(0) };
}

/** Idempotent by construction: re-adding a value that already produced the current register's max
 * rank changes nothing, the same way inserting an already-present item into a Bloom filter changes
 * nothing — the register only ever moves up, never down, and a repeat can only ever tie or lose. */
export function addToHyperLogLog(hll: HyperLogLog, value: string): void {
  const hash = hashString(value);
  const index = registerIndex(hash, hll.precision);
  const r = rank(hash, hll.precision);
  if (r > hll.registers[index]) {
    hll.registers[index] = r;
  }
}

function alphaFor(m: number): number {
  if (m === 16) return 0.673;
  if (m === 32) return 0.697;
  if (m === 64) return 0.709;
  return 0.7213 / (1 + 1.079 / m);
}

/** The formula with no small-range correction — included only so the test suite can show directly
 * what it gets wrong, not as something a real caller should reach for. */
export function estimateCardinalityRaw(hll: HyperLogLog): number {
  const { registerCount: m, registers } = hll;
  const alpha = alphaFor(m);
  let sumInv = 0;
  for (const r of registers) sumInv += Math.pow(2, -r);
  return (alpha * m * m) / sumInv;
}

/**
 * The real estimator: the raw formula above, with the small-range (linear counting) correction the
 * original paper specifies. Below roughly 2.5m true distinct items, most registers are still at 0
 * (never hit), and the harmonic-mean formula is measurably biased upward in that regime — linear
 * counting (`m * ln(m / zeroRegisters)`) is accurate exactly where the raw formula isn't.
 */
export function estimateCardinality(hll: HyperLogLog): number {
  const { registerCount: m, registers } = hll;
  const rawEstimate = estimateCardinalityRaw(hll);
  if (rawEstimate <= 2.5 * m) {
    const zeroRegisters = registers.filter((r) => r === 0).length;
    if (zeroRegisters > 0) {
      return m * Math.log(m / zeroRegisters);
    }
  }
  return rawEstimate;
}

/**
 * Merges two sketches into a new one representing the union of whatever each saw — without either
 * sketch ever having stored a single actual item. Elementwise max per register is exactly what a
 * single sketch that had seen everything both inputs saw would itself contain: a register that saw
 * a longer leading-zero run in either input keeps that longer run under a union, precisely because
 * "did any item hash to a longer run" doesn't care which sketch it came from. This is what makes
 * HyperLogLog practical for anything sharded — each shard tracks its own sketch independently, and
 * a exact-item-free merge afterward is enough to estimate the whole dataset's cardinality.
 */
export function mergeHyperLogLog(a: HyperLogLog, b: HyperLogLog): HyperLogLog {
  if (a.precision !== b.precision) {
    throw new Error(`cannot merge sketches with different precision (${a.precision} vs ${b.precision})`);
  }
  return {
    precision: a.precision,
    registerCount: a.registerCount,
    registers: a.registers.map((r, i) => Math.max(r, b.registers[i])),
  };
}

export interface CardinalityTrial {
  trueCardinality: number;
  estimate: number;
  relativeError: number;
}

/** Builds a sketch from `trueCardinality` genuinely distinct values (a numbered prefix, not random
 * — determinism matters more here than realism, since the point is measuring against a known-exact
 * ground truth) and reports the estimate alongside the true count, so error is measured, not
 * asserted. */
export function runCardinalityTrial(trueCardinality: number, precision: number, prefix = 'item'): CardinalityTrial {
  const hll = createHyperLogLog(precision);
  for (let i = 0; i < trueCardinality; i++) {
    addToHyperLogLog(hll, `${prefix}-${i}`);
  }
  const estimate = estimateCardinality(hll);
  const relativeError = trueCardinality === 0 ? 0 : Math.abs(estimate - trueCardinality) / trueCardinality;
  return { trueCardinality, estimate, relativeError };
}

/** The theoretical standard error a sketch of this size is designed to hit, per the original paper
 * — the number `runCardinalityTrial`'s measured relativeError is checked against, not derived from
 * it (the test asserts they land in the same ballpark independently, not that one equals the other). */
export function theoreticalStandardError(registerCount: number): number {
  return 1.04 / Math.sqrt(registerCount);
}
