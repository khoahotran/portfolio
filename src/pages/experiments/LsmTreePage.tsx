import { AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { compact, createLsmTree, get, put, runCount, writeAmplification } from '../../labs/lsmTree';
import { useSeo } from '../../seo/useSeo';

const MEMTABLE_CAPACITY = 50;

function runWorkload(totalOps: number, uniqueKeys: number, compactEveryNFlushes: number | null) {
  const tree = createLsmTree(MEMTABLE_CAPACITY);
  let flushesSinceCompact = 0;
  for (let i = 0; i < totalOps; i++) {
    const runsBefore = tree.runs.length;
    put(tree, `key-${i % uniqueKeys}`, `v${i}`);
    if (tree.runs.length > runsBefore) {
      flushesSinceCompact++;
      if (compactEveryNFlushes !== null && flushesSinceCompact >= compactEveryNFlushes) {
        compact(tree);
        flushesSinceCompact = 0;
      }
    }
  }
  let totalProbed = 0;
  for (let i = 0; i < uniqueKeys; i++) totalProbed += get(tree, `key-${i}`).runsProbed;
  return {
    finalRunCount: runCount(tree),
    avgReadAmplification: totalProbed / uniqueKeys,
    missRunsProbed: get(tree, 'not-a-real-key').runsProbed,
    writeAmp: writeAmplification(tree),
  };
}

function LsmTreePage() {
  useSeo({
    title: 'LSM Tree Visualizer',
    description: 'Run a real log-structured merge tree — measure read amplification growing unbounded without compaction, then measure the real write-amplification cost of bounding it.',
  });

  const [totalOps, setTotalOps] = useState(5000);
  const [uniqueKeys, setUniqueKeys] = useState(500);
  const [compactEveryNFlushes, setCompactEveryNFlushes] = useState<number | null>(null);

  const result = useMemo(() => runWorkload(totalOps, uniqueKeys, compactEveryNFlushes), [totalOps, uniqueKeys, compactEveryNFlushes]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="lsm-tree" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">LSM Trees</h1>
      <p className="mt-2 text-slate-600">
        Every write appends to memory, then flushes as an immutable sorted run — never an in-place
        update. Run the same workload with and without compaction and watch which cost you're
        actually paying: unbounded reads, or real, measured extra writes.
      </p>

      <ProvenanceNote labId="lsm-tree" />

      <div className="mt-8 grid gap-6 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <label className="block text-xs font-semibold text-slate-600">
            <div className="flex justify-between">
              <span>Total write operations</span>
              <span>{totalOps.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={500}
              max={20000}
              step={500}
              value={totalOps}
              onChange={(e) => setTotalOps(Number(e.target.value))}
              className="mt-1.5 w-full accent-teal-600"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            <div className="flex justify-between">
              <span>Unique keys (rest are updates)</span>
              <span>{uniqueKeys.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={uniqueKeys}
              onChange={(e) => setUniqueKeys(Number(e.target.value))}
              className="mt-1.5 w-full accent-teal-600"
            />
          </label>
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-600">Compaction</p>
            {[
              { label: 'Never', value: null },
              { label: 'Every 4 flushes', value: 4 },
              { label: 'Every 2 flushes', value: 2 },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setCompactEveryNFlushes(opt.value)}
                className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs font-semibold ${
                  compactEveryNFlushes === opt.value ? 'bg-teal-50 text-teal-700' : 'bg-slate-50 text-slate-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 border-t border-slate-100 pt-4">
            Memtable capacity fixed at {MEMTABLE_CAPACITY} entries — {Math.ceil(totalOps / MEMTABLE_CAPACITY)}{' '}
            flushes over this run.
          </p>
        </section>

        <section className="min-w-0 md:col-span-8 space-y-4">
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
              result.finalRunCount > 10 || result.writeAmp > 1.5 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-teal-200 bg-teal-50 text-teal-800'
            }`}
          >
            {result.finalRunCount > 10 || result.writeAmp > 1.5 ? <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />}
            <p>
              {compactEveryNFlushes === null
                ? `No compaction: write amplification is exactly ${result.writeAmp.toFixed(2)} — every operation written to disk exactly once. But ${result.finalRunCount} sorted runs have piled up, and a lookup for a missing key has to check all ${result.missRunsProbed} of them.`
                : `Compacting ${compactEveryNFlushes === 2 ? 'every 2' : 'every 4'} flushes: reads are bounded — ${result.finalRunCount} run${result.finalRunCount === 1 ? '' : 's'}, ${result.avgReadAmplification.toFixed(1)} runs probed on average. The cost: write amplification of ${result.writeAmp.toFixed(2)}× — every live key gets rewritten each time compaction runs, whether it changed or not.`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <Layers className="w-4 h-4" aria-hidden="true" /> Measured, not modeled
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sorted runs on disk</p>
                <div className="mt-2 text-2xl font-bold text-slate-700">{result.finalRunCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Avg. runs per lookup</p>
                <div className="mt-2 text-2xl font-bold text-slate-700">{result.avgReadAmplification.toFixed(2)}</div>
              </div>
              <div className={`rounded-2xl border p-4 ${result.writeAmp > 1 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Write amplification</p>
                <div className={`mt-2 text-2xl font-bold ${result.writeAmp > 1 ? 'text-rose-800' : 'text-slate-700'}`}>{result.writeAmp.toFixed(2)}×</div>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Drag total operations up with compaction off — run count and the miss-lookup cost keep
              climbing, unbounded. Switch to "Every 2 flushes" — read cost drops to the floor of 1,
              but write amplification rises further than "Every 4 flushes," because the same live
              data gets fully rewritten twice as often.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default LsmTreePage;
