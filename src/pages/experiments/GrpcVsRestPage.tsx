import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { useSeo } from '../../seo/useSeo';
import { BarChart3, Info } from 'lucide-react';
import rawResults from './grpc-vs-rest-results.json';

/**
 * Raw shape written by benchmarks/grpc-vs-rest/run.sh — one row per (target, mode, clients)
 * combination, straight from the harness's own JSON stdout line. Byte-identical copy of
 * benchmarks/grpc-vs-rest/results.json; see that directory's README.md to reproduce it.
 */
interface RawResult {
  target: 'grpc' | 'rest';
  mode: 'single' | 'list';
  clients: number;
  requestsPerClient: number;
  totalRequests: number;
  throughputPerSec: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgResponseBytes: number;
  durationSeconds: number;
}

interface BenchmarkData {
  mode: 'single' | 'list';
  clients: number;
  grpcThroughput: number;
  restThroughput: number;
  grpcLatency: number;
  restLatency: number;
  grpcBytes: number;
  restBytes: number;
}

/** Pairs the flat per-target rows into one row per (mode, clients) combo, which is what the UI renders. */
function pairResults(raw: RawResult[]): BenchmarkData[] {
  const byCombo = new Map<string, Partial<BenchmarkData> & { mode: BenchmarkData['mode']; clients: number }>();

  for (const row of raw) {
    const key = `${row.mode}:${row.clients}`;
    const entry = byCombo.get(key) ?? { mode: row.mode, clients: row.clients };
    if (row.target === 'grpc') {
      entry.grpcThroughput = row.throughputPerSec;
      entry.grpcLatency = row.avgLatencyMs;
      entry.grpcBytes = row.avgResponseBytes;
    } else {
      entry.restThroughput = row.throughputPerSec;
      entry.restLatency = row.avgLatencyMs;
      entry.restBytes = row.avgResponseBytes;
    }
    byCombo.set(key, entry);
  }

  return [...byCombo.values()] as BenchmarkData[];
}

const DATASET: BenchmarkData[] = pairResults(rawResults as RawResult[]);
const CLIENT_COUNTS = [10, 25, 50] as const;

function GrpcVsRestPage() {
  useSeo({
    title: 'Benchmark: gRPC vs REST',
    description: 'Interactive benchmark visualizing gRPC vs REST throughput, latency, and payload size across two payload shapes.',
  });

  const [mode, setMode] = useState<'single' | 'list'>('single');
  const [clients, setClients] = useState<(typeof CLIENT_COUNTS)[number]>(10);

  const currentData = useMemo(() => {
    return DATASET.find((d) => d.mode === mode && d.clients === clients)!;
  }, [mode, clients]);

  // Scaled per-mode, not globally — single (hundreds of q/s, ~250 bytes) and list (thousands of
  // q/s at 50 clients, ~25-30 KB) live on completely different scales.
  const modeData = useMemo(() => DATASET.filter((d) => d.mode === mode), [mode]);
  const maxThroughput = Math.max(...modeData.flatMap((d) => [d.grpcThroughput, d.restThroughput])) * 1.1;
  const maxLatency = Math.max(...modeData.flatMap((d) => [d.grpcLatency, d.restLatency])) * 1.1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="grpc-vs-rest" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">gRPC vs REST</h1>
      <p className="mt-2 text-slate-600">
        One measured run comparing gRPC (protobuf/HTTP2) against REST (JSON/HTTP1.1) serving the same
        data. Read the environment and limits below before quoting any of these numbers.
      </p>

      <ProvenanceNote labId="grpc-vs-rest" />

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">Parameters</h2>

            <div className="block text-sm font-semibold text-slate-700">
              Payload Shape
              <div className="mt-3 flex gap-2" role="group" aria-label="Payload shape">
                {(['single', 'list'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors capitalize ${mode === m ? 'bg-inverse text-inverse-fg border-inverse' : 'bg-surface text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {m === 'single' ? '1 record' : '100 records'}
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

            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-center">
              <div>
                <div className="text-lg font-bold text-teal-700">{Math.round(currentData.grpcBytes).toLocaleString()}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">gRPC bytes/resp</div>
              </div>
              <div>
                <div className="text-lg font-bold text-rose-700">{Math.round(currentData.restBytes).toLocaleString()}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">REST bytes/resp</div>
              </div>
            </div>

            <div className="bg-sky-50 text-sky-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed mt-4">
              <Info className="w-5 h-5 shrink-0 text-sky-600" />
              <p>
                {mode === 'single'
                  ? "One small record per request — protobuf's smaller payload barely matters at this size; watch which protocol actually wins throughput anyway."
                  : "100 records per request — protobuf's ~20% smaller payload is real here, but watch whether that translates into a throughput win at every concurrency level."}{' '}
                These numbers come from <code>benchmarks/grpc-vs-rest/</code> in the repository — a
                runnable Docker Compose harness, not a fixed dataset.
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
              <h3 className="text-center font-bold text-slate-800 mb-6">Throughput (requests/sec)</h3>
              <div className="flex items-end justify-center gap-6 h-64 border-b border-slate-200 pb-2 relative">
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-teal-700">{Math.round(currentData.grpcThroughput).toLocaleString()}</div>
                  {/* Fixed-height track: `height: N%` only resolves against a definite-height
                      ancestor, and this column (child of an `items-end`, not `stretch`, row) is
                      otherwise auto-height — without this wrapper the bar silently renders 0px. */}
                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full bg-teal-500 rounded-t-sm transition-all duration-500"
                      style={{ height: `${(currentData.grpcThroughput / maxThroughput) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">gRPC</div>
                </div>

                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-700">{Math.round(currentData.restThroughput).toLocaleString()}</div>
                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full bg-rose-400 rounded-t-sm transition-all duration-500"
                      style={{ height: `${(currentData.restThroughput / maxThroughput) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">REST</div>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-4 font-mono">Higher is better &uarr;</p>
            </div>

            <div>
              <h3 className="text-center font-bold text-slate-800 mb-6">Avg Latency (ms)</h3>
              <div className="flex items-end justify-center gap-6 h-64 border-b border-slate-200 pb-2 relative">
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-teal-700">{currentData.grpcLatency.toFixed(1)}ms</div>
                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full bg-teal-500 rounded-t-sm transition-all duration-500"
                      style={{ height: `${(currentData.grpcLatency / maxLatency) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">gRPC</div>
                </div>

                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-700">{currentData.restLatency.toFixed(1)}ms</div>
                  <div className="flex h-48 w-full items-end">
                    <div
                      className="w-full bg-rose-400 rounded-t-sm transition-all duration-500"
                      style={{ height: `${(currentData.restLatency / maxLatency) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">REST</div>
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

export default GrpcVsRestPage;
