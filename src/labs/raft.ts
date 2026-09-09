/**
 * Raft (Ongaro & Ousterhout, 2014) — the consensus algorithm the leader-election lab's own
 * comparison table names as what production systems actually reach for over the Bully algorithm
 * ("production systems reach for Raft or ZAB"). This lab delivers on that setup: two real Raft
 * mechanisms, each demonstrating a property Bully simply doesn't have.
 *
 * 1. **Election restriction** (`simulateElection`) — a Raft candidate only wins a peer's vote if
 *    its own log is at least as up-to-date as that peer's (higher last-log term, or equal term and
 *    at least as long). Bully elects strictly by node id, with zero awareness of which node
 *    actually holds the most data — a stale node can win a Bully election outright. A Raft
 *    candidate with a stale log **cannot** win, even against peers happy to vote for it, which is
 *    exactly what keeps a node missing committed entries from ever becoming leader.
 * 2. **Commit-index safety** (`advanceCommitIndex`) — Raft's most subtle, most often hand-waved
 *    safety rule (the Raft paper's own Figure 8 scenario exists specifically to justify it): a
 *    leader must not conclude an entry is committed just because a majority of nodes have
 *    replicated it — it must *also* have replicated at least one entry from its own current term
 *    to a majority first. An entry from a previous term, sitting on a majority of nodes, can still
 *    be silently overwritten by a future leader with a different history; only once a current-term
 *    entry joins it on that majority does the whole prefix become genuinely safe. This lab counts
 *    the exact case where "committing by replica count alone" would have been wrong
 *    (`wouldBeUnsafeWithoutTermCheck`), rather than asserting the rule in prose only.
 */

export interface LogEntry {
  term: number;
}

/** True iff `candidateLog` is at least as up-to-date as `voterLog` — the real Raft election
 * restriction: compare last-log term first (higher wins outright), and only fall back to log
 * length when the last-log terms are equal. */
function isLogAtLeastAsUpToDate(candidateLog: LogEntry[], voterLog: LogEntry[]): boolean {
  const candidateLastTerm = candidateLog.length > 0 ? candidateLog[candidateLog.length - 1].term : 0;
  const voterLastTerm = voterLog.length > 0 ? voterLog[voterLog.length - 1].term : 0;
  if (candidateLastTerm !== voterLastTerm) {
    return candidateLastTerm > voterLastTerm;
  }
  return candidateLog.length >= voterLog.length;
}

export interface PeerState {
  log: LogEntry[];
  alive: boolean;
}

export interface ElectionResult {
  candidateId: string;
  term: number;
  /** Node ids that granted a vote, including the candidate's own vote for itself. */
  votesGranted: string[];
  /** Majority of the *whole* cluster (alive or not) — a down node still counts toward the
   * denominator, the same partition-tolerant quorum semantics `redlock.ts` and
   * `leaderElection.ts` already use. */
  quorum: number;
  elected: boolean;
}

/**
 * `peers` covers every other node in the cluster, alive or not. A down peer simply can't grant a
 * vote (it's unreachable); an alive peer grants one only if `candidateLog` is at least as
 * up-to-date as that peer's own log — the actual election restriction, not a name-only rule.
 */
export function simulateElection(
  candidateId: string,
  candidateLog: LogEntry[],
  term: number,
  peers: Record<string, PeerState>
): ElectionResult {
  const clusterSize = 1 + Object.keys(peers).length;
  const quorum = Math.floor(clusterSize / 2) + 1;
  const votesGranted = [candidateId];

  for (const [peerId, peer] of Object.entries(peers)) {
    if (peer.alive && isLogAtLeastAsUpToDate(candidateLog, peer.log)) {
      votesGranted.push(peerId);
    }
  }

  return { candidateId, term, votesGranted, quorum, elected: votesGranted.length >= quorum };
}

export interface CommitAdvancement {
  currentTerm: number;
  /** Every node's match index, leader's own included (always `leaderLog.length`). */
  matchIndexes: number[];
  quorum: number;
  /** The new commit index — 0 if nothing is safely committed yet. */
  newCommitIndex: number;
  /** True iff some index has majority replication but its entry is from a term other than
   * `currentTerm` — the case a naive "commit by replica count alone" resolver would have wrongly
   * treated as committed. */
  wouldBeUnsafeWithoutTermCheck: boolean;
}

/**
 * The real Raft commit rule: find the highest index N such that a majority of `matchIndexes`
 * (leader's own log length included) are `>= N`, **and** `leaderLog[N-1].term === currentTerm`.
 * Replication count is monotonically non-decreasing as N decreases (a node whose matchIndex is
 * `>= N` is also `>= N-1`), so once a majority is reached at some N, it holds for every smaller N
 * too — the scan below relies on exactly that to find the highest committable index, not just the
 * highest majority-replicated one.
 */
export function advanceCommitIndex(
  leaderLog: LogEntry[],
  followerMatchIndexes: number[],
  currentTerm: number
): CommitAdvancement {
  if (followerMatchIndexes.some((m) => m < 0 || m > leaderLog.length)) {
    throw new Error('advanceCommitIndex requires every matchIndex to be within [0, leaderLog.length]');
  }

  const matchIndexes = [leaderLog.length, ...followerMatchIndexes];
  const quorum = Math.floor(matchIndexes.length / 2) + 1;

  let newCommitIndex = 0;
  let wouldBeUnsafeWithoutTermCheck = false;

  for (let n = leaderLog.length; n >= 1; n--) {
    const replicatedCount = matchIndexes.filter((m) => m >= n).length;
    if (replicatedCount < quorum) {
      continue;
    }
    if (leaderLog[n - 1].term === currentTerm) {
      newCommitIndex = n;
      break;
    }
    wouldBeUnsafeWithoutTermCheck = true;
  }

  return { currentTerm, matchIndexes, quorum, newCommitIndex, wouldBeUnsafeWithoutTermCheck };
}
