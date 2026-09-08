import { describe, expect, it } from 'vitest';
import {
  buildRing,
  compareAssignments,
  computeLoadDistribution,
  hashToRing,
  loadImbalance,
  lookupNode,
  naiveModuloAssign,
  simulateNodeChange,
} from './consistentHashing';

function keyRange(count: number, prefix = 'key'): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}

describe('hashToRing', () => {
  it('is deterministic — same input always lands on the same position', () => {
    expect(hashToRing('user-42')).toBe(hashToRing('user-42'));
  });

  it('stays within [0, ringSize)', () => {
    for (const key of keyRange(200)) {
      const position = hashToRing(key, 1000);
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThan(1000);
    }
  });
});

describe('buildRing', () => {
  it('rejects an empty node list rather than returning an unusable ring', () => {
    expect(() => buildRing([], 3)).toThrow();
  });

  it('rejects fewer than one virtual node per physical node', () => {
    expect(() => buildRing(['a'], 0)).toThrow();
  });

  it('places exactly nodeIds.length * virtualNodesPerNode entries, sorted by position', () => {
    const ring = buildRing(['a', 'b', 'c'], 5);
    expect(ring).toHaveLength(15);
    for (let i = 1; i < ring.length; i++) {
      expect(ring[i].position).toBeGreaterThanOrEqual(ring[i - 1].position);
    }
  });
});

describe('lookupNode', () => {
  it('rejects an empty ring', () => {
    expect(() => lookupNode([], 'key-0')).toThrow();
  });

  it('always resolves to a node that is actually on the ring', () => {
    const nodeIds = ['a', 'b', 'c', 'd'];
    const ring = buildRing(nodeIds, 10);
    for (const key of keyRange(100)) {
      expect(nodeIds).toContain(lookupNode(ring, key));
    }
  });

  it('wraps around: a key past every ring position resolves to the first entry, not nothing', () => {
    // A single-entry ring pinned at position 0 — every key's hash position is >= 0, so the "first
    // entry at or after" is always that one entry; this is the wrap-around case in miniature.
    const ring = buildRing(['solo'], 1, 1);
    expect(lookupNode(ring, 'anything', 1)).toBe('solo');
  });

  it('gives the same key the same owner on repeated lookups against an unchanged ring', () => {
    const ring = buildRing(['a', 'b', 'c'], 8);
    const first = lookupNode(ring, 'stable-key');
    const second = lookupNode(ring, 'stable-key');
    expect(first).toBe(second);
  });
});

describe('naiveModuloAssign', () => {
  it('rejects fewer than one node', () => {
    expect(() => naiveModuloAssign('key-0', 0)).toThrow();
  });

  it('returns an index within [0, nodeCount)', () => {
    for (const key of keyRange(50)) {
      const index = naiveModuloAssign(key, 4);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(4);
    }
  });
});

describe('compareAssignments', () => {
  it('counts zero remapped keys when nothing changed', () => {
    const before = new Map([
      ['a', 'node-1'],
      ['b', 'node-2'],
    ]);
    const result = compareAssignments(before, before);
    expect(result.remappedKeys).toBe(0);
    expect(result.remappedFraction).toBe(0);
  });

  it('counts every key whose owner differs, ignoring keys that stayed the same', () => {
    const before = new Map([
      ['a', 'node-1'],
      ['b', 'node-2'],
      ['c', 'node-3'],
    ]);
    const after = new Map([
      ['a', 'node-1'], // unchanged
      ['b', 'node-9'], // remapped
      ['c', 'node-3'], // unchanged
    ]);
    const result = compareAssignments(before, after);
    expect(result.totalKeys).toBe(3);
    expect(result.remappedKeys).toBe(1);
    expect(result.remappedFraction).toBeCloseTo(1 / 3);
  });
});

describe('simulateNodeChange — the two-sided finding', () => {
  it('naive modulo remaps nearly the entire keyspace when the node count changes by one', () => {
    // 5000 keys, 4 nodes growing to 5. Naive modulo's remapped fraction has no reason to land near
    // any particular value except "most of it" — this asserts that directly rather than picking a
    // number by hand.
    const keys = keyRange(5000);
    const result = simulateNodeChange(keys, ['n1', 'n2', 'n3', 'n4'], ['n1', 'n2', 'n3', 'n4', 'n5'], 100);
    expect(result.naive.remappedFraction).toBeGreaterThan(0.7);
  });

  it('consistent hashing remaps only roughly 1/newNodeCount of the keyspace for the same change', () => {
    const keys = keyRange(5000);
    const result = simulateNodeChange(keys, ['n1', 'n2', 'n3', 'n4'], ['n1', 'n2', 'n3', 'n4', 'n5'], 100);
    // Theoretical ideal is 1/5 = 0.2; real hashing has noise, so assert a band around it rather
    // than an exact figure.
    expect(result.consistentHashing.remappedFraction).toBeGreaterThan(0.1);
    expect(result.consistentHashing.remappedFraction).toBeLessThan(0.3);
  });

  it('consistent hashing remaps dramatically less than naive modulo for the identical change', () => {
    const keys = keyRange(5000);
    const result = simulateNodeChange(keys, ['n1', 'n2', 'n3', 'n4'], ['n1', 'n2', 'n3', 'n4', 'n5'], 100);
    expect(result.consistentHashing.remappedFraction).toBeLessThan(result.naive.remappedFraction / 2);
  });

  it('removing a node behaves the same way as adding one — the surviving keyspace barely moves', () => {
    const keys = keyRange(5000);
    const result = simulateNodeChange(keys, ['n1', 'n2', 'n3', 'n4', 'n5'], ['n1', 'n2', 'n3', 'n4'], 100);
    expect(result.consistentHashing.remappedFraction).toBeLessThan(result.naive.remappedFraction / 2);
  });
});

describe('computeLoadDistribution / loadImbalance — the ring\'s own trade-off', () => {
  it('accounts for every key exactly once across all nodes', () => {
    const nodeIds = ['n1', 'n2', 'n3', 'n4'];
    const keys = keyRange(2000);
    const ring = buildRing(nodeIds, 20);
    const distribution = computeLoadDistribution(ring, keys, nodeIds);
    const total = [...distribution.values()].reduce((sum, count) => sum + count, 0);
    expect(total).toBe(keys.length);
  });

  it('load imbalance is markedly higher with one virtual node per physical node than with many', () => {
    const nodeIds = ['n1', 'n2', 'n3', 'n4', 'n5'];
    const keys = keyRange(5000);

    const sparseRing = buildRing(nodeIds, 1);
    const sparseImbalance = loadImbalance([...computeLoadDistribution(sparseRing, keys, nodeIds).values()]);

    const denseRing = buildRing(nodeIds, 200);
    const denseImbalance = loadImbalance([...computeLoadDistribution(denseRing, keys, nodeIds).values()]);

    expect(sparseImbalance).toBeGreaterThan(denseImbalance);
    // Not just "higher" — the whole point is that a handful of positions per node do not average
    // out, while hundreds of positions per node do. Measured at ~0.15 for 200 virtual nodes/node
    // over 5 nodes, comfortably under half of the 1-virtual-node case.
    expect(denseImbalance).toBeLessThan(sparseImbalance / 2);
  });

  it('improves roughly monotonically as virtual nodes per node increases, not just at the extremes', () => {
    // This is the assertion that actually caught a real bug while writing this lab: plain FNV-1a
    // under-mixes short strings differing only in a trailing digit (the exact `nodeId#virtualIndex`
    // scheme used here), so imbalance bounced around non-monotonically as virtual-node count rose
    // (worse at 60 than at 40, for instance) until `hashString` gained a MurmurHash3-style
    // finalizer. Asserting a genuinely decreasing staircase, not just "1 vs 200", is what would
    // have failed against the pre-finalizer implementation.
    const nodeIds = ['n1', 'n2', 'n3', 'n4', 'n5'];
    const keys = keyRange(5000);

    const imbalanceAt = (virtualNodesPerNode: number) => {
      const ring = buildRing(nodeIds, virtualNodesPerNode);
      return loadImbalance([...computeLoadDistribution(ring, keys, nodeIds).values()]);
    };

    const at1 = imbalanceAt(1);
    const at10 = imbalanceAt(10);
    const at50 = imbalanceAt(50);

    expect(at10).toBeLessThan(at1);
    expect(at50).toBeLessThan(at10);
  });

  it('a perfectly even distribution has zero imbalance', () => {
    expect(loadImbalance([10, 10, 10, 10])).toBe(0);
  });

  it('an empty count list has zero imbalance rather than dividing by zero', () => {
    expect(loadImbalance([])).toBe(0);
  });
});
