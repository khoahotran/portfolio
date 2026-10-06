import { describe, expect, it } from 'vitest';
import { advanceCommitIndex, simulateElection } from './raft';
import type { LogEntry, PeerState } from './raft';

function logOfLength(length: number, term = 1): LogEntry[] {
  return Array.from({ length }, () => ({ term }));
}

describe('simulateElection — the election restriction Bully does not have', () => {
  it('a candidate whose log is behind loses the election even though every peer is alive', () => {
    // Candidate has only 1 entry; three peers each have 3 entries at the same last term — all
    // strictly more up-to-date, so none of them can grant a vote no matter how "electable" the
    // candidate would otherwise look. A fourth peer has an empty log (less up-to-date than the
    // candidate) and does grant a vote.
    const peers: Record<string, PeerState> = {
      p1: { log: logOfLength(3), alive: true },
      p2: { log: logOfLength(3), alive: true },
      p3: { log: logOfLength(3), alive: true },
      p4: { log: [], alive: true },
    };
    const result = simulateElection('candidate', logOfLength(1), 1, peers);
    expect(result.votesGranted.sort()).toEqual(['candidate', 'p4'].sort());
    expect(result.quorum).toBe(3); // majority of 5
    expect(result.elected).toBe(false);
  });

  it('a candidate with the most up-to-date log wins every vote', () => {
    const peers: Record<string, PeerState> = {
      p1: { log: logOfLength(1), alive: true },
      p2: { log: logOfLength(2), alive: true },
      p3: { log: [], alive: true },
      p4: { log: logOfLength(3), alive: true },
    };
    const result = simulateElection('candidate', logOfLength(5), 1, peers);
    expect(result.votesGranted).toHaveLength(5);
    expect(result.elected).toBe(true);
  });

  it('a higher last-log term always wins the comparison, regardless of length', () => {
    const peers: Record<string, PeerState> = {
      p1: { log: logOfLength(4, 1), alive: true }, // longer, but an older term
    };
    const result = simulateElection('candidate', logOfLength(1, 2), 2, peers);
    expect(result.votesGranted).toContain('p1');
  });

  it('with equal last-log term, a longer log is required to be considered at least as up-to-date', () => {
    const peers: Record<string, PeerState> = {
      shorter: { log: logOfLength(1, 1), alive: true },
      longer: { log: logOfLength(3, 1), alive: true },
    };
    const result = simulateElection('candidate', logOfLength(2, 1), 1, peers);
    expect(result.votesGranted).toContain('shorter');
    expect(result.votesGranted).not.toContain('longer');
  });

  it('a down peer cannot grant a vote, even with a log that would otherwise qualify', () => {
    const peers: Record<string, PeerState> = {
      p1: { log: [], alive: false },
      p2: { log: [], alive: true },
    };
    const result = simulateElection('candidate', logOfLength(1), 1, peers);
    expect(result.votesGranted).not.toContain('p1');
    expect(result.votesGranted).toContain('p2');
  });

  it('down nodes still count toward the quorum denominator — partition tolerance, not a smaller cluster', () => {
    // 5-node cluster, 2 down. Quorum is still 3 (majority of 5), not 2 (majority of the 3 alive).
    const peers: Record<string, PeerState> = {
      p1: { log: [], alive: false },
      p2: { log: [], alive: false },
      p3: { log: [], alive: true },
      p4: { log: [], alive: true },
    };
    const result = simulateElection('candidate', logOfLength(1), 1, peers);
    expect(result.quorum).toBe(3);
    // Candidate + p3 + p4 = 3, exactly quorum.
    expect(result.elected).toBe(true);
  });
});

describe('advanceCommitIndex — the subtle safety rule', () => {
  it('rejects a matchIndex outside [0, leaderLog.length]', () => {
    expect(() => advanceCommitIndex(logOfLength(2), [3], 1)).toThrow();
    expect(() => advanceCommitIndex(logOfLength(2), [-1], 1)).toThrow();
  });

  it('unanimous replication of a current-term entry commits immediately', () => {
    const leaderLog = logOfLength(2, 3); // both entries at term 3, currentTerm 3
    const result = advanceCommitIndex(leaderLog, [2, 2, 2, 2], 3);
    expect(result.newCommitIndex).toBe(2);
    expect(result.wouldBeUnsafeWithoutTermCheck).toBe(false);
  });

  it('no majority anywhere leaves nothing committed', () => {
    const leaderLog = logOfLength(2, 3);
    const result = advanceCommitIndex(leaderLog, [0, 0, 0, 0], 3);
    expect(result.newCommitIndex).toBe(0);
    expect(result.quorum).toBe(3); // 5-node cluster (leader + 4 followers)
  });

  it('a previous-term entry on a majority is NOT committed by replica count alone — the actual finding', () => {
    // Leader's log: index 1 is an old term-2 entry, index 2 is the new term-4 entry (currentTerm 4).
    // 5-node cluster: 2 followers only have the term-2 entry (matchIndex 1), 1 follower has both
    // (matchIndex 2), 1 follower has nothing (matchIndex 0). A majority (4 of 5, leader included)
    // has replicated index 1 — but its term (2) doesn't match currentTerm (4).
    const leaderLog: LogEntry[] = [{ term: 2 }, { term: 4 }];
    const result = advanceCommitIndex(leaderLog, [1, 1, 2, 0], 4);
    expect(result.newCommitIndex).toBe(0);
    expect(result.wouldBeUnsafeWithoutTermCheck).toBe(true);
  });

  it('once a current-term entry also reaches a majority, the whole prefix becomes safely committed', () => {
    // Same leader log as above, but now 3 of 4 followers have replicated both entries.
    const leaderLog: LogEntry[] = [{ term: 2 }, { term: 4 }];
    const result = advanceCommitIndex(leaderLog, [2, 2, 2, 0], 4);
    expect(result.newCommitIndex).toBe(2);
    // The higher index (matching current term) is found first in the scan, so the "unsafe" flag
    // for the lower, old-term index is never reached — the safe path short-circuits it entirely.
    expect(result.wouldBeUnsafeWithoutTermCheck).toBe(false);
  });
});
