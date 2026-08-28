import { Pause, Play, RotateCcw, Shuffle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { simulateGossip } from '../../labs/gossipProtocol';
import { useSeo } from '../../seo/useSeo';

const MAX_ROUNDS = 30;

function nodePosition(index: number, total: number): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 38;
  return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
}

function GossipProtocolVisualizerPage() {
  useSeo({
    title: 'Gossip Protocol Visualizer',
    description: 'A real push-based epidemic broadcast simulation — watch a message spread node by node.',
  });

  const [nodeCount, setNodeCount] = useState(24);
  const [fanout, setFanout] = useState(2);
  const [reshuffleToken, setReshuffleToken] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Math.random() runs inside this useMemo, so a new random simulation is only drawn when one of
  // the actual inputs changes — nodeCount, fanout, or an explicit "Reshuffle" click — not on every
  // render, the same pattern RetryStrategyVisualizerPage uses for its jitter.
  const rounds = useMemo(() => {
    // Not read for its value — `void`-ing it is what tells useMemo (and exhaustive-deps) that
    // bumping reshuffleToken via the "Reshuffle peers" button should force a fresh Math.random()
    // draw below, the same way changing nodeCount or fanout does.
    void reshuffleToken;
    return simulateGossip(nodeCount, fanout, MAX_ROUNDS);
  }, [nodeCount, fanout, reshuffleToken]);

  useEffect(() => {
    setCurrentRound(0);
    setIsPlaying(false);
  }, [rounds]);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentRound >= rounds.length) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => setCurrentRound((r) => r + 1), 700);
    return () => clearTimeout(timer);
  }, [isPlaying, currentRound, rounds.length]);

  // Cumulative set of infected node ids as of `currentRound` — node 0 is always patient zero.
  const infectedIds = useMemo(() => {
    const ids = new Set<number>([0]);
    for (let i = 0; i < currentRound; i += 1) {
      for (const id of rounds[i]?.newlyInfected ?? []) ids.add(id);
    }
    return ids;
  }, [rounds, currentRound]);

  const converged = rounds.length > 0 && rounds[rounds.length - 1].infectedCount === nodeCount;
  const coveragePercent = (infectedIds.size / nodeCount) * 100;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="gossip-protocol-visualizer" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gossip Protocol Visualizer</h1>
      <p className="mt-2 text-slate-600">
        A push-based epidemic broadcast: one node starts with a message, and every infected node
        gossips to a random {fanout === 1 ? 'peer' : `${fanout} peers`} each round.
      </p>

      <ProvenanceNote labId="gossip-protocol-visualizer" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Nodes</span>
              <span className="text-teal-700">{nodeCount}</span>
            </div>
            <input
              type="range"
              min={6}
              max={60}
              value={nodeCount}
              onChange={(event) => setNodeCount(Number(event.target.value))}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Fanout</span>
              <span className="text-teal-700">{fanout}</span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              value={fanout}
              onChange={(event) => setFanout(Number(event.target.value))}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <button
            type="button"
            onClick={() => setReshuffleToken((t) => t + 1)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200"
          >
            <Shuffle size={14} aria-hidden="true" />
            Reshuffle peers
          </button>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-center">
            <div>
              <div className="text-lg font-bold text-teal-700">{infectedIds.size}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Reached</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{coveragePercent.toFixed(0)}%</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Coverage</div>
            </div>
          </div>

          <p className="pt-2 text-xs text-slate-500">
            {converged
              ? `Fully converged in ${rounds.length} round${rounds.length === 1 ? '' : 's'} — O(log n) spread, not linear.`
              : fanout === 0
                ? 'Fanout is 0 — patient zero never pushes, so the message never leaves node 0.'
                : `Did not reach full coverage within ${MAX_ROUNDS} rounds at this fanout.`}
          </p>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Round {currentRound} of {rounds.length}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                disabled={rounds.length === 0}
                className="flex items-center gap-1 rounded-md bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-50"
              >
                {isPlaying ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentRound(0);
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
            max={rounds.length}
            value={currentRound}
            onChange={(event) => {
              setIsPlaying(false);
              setCurrentRound(Number(event.target.value));
            }}
            className="mb-4 w-full accent-teal-600"
            aria-label="Round scrubber"
          />

          <div className="relative w-full min-h-[320px] bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              {Array.from({ length: nodeCount }, (_, i) => {
                const { x, y } = nodePosition(i, nodeCount);
                const isPatientZero = i === 0;
                const isInfected = infectedIds.has(i);
                const isNewThisRound = currentRound > 0 && (rounds[currentRound - 1]?.newlyInfected.includes(i) ?? false);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={isPatientZero ? 3 : 2.2}
                    fill={isInfected ? 'rgb(13, 148, 136)' : 'rgb(203, 213, 225)'}
                    stroke={isPatientZero ? 'rgb(15, 23, 42)' : 'none'}
                    strokeWidth={isPatientZero ? 0.6 : 0}
                    className={isNewThisRound ? 'animate-pulse' : ''}
                  />
                );
              })}
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-600" aria-hidden="true" />
              Has the message
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />
              Doesn't have it yet
            </span>
            <span className="ml-auto text-slate-500">Ring outline = patient zero (node 0)</span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default GossipProtocolVisualizerPage;
