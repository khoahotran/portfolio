import { describe, expect, it } from 'vitest';
import {
  addToORSet,
  addToTwoPhaseSet,
  compareConcurrentIncrements,
  compareReAddAfterRemove,
  createGCounter,
  createORSet,
  createTwoPhaseSet,
  gCounterValue,
  incrementGCounter,
  mergeGCounter,
  mergeLwwRegister,
  mergeORSet,
  mergeTwoPhaseSet,
  orSetElements,
  removeFromORSet,
  removeFromTwoPhaseSet,
  twoPhaseSetElements,
} from './crdt';
import type { GCounterState, ORSetState } from './crdt';

function canonicalGCounter(state: GCounterState): string {
  return JSON.stringify(Object.entries(state).sort(([a], [b]) => a.localeCompare(b)));
}

function canonicalORSet(state: ORSetState): string {
  const adds = state.adds.map((a) => `${a.element}#${a.tag}`).sort();
  const tombstones = [...state.tombstones].sort();
  return JSON.stringify({ adds, tombstones });
}

describe('GCounter — basics', () => {
  it('starts every node at 0', () => {
    expect(createGCounter(['a', 'b'])).toEqual({ a: 0, b: 0 });
  });

  it('increments only the given node\'s slot, without mutating the input', () => {
    const state = createGCounter(['a', 'b']);
    const next = incrementGCounter(state, 'a');
    expect(next).toEqual({ a: 1, b: 0 });
    expect(state).toEqual({ a: 0, b: 0 });
  });

  it('sums every slot as the value', () => {
    const state = { a: 3, b: 5, c: 0 };
    expect(gCounterValue(state)).toBe(8);
  });

  it('merges by component-wise max', () => {
    expect(mergeGCounter({ a: 3, b: 1 }, { a: 1, b: 5 })).toEqual({ a: 3, b: 5 });
  });
});

describe('GCounter merge — the actual CRDT laws, not just "seems to work"', () => {
  const a = { a: 3, b: 1, c: 0 };
  const b = { a: 1, b: 5, c: 2 };
  const c = { a: 0, b: 0, c: 9 };

  it('is commutative: merge(a,b) == merge(b,a)', () => {
    expect(canonicalGCounter(mergeGCounter(a, b))).toBe(canonicalGCounter(mergeGCounter(b, a)));
  });

  it('is associative: merge(merge(a,b),c) == merge(a,merge(b,c))', () => {
    const left = mergeGCounter(mergeGCounter(a, b), c);
    const right = mergeGCounter(a, mergeGCounter(b, c));
    expect(canonicalGCounter(left)).toBe(canonicalGCounter(right));
  });

  it('is idempotent: merging a state with itself changes nothing', () => {
    expect(canonicalGCounter(mergeGCounter(a, a))).toBe(canonicalGCounter(a));
  });

  it('is idempotent under duplicate delivery: merging the same update twice equals merging it once', () => {
    const once = mergeGCounter(a, b);
    const twice = mergeGCounter(once, b);
    expect(canonicalGCounter(once)).toBe(canonicalGCounter(twice));
  });
});

describe('compareConcurrentIncrements — the lost-update finding', () => {
  it('rejects an empty node set', () => {
    expect(() => compareConcurrentIncrements({}, {})).toThrow();
  });

  it('the G-Counter total always equals the true total, regardless of timestamps', () => {
    const result = compareConcurrentIncrements({ A: 3, B: 2 }, { A: 100, B: 200 });
    expect(result.trueTotal).toBe(5);
    expect(result.gCounterTotal).toBe(5);
  });

  it('the naive LWW register loses the non-winning node\'s increments — a real, counted bug', () => {
    const result = compareConcurrentIncrements({ A: 3, B: 2 }, { A: 100, B: 200 });
    // B's timestamp (200) is later, so B's register wins and A's 3 increments vanish entirely.
    expect(result.lwwTotal).toBe(2);
    expect(result.lwwLostUpdates).toBe(3);
  });

  it('which node "wins" under LWW depends only on timestamp, not on which node did more real work', () => {
    // Same increment counts, timestamps reversed — the LWW winner flips, the G-Counter total does not.
    const bWins = compareConcurrentIncrements({ A: 3, B: 2 }, { A: 100, B: 200 });
    const aWins = compareConcurrentIncrements({ A: 3, B: 2 }, { A: 200, B: 100 });
    expect(bWins.lwwTotal).toBe(2);
    expect(aWins.lwwTotal).toBe(3);
    expect(bWins.gCounterTotal).toBe(aWins.gCounterTotal);
  });

  it('with only one node contributing and that node\'s write also winning the timestamp race, nothing is lost', () => {
    const result = compareConcurrentIncrements({ A: 4, B: 0 }, { A: 20, B: 10 });
    expect(result.lwwLostUpdates).toBe(0);
  });

  it('but a timestamp tie can still lose a sole contributor\'s work — the tiebreak, not the work, decides', () => {
    // A did all the real work (4 increments); B did none. A tied timestamp with B, and the
    // deterministic nodeId tiebreak favors 'B' — so the naive register reports 0, discarding every
    // one of A's real increments even though B contributed nothing at all. The lesson: LWW's
    // "winner" is a property of the resolver's tiebreak rule, not of who actually did the work.
    const result = compareConcurrentIncrements({ A: 4, B: 0 }, { A: 10, B: 10 });
    expect(result.lwwTotal).toBe(0);
    expect(result.lwwLostUpdates).toBe(4);
  });
});

describe('mergeLwwRegister', () => {
  it('picks the later timestamp', () => {
    const a = { value: 1, timestamp: 10, nodeId: 'a' };
    const b = { value: 2, timestamp: 20, nodeId: 'b' };
    expect(mergeLwwRegister(a, b)).toBe(b);
    expect(mergeLwwRegister(b, a)).toBe(b);
  });

  it('breaks a timestamp tie deterministically by nodeId', () => {
    const a = { value: 1, timestamp: 10, nodeId: 'a' };
    const b = { value: 2, timestamp: 10, nodeId: 'b' };
    expect(mergeLwwRegister(a, b)).toBe(b);
    expect(mergeLwwRegister(b, a)).toBe(b);
  });
});

describe('ORSet — basics', () => {
  it('starts empty', () => {
    expect(orSetElements(createORSet())).toEqual(new Set());
  });

  it('an added element is present', () => {
    const state = addToORSet(createORSet(), 'x', 'A#1');
    expect(orSetElements(state)).toEqual(new Set(['x']));
  });

  it('removing tombstones only the tags actually observed for that element', () => {
    let state = createORSet();
    state = addToORSet(state, 'x', 'A#1');
    state = addToORSet(state, 'y', 'A#2');
    state = removeFromORSet(state, 'x');
    expect(orSetElements(state)).toEqual(new Set(['y']));
    // 'y' is untouched — remove only ever looked at tags for 'x'.
    expect(state.tombstones).toEqual(['A#1']);
  });

  it('removing an element with no observed adds is a harmless no-op', () => {
    const state = removeFromORSet(createORSet(), 'never-added');
    expect(orSetElements(state)).toEqual(new Set());
  });

  it('merge unions adds and tombstones, deduplicated', () => {
    const a = addToORSet(createORSet(), 'x', 'A#1');
    const b = addToORSet(createORSet(), 'x', 'A#1'); // same tag delivered to both replicas
    const merged = mergeORSet(a, b);
    expect(merged.adds).toHaveLength(1);
  });
});

describe('ORSet merge — the actual CRDT laws', () => {
  const a = addToORSet(addToORSet(createORSet(), 'x', 'A#1'), 'y', 'A#2');
  const b = removeFromORSet(addToORSet(createORSet(), 'x', 'A#1'), 'x');
  const c = addToORSet(createORSet(), 'z', 'C#1');

  it('is commutative', () => {
    expect(canonicalORSet(mergeORSet(a, b))).toBe(canonicalORSet(mergeORSet(b, a)));
  });

  it('is associative', () => {
    const left = mergeORSet(mergeORSet(a, b), c);
    const right = mergeORSet(a, mergeORSet(b, c));
    expect(canonicalORSet(left)).toBe(canonicalORSet(right));
  });

  it('is idempotent', () => {
    expect(canonicalORSet(mergeORSet(a, a))).toBe(canonicalORSet(a));
  });

  it('is idempotent under duplicate delivery', () => {
    const once = mergeORSet(a, b);
    const twice = mergeORSet(once, b);
    expect(canonicalORSet(once)).toBe(canonicalORSet(twice));
  });
});

describe('ORSet — true concurrent add-wins across two independently evolving replicas', () => {
  it('a concurrent re-add survives a remove neither replica knew about', () => {
    // Both replicas start having synced one add of 'x' (tag A#1).
    const synced = addToORSet(createORSet(), 'x', 'A#1');

    // Replica 1: removes 'x', observing only A#1 (the only tag it knows about).
    const replica1 = removeFromORSet(synced, 'x');

    // Replica 2: concurrently, independently, re-adds 'x' with a fresh tag — no knowledge of replica 1's remove.
    const replica2 = addToORSet(synced, 'x', 'A#2');

    const merged = mergeORSet(replica1, replica2);
    // A#1 is tombstoned, but A#2 never was — the element survives the concurrent remove.
    expect(orSetElements(merged).has('x')).toBe(true);
    // Merging the other direction gives the identical answer.
    expect(orSetElements(mergeORSet(replica2, replica1)).has('x')).toBe(true);
  });
});

describe('TwoPhaseSet — the naive contrast', () => {
  it('basic add/remove/merge behaves as a plain set until a remove happens', () => {
    let state = createTwoPhaseSet();
    state = addToTwoPhaseSet(state, 'x');
    expect(twoPhaseSetElements(state)).toEqual(new Set(['x']));
    state = removeFromTwoPhaseSet(state, 'x');
    expect(twoPhaseSetElements(state)).toEqual(new Set());
  });

  it('merges by unioning adds and removes', () => {
    const a = addToTwoPhaseSet(createTwoPhaseSet(), 'x');
    const b = removeFromTwoPhaseSet(createTwoPhaseSet(), 'y');
    const merged = mergeTwoPhaseSet(a, b);
    expect(merged.adds).toEqual(['x']);
    expect(merged.removes).toEqual(['y']);
  });
});

describe('compareReAddAfterRemove — the finding: OR-Set survives a re-add, 2P-Set does not', () => {
  it('OR-Set correctly keeps the re-added element present', () => {
    const result = compareReAddAfterRemove('x', 'A#1', 'A#2');
    expect(result.orSetHasElement).toBe(true);
  });

  it('2P-Set permanently loses the value once it has ever been removed, even after a real re-add', () => {
    const result = compareReAddAfterRemove('x', 'A#1', 'A#2');
    expect(result.twoPhaseSetHasElement).toBe(false);
  });
});
