import { describe, expect, it } from 'vitest';
import { simulateGossip } from './gossipProtocol';

describe('simulateGossip', () => {
  it('returns nothing for a non-positive node count', () => {
    expect(simulateGossip(0, 2, 10)).toEqual([]);
    expect(simulateGossip(-1, 2, 10)).toEqual([]);
  });

  it('stalls immediately when fanout is 0 — patient zero never pushes', () => {
    const rounds = simulateGossip(10, 0, 10);
    expect(rounds).toEqual([]);
  });

  it('infects every other node in exactly one round when fanout covers all peers', () => {
    // fanout = nodeCount - 1: every infected node contacts literally everyone else at once.
    const rounds = simulateGossip(6, 5, 10);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].infectedCount).toBe(6);
    expect(rounds[0].newlyInfected).toEqual([1, 2, 3, 4, 5]);
  });

  it('reaches full coverage within a bounded number of rounds for a reasonable fanout', () => {
    const nodeCount = 50;
    const rounds = simulateGossip(nodeCount, 3, 30);
    const last = rounds[rounds.length - 1];
    expect(last.infectedCount).toBe(nodeCount);
    // O(log n) convergence is the whole point of push gossip — for n=50 this should be well
    // under a linear number of rounds, not just "eventually" under the generous 30-round cap.
    expect(rounds.length).toBeLessThan(15);
  });

  it('infected count is monotonically non-decreasing and never exceeds nodeCount', () => {
    const nodeCount = 30;
    const rounds = simulateGossip(nodeCount, 2, 30);
    let previous = 1;
    for (const r of rounds) {
      expect(r.infectedCount).toBeGreaterThanOrEqual(previous);
      expect(r.infectedCount).toBeLessThanOrEqual(nodeCount);
      previous = r.infectedCount;
    }
  });

  it('never reports the same node as newly infected twice across all rounds', () => {
    const rounds = simulateGossip(40, 2, 30);
    const seen = new Set<number>([0]); // node 0 starts infected
    for (const r of rounds) {
      for (const id of r.newlyInfected) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  });

  it('is fully deterministic given a fixed rng sequence', () => {
    const fixedRng = () => 0; // always "pick the first candidate after each swap"
    const a = simulateGossip(12, 2, 10, fixedRng);
    const b = simulateGossip(12, 2, 10, fixedRng);
    expect(a).toEqual(b);
  });

  it('respects maxRounds as a hard cap even if not fully converged', () => {
    // fanout 1 on a large population, capped very low — should not silently run past maxRounds.
    const rounds = simulateGossip(200, 1, 2);
    expect(rounds.length).toBeLessThanOrEqual(2);
  });
});
