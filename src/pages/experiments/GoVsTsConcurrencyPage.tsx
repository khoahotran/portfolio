import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { useSeo } from '../../seo/useSeo';
import { Activity } from 'lucide-react';
import rawResults from './go-vs-ts-concurrency-results.json';

/**
 * Raw shape written by benchmarks/go-vs-ts-concurrency/run.sh — one row per (language, task count)
 * combination, straight from the harness's own JSON stdout line. Byte-identical copy of
 * benchmarks/go-vs-ts-concurrency/results.json; see that directory's README.md to reproduce it.
 */
interface RawResult {
  language: 'go' | 'node';
  tasks: 1000 | 10000 | 50000;
  peakMemoryMB: number;
  durationMs: number;
}

interface BenchmarkData {
  tasks: 1000 | 10000 | 50000;
  goMemory: number;
  tsMemory: number;
  goTime: number;
  tsTime: number;
}

/** Pairs the flat per-language rows into one row per task count, which is what the UI renders. */
function pairResults(raw: RawResult[]): BenchmarkData[] {
  const byTasks = new Map<number, Partial<BenchmarkData> & { tasks: BenchmarkData['tasks'] }>();

  for (const row of raw) {
    const entry = byTasks.get(row.tasks) ?? { tasks: row.tasks };
    if (row.language === 'go') {
      entry.goMemory = row.peakMemoryMB;
      entry.goTime = row.durationMs;
    } else {
      entry.tsMemory = row.peakMemoryMB;
      entry.tsTime = row.durationMs;
    }
    byTasks.set(row.tasks, entry);
  }

  return [...byTasks.values()].sort((a, b) => a.tasks - b.tasks) as BenchmarkData[];
}

const DATASET: BenchmarkData[] = pairResults(rawResults as RawResult[]);
const MAX_MEMORY = Math.max(...DATASET.flatMap((d) => [d.goMemory, d.tsMemory])) * 1.1;
const MAX_TIME = Math.max(...DATASET.flatMap((d) => [d.goTime, d.tsTime])) * 1.1;

function GoVsTsConcurrencyPage() {
  useSeo({ title: 'Benchmark: Go vs TS Concurrency', description: 'Interactive benchmark visualizing memory and execution time for concurrent tasks.' });
  
  const [tasks, setTasks] = useState<1000 | 10000 | 50000>(10000);

  const currentData = useMemo(() => {
    return DATASET.find(d => d.tasks === tasks)!;
  }, [tasks]);


  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="go-vs-ts-concurrency" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Goroutines vs Node.js Promises</h1>
      <p className="mt-2 text-slate-600">Benchmarking memory footprint and execution time for concurrent network-bound tasks.</p>

      <ProvenanceNote labId="go-vs-ts-concurrency" />

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">Workload</h2>

            <div className="block text-sm font-semibold text-slate-700">
              Number of Concurrent Tasks
              <div className="mt-3 flex gap-2" role="group" aria-label="Number of concurrent tasks">
                {[1000, 10000, 50000].map(t => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tasks === t}
                    onClick={() => setTasks(t as 1000 | 10000 | 50000)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${tasks === t ? 'bg-inverse text-inverse-fg border-inverse' : 'bg-surface text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {t.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-sky-50 text-sky-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed mt-8">
              <Activity className="w-5 h-5 shrink-0 text-sky-600" />
              <p>Each task simulates a 50ms network request. Goroutines are spawned via `go` and a wait-group; Node.js uses `Promise.all()`. Watch the gap between them <em>narrow</em> as task count grows &mdash; Node&rsquo;s footprint is dominated by a fixed ~50MB runtime baseline, while Go&rsquo;s scales closer to linearly with task count. Full explanation in the article below.</p>
            </div>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-8 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Benchmark Results
          </h2>

          <div className="flex-1 grid md:grid-cols-2 gap-12">

            {/* Memory Chart */}
            <div>
              <h3 className="text-center font-bold text-slate-800 mb-6">Peak Memory (MB)</h3>
              <div className="flex items-end justify-center gap-6 h-64 border-b border-slate-200 pb-2 relative">
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-teal-700">{currentData.goMemory.toFixed(1)} MB</div>
                  {/* Fixed-height track: the bar's `height: N%` only resolves against a
                      definite-height ancestor, and this column (a child of an `items-end`, not
                      `stretch`, row) is otherwise auto-height — without this wrapper the bar
                      silently computes to 0px regardless of the percentage. */}
                  <div className="flex h-48 w-full items-end">
                    <div className="w-full bg-teal-500 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.goMemory / MAX_MEMORY) * 100}%` }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">Go</div>
                </div>

                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-700">{currentData.tsMemory.toFixed(1)} MB</div>
                  <div className="flex h-48 w-full items-end">
                    <div className="w-full bg-rose-400 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.tsMemory / MAX_MEMORY) * 100}%` }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">Node.js</div>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-4 font-mono">Lower is better &darr;</p>
            </div>

            {/* Time Chart */}
            <div>
              <h3 className="text-center font-bold text-slate-800 mb-6">Execution Time (ms)</h3>
              <div className="flex items-end justify-center gap-6 h-64 border-b border-slate-200 pb-2 relative">
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-teal-700">{currentData.goTime.toFixed(0)} ms</div>
                  <div className="flex h-48 w-full items-end">
                    <div className="w-full bg-teal-500 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.goTime / MAX_TIME) * 100}%` }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">Go</div>
                </div>

                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-700">{currentData.tsTime.toFixed(0)} ms</div>
                  <div className="flex h-48 w-full items-end">
                    <div className="w-full bg-rose-400 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.tsTime / MAX_TIME) * 100}%` }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">Node.js</div>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-4 font-mono">Lower is better &darr;</p>
            </div>

          </div>
          
        </section>
      </div>
    </main>
  );
}

export default GoVsTsConcurrencyPage;
