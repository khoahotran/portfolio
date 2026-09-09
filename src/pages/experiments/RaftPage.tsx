import { AlertTriangle, CheckCircle2, ShieldCheck, Vote, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { advanceCommitIndex, simulateElection } from '../../labs/raft';
import type { PeerState } from '../../labs/raft';
import { useSeo } from '../../seo/useSeo';

const PEER_IDS = ['p1', 'p2', 'p3', 'p4'];
const OLD_TERM = 2;
const CURRENT_TERM = 4;

function RaftPage() {
  useSeo({
    title: 'Raft Consensus Visualizer',
    description: "Run Raft's real election restriction and commit-index safety rule — see why a stale node can't win an election, and why replica count alone can't prove a log entry is safely committed.",
  });

  // Stage 1 — election restriction
  const [candidateLogLength, setCandidateLogLength] = useState(2);
  const [peerLogLengths, setPeerLogLengths] = useState<Record<string, number>>({ p1: 1, p2: 3, p3: 3, p4: 0 });
  const [downPeers, setDownPeers] = useState<Set<string>>(() => new Set());

  const peers: Record<string, PeerState> = useMemo(
    () =>
      Object.fromEntries(
        PEER_IDS.map((id) => [
          id,
          { log: Array.from({ length: peerLogLengths[id] }, () => ({ term: 1 })), alive: !downPeers.has(id) },
        ])
      ),
    [peerLogLengths, downPeers]
  );

  const election = useMemo(
    () => simulateElection('candidate', Array.from({ length: candidateLogLength }, () => ({ term: 1 })), 1, peers),
    [candidateLogLength, peers]
  );

  function togglePeerDown(id: string) {
    setDownPeers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Stage 2 — commit-index safety
  const [matchIndexes, setMatchIndexes] = useState<number[]>([1, 1, 2, 0]);
  // Fixed, not a slider: the scenario is the two-term log itself, not something the reader tunes —
  // only each follower's replication progress (matchIndexes) is the variable being explored.
  const leaderLog = useMemo(() => [{ term: OLD_TERM }, { term: CURRENT_TERM }], []);
  const commit = useMemo(() => advanceCommitIndex(leaderLog, matchIndexes, CURRENT_TERM), [leaderLog, matchIndexes]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="raft" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Raft Consensus</h1>
      <p className="mt-2 text-slate-600">
        Two real Raft mechanisms Bully doesn't have: an election that a stale node can't win no
        matter how many peers are alive, and a commit rule that won't trust replica count alone.
      </p>

      <ProvenanceNote labId="raft" />

      <div className="mt-8 space-y-10">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            <Vote className="w-4 h-4" aria-hidden="true" /> Stage 1 — Election Restriction
          </h2>
          <div className="grid gap-6 md:grid-cols-12">
            <div className="min-w-0 md:col-span-4 space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
              <label className="block text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span className="font-bold text-teal-700">Candidate's log length</span>
                  <span>{candidateLogLength}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={candidateLogLength}
                  onChange={(e) => setCandidateLogLength(Number(e.target.value))}
                  className="mt-1.5 w-full accent-teal-600"
                />
              </label>
              {PEER_IDS.map((id) => (
                <label key={id} className={`block text-xs font-semibold ${downPeers.has(id) ? 'text-slate-300' : 'text-slate-600'}`}>
                  <div className="flex justify-between">
                    <span>{id} log length</span>
                    <button
                      type="button"
                      onClick={() => togglePeerDown(id)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${downPeers.has(id) ? 'bg-slate-200 text-slate-500' : 'bg-teal-50 text-teal-700'}`}
                    >
                      {downPeers.has(id) ? 'down' : 'alive'}
                    </button>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    disabled={downPeers.has(id)}
                    value={peerLogLengths[id]}
                    onChange={(e) => setPeerLogLengths((prev) => ({ ...prev, [id]: Number(e.target.value) }))}
                    className="mt-1.5 w-full accent-teal-600 disabled:opacity-30"
                  />
                </label>
              ))}
            </div>

            <div className="min-w-0 md:col-span-8 space-y-4">
              <div
                className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
                  election.elected ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-rose-200 bg-rose-50 text-rose-800'
                }`}
              >
                {election.elected ? <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" /> : <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />}
                <p>
                  {election.votesGranted.length} of {election.quorum} needed —{' '}
                  {election.elected
                    ? 'elected leader.'
                    : "not elected. Every alive peer with a more up-to-date log refuses this candidate's vote request, no matter how many peers are alive — the exact thing Bully's pure id-based election can't do."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Vote per peer</p>
                <div className="space-y-2">
                  {PEER_IDS.map((id) => {
                    const granted = election.votesGranted.includes(id);
                    const down = downPeers.has(id);
                    return (
                      <div key={id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                        <span className="font-mono text-slate-600">{id} (log length {peerLogLengths[id]})</span>
                        <span className={`font-bold ${down ? 'text-slate-400' : granted ? 'text-teal-700' : 'text-rose-700'}`}>
                          {down ? 'unreachable' : granted ? 'vote granted' : 'vote refused — more up-to-date'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Stage 2 — Commit-Index Safety
          </h2>
          <div className="grid gap-6 md:grid-cols-12">
            <div className="min-w-0 md:col-span-4 space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
              <p className="text-xs text-slate-500">
                The leader's log is fixed: index 1 from an old term ({OLD_TERM}), index 2 from the
                current term ({CURRENT_TERM}). Drag each follower's replication progress.
              </p>
              {matchIndexes.map((value, i) => (
                <label key={i} className="block text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Follower {i + 1}</span>
                    <span>{value === 0 ? 'nothing' : `index ${value}`}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    value={value}
                    onChange={(e) =>
                      setMatchIndexes((prev) => prev.map((v, idx) => (idx === i ? Number(e.target.value) : v)))
                    }
                    className="mt-1.5 w-full accent-teal-600"
                  />
                </label>
              ))}
            </div>

            <div className="min-w-0 md:col-span-8 space-y-4">
              <div
                className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
                  commit.wouldBeUnsafeWithoutTermCheck
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : commit.newCommitIndex > 0
                      ? 'border-teal-200 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {commit.wouldBeUnsafeWithoutTermCheck ? <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />}
                <p>
                  Committed through index {commit.newCommitIndex} of 2 ({commit.matchIndexes.filter((m) => m >= 1).length}/{commit.quorum} needed replicated index 1).
                  {commit.wouldBeUnsafeWithoutTermCheck &&
                    ' A majority has replicated the old-term entry — but replica count alone would have wrongly called that committed. Raft refuses, because that entry isn\'t from the current term.'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Leader's log</p>
                <div className="flex gap-2">
                  <div className={`flex-1 rounded-lg border p-3 text-center text-xs font-bold ${commit.newCommitIndex >= 1 ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    Index 1 — term {OLD_TERM}
                    <div className="mt-1 font-normal">{commit.newCommitIndex >= 1 ? 'committed' : 'not yet committed'}</div>
                  </div>
                  <div className={`flex-1 rounded-lg border p-3 text-center text-xs font-bold ${commit.newCommitIndex >= 2 ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                    Index 2 — term {CURRENT_TERM}
                    <div className="mt-1 font-normal">{commit.newCommitIndex >= 2 ? 'committed' : 'not yet committed'}</div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Try: all four followers at "index 1" only. A majority (4/5, leader included) has
                  the old-term entry — yet nothing commits. Now move any two followers to "index 2":
                  the current-term entry reaches a majority, and both indexes commit together.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default RaftPage;
