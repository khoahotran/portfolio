import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { useSeo } from '../../seo/useSeo';
import { BarChart3, Info } from 'lucide-react';
import rawResults from './pgbouncer-vs-direct-results.json';

/**
 * Raw shape written by benchmarks/pgbouncer-vs-direct/run.sh — one row per (target, mode, clients)
 * combination, straight from the harness's own JSON stdout line. Byte-identical copy of
 * benchmarks/pgbouncer-vs-direct/results.json; see that directory's README.md to reproduce it.
 */
interface RawResult {
  target: 'direct' | 'pgbouncer';
  mode: 'churn' | 'persistent';
  clients: number;
  queriesPerClient: number;
  totalQueries: number;
  throughputPerSec: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  durationSeconds: number;
}

interface BenchmarkData {
  mode: 'churn' | 'persistent';
  clients: number;
  directThroughput: number;
  pgbouncerThroughput: number;
  directLatency: number;
  pgbouncerLatency: number;
}

/** Pairs the flat per-target rows into one row per (mode, clients) combo, which is what the UI renders. */
function pairResults(raw: RawResult[]): BenchmarkData[] {
  const byCombo = new Map<string, Partial<BenchmarkData> & { mode: BenchmarkData['mode']; clients: number }>();

  for (const row of raw) {
    const key = `${row.mode}:${row.clients}`;
    const entry = byCombo.get(key) ?? { mode: row.mode, clients: row.clients };
    if (row.target === 'direct') {
      entry.directThroughput = row.throughputPerSec;
      entry.directLatency = row.avgLatencyMs;
    } else {
      entry.pgbouncerThroughput = row.throughputPerSec;
      entry.pgbouncerLatency = row.avgLatencyMs;
    }
    byCombo.set(key, entry);
  }

  return [...byCombo.values()] as BenchmarkData[];
}

const DATASET: BenchmarkData[] = pairResults(rawResults as RawResult[]);
const CLIENT_COUNTS = [10, 25, 50] as const;

function PgbouncerVsDirectPage() {
  useSeo({
    title: 'Benchmark: PgBouncer vs Direct Postgres',
    description: 'Interactive benchmark visualizing connection-pooling overhead across two connection lifecycles.',
  });

  const [mode, setMode] = useState<'churn' | 'persistent'>('churn');
  const [clients, setClients] = useState<(typeof CLIENT_COUNTS)[number]>(10);

  const currentData = useMemo(() => {
    return DATASET.find((d) => d.mode === mode && d.clients === clients)!;
  }, [mode, clients]);

  // Scaled per-mode, not globally — churn (tens of q/s) and persistent (thousands of q/s) live on
  // completely different scales, and one shared axis would make churn's bars unreadably tiny.
  const modeData = useMemo(() => DATASET.filter((d) => d.mode === mode), [mode]);
  const maxThroughput = Math.max(...modeData.flatMap((d) => [d.directThroughput, d.pgbouncerThroughput])) * 1.1;
  const maxLatency = Math.max(...modeData.flatMap((d) => [d.directLatency, d.pgbouncerLatency])) * 1.1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="pgbouncer-vs-direct" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">PgBouncer vs Direct Postgres</h1>
      <p className="mt-2 text-slate-600">
        One measured run comparing connection-pooling overhead across two connection lifecycles. Read
        the environment and limits below before quoting any of these numbers.
      </p>

      <ProvenanceNote labId="pgbouncer-vs-direct" />

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">Parameters</h2>

            <div className="block text-sm font-semibold text-slate-700">
              Connection Lifecycle
              <div className="mt-3 flex gap-2" role="group" aria-label="Connection lifecycle">
                {(['churn', 'persistent'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors capitalize ${mode === m ? 'bg-inverse text-inverse-fg border-inverse' : 'bg-surface text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="block text-sm font-semibold text-slate-700">
              Concurrent Clients
              <div className="mt-3 flex gap-2" role="group" aria-label="Concurrent clients">
                {CLIENT_COUNTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={clients === c}
                    onClick={() => setClients(c)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${clients === c ? 'bg-inverse text-inverse-fg border-inverse' : 'bg-surface text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-sky-50 text-sky-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed mt-8">
              <Info className="w-5 h-5 shrink-0 text-sky-600" />
              <p>
                {mode === 'churn'
                  ? "Churn opens a fresh connection per query — the pattern a pooler exists to help with. Watch PgBouncer's advantage widen as client count rises."
                  : "Persistent opens one connection per client and reuses it — there's no setup cost left to amortize, only an extra hop's cost to pay."}{' '}
                These numbers come from <code>benchmarks/pgbouncer-vs-direct/</code> in the repository
                — a runnable Docker Compose harness, not a fixed dataset.
              </p>
            </div>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-8 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Benchmark Results
          </h2>

          <div className="flex-1 grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-center font-bold text-slate-800 mb-6">Throughput (queries/sec)</h3>
              <div className="flex items-end justify-center gap-6 h-64 border-b border-slate-200 pb-2 relative">
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-teal-700">{Math.round(currentData.directThroughput).toLocaleString()}</div>
                  {/* Fixed-height track: `height: N%` only resolves against a definite-height
                      ancestor, and this column (child of an `items-end`, not `stretch`, row) is
                      otherwise auto-height — without this wrapper the bar silently renders 0px. */}
                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full bg-teal-500 rounded-t-sm transition-all duration-500"
                      style={{ height: `${(currentData.directThroughput / maxThroughput) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">Direct</div>
                </div>

                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-700">{Math.round(currentData.pgbouncerThroughput).toLocaleString()}</div>
                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full bg-rose-400 rounded-t-sm transition-all duration-500"
                      style={{ height: `${(currentData.pgbouncerThroughput / maxThroughput) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">PgBouncer</div>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-4 font-mono">Higher is better &uarr;</p>
            </div>

            <div>
              <h3 className="text-center font-bold text-slate-800 mb-6">Avg Latency (ms)</h3>
              <div className="flex items-end justify-center gap-6 h-64 border-b border-slate-200 pb-2 relative">
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-teal-700">{currentData.directLatency.toFixed(1)}ms</div>
                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full bg-teal-500 rounded-t-sm transition-all duration-500"
                      style={{ height: `${(currentData.directLatency / maxLatency) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">Direct</div>
                </div>

                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-700">{currentData.pgbouncerLatency.toFixed(1)}ms</div>
                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full bg-rose-400 rounded-t-sm transition-all duration-500"
                      style={{ height: `${(currentData.pgbouncerLatency / maxLatency) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">PgBouncer</div>
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

export default PgbouncerVsDirectPage;
