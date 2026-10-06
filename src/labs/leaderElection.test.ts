import { describe, expect, it } from 'vitest';
import { simulateBullyElection } from './leaderElection';

/**
 * `nodeIds` uses 1-indexed ids throughout these tests (matching the lab UI, where "node 0" would
 * read oddly next to "the highest id wins") — the algorithm itself is id-scheme agnostic.
 */
describe('simulateBullyElection', () => {
  it('refuses to start an election from a node that is not itself alive', () => {
    // A crashed node cannot notice anything or send a message — this is not a degraded case with
    // a plausible-looking answer, it is simply not a thing that happens. See the fixed-window
    // seriesOrder-style precondition rejection this mirrors (Decision 21).
    const result = simulateBullyElection([1, 2, 3], new Set([1, 3]), 2);
    expect(result).toEqual({ steps: [], leaderId: null });
  });

  it('elects the initiator immediately when it has no higher id in the cluster at all', () => {
    const result = simulateBullyElection([1, 2, 3], new Set([1, 2, 3]), 3);
    expect(result.leaderId).toBe(3);
    // No ELECTION message is needed — there is no one above 3 to send one to.
    expect(result.steps[0].messages).toEqual([]);
    // Broadcasts COORDINATOR to every other alive node.
    const coordinatorStep = result.steps[result.steps.length - 1];
    expect(coordinatorStep.messages).toEqual(
      expect.arrayContaining([
        { type: 'coordinator', from: 3, to: 1 },
        { type: 'coordinator', from: 3, to: 2 },
      ])
    );
  });

  it('elects the highest ALIVE id, not the highest id in the cluster, when the top node is down', () => {
    // 5 exists in the cluster but is down; 4 is the highest reachable id.
    const result = simulateBullyElection([1, 2, 3, 4, 5], new Set([1, 2, 3, 4]), 1);
    expect(result.leaderId).toBe(4);
  });

  it('bounces the election up through every intermediate alive node from the lowest initiator', () => {
    const result = simulateBullyElection([1, 2, 3, 4, 5], new Set([1, 2, 3, 4, 5]), 1);
    expect(result.leaderId).toBe(5);

    // Node 1's own ELECTION message must reach every higher id, per the algorithm's actual rule
    // ("send to all nodes with higher process ids"), not just the next one up.
    const firstStepTargets = result.steps[0].messages
      .filter((m) => m.type === 'election' && m.from === 1)
      .map((m) => m.to)
      .sort((a, b) => a - b);
    expect(firstStepTargets).toEqual([2, 3, 4, 5]);
  });

  it('never asks the same node to run its own election sub-attempt twice', () => {
    const result = simulateBullyElection([1, 2, 3, 4, 5, 6], new Set([1, 2, 3, 4, 5, 6]), 1);
    // Exclude the final COORDINATOR broadcast step: the leader legitimately reappears there as
    // the active candidate while announcing itself — that's not a repeated election attempt.
    const electionSteps = result.steps.filter((s) => s.messages.every((m) => m.type !== 'coordinator'));
    const allCandidates = electionSteps.flatMap((s) => s.candidates);
    expect(new Set(allCandidates).size).toBe(allCandidates.length);
  });

  it('generates real O(n^2)-shaped message volume for the worst case (lowest initiator, everyone alive)', () => {
    // This is the property that makes Bully's well-known message-cost criticism visible in the
    // simulation itself rather than only asserted in the lab's companion article's prose.
    const n5 = simulateBullyElection([1, 2, 3, 4, 5], new Set([1, 2, 3, 4, 5]), 1);
    const n10 = simulateBullyElection(
      Array.from({ length: 10 }, (_, i) => i + 1),
      new Set(Array.from({ length: 10 }, (_, i) => i + 1)),
      1
    );
    const totalMessages = (r: typeof n5) => r.steps.reduce((sum, s) => sum + s.messages.length, 0);
    // Doubling node count should more than double message volume — the quadratic signature,
    // distinguishing it from a linear (gossip-like) protocol.
    expect(totalMessages(n10)).toBeGreaterThan(totalMessages(n5) * 2);
  });

  it('sends no coordinator broadcast when the leader has no lower alive node to notify', () => {
    const result = simulateBullyElection([1, 2, 3], new Set([2]), 2);
    expect(result.leaderId).toBe(2);
    expect(result.steps.every((s) => s.messages.every((m) => m.type !== 'coordinator'))).toBe(true);
  });

  it('is fully deterministic — no randomness, unlike the gossip lab', () => {
    const a = simulateBullyElection([1, 2, 3, 4, 5], new Set([1, 3, 5]), 1);
    const b = simulateBullyElection([1, 2, 3, 4, 5], new Set([1, 3, 5]), 1);
    expect(a).toEqual(b);
  });

  it('elects the sole alive node in a mostly-crashed cluster', () => {
    const result = simulateBullyElection([1, 2, 3, 4, 5], new Set([3]), 3);
    expect(result.leaderId).toBe(3);
  });
});
