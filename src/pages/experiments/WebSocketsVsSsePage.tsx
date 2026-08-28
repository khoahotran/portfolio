import { AlertTriangle, Gauge } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { useSeo } from '../../seo/useSeo';
import rawResults from './websockets-vs-sse-results.json';

/**
 * Raw shape written by benchmarks/websockets-vs-sse/run.sh — one row per (transport, connection
 * count) combination, straight from the harness's own JSON stdout line. Byte-identical copy of
 * benchmarks/websockets-vs-sse/results.json; see that directory's README.md to reproduce it.
 */
interface RawResult {
  transport: 'ws' | 'sse';
  connections: 100 | 1000 | 5000;
  connectMs: number;
  peakMemoryMB: number;
}

interface BenchmarkData {
  connections: 100 | 1000 | 5000;
  wsMemory: number;
  sseMemory: number;
  wsConnectMs: number;
  sseConnectMs: number;
}

/** Pairs the flat per-transport rows into one row per connection count, which is what the UI renders. */
function pairResults(raw: RawResult[]): BenchmarkData[] {
  const byConns = new Map<number, Partial<BenchmarkData> & { connections: BenchmarkData['connections'] }>();

  for (const row of raw) {
    const entry = byConns.get(row.connections) ?? { connections: row.connections };
    if (row.transport === 'ws') {
      entry.wsMemory = row.peakMemoryMB;
      entry.wsConnectMs = row.connectMs;
    } else {
      entry.sseMemory = row.peakMemoryMB;
      entry.sseConnectMs = row.connectMs;
    }
    byConns.set(row.connections, entry);
  }

  return [...byConns.values()].sort((a, b) => a.connections - b.connections) as BenchmarkData[];
}

const DATASET: BenchmarkData[] = pairResults(rawResults as RawResult[]);
const MAX_MEMORY = Math.max(...DATASET.flatMap((d) => [d.wsMemory, d.sseMemory])) * 1.1;

function WebSocketsVsSsePage() {
  useSeo({
    title: 'Benchmark: WebSockets vs SSE',
    description: 'Interactive benchmark visualizing server memory cost for holding open thousands of WebSocket vs Server-Sent Events connections.',
  });

  const [connections, setConnections] = useState<100 | 1000 | 5000>(1000);

  const currentData = useMemo(() => DATASET.find((d) => d.connections === connections)!, [connections]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="websockets-vs-sse" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">WebSockets vs Server-Sent Events</h1>
      <p className="mt-2 text-slate-600">
        Server memory cost of holding N concurrent long-lived connections open, one broadcast
        transport at a time.
      </p>

      <ProvenanceNote labId="websockets-vs-sse" />

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
            Held-Open Connections
          </h2>

          <div className="flex gap-2" role="group" aria-label="Number of connections">
            {[100, 1000, 5000].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={connections === c}
                onClick={() => setConnections(c as 100 | 1000 | 5000)}
                className={`flex-1 rounded-lg border py-2 text-xs font-bold transition-colors ${
                  connections === c ? 'bg-inverse text-inverse-fg border-inverse' : 'bg-surface text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {c.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="flex gap-3 rounded-xl bg-sky-50 p-4 text-xs leading-relaxed text-sky-800">
            <Gauge className="h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
            <p>
              Both transports are implemented in the same Go process model — a broadcaster pushes a
              tick to every connected client every 200ms. What's measured is each transport's own
              connection-holding cost, not a language or runtime difference.
            </p>
          </div>

          <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <p>
              Connect-time (below) showed high run-to-run variance at 5,000 connections when this
              harness was re-run — see the article and{' '}
              <a
                href="https://github.com/khoahotran/portfolio/tree/main/benchmarks/websockets-vs-sse"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-amber-400 underline-offset-2 hover:text-amber-900"
              >
                harness README
              </a>
              . Treat memory as the reliable number here, not connect-time.
            </p>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-8 shadow-sm flex flex-col">
          <h2 className="mb-8 text-sm font-bold uppercase tracking-widest text-slate-500">
            Peak Server Memory (MB) — {connections.toLocaleString()} connections
          </h2>

          <div className="flex flex-1 items-end justify-center gap-8 h-64 border-b border-slate-200 pb-2">
            <div className="w-20 flex flex-col items-center gap-2">
              <div className="text-xs font-bold text-teal-700">{currentData.wsMemory.toFixed(1)} MB</div>
              {/* The bar's height is a percentage, which only resolves against a definite-height
                  ancestor — the outer row is `items-end` (not `stretch`), so this column's own
                  height is auto/content-sized and a percentage inside it computes to 0 without
                  this fixed-height track wrapping it. */}
              <div className="flex h-48 w-full items-end">
                <div
                  className="w-full rounded-t-sm bg-teal-500 transition-all duration-500"
                  style={{ height: `${(currentData.wsMemory / MAX_MEMORY) * 100}%` }}
                />
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">WebSocket</div>
            </div>

            <div className="w-20 flex flex-col items-center gap-2">
              <div className="text-xs font-bold text-rose-700">{currentData.sseMemory.toFixed(1)} MB</div>
              <div className="flex h-48 w-full items-end">
                <div
                  className="w-full rounded-t-sm bg-rose-400 transition-all duration-500"
                  style={{ height: `${(currentData.sseMemory / MAX_MEMORY) * 100}%` }}
                />
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">SSE</div>
            </div>
          </div>
          <p className="mt-4 text-center font-mono text-xs text-slate-500">Lower is better &darr;</p>

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              Connect time (unreliable at scale — see caveat):{' '}
              <span className="font-mono text-slate-700">{currentData.wsConnectMs.toFixed(0)}ms</span> WS vs{' '}
              <span className="font-mono text-slate-700">{currentData.sseConnectMs.toFixed(0)}ms</span> SSE
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default WebSocketsVsSsePage;
