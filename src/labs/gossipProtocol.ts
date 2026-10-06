/**
 * A real push-based epidemic (gossip) broadcast simulation — not a modelled convergence curve.
 * One node starts holding a piece of information; each round, every node that already has it
 * pushes to `fanout` distinct, randomly chosen peers, and any peer that doesn't have it yet
 * becomes infected. This is the same "rumor mongering" protocol underlying real cluster membership
 * systems (e.g. the gossip layer in Cassandra, Consul, and Serf/SWIM-style implementations), not a
 * simplification invented for this lab.
 *
 * `rng` is injectable specifically so this stays unit-testable: production code (the lab page)
 * passes `Math.random`, tests pass a fixed generator to assert exact, reproducible outcomes.
 */

export interface GossipRound {
  /** 1-indexed round number. */
  round: number;
  /** Node ids that first received the message this round, ascending. */
  newlyInfected: number[];
  /** Cumulative count of nodes holding the message after this round. */
  infectedCount: number;
}

/**
 * Fisher-Yates partial shuffle: returns up to `fanout` distinct node ids, excluding `selfId`,
 * chosen uniformly at random via `rng`. Fewer than `fanout` peers exist only when `nodeCount` is
 * very small relative to `fanout`, in which case every other node is returned.
 */
function pickRandomPeers(selfId: number, nodeCount: number, fanout: number, rng: () => number): number[] {
  const candidates: number[] = [];
  for (let i = 0; i < nodeCount; i += 1) {
    if (i !== selfId) candidates.push(i);
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // `Math.max(0, fanout)` guards a negative fanout: `Array.slice(0, -1)` means "everything except
  // the last element", not "nothing" — without this clamp, a negative fanout would gossip to
  // almost every peer instead of behaving like the no-op `fanout=0` already correctly does.
  // Unreachable via the shipped lab (its slider's min is 0), but this function is exported and
  // tested independently of that UI constraint.
  return candidates.slice(0, Math.max(0, Math.min(fanout, candidates.length)));
}

/**
 * Simulates push-based gossip starting from node 0, for up to `maxRounds` rounds or until every
 * node has the message, whichever comes first. Stops early (before `maxRounds`) if a round produces
 * no new infections, which happens when `fanout` is 0 or every infected node's random peers all
 * already have the message — continuing to "simulate" rounds that provably cannot change anything
 * would just be padding, not more information.
 */
export function simulateGossip(
  nodeCount: number,
  fanout: number,
  maxRounds: number,
  rng: () => number = Math.random
): GossipRound[] {
  if (nodeCount <= 0) return [];

  const infected = new Array(nodeCount).fill(false);
  infected[0] = true;
  let infectedCount = 1;
  const rounds: GossipRound[] = [];

  for (let round = 1; round <= maxRounds && infectedCount < nodeCount; round += 1) {
    const infectedAtStart: number[] = [];
    for (let i = 0; i < nodeCount; i += 1) {
      if (infected[i]) infectedAtStart.push(i);
    }

    const newlyInfected = new Set<number>();
    for (const senderId of infectedAtStart) {
      const peers = pickRandomPeers(senderId, nodeCount, fanout, rng);
      for (const peerId of peers) {
        if (!infected[peerId]) newlyInfected.add(peerId);
      }
    }

    if (newlyInfected.size === 0) break;

    for (const id of newlyInfected) {
      infected[id] = true;
      infectedCount += 1;
    }

    rounds.push({
      round,
      newlyInfected: [...newlyInfected].sort((a, b) => a - b),
      infectedCount,
    });
  }

  return rounds;
}
