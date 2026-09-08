import { ArrowLeftRight, ArrowRight, Equal, Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { compareClocks, pickLastWriteWinner, simulateCausalHistory } from '../../labs/vectorClocks';
import type { ClockAction, ClockComparison, ClockEvent, VectorClock } from '../../labs/vectorClocks';
import { useSeo } from '../../seo/useSeo';

const NODE_IDS = ['A', 'B', 'C'];
const NODE_COLOR: Record<string, string> = { A: 'text-teal-700', B: 'text-sky-700', C: 'text-violet-700' };

// A fixed, real scenario: A and B each write independently before any message connects them; A's
// update reaches B and visibly informs B's next write; C's write stays isolated the whole time,
// so C's write and B's post-receive write stay concurrent right through the end of the script —
// the pair the lab defaults to comparing.
const SCRIPT: ClockAction[] = [
  { type: 'local', nodeId: 'A', label: 'A writes x=1' },
  { type: 'local', nodeId: 'B', label: 'B writes y=2' },
  { type: 'send', nodeId: 'A', toNodeId: 'B', label: "A sends its update to B" },
  { type: 'local', nodeId: 'C', label: 'C writes x=3' },
  { type: 'receive', nodeId: 'B', fromEventId: 2, label: "B receives A's update" },
  { type: 'local', nodeId: 'B', label: 'B writes x=4, informed by A' },
  { type: 'send', nodeId: 'C', toNodeId: 'A', label: 'C sends its update to A' },
  { type: 'receive', nodeId: 'A', fromEventId: 6, label: "A receives C's update" },
  { type: 'local', nodeId: 'A', label: 'A writes the final value' },
];

const COMPARISON_STYLE: Record<ClockComparison, { icon: typeof ArrowRight; label: string; surface: string; accent: string }> = {
  before: { icon: ArrowRight, label: 'happened-before', surface: 'border-sky-200 bg-sky-50', accent: 'text-sky-800' },
  after: { icon: ArrowRight, label: 'happened-after', surface: 'border-sky-200 bg-sky-50', accent: 'text-sky-800' },
  equal: { icon: Equal, label: 'equal', surface: 'border-slate-200 bg-slate-50', accent: 'text-slate-700' },
  concurrent: { icon: ArrowLeftRight, label: 'concurrent — provably no causal link', surface: 'border-amber-200 bg-amber-50', accent: 'text-amber-800' },
};

function clockLabel(clock: VectorClock): string {
  return NODE_IDS.map((id) => `${id}:${clock[id] ?? 0}`).join('  ');
}

function VectorClocksPage() {
  useSeo({
    title: 'Vector Clocks Visualizer',
    description: 'Run the real happens-before/happens-after/concurrent test, then watch naive last-write-wins flip its answer under clock skew while the causal verdict never moves.',
  });

  const [skew, setSkew] = useState<Record<string, number>>({ A: 0, B: 0, C: 0 });
  const [eventAId, setEventAId] = useState(3); // C writes x=3
  const [eventBId, setEventBId] = useState(5); // B writes x=4, informed by A

  const events = useMemo(() => simulateCausalHistory(NODE_IDS, SCRIPT, 1000, skew), [skew]);
  const eventA = events[eventAId];
  const eventB = events[eventBId];
  const comparison = compareClocks(eventA.clock, eventB.clock);
  const winner = pickLastWriteWinner(eventA, eventB);

  const ComparisonIcon = COMPARISON_STYLE[comparison].icon;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="vector-clocks" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Vector Clocks</h1>
      <p className="mt-2 text-slate-600">
        A real scripted causal history across three nodes — pick any two events and see the actual
        happens-before/happens-after/concurrent verdict, then compare it against what a naive
        last-write-wins resolver would do with the same events' physical timestamps.
      </p>

      <ProvenanceNote labId="vector-clocks" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Shuffle className="w-4 h-4" aria-hidden="true" /> Simulated clock skew
            </p>
            {NODE_IDS.map((id) => (
              <label key={id} className="mt-3 block text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span className={NODE_COLOR[id]}>Node {id}</span>
                  <span className="text-slate-500">{skew[id] >= 0 ? '+' : ''}{skew[id]}ms</span>
                </div>
                <input
                  type="range"
                  min={-8000}
                  max={8000}
                  step={500}
                  value={skew[id]}
                  onChange={(e) => setSkew((prev) => ({ ...prev, [id]: Number(e.target.value) }))}
                  className="mt-1.5 w-full accent-teal-600"
                />
              </label>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-sm font-semibold text-slate-700">
              Event A
              <select
                value={eventAId}
                onChange={(e) => setEventAId(Number(e.target.value))}
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-surface px-2 py-1.5 text-xs"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>#{e.id} [{e.nodeId}] {e.label}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold text-slate-700">
              Event B
              <select
                value={eventBId}
                onChange={(e) => setEventBId(Number(e.target.value))}
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-surface px-2 py-1.5 text-xs"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>#{e.id} [{e.nodeId}] {e.label}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="text-xs text-slate-500">
            The default pair (C's write, B's write informed by A) never exchanged a message with
            each other in this script — try dragging their clock skew apart and see the naive
            winner flip while the causal verdict underneath never does.
          </p>
        </section>

        <section className="min-w-0 md:col-span-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={`rounded-2xl border p-5 ${COMPARISON_STYLE[comparison].surface}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Real causal verdict</p>
              <div className={`mt-2 flex items-center gap-2 text-sm font-bold ${COMPARISON_STYLE[comparison].accent}`}>
                <ComparisonIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {COMPARISON_STYLE[comparison].label}
              </div>
              <p className="mt-2 text-xs text-slate-500">Depends only on the two events' vector clocks — immune to clock skew.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Naive last-write-wins</p>
              <div className={`mt-2 text-sm font-bold ${NODE_COLOR[winner.nodeId]}`}>
                #{winner.id} [{winner.nodeId}] wins
              </div>
              <p className="mt-2 text-xs text-slate-500">Picked purely by physical timestamp — always produces a winner, even here.</p>
            </div>
          </div>

          {comparison === 'concurrent' && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              These two events are provably concurrent — neither could have influenced the other —
              yet last-write-wins still confidently names a winner. Drag the skew sliders for{' '}
              {eventA.nodeId} and {eventB.nodeId} in opposite directions: the naive winner flips,
              but the causal verdict above stays exactly "concurrent" the entire time.
            </p>
          )}

          <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">Full Event Log</h2>
            <div className="space-y-2">
              {events.map((event: ClockEvent) => {
                const isSelected = event.id === eventAId || event.id === eventBId;
                return (
                  <div
                    key={event.id}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      isSelected ? 'border-teal-300 bg-teal-50' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="font-mono text-slate-400">#{event.id}</span>{' '}
                        <span className={`font-bold ${NODE_COLOR[event.nodeId]}`}>[{event.nodeId}]</span>{' '}
                        <span className="text-slate-700">{event.label}</span>
                      </span>
                      <span className="font-mono text-slate-500">{clockLabel(event.clock)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default VectorClocksPage;
