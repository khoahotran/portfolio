import { Crown, Pause, Play, RotateCcw, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { simulateBullyElection } from '../../labs/leaderElection';
import type { ElectionMessageType } from '../../labs/leaderElection';
import { useSeo } from '../../seo/useSeo';

function nodePosition(index: number, total: number): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 38;
  return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
}

const MESSAGE_STYLE: Record<ElectionMessageType, { stroke: string; label: string; dash?: string }> = {
  election: { stroke: 'rgb(217, 119, 6)', label: 'ELECTION', dash: '2,1.5' },
  alive: { stroke: 'rgb(2, 132, 199)', label: 'ALIVE' },
  coordinator: { stroke: 'rgb(13, 148, 136)', label: 'COORDINATOR' },
};

function LeaderElectionPage() {
  useSeo({
    title: 'Leader Election (Bully Algorithm) Visualizer',
    description: 'A real Bully algorithm election, run step by step — crash the leader and watch a new one get chosen.',
  });

  const [nodeCount, setNodeCount] = useState(7);
  const [downIds, setDownIds] = useState<Set<number>>(() => new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const nodeIds = useMemo(() => Array.from({ length: nodeCount }, (_, i) => i + 1), [nodeCount]);
  const aliveIds = useMemo(() => new Set(nodeIds.filter((id) => !downIds.has(id))), [nodeIds, downIds]);

  // The node that "notices" the previous leader is unreachable and starts the election is always
  // the lowest surviving id — a deliberate simplification so the lab has one control (which nodes
  // are down) instead of two, and because it also happens to be the worst case for message volume
  // (see the O(n^2) test in leaderElection.test.ts), which is the more interesting thing to show.
  const initiatorId = useMemo(() => {
    const sorted = [...aliveIds].sort((a, b) => a - b);
    return sorted[0] ?? null;
  }, [aliveIds]);

  const result = useMemo(() => {
    if (initiatorId === null) return { steps: [], leaderId: null };
    return simulateBullyElection(nodeIds, aliveIds, initiatorId);
  }, [nodeIds, aliveIds, initiatorId]);

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [result]);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= result.steps.length) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), 900);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, result.steps.length]);

  function toggleNode(id: number) {
    setDownIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function crashLeader() {
    if (result.leaderId !== null) toggleNode(result.leaderId);
  }

  const activeMessages = currentStep > 0 ? (result.steps[currentStep - 1]?.messages ?? []) : [];
  const totalMessages = result.steps.reduce((sum, s) => sum + s.messages.length, 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="leader-election" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Leader Election (Bully Algorithm)</h1>
      <p className="mt-2 text-slate-600">
        Crash the current leader and watch the real Bully election protocol pick a new one — every
        message shown actually gets sent by the simulation, not implied.
      </p>

      <ProvenanceNote labId="leader-election" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Nodes</span>
              <span className="text-teal-700">{nodeCount}</span>
            </div>
            <input
              type="range"
              min={4}
              max={10}
              value={nodeCount}
              onChange={(event) => {
                setNodeCount(Number(event.target.value));
                setDownIds(new Set());
              }}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <button
            type="button"
            onClick={crashLeader}
            disabled={result.leaderId === null}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
          >
            <Zap size={14} aria-hidden="true" />
            Crash the leader
          </button>

          <button
            type="button"
            onClick={() => setDownIds(new Set())}
            disabled={downIds.size === 0}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Recover all nodes
          </button>

          <p className="text-xs text-slate-500">
            Click any node in the ring to crash or recover it directly. Node {initiatorId ?? '—'} is the
            lowest surviving id, so it's the one that notices the leader is gone and starts the election
            — the worst case for message volume.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-center">
            <div>
              <div className="text-lg font-bold text-teal-700">
                {result.leaderId ?? (initiatorId === null ? '—' : '…')}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {currentStep >= result.steps.length ? 'Leader' : 'Electing'}
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{totalMessages}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total messages</div>
            </div>
          </div>

          {initiatorId === null && (
            <p className="pt-2 text-xs font-semibold text-red-600">
              Every node is down — there's no one left alive to notice, let alone start an election.
            </p>
          )}
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Step {currentStep} of {result.steps.length}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                disabled={result.steps.length === 0}
                className="flex items-center gap-1 rounded-md bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-50"
              >
                {isPlaying ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStep(0);
                }}
                className="flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={result.steps.length}
            value={currentStep}
            onChange={(event) => {
              setIsPlaying(false);
              setCurrentStep(Number(event.target.value));
            }}
            className="mb-4 w-full accent-teal-600"
            aria-label="Step scrubber"
          />

          <div className="relative w-full min-h-[320px] bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {activeMessages.map((m, i) => {
                const from = nodePosition(m.from - 1, nodeCount);
                const to = nodePosition(m.to - 1, nodeCount);
                const style = MESSAGE_STYLE[m.type];
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={style.stroke}
                    strokeWidth={m.type === 'coordinator' ? 0.8 : 0.5}
                    strokeDasharray={style.dash}
                    opacity={0.85}
                  />
                );
              })}
              {nodeIds.map((id) => {
                const { x, y } = nodePosition(id - 1, nodeCount);
                const isDown = downIds.has(id);
                const isLeader = currentStep >= result.steps.length && result.leaderId === id;
                const isInitiator = id === initiatorId;
                return (
                  <g key={id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isLeader ? 4.5 : 3.5}
                      fill={isDown ? 'rgb(203, 213, 225)' : isLeader ? 'rgb(217, 119, 6)' : 'rgb(13, 148, 136)'}
                      stroke={isInitiator && !isDown ? 'rgb(15, 23, 42)' : 'none'}
                      strokeWidth={0.6}
                      className="cursor-pointer"
                      onClick={() => toggleNode(id)}
                      role="button"
                      aria-label={`Node ${id}${isDown ? ', down' : ', alive'}${isLeader ? ', leader' : ''} — click to ${isDown ? 'recover' : 'crash'}`}
                    />
                    <text x={x} y={y + 0.2} fontSize={3} textAnchor="middle" dominantBaseline="middle" fill="white" className="pointer-events-none select-none font-bold">
                      {isDown ? '×' : id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-600" aria-hidden="true" />
              Alive
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
              <Crown size={11} aria-hidden="true" className="text-amber-600" />
              Leader
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />
              Down (click to recover)
            </span>
            <span className="ml-auto text-slate-500">Ring outline = election initiator</span>
          </div>

          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`Messages sent in step ${currentStep}`}>
            {activeMessages.length === 0 && currentStep === 0 && (
              <li className="text-xs text-slate-500">Press Play or drag the scrubber to see the election unfold.</li>
            )}
            {activeMessages.map((m, i) => (
              <li
                key={i}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: `${MESSAGE_STYLE[m.type].stroke}1a`, color: MESSAGE_STYLE[m.type].stroke }}
              >
                {m.from} → {m.to} {MESSAGE_STYLE[m.type].label}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

export default LeaderElectionPage;
