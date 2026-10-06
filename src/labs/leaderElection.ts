/**
 * The Bully algorithm (Garcia-Molina, 1982) for leader election in a distributed system where
 * every node has a unique, comparable, totally-ordered id — the classic mechanism this lab
 * implements exactly, not a diagram of it. Rule: any node that notices the leader is unreachable
 * sends an ELECTION message to every node with a *higher* id. Any higher node that is alive
 * replies ALIVE and starts its own election against ids above *it*. A node that gets no ALIVE
 * reply (because every higher id is down) declares itself leader and broadcasts COORDINATOR to
 * every alive node below it. The winner is always the highest-id alive node — deterministically,
 * given a fixed alive/down set, which is what makes this simulatable step by step rather than
 * needing real timeouts or randomness.
 *
 * Deliberately modelled as a breadth-first wave rather than one linear chain: in the real
 * algorithm, every alive node that receives an ELECTION message replies *and* starts its own
 * election concurrently, so a single initiator's message can fan out to several simultaneous
 * sub-elections in one step. This is also what makes Bully's well-known worst-case message cost
 * (O(n^2) in the number of alive nodes) visible in the simulation rather than asserted in prose —
 * see the "all nodes alive" test below.
 */

export type ElectionMessageType = 'election' | 'alive' | 'coordinator';

export interface ElectionMessage {
  type: ElectionMessageType;
  from: number;
  to: number;
}

export interface ElectionStep {
  /** 1-indexed step number. */
  step: number;
  /** Every message sent during this step, in a stable (sender, then receiver) order. */
  messages: ElectionMessage[];
  /** Node ids that were actively running their own election sub-attempt during this step. */
  candidates: number[];
}

export interface ElectionResult {
  steps: ElectionStep[];
  /** The elected leader's id, or null if the election could not run at all (see below). */
  leaderId: number | null;
}

/**
 * Simulates a full Bully election.
 *
 * `nodeIds` is every node id that exists in the cluster (alive or not) — a node must know the full
 * membership to know who is "higher" than it, exactly as the real algorithm requires.
 * `aliveIds` is the subset currently reachable. `initiatorId` is the node that noticed the previous
 * leader was unreachable and is the one that starts the election.
 *
 * Returns `{ steps: [], leaderId: null }` if `initiatorId` is not itself alive — a crashed node
 * cannot notice anything or send a message, so "the dead node starts an election" is not a
 * degraded case this function silently guesses an answer for; it is simply not a thing that
 * happens. Same treatment `simulateFixedWindow` gives `windowSeconds <= 0` (Decision 21): reject
 * the invalid precondition rather than return a number that looks plausible but isn't.
 */
export function simulateBullyElection(
  nodeIds: number[],
  aliveIds: ReadonlySet<number>,
  initiatorId: number
): ElectionResult {
  if (!aliveIds.has(initiatorId)) {
    return { steps: [], leaderId: null };
  }

  const sortedIds = [...nodeIds].sort((a, b) => a - b);
  const visited = new Set<number>([initiatorId]);
  let wave = [initiatorId];
  const steps: ElectionStep[] = [];
  let leaderId: number | null = null;

  while (wave.length > 0) {
    const messages: ElectionMessage[] = [];
    const nextWave: number[] = [];

    for (const candidate of wave) {
      const higher = sortedIds.filter((id) => id > candidate);
      for (const id of higher) {
        messages.push({ type: 'election', from: candidate, to: id });
      }

      const aliveHigher = higher.filter((id) => aliveIds.has(id));
      if (aliveHigher.length === 0) {
        // No one above `candidate` is alive to answer — `candidate` wins. Only one candidate in
        // the whole run can ever satisfy this (the highest alive id overall), since every other
        // alive node has at least the eventual winner above it to reply ALIVE.
        leaderId = candidate;
        continue;
      }

      for (const id of aliveHigher) {
        messages.push({ type: 'alive', from: id, to: candidate });
        if (!visited.has(id)) {
          visited.add(id);
          nextWave.push(id);
        }
      }
    }

    steps.push({ step: steps.length + 1, messages, candidates: wave });
    if (leaderId !== null) break;
    wave = nextWave;
  }

  if (leaderId !== null) {
    const lowerAlive = sortedIds.filter((id) => id < leaderId! && aliveIds.has(id));
    if (lowerAlive.length > 0) {
      steps.push({
        step: steps.length + 1,
        messages: lowerAlive.map((id) => ({ type: 'coordinator', from: leaderId!, to: id })),
        candidates: [leaderId],
      });
    }
  }

  return { steps, leaderId };
}
