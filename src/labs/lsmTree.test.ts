import { describe, expect, it } from 'vitest';
import { compact, createLsmTree, get, put, remove, runCount, writeAmplification } from './lsmTree';

const MEMTABLE_CAPACITY = 50;

/** Runs a deterministic update-heavy workload — `totalOps` puts cycling through `uniqueKeys`
 * distinct keys (so most operations are updates, not first-time inserts) — optionally compacting
 * every `compactEveryNFlushes` flushes. Returns the same measurements the lab UI shows. */
function runWorkload(totalOps: number, uniqueKeys: number, compactEveryNFlushes: number | null) {
  const tree = createLsmTree(MEMTABLE_CAPACITY);
  let flushesSinceCompact = 0;
  for (let i = 0; i < totalOps; i++) {
    const runsBefore = tree.runs.length;
    put(tree, `key-${i % uniqueKeys}`, `v${i}`);
    if (tree.runs.length > runsBefore) {
      flushesSinceCompact++;
      if (compactEveryNFlushes !== null && flushesSinceCompact >= compactEveryNFlushes) {
        compact(tree);
        flushesSinceCompact = 0;
      }
    }
  }
  let totalProbed = 0;
  for (let i = 0; i < uniqueKeys; i++) totalProbed += get(tree, `key-${i}`).runsProbed;
  return {
    finalRunCount: runCount(tree),
    avgReadAmplification: totalProbed / uniqueKeys,
    missRunsProbed: get(tree, 'not-a-real-key').runsProbed,
    writeAmp: writeAmplification(tree),
  };
}

describe('LSM tree — the real trade-off, measured on both sides', () => {
  it('with no compaction, write amplification is exactly 1.0 — every operation written to disk exactly once', () => {
    const result = runWorkload(5000, 500, null);
    expect(result.writeAmp).toBe(1);
  });

  it('with no compaction, run count and read amplification for a miss both grow with total writes — unbounded, not just large', () => {
    const at5000 = runWorkload(5000, 500, null);
    const at20000 = runWorkload(20000, 500, null);
    expect(at5000.finalRunCount).toBe(100); // 5000 ops / 50-entry memtable
    expect(at20000.finalRunCount).toBe(400); // 20000 ops / 50-entry memtable — 4x the runs for 4x the writes
    // A miss must check every run, since nothing rules a run out without a per-run filter.
    expect(at5000.missRunsProbed).toBe(at5000.finalRunCount);
    expect(at20000.missRunsProbed).toBe(at20000.finalRunCount);
    expect(at20000.missRunsProbed).toBeGreaterThan(at5000.missRunsProbed);
  });

  it('compaction bounds run count and read amplification to a small constant, regardless of total writes', () => {
    const at5000 = runWorkload(5000, 500, 4);
    const at20000 = runWorkload(20000, 500, 4);
    expect(at5000.finalRunCount).toBe(1);
    expect(at20000.finalRunCount).toBe(1);
    expect(at5000.avgReadAmplification).toBe(1);
    expect(at20000.avgReadAmplification).toBe(1);
  });

  it('the real cost of that bound: write amplification is measurably above 1.0 once compaction runs', () => {
    const result = runWorkload(5000, 500, 4);
    expect(result.writeAmp).toBeCloseTo(3.42, 2);
    expect(result.writeAmp).toBeGreaterThan(1);
  });

  it('compacting more frequently lowers read amplification no further (already at the floor) but raises write amplification further', () => {
    const everyTwo = runWorkload(5000, 500, 2);
    const everyFour = runWorkload(5000, 500, 4);
    expect(everyTwo.avgReadAmplification).toBe(everyFour.avgReadAmplification); // both already at the floor of 1
    expect(everyTwo.writeAmp).toBeGreaterThan(everyFour.writeAmp); // but everyTwo rewrites the same live data twice as often
  });

  it('a tombstone shadows an older value until compaction, then is dropped entirely once nothing older remains to hide', () => {
    const tree = createLsmTree(4);
    put(tree, 'a', '1'); put(tree, 'b', '2'); put(tree, 'c', '3'); put(tree, 'd', '4'); // flush 1
    remove(tree, 'a');
    put(tree, 'e', '5'); put(tree, 'f', '6'); put(tree, 'g', '7'); // flush 2 (with tombstone for 'a')
    expect(get(tree, 'a').value).toBeNull();
    expect(runCount(tree)).toBe(2);
    compact(tree);
    expect(runCount(tree)).toBe(1);
    expect(get(tree, 'a').value).toBeNull(); // still correctly absent
    expect(tree.runs[0].entries.has('a')).toBe(false); // and the tombstone itself is gone, not just hidden
  });

  it('a newer run correctly shadows an older run\'s value for the same key without compaction', () => {
    const tree = createLsmTree(2);
    put(tree, 'x', 'old'); put(tree, 'y', 'irrelevant'); // flush 1
    put(tree, 'x', 'new'); put(tree, 'z', 'irrelevant'); // flush 2
    const result = get(tree, 'x');
    expect(result.value).toBe('new');
    expect(result.runsProbed).toBe(1); // found in the first (newest) run checked, no need to go further
  });
});
