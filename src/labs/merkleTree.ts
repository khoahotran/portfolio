/**
 * Merkle trees — the anti-entropy reconciliation mechanism behind how Dynamo-style stores,
 * Cassandra, and git all answer "do these two replicas actually agree?" without comparing every
 * key. Each leaf is the hash of one entry; each internal node is the hash of its two children's
 * hashes; the root is a single value that summarizes the entire dataset. Two datasets are
 * identical iff their root hashes match — a single O(1) comparison proves full equality, something
 * no naive per-key scan can do without actually visiting every key.
 *
 * The real payoff shows up when two replicas *disagree*: instead of comparing every key, walk down
 * from the root and only descend into a subtree whose hash actually differs — a subtree whose hash
 * matches is provably identical everywhere underneath it, so there is nothing more to check there.
 * `findDifferingKeys` (`src/labs/merkleTree.ts`) is the real walk, not a description of one, and it
 * counts every node it actually visits (`nodesVisited`) so the O(log n)-ish cost for a handful of
 * differences, versus the O(n) cost of `naiveFindDifferingKeys`'s full leaf-by-leaf scan, is a
 * measured comparison against the identical two datasets — not two separate claims.
 *
 * This lab's hash is the same fast, non-cryptographic FNV-1a-plus-finalizer used elsewhere in this
 * portfolio's labs, not SHA-256 — deliberately: a real production Merkle tree (git, Cassandra) uses
 * a cryptographic hash so an adversary or silent bit-rot can't forge a matching hash for different
 * content. This lab's finding is about the *shape* of the diffing algorithm — how few nodes a
 * targeted walk needs to visit versus a full scan — which a fast hash demonstrates identically to a
 * slow cryptographic one, while keeping the tree's actual hash values legible in the UI.
 */

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

function hashLeaf(key: string, value: string): number {
  return hashWithSeed(`${key}=${value}`, 0x811c9dc5);
}

function hashPair(leftHash: number, rightHash: number): number {
  return hashWithSeed(`${leftHash}:${rightHash}`, 0x811c9dc5);
}

export interface MerkleEntry {
  key: string;
  value: string;
}

export interface MerkleNode {
  hash: number;
  /** null on a leaf. Both null or both non-null — never one without the other. */
  left: MerkleNode | null;
  right: MerkleNode | null;
  /** Only set on a leaf — which entry's key this node represents. */
  leafKey?: string;
}

/**
 * Builds a balanced binary tree bottom-up from `entries`, in the given order — both replicas being
 * compared must build from entries in the *same* key order (see `compareReconciliation`'s
 * precondition), since position, not key lookup, is what a real Merkle tree walk uses. An odd
 * level is padded by duplicating its last node, the same technique real implementations (e.g.
 * Bitcoin's block Merkle trees) use rather than inventing a placeholder value.
 */
export function buildMerkleTree(entries: MerkleEntry[]): MerkleNode {
  if (entries.length === 0) {
    throw new Error('buildMerkleTree requires at least one entry');
  }

  let level: MerkleNode[] = entries.map((entry) => ({
    hash: hashLeaf(entry.key, entry.value),
    left: null,
    right: null,
    leafKey: entry.key,
  }));

  while (level.length > 1) {
    if (level.length % 2 === 1) {
      level = [...level, level[level.length - 1]];
    }
    const nextLevel: MerkleNode[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1];
      nextLevel.push({ hash: hashPair(left.hash, right.hash), left, right });
    }
    level = nextLevel;
  }

  return level[0];
}

export interface DiffResult {
  /** Keys whose leaf hash differs between the two trees — the entries that actually need repair. */
  differingKeys: string[];
  /** Real count of tree nodes the walk actually visited — the O(log n)-for-sparse-diffs cost, or
   * up to roughly 2x the leaf count in the worst case of every leaf differing (see the module doc). */
  nodesVisited: number;
}

/**
 * The targeted walk: never descends into a subtree whose hash already matches, since a matching
 * hash proves that subtree is identical everywhere underneath it. `a` and `b` must have identical
 * shape (same structure, produced from equal-length, equal-key-order entry lists) — see
 * `compareReconciliation`'s precondition, which is what actually enforces this before either tree
 * is built.
 */
export function findDifferingKeys(a: MerkleNode, b: MerkleNode): DiffResult {
  let nodesVisited = 0;
  const differingKeys: string[] = [];

  function walk(x: MerkleNode, y: MerkleNode): void {
    nodesVisited++;
    if (x.hash === y.hash) {
      return; // proven identical everywhere underneath — nothing more to visit here
    }
    if (!x.left || !x.right || !y.left || !y.right) {
      // a leaf whose hash differs — a real, confirmed difference.
      if (x.leafKey) differingKeys.push(x.leafKey);
      return;
    }
    walk(x.left, y.left);
    walk(x.right, y.right);
  }

  walk(a, b);
  return { differingKeys, nodesVisited };
}

/** The naive alternative: compare every entry's value directly, in order — always exactly
 * `entries.length` comparisons, whether 0 or all of them actually differ. */
export function naiveFindDifferingKeys(entriesA: MerkleEntry[], entriesB: MerkleEntry[]): DiffResult {
  const differingKeys: string[] = [];
  let nodesVisited = 0;
  for (let i = 0; i < entriesA.length; i++) {
    nodesVisited++;
    if (entriesA[i].value !== entriesB[i].value) {
      differingKeys.push(entriesA[i].key);
    }
  }
  return { differingKeys, nodesVisited };
}

export interface ReconciliationComparison {
  totalKeys: number;
  differingKeys: string[];
  /** Real node-visit count from the targeted Merkle-tree walk. */
  merkleNodesVisited: number;
  /** Always equals totalKeys — the naive scan's fixed cost, real either way. */
  naiveComparisons: number;
}

/**
 * Builds both trees for real and runs both diffing strategies against them, so
 * `merkleNodesVisited` and `naiveComparisons` are a direct, apples-to-apples measurement for the
 * identical pair of datasets — not two figures computed in isolation. Requires `entriesA` and
 * `entriesB` to have the same length and the same key at every index (position is what the tree
 * walk actually compares); a caller violating this gets a thrown error, not a plausible-looking
 * wrong diff.
 */
export function compareReconciliation(entriesA: MerkleEntry[], entriesB: MerkleEntry[]): ReconciliationComparison {
  if (entriesA.length !== entriesB.length) {
    throw new Error('compareReconciliation requires both entry lists to have the same length');
  }
  for (let i = 0; i < entriesA.length; i++) {
    if (entriesA[i].key !== entriesB[i].key) {
      throw new Error(`compareReconciliation requires matching keys at every index — mismatch at index ${i}`);
    }
  }

  const treeA = buildMerkleTree(entriesA);
  const treeB = buildMerkleTree(entriesB);
  const merkleResult = findDifferingKeys(treeA, treeB);
  const naiveResult = naiveFindDifferingKeys(entriesA, entriesB);

  return {
    totalKeys: entriesA.length,
    differingKeys: merkleResult.differingKeys,
    merkleNodesVisited: merkleResult.nodesVisited,
    naiveComparisons: naiveResult.nodesVisited,
  };
}
