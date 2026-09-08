import { AlertTriangle, CheckCircle2, Hash, ListChecks, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { compareConcurrentIncrements, compareReAddAfterRemove } from '../../labs/crdt';
import { useSeo } from '../../seo/useSeo';

function CrdtPage() {
  useSeo({
    title: 'CRDTs Visualizer',
    description: 'Run a real G-Counter against a naive LWW register, and a real OR-Set against a naive 2P-Set — see exactly which concurrent updates the naive designs silently lose.',
  });

  const [incrementsA, setIncrementsA] = useState(4);
  const [incrementsB, setIncrementsB] = useState(3);
  const [timestampA, setTimestampA] = useState(100);
  const [timestampB, setTimestampB] = useState(150);

  const counterResult = useMemo(
    () => compareConcurrentIncrements({ A: incrementsA, B: incrementsB }, { A: timestampA, B: timestampB }),
    [incrementsA, incrementsB, timestampA, timestampB]
  );

  const setResult = useMemo(() => compareReAddAfterRemove('x', 'A#1', 'A#2'), []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="crdt" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">CRDTs</h1>
      <p className="mt-2 text-slate-600">
        Vector clocks tell you two writes are concurrent. These two structures show what to actually
        do about it: a real G-Counter and a real OR-Set, each run against the naive design it
        replaces, on the identical scenario.
      </p>

      <ProvenanceNote labId="crdt" />

      <div className="mt-8 space-y-10">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            <Hash className="w-4 h-4" aria-hidden="true" /> G-Counter vs. a Naive LWW Register
          </h2>

          <div className="grid gap-6 md:grid-cols-12">
            <div className="min-w-0 md:col-span-4 space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
              <p className="text-xs text-slate-500">
                Two nodes each apply local increments with no knowledge of the other, then merge.
                Adjust each node's increment count and the physical timestamp its final write carries.
              </p>
              {(['A', 'B'] as const).map((node) => (
                <div key={node} className="space-y-3 border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                  <p className="text-xs font-bold text-teal-700">Node {node}</p>
                  <label className="block text-xs font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span>Increments</span>
                      <span>{node === 'A' ? incrementsA : incrementsB}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={node === 'A' ? incrementsA : incrementsB}
                      onChange={(e) => (node === 'A' ? setIncrementsA : setIncrementsB)(Number(e.target.value))}
                      className="mt-1.5 w-full accent-teal-600"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span>Write timestamp</span>
                      <span>{node === 'A' ? timestampA : timestampB}ms</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={300}
                      value={node === 'A' ? timestampA : timestampB}
                      onChange={(e) => (node === 'A' ? setTimestampA : setTimestampB)(Number(e.target.value))}
                      className="mt-1.5 w-full accent-teal-600"
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="min-w-0 md:col-span-8 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">G-Counter (real merge)</p>
                  <div className="mt-2 flex items-center gap-2 text-2xl font-bold text-teal-800">
                    <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                    {counterResult.gCounterTotal}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Sum of every slot — always equals the true total.</p>
                </div>
                <div className={`rounded-2xl border p-5 ${counterResult.lwwLostUpdates > 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Naive LWW register</p>
                  <div className={`mt-2 flex items-center gap-2 text-2xl font-bold ${counterResult.lwwLostUpdates > 0 ? 'text-rose-800' : 'text-slate-700'}`}>
                    {counterResult.lwwLostUpdates > 0 ? <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />}
                    {counterResult.lwwTotal}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {counterResult.lwwLostUpdates > 0
                      ? `${counterResult.lwwLostUpdates} real increment${counterResult.lwwLostUpdates === 1 ? '' : 's'} silently discarded.`
                      : 'Nothing lost this time — the winning write happens to hold every real increment.'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                True total (ground truth, every increment that actually happened):{' '}
                <span className="font-bold text-slate-700">{counterResult.trueTotal}</span>. Drag the
                two timestamps to a tie — the LWW winner is then decided by a nodeId tiebreak alone,
                which can discard a node's entire real contribution even when it did all the work.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            <ListChecks className="w-4 h-4" aria-hidden="true" /> OR-Set vs. a Naive 2P-Set
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
            <p className="mb-4 text-xs text-slate-500">
              Fixed scenario, run through both structures: add "x", remove "x" (observing that add),
              then add "x" again with a fresh identity — a real re-add, not a replay.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={`rounded-2xl border p-5 ${setResult.orSetHasElement ? 'border-teal-200 bg-teal-50' : 'border-rose-200 bg-rose-50'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">OR-Set (real merge)</p>
                <div className={`mt-2 flex items-center gap-2 text-lg font-bold ${setResult.orSetHasElement ? 'text-teal-800' : 'text-rose-800'}`}>
                  {setResult.orSetHasElement ? <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" /> : <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />}
                  "x" is {setResult.orSetHasElement ? 'present' : 'absent'}
                </div>
                <p className="mt-2 text-xs text-slate-500">The re-add's fresh tag was never tombstoned — it survives.</p>
              </div>
              <div className={`rounded-2xl border p-5 ${setResult.twoPhaseSetHasElement ? 'border-teal-200 bg-teal-50' : 'border-rose-200 bg-rose-50'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Naive 2P-Set</p>
                <div className={`mt-2 flex items-center gap-2 text-lg font-bold ${setResult.twoPhaseSetHasElement ? 'text-teal-800' : 'text-rose-800'}`}>
                  {setResult.twoPhaseSetHasElement ? <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" /> : <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />}
                  "x" is {setResult.twoPhaseSetHasElement ? 'present' : 'absent'}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {setResult.twoPhaseSetHasElement ? '' : "\"x\" was removed once, by value alone — permanently, even after the real re-add."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default CrdtPage;
