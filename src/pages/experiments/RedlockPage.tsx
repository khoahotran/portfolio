import { AlertTriangle, CheckCircle2, Lock, ShieldAlert, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { attemptRedlockAcquisition, simulatePauseAfterAcquire } from '../../labs/redlock';
import { useSeo } from '../../seo/useSeo';

/** Fixed, not a slider: the per-node acquire timeout should be small relative to the TTL by
 * design (that's the whole point of it — a down node can't stall the attempt past a bounded
 * cost), so exposing it as a knob would let a reader construct a case Redlock's own spec rules
 * out rather than one it's actually vulnerable to. */
const ACQUIRE_TIMEOUT_MS = 50;

function nodePosition(index: number, total: number): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 38;
  return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
}

function RedlockPage() {
  useSeo({
    title: 'Distributed Locks: Redlock Visualizer',
    description: 'Run the real Redlock quorum-acquisition algorithm, then simulate the pause that lets a second client sneak in.',
  });

  const [nodeCount, setNodeCount] = useState(5);
  const [downIds, setDownIds] = useState<Set<number>>(() => new Set());
  const [latencyMs, setLatencyMs] = useState(10);
  const [ttlMs, setTtlMs] = useState(1000);
  const [pauseMs, setPauseMs] = useState(0);

  function toggleNode(id: number) {
    setDownIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const acquisition = useMemo(() => {
    const latencies = Array.from({ length: nodeCount }, () => latencyMs);
    return attemptRedlockAcquisition(nodeCount, downIds, latencies, ttlMs, ACQUIRE_TIMEOUT_MS);
  }, [nodeCount, downIds, latencyMs, ttlMs]);

  const pause = useMemo(() => {
    if (!acquisition.acquired) return null;
    return simulatePauseAfterAcquire(acquisition.remainingValidityMs, pauseMs);
  }, [acquisition, pauseMs]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="redlock" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Distributed Locks: Redlock</h1>
      <p className="mt-2 text-slate-600">
        Runs the real Redlock quorum-acquisition arithmetic against nodes you control, then simulates
        the specific pause-based flaw Martin Kleppmann's 2016 critique centers on.
      </p>

      <ProvenanceNote labId="redlock" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Nodes</span>
              <span className="text-teal-700">{nodeCount}</span>
            </div>
            <input
              type="range"
              min={3}
              max={9}
              value={nodeCount}
              onChange={(event) => {
                setNodeCount(Number(event.target.value));
                setDownIds(new Set());
              }}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Per-node latency</span>
              <span className="text-teal-700">{latencyMs}ms</span>
            </div>
            <input
              type="range"
              min={1}
              max={400}
              value={latencyMs}
              onChange={(event) => setLatencyMs(Number(event.target.value))}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Lock TTL</span>
              <span className="text-teal-700">{ttlMs}ms</span>
            </div>
            <input
              type="range"
              min={200}
              max={2000}
              step={50}
              value={ttlMs}
              onChange={(event) => setTtlMs(Number(event.target.value))}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <p className="text-xs text-slate-500">
            Click any node to crash or recover it. Acquire timeout is fixed at {ACQUIRE_TIMEOUT_MS}ms —
            a down node can never cost the attempt more than that, which is the entire reason for
            having a short per-node timeout at all.
          </p>

          <div className="relative w-full aspect-square max-w-[220px] mx-auto">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <circle cx={50} cy={50} r={12} fill="none" stroke="rgb(203, 213, 225)" strokeWidth={0.6} strokeDasharray="2,2" />
              {Array.from({ length: nodeCount }, (_, i) => i + 1).map((id) => {
                const { x, y } = nodePosition(id - 1, nodeCount);
                const isDown = downIds.has(id);
                const attempt = acquisition.attempts.find((a) => a.nodeId === id);
                return (
                  <g key={id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={3.5}
                      fill={isDown ? 'rgb(203, 213, 225)' : attempt?.acquired ? 'rgb(13, 148, 136)' : 'rgb(225, 29, 72)'}
                      className="cursor-pointer"
                      onClick={() => toggleNode(id)}
                      role="button"
                      aria-label={`Node ${id}${isDown ? ', down' : ', alive'} — click to ${isDown ? 'recover' : 'crash'}`}
                    />
                    <text x={x} y={y + 0.2} fontSize={3} textAnchor="middle" dominantBaseline="middle" fill="white" className="pointer-events-none select-none font-bold">
                      {isDown ? '×' : id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Stage 1 — Quorum Acquisition
            </h2>

            <div className="grid grid-cols-3 gap-4 text-center mb-5">
              <div>
                <div className="text-lg font-bold text-slate-900">
                  {acquisition.acquiredCount} / {nodeCount}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Nodes acquired (need {acquisition.quorum})
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">{acquisition.elapsedMs}ms</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Time to acquire</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${acquisition.remainingValidityMs > 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                  {acquisition.remainingValidityMs}ms
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Validity remaining</div>
              </div>
            </div>

            <div
              className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
                acquisition.acquired
                  ? 'border-teal-200 bg-teal-50 text-teal-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {acquisition.acquired ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
              )}
              <p>
                {acquisition.acquired
                  ? 'Lock acquired — quorum reached with validity left to spend.'
                  : acquisition.acquiredCount < acquisition.quorum
                    ? `Lock NOT acquired — only ${acquisition.acquiredCount} of ${nodeCount} nodes responded, short of the ${acquisition.quorum}-node quorum.`
                    : 'Lock NOT acquired — quorum was reached, but acquiring it consumed the entire TTL. Nothing is left to actually use.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Stage 2 — The Pause Kleppmann's Critique Is About
            </h2>

            {!acquisition.acquired ? (
              <p className="text-sm text-slate-500">Acquire the lock in Stage 1 first — there's nothing to pause on top of a failed acquisition.</p>
            ) : (
              <>
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                  <div className="flex justify-between">
                    <span>Simulated pause after acquiring (GC pause, slow disk, descheduled VM…)</span>
                    <span className="text-teal-700">{pauseMs}ms</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(200, acquisition.remainingValidityMs * 2)}
                    value={pauseMs}
                    onChange={(event) => setPauseMs(Number(event.target.value))}
                    className="mt-3 w-full accent-teal-600"
                  />
                </label>

                {pause && (
                  <div
                    className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
                      pause.lockExpiredDuringPause
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-teal-200 bg-teal-50 text-teal-800'
                    }`}
                  >
                    {pause.lockExpiredDuringPause ? (
                      <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                    )}
                    <p>
                      {pause.lockExpiredDuringPause
                        ? "The lock expired mid-pause. A second client racing for this key could win a fresh quorum right now — this client still believes it holds the lock, and Redlock's storage nodes have no way to know a pause happened at all."
                        : 'The pause finished before the remaining validity ran out — no second client could have acquired the lock in that window.'}
                    </p>
                  </div>
                )}

                <p className="mt-4 text-xs text-slate-500">
                  This is Kleppmann's point rendered as arithmetic, not opinion: the lock's expiry is a
                  clock on the storage nodes, not a property of what this client is doing. Redlock alone
                  can't prevent the pause — Antirez's own reply is that a fencing token, checked by the
                  resource being protected, is what actually closes this gap; Redlock only bounds how
                  quickly a client can detect it lost the lock, not whether it can.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default RedlockPage;
