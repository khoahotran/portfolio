import { ArrowRightLeft, Gauge, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import {
  buildRing,
  computeLoadDistribution,
  loadImbalance,
  simulateNodeChange,
} from '../../labs/consistentHashing';
import { useSeo } from '../../seo/useSeo';

/** Fixed, not a slider: the key-set size isn't the thing being varied here, and the finding is
 * only legible once it's large enough to average out per-key hashing noise — the same reasoning
 * as Redlock's fixed acquire timeout. */
const KEY_COUNT = 5000;
/** Fixed at 5 base nodes: enough to make "one node added/removed" a real minority-of-the-fleet
 * change worth showing, small enough that the ring visualization stays legible node by node. */
const NODE_COUNT = 5;

const NODE_COLORS = ['#0d9488', '#e11d48', '#d97706', '#0284c7', '#7c3aed', '#059669'];

function keyRange(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `key-${i}`);
}

function pointOnRing(position: number, ringSize: number, radius = 38) {
  const angle = (position / ringSize) * 2 * Math.PI - Math.PI / 2;
  return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
}

function ConsistentHashingPage() {
  useSeo({
    title: 'Consistent Hashing Visualizer',
    description:
      'Run the real hash-ring key-placement algorithm and compare it against naive modulo hashing — see exactly how much of the keyspace each scheme reshuffles when a node joins or leaves.',
  });

  const [virtualNodesPerNode, setVirtualNodesPerNode] = useState(10);
  const [changeType, setChangeType] = useState<'add' | 'remove'>('add');

  const nodeIds = useMemo(() => Array.from({ length: NODE_COUNT }, (_, i) => `node-${i + 1}`), []);
  const keys = useMemo(() => keyRange(KEY_COUNT), []);

  const afterNodeIds = useMemo(
    () => (changeType === 'add' ? [...nodeIds, `node-${NODE_COUNT + 1}`] : nodeIds.slice(0, -1)),
    [nodeIds, changeType]
  );

  const change = useMemo(
    () => simulateNodeChange(keys, nodeIds, afterNodeIds, virtualNodesPerNode),
    [keys, nodeIds, afterNodeIds, virtualNodesPerNode]
  );

  const ring = useMemo(() => buildRing(nodeIds, virtualNodesPerNode), [nodeIds, virtualNodesPerNode]);

  const distribution = useMemo(() => computeLoadDistribution(ring, keys, nodeIds), [ring, keys, nodeIds]);
  const counts = useMemo(() => nodeIds.map((id) => distribution.get(id) ?? 0), [distribution, nodeIds]);
  const imbalance = useMemo(() => loadImbalance(counts), [counts]);
  const maxCount = Math.max(...counts, 1);

  const colorFor = (nodeId: string) => {
    const index = nodeIds.indexOf(nodeId);
    return NODE_COLORS[index % NODE_COLORS.length] ?? '#64748b';
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="consistent-hashing" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Consistent Hashing</h1>
      <p className="mt-2 text-slate-600">
        The real hash-ring placement algorithm, run against the same key set as naive modulo
        hashing — see how little of the keyspace the ring actually moves when a node joins or
        leaves, and what happens to load balance when there aren't enough virtual nodes to spread
        the luck around.
      </p>

      <ProvenanceNote labId="consistent-hashing" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Virtual nodes per physical node</span>
              <span className="text-teal-700">{virtualNodesPerNode}</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={virtualNodesPerNode}
              onChange={(event) => setVirtualNodesPerNode(Number(event.target.value))}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Simulate a node-count change</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChangeType('add')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-colors ${
                  changeType === 'add' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Plus size={14} aria-hidden="true" /> Add a node
              </button>
              <button
                type="button"
                onClick={() => setChangeType('remove')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-colors ${
                  changeType === 'remove' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Minus size={14} aria-hidden="true" /> Remove a node
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Fixed at {NODE_COUNT} base nodes and {KEY_COUNT.toLocaleString()} keys — large enough
            that per-key hashing noise averages out and the comparison reflects the schemes
            themselves, not the sample.
          </p>

          <div className="relative w-full aspect-square max-w-[220px] mx-auto pt-2">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <circle cx={50} cy={50} r={38} fill="none" stroke="rgb(226, 232, 240)" strokeWidth={0.6} />
              {ring.map((entry, i) => {
                const { x, y } = pointOnRing(entry.position, 100_000, 38);
                return (
                  <circle
                    key={`${entry.nodeId}-${entry.virtualIndex}-${i}`}
                    cx={x}
                    cy={y}
                    r={entry.virtualIndex === 0 ? 2.6 : 1.3}
                    fill={colorFor(entry.nodeId)}
                    opacity={entry.virtualIndex === 0 ? 1 : 0.65}
                  />
                );
              })}
            </svg>
          </div>
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Every dot = one virtual node's ring position
          </p>
        </section>

        <section className="min-w-0 md:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> Naive Modulo vs Consistent Hashing
            </h2>
            <p className="mb-4 text-sm text-slate-600">
              {changeType === 'add'
                ? `Simulating: ${nodeIds.length} nodes → ${afterNodeIds.length} nodes (one joins).`
                : `Simulating: ${nodeIds.length} nodes → ${afterNodeIds.length} nodes (one leaves).`}
            </p>

            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                  <span>Naive modulo (hash(key) % nodeCount)</span>
                  <span className="text-rose-700">{(change.naive.remappedFraction * 100).toFixed(1)}% remapped</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-rose-500 transition-all"
                    style={{ width: `${Math.min(100, change.naive.remappedFraction * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                  <span>Consistent hashing (ring lookup)</span>
                  <span className="text-teal-700">
                    {(change.consistentHashing.remappedFraction * 100).toFixed(1)}% remapped
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-teal-600 transition-all"
                    style={{ width: `${Math.min(100, change.consistentHashing.remappedFraction * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              {change.naive.remappedKeys.toLocaleString()} of {change.naive.totalKeys.toLocaleString()}{' '}
              keys changed owner under naive modulo; only{' '}
              {change.consistentHashing.remappedKeys.toLocaleString()} changed owner on the ring for
              the identical node-count change — both counted against the same key set, so this is a
              direct comparison, not two separate claims.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Gauge className="w-4 h-4" /> Load Distribution at {virtualNodesPerNode} Virtual Node
              {virtualNodesPerNode === 1 ? '' : 's'}/Node
            </h2>

            <div className="space-y-2">
              {nodeIds.map((id, i) => (
                <div key={id} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs font-semibold text-slate-600">{id}</span>
                  <div className="h-3 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{ width: `${(counts[i] / maxCount) * 100}%`, backgroundColor: NODE_COLORS[i % NODE_COLORS.length] }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs text-slate-500">{counts[i].toLocaleString()}</span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Coefficient of variation: <span className="font-bold text-slate-700">{imbalance.toFixed(3)}</span> (0 =
              perfectly even).{' '}
              {virtualNodesPerNode <= 2
                ? 'At this few virtual nodes per physical node, a handful of hashed positions simply don’t land evenly by chance — drag the slider up to see it settle.'
                : virtualNodesPerNode <= 15
                  ? 'Better, but still visibly uneven — more virtual nodes keep smoothing this out.'
                  : 'Comfortably balanced: enough virtual nodes per node that the luck of any one position averages out.'}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ConsistentHashingPage;
