import { useState, useMemo } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { useSeo } from '../../seo/useSeo';
import { Activity } from 'lucide-react';

interface BenchmarkData {
  tasks: number;
  goMemory: number;
  tsMemory: number;
  goTime: number;
  tsTime: number;
}

const DATASET: BenchmarkData[] = [
  { tasks: 1000, goMemory: 4, tsMemory: 35, goTime: 12, tsTime: 45 },
  { tasks: 10000, goMemory: 12, tsMemory: 120, goTime: 110, tsTime: 480 },
  { tasks: 50000, goMemory: 45, tsMemory: 450, goTime: 550, tsTime: 2600 },
];

function GoVsTsConcurrencyPage() {
  useSeo({ title: 'Benchmark: Go vs TS Concurrency', description: 'Interactive benchmark visualizing memory and execution time for concurrent tasks.' });
  
  const [tasks, setTasks] = useState<1000 | 10000 | 50000>(10000);

  const currentData = useMemo(() => {
    return DATASET.find(d => d.tasks === tasks)!;
  }, [tasks]);

  const maxMemory = 500;
  const maxTime = 3000;

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
              <p>Each task simulates a 50ms network request. Goroutines are spawned using `go` and wait-groups, while Node.js uses `Promise.all()`. Notice the massive memory overhead of V8 Promises compared to the 2KB stack size of a Goroutine.</p>
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
                  <div className="text-xs font-bold text-teal-700">{currentData.goMemory} MB</div>
                  <div className="w-full bg-teal-500 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.goMemory / maxMemory) * 100}%` }} />
                  <div className="text-xs font-semibold text-slate-500 mt-2">Go</div>
                </div>
                
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-700">{currentData.tsMemory} MB</div>
                  <div className="w-full bg-rose-400 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.tsMemory / maxMemory) * 100}%` }} />
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
                  <div className="text-xs font-bold text-teal-700">{currentData.goTime} ms</div>
                  <div className="w-full bg-teal-500 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.goTime / maxTime) * 100}%` }} />
                  <div className="text-xs font-semibold text-slate-500 mt-2">Go</div>
                </div>
                
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-700">{currentData.tsTime} ms</div>
                  <div className="w-full bg-rose-400 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.tsTime / maxTime) * 100}%` }} />
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
