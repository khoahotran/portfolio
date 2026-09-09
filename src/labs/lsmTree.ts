/**
 * Log-Structured Merge tree — the storage engine behind most real-world write-heavy key-value
 * stores (LevelDB, RocksDB, Cassandra's SSTables), and the write-optimized alternative to the
 * B-Tree the site's own research piece on time-series indexing already covers. A B-Tree updates a
 * key in place, wherever it already lives on disk — cheap to read, expensive to write randomly. An
 * LSM tree never updates in place: every write lands in an in-memory `memtable`, and once that
 * fills up it's flushed, as-is, to an immutable sorted run on disk. Writes are always sequential
 * appends; nothing already on disk is ever touched by a single write.
 *
 * The two-sided trade-off this lab is built to measure, not just state:
 *
 * 1. **Read amplification.** A newer run can shadow an older one for the same key (an update, or a
 *    tombstone for a delete), so a point lookup has to check runs from newest to oldest until it
 *    finds the key or runs out of runs — `get`'s `runsProbed` is a real count, not an estimate. Left
 *    unchecked, the number of runs only ever grows (one new run per flush), so read amplification
 *    grows without bound as more data is written.
 * 2. **Write amplification.** `compact` is the fix for (1) — merge every run into one, keeping only
 *    the newest value per key and dropping tombstones (nothing older remains for them to hide once
 *    everything is merged). That bounds read amplification, but at a real cost: every live key gets
 *    *rewritten*, even keys nobody touched since the last compaction. `writeAmplification` measures
 *    exactly that — total bytes ever written to a run, divided by the number of write operations
 *    that were actually issued.
 */

export interface SortedRun {
  id: number;
  entries: Map<string, string | null>; // null = tombstone (a deleted key)
}

export interface LsmTree {
  memtableCapacity: number;
  memtable: Map<string, string | null>;
  runs: SortedRun[]; // oldest first, newest last
  nextRunId: number;
  totalWrites: number; // cumulative entries ever written to a run — flushes AND compaction rewrites
  totalOperations: number; // put/remove calls actually issued by the caller
}

export function createLsmTree(memtableCapacity: number): LsmTree {
  return { memtableCapacity, memtable: new Map(), runs: [], nextRunId: 0, totalWrites: 0, totalOperations: 0 };
}

function flush(tree: LsmTree): void {
  if (tree.memtable.size === 0) return;
  tree.runs.push({ id: tree.nextRunId++, entries: tree.memtable });
  tree.totalWrites += tree.memtable.size;
  tree.memtable = new Map();
}

export function put(tree: LsmTree, key: string, value: string): void {
  tree.totalOperations++;
  tree.memtable.set(key, value);
  if (tree.memtable.size >= tree.memtableCapacity) flush(tree);
}

export function remove(tree: LsmTree, key: string): void {
  tree.totalOperations++;
  tree.memtable.set(key, null); // tombstone — shadows any older value for this key
  if (tree.memtable.size >= tree.memtableCapacity) flush(tree);
}

export interface LookupResult {
  value: string | null;
  runsProbed: number;
}

/** Checks the memtable first (free — it's already in memory), then every sorted run from newest to
 * oldest until the key is found or every run has been checked. `runsProbed` is the real, countable
 * cost of the lookup — the read-amplification number this lab measures directly. */
export function get(tree: LsmTree, key: string): LookupResult {
  if (tree.memtable.has(key)) {
    return { value: tree.memtable.get(key) ?? null, runsProbed: 0 };
  }
  let runsProbed = 0;
  for (let i = tree.runs.length - 1; i >= 0; i--) {
    runsProbed++;
    if (tree.runs[i].entries.has(key)) {
      return { value: tree.runs[i].entries.get(key) ?? null, runsProbed };
    }
  }
  return { value: null, runsProbed };
}

/**
 * Merges every current sorted run (and the still-unflushed memtable) into a single new run,
 * applying them oldest-to-newest so a later write always wins. Because this merges *everything*,
 * tombstones can be dropped entirely — there is nothing older left for them to shadow. The number
 * of entries this writes (`tree.totalWrites` grows by exactly the merged run's live key count) is
 * the write-amplification cost: every one of those keys is written again, even ones nobody touched
 * since the previous compaction.
 */
export function compact(tree: LsmTree): void {
  flush(tree);
  if (tree.runs.length <= 1) return;
  const merged = new Map<string, string | null>();
  for (const run of tree.runs) {
    for (const [key, value] of run.entries) merged.set(key, value);
  }
  for (const [key, value] of merged) {
    if (value === null) merged.delete(key);
  }
  tree.totalWrites += merged.size;
  tree.runs = merged.size > 0 ? [{ id: tree.nextRunId++, entries: merged }] : [];
}

export function runCount(tree: LsmTree): number {
  return tree.runs.length;
}

/** Total entries ever written to a run, divided by the number of put/remove calls actually issued —
 * exactly 1.0 means every operation was written to disk exactly once and never rewritten; anything
 * above 1.0 is compaction rewriting already-durable data. */
export function writeAmplification(tree: LsmTree): number {
  if (tree.totalOperations === 0) return 0;
  return tree.totalWrites / tree.totalOperations;
}
