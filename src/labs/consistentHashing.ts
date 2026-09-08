/**
 * Consistent hashing — the key-placement scheme behind sharded caches and partitioned datastores
 * (Karger et al., 1997; the practical form here is the one Dynamo, Cassandra, and most consistent-
 * hash cache clients actually ship). The problem it solves: naive `hash(key) % nodeCount` placement
 * is fine until `nodeCount` itself changes — every single key's assignment depends on the *current*
 * node count, so adding or removing one node reshuffles almost the entire keyspace at once. For a
 * cache, that's a stampede of cold misses; for a partitioned datastore, it's every replica moving
 * data at once.
 *
 * Consistent hashing fixes this by placing both nodes and keys on the same fixed-size ring (hash
 * space, not node count) and assigning each key to the first node clockwise from its position. A
 * node leaving or joining only affects the *arc* immediately after it — every key elsewhere on the
 * ring keeps its existing owner. That's the whole trick, and it's real arithmetic here
 * (`buildRing` / `lookupNode`), not an assertion.
 *
 * The two-sided finding this lab is built to prove, not just state:
 *
 * 1. `naiveModuloAssign` vs the ring: on a node-count change, naive modulo remaps close to the
 *    *entire* keyspace (`(N-1)/N` of it in the typical case) while the ring remaps roughly `1/N` —
 *    `simulateNodeChange` computes both from the same key set and the same before/after node list,
 *    so the comparison is a real measurement, not two numbers asserted independently.
 * 2. The ring's own trade-off: with too few virtual nodes per physical node, key load across nodes
 *    is visibly uneven — a handful of real, hashed positions on a ring don't land evenly by chance.
 *    `computeLoadDistribution` / `loadImbalance` show this directly: imbalance is high at 1 virtual
 *    node per physical node and drops as virtual nodes per node increases, because more positions
 *    per node average out the luck of where any one of them happens to land.
 */

/**
 * FNV-1a, 32-bit, plus a MurmurHash3 `fmix32` finalizer — deterministic, fast, and not
 * cryptographic (nothing here needs it to be). The finalizer is not decorative: plain FNV-1a alone
 * measurably under-mixes short strings that differ only in a trailing digit (`n1#0` vs `n1#1` vs
 * `n1#10`, exactly the virtual-node naming scheme below), producing visibly clustered — not
 * scattered — ring positions at low virtual-node counts and noisy, non-monotonic load imbalance as
 * virtual-node count rises. Measured directly while building this lab: without the finalizer,
 * `loadImbalance` bounced around non-monotonically as virtual nodes per node increased (e.g. worse
 * at 60 than at 40); with it, imbalance drops in a stable, expected curve.
 */
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

/** Ring positions are integers in [0, ringSize) — large enough that virtual nodes rarely collide
 * exactly, small enough to stay a followable number rather than the full 32-bit hash space. */
export const DEFAULT_RING_SIZE = 100_000;

export function hashToRing(input: string, ringSize: number = DEFAULT_RING_SIZE): number {
  return hashString(input) % ringSize;
}

export interface RingEntry {
  nodeId: string;
  virtualIndex: number;
  position: number;
}

/**
 * Places `virtualNodesPerNode` positions per physical node on the ring, each at
 * `hashToRing("<nodeId>#<virtualIndex>")` — a distinct, deterministic input per virtual node so
 * the positions actually scatter instead of clustering at one spot per node. Sorted by position so
 * `lookupNode` can walk it in order.
 */
export function buildRing(
  nodeIds: string[],
  virtualNodesPerNode: number,
  ringSize: number = DEFAULT_RING_SIZE
): RingEntry[] {
  if (nodeIds.length === 0) {
    throw new Error('buildRing requires at least one node');
  }
  if (virtualNodesPerNode < 1) {
    throw new Error('buildRing requires at least one virtual node per physical node');
  }

  const ring: RingEntry[] = [];
  for (const nodeId of nodeIds) {
    for (let virtualIndex = 0; virtualIndex < virtualNodesPerNode; virtualIndex++) {
      ring.push({
        nodeId,
        virtualIndex,
        position: hashToRing(`${nodeId}#${virtualIndex}`, ringSize),
      });
    }
  }

  return ring.sort((a, b) => a.position - b.position);
}

/**
 * A key's owner is the first ring entry at or after its own hash position — walking clockwise and
 * wrapping to the first entry if the key's position is past every node (the ring has no "end").
 */
export function lookupNode(ring: RingEntry[], key: string, ringSize: number = DEFAULT_RING_SIZE): string {
  if (ring.length === 0) {
    throw new Error('lookupNode requires a non-empty ring');
  }

  const keyPosition = hashToRing(key, ringSize);
  const owner = ring.find((entry) => entry.position >= keyPosition);
  return (owner ?? ring[0]).nodeId;
}

/** The naive scheme being contrasted against: a key's owner is just `hash(key) % nodeCount`. No
 * ring, no virtual nodes — every key's owner is a direct function of how many nodes exist *right
 * now*, which is exactly what makes it unstable under a node-count change. */
export function naiveModuloAssign(key: string, nodeCount: number): number {
  if (nodeCount < 1) {
    throw new Error('naiveModuloAssign requires at least one node');
  }
  return hashString(key) % nodeCount;
}

export interface RemappingResult {
  totalKeys: number;
  remappedKeys: number;
  remappedFraction: number;
}

/** Compares two key->owner maps over the same key set and counts how many keys changed owner —
 * the actual cost of a node-count change, not an estimate of it. */
export function compareAssignments(before: Map<string, string>, after: Map<string, string>): RemappingResult {
  let remappedKeys = 0;
  for (const [key, owner] of before) {
    if (after.get(key) !== owner) {
      remappedKeys++;
    }
  }
  return {
    totalKeys: before.size,
    remappedKeys,
    remappedFraction: before.size > 0 ? remappedKeys / before.size : 0,
  };
}

export interface NodeChangeSimulation {
  keys: string[];
  beforeNodes: string[];
  afterNodes: string[];
  naive: RemappingResult;
  consistentHashing: RemappingResult;
}

/**
 * Runs the same node-count change (`beforeNodes` -> `afterNodes`) through both schemes against the
 * same key set, so `naive.remappedFraction` and `consistentHashing.remappedFraction` are a real,
 * apples-to-apples comparison rather than two figures computed in isolation.
 */
export function simulateNodeChange(
  keys: string[],
  beforeNodes: string[],
  afterNodes: string[],
  virtualNodesPerNode: number,
  ringSize: number = DEFAULT_RING_SIZE
): NodeChangeSimulation {
  const naiveBefore = new Map(keys.map((key) => [key, String(naiveModuloAssign(key, beforeNodes.length))]));
  const naiveAfter = new Map(keys.map((key) => [key, String(naiveModuloAssign(key, afterNodes.length))]));

  const ringBefore = buildRing(beforeNodes, virtualNodesPerNode, ringSize);
  const ringAfter = buildRing(afterNodes, virtualNodesPerNode, ringSize);
  const chBefore = new Map(keys.map((key) => [key, lookupNode(ringBefore, key, ringSize)]));
  const chAfter = new Map(keys.map((key) => [key, lookupNode(ringAfter, key, ringSize)]));

  return {
    keys,
    beforeNodes,
    afterNodes,
    naive: compareAssignments(naiveBefore, naiveAfter),
    consistentHashing: compareAssignments(chBefore, chAfter),
  };
}

/** How many of `keys` each node on `ring` actually owns — the real distribution a client hashing
 * that many keys against that ring would produce. */
export function computeLoadDistribution(
  ring: RingEntry[],
  keys: string[],
  nodeIds: string[],
  ringSize: number = DEFAULT_RING_SIZE
): Map<string, number> {
  const counts = new Map(nodeIds.map((id) => [id, 0]));
  for (const key of keys) {
    const owner = lookupNode(ring, key, ringSize);
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  return counts;
}

/** Coefficient of variation (stddev / mean) of the per-node counts — 0 means perfectly even load,
 * larger means less even. Scale-free, so it's comparable across different key-set sizes, unlike a
 * raw stddev. */
export function loadImbalance(counts: number[]): number {
  if (counts.length === 0) {
    return 0;
  }
  const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  if (mean === 0) {
    return 0;
  }
  const variance = counts.reduce((sum, count) => sum + (count - mean) ** 2, 0) / counts.length;
  return Math.sqrt(variance) / mean;
}
