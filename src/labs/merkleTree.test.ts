import { describe, expect, it } from 'vitest';
import {
  buildMerkleTree,
  compareReconciliation,
  findDifferingKeys,
  naiveFindDifferingKeys,
} from './merkleTree';
import type { MerkleEntry } from './merkleTree';

function entryRange(count: number): MerkleEntry[] {
  return Array.from({ length: count }, (_, i) => ({ key: `k${i}`, value: `v${i}` }));
}

describe('buildMerkleTree', () => {
  it('rejects an empty entry list', () => {
    expect(() => buildMerkleTree([])).toThrow();
  });

  it('is deterministic — the same entries in the same order always produce the same root hash', () => {
    const entries = entryRange(10);
    const a = buildMerkleTree(entries.map((e) => ({ ...e })));
    const b = buildMerkleTree(entries.map((e) => ({ ...e })));
    expect(a.hash).toBe(b.hash);
  });

  it('changing any single value changes the root hash', () => {
    const original = entryRange(10);
    const changed = original.map((e, i) => (i === 3 ? { ...e, value: 'different' } : e));
    expect(buildMerkleTree(original).hash).not.toBe(buildMerkleTree(changed).hash);
  });

  it('builds a valid tree for a single entry (no children needed)', () => {
    const tree = buildMerkleTree([{ key: 'only', value: 'x' }]);
    expect(tree.left).toBeNull();
    expect(tree.right).toBeNull();
    expect(tree.leafKey).toBe('only');
  });

  it('handles an odd number of entries by padding, without throwing', () => {
    expect(() => buildMerkleTree(entryRange(7))).not.toThrow();
    expect(() => buildMerkleTree(entryRange(1))).not.toThrow();
  });
});

describe('findDifferingKeys — the targeted walk', () => {
  it('two identical trees require visiting only the root — O(1) proof of full equality', () => {
    const entries = entryRange(1024);
    const a = buildMerkleTree(entries.map((e) => ({ ...e })));
    const b = buildMerkleTree(entries.map((e) => ({ ...e })));
    const result = findDifferingKeys(a, b);
    expect(result.differingKeys).toEqual([]);
    expect(result.nodesVisited).toBe(1);
  });

  it('a single differing leaf among 1024 is found by visiting a small fraction of the tree', () => {
    const base = entryRange(1024);
    const changed = base.map((e, i) => (i === 500 ? { key: e.key, value: 'CHANGED' } : e));
    const a = buildMerkleTree(base);
    const b = buildMerkleTree(changed);
    const result = findDifferingKeys(a, b);
    expect(result.differingKeys).toEqual(['k500']);
    // Measured at 21 (roughly 2*log2(1024)+1) — asserting well under the 1024-leaf count is the
    // real claim; the exact figure is noted for context, not pinned as a brittle exact match.
    expect(result.nodesVisited).toBeLessThan(30);
  });

  it('sparse differences cost roughly proportional to their count times tree height, not the full leaf count', () => {
    const base = entryRange(1024);
    const indices = [10, 200, 500, 777, 1000];
    const changed = base.map((e, i) => (indices.includes(i) ? { key: e.key, value: `CHANGED${i}` } : e));
    const result = findDifferingKeys(buildMerkleTree(base), buildMerkleTree(changed));
    expect(result.differingKeys).toHaveLength(5);
    expect(result.nodesVisited).toBeLessThan(150);
  });

  it('honest caveat: when every leaf differs, the targeted walk visits more nodes than a naive scan would', () => {
    const base = entryRange(1024);
    const allDifferent = base.map((e, i) => ({ key: e.key, value: `X${i}` }));
    const result = findDifferingKeys(buildMerkleTree(base), buildMerkleTree(allDifferent));
    expect(result.differingKeys).toHaveLength(1024);
    // Visits essentially the whole tree (2*leafCount - 1 internal+leaf nodes) — worse than the
    // naive scan's 1024 comparisons, not better. The win is specific to sparse differences.
    expect(result.nodesVisited).toBeGreaterThan(1024);
  });
});

describe('naiveFindDifferingKeys', () => {
  it('always costs exactly entries.length comparisons, regardless of how many actually differ', () => {
    const base = entryRange(100);
    const identical = base.map((e) => ({ ...e }));
    const allDifferent = base.map((e, i) => ({ key: e.key, value: `X${i}` }));
    expect(naiveFindDifferingKeys(base, identical).nodesVisited).toBe(100);
    expect(naiveFindDifferingKeys(base, allDifferent).nodesVisited).toBe(100);
  });

  it('finds the same differing keys the targeted walk does', () => {
    const base = entryRange(50);
    const changed = base.map((e, i) => (i === 12 || i === 40 ? { key: e.key, value: 'X' } : e));
    const naive = naiveFindDifferingKeys(base, changed);
    const merkle = findDifferingKeys(buildMerkleTree(base), buildMerkleTree(changed));
    expect([...naive.differingKeys].sort()).toEqual([...merkle.differingKeys].sort());
  });
});

describe('compareReconciliation — the measured two-sided finding', () => {
  it('rejects mismatched-length entry lists', () => {
    expect(() => compareReconciliation(entryRange(5), entryRange(6))).toThrow();
  });

  it('rejects entry lists whose keys are not aligned by index', () => {
    const a = entryRange(5);
    const b = [...entryRange(4), { key: 'different-key', value: 'v4' }];
    expect(() => compareReconciliation(a, b)).toThrow();
  });

  it('for a large dataset with one difference, Merkle reconciliation costs a small fraction of the naive scan', () => {
    const base = entryRange(1024);
    const oneDiff = base.map((e, i) => (i === 500 ? { key: e.key, value: 'CHANGED' } : e));
    const result = compareReconciliation(base, oneDiff);
    expect(result.naiveComparisons).toBe(1024);
    expect(result.merkleNodesVisited).toBeLessThan(result.naiveComparisons / 20);
  });

  it('for identical large datasets, Merkle reconciliation is a single comparison — the sharpest case', () => {
    const base = entryRange(1024);
    const result = compareReconciliation(base, base.map((e) => ({ ...e })));
    expect(result.merkleNodesVisited).toBe(1);
    expect(result.naiveComparisons).toBe(1024);
  });

  it('when everything has changed, Merkle reconciliation costs more than the naive scan — the honest caveat, measured', () => {
    const base = entryRange(1024);
    const allDifferent = base.map((e, i) => ({ key: e.key, value: `X${i}` }));
    const result = compareReconciliation(base, allDifferent);
    expect(result.merkleNodesVisited).toBeGreaterThan(result.naiveComparisons);
  });
});
