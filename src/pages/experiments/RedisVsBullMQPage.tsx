import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { useSeo } from '../../seo/useSeo';
import { BarChart3, Info } from 'lucide-react';
import rawResults from './redis-vs-bullmq-results.json';

/**
 * Raw shape written by benchmarks/redis-vs-bullmq/run.sh — one row per (engine, payload, workers)
 * combination, straight from each harness's own JSON stdout line. This file is a byte-identical
 * copy of benchmarks/redis-vs-bullmq/results.json; see that directory's README.md to reproduce it.
 */
interface RawResult {
  engine: 'redis-streams' | 'bullmq';
  payloadBytes: number;
  workers: number;
  jobs: number;
  throughputPerSec: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  durationSeconds: number;
  enqueueSeconds: number;
  payloadLabel: '1KB' | '10KB' | '100KB';
}

interface BenchmarkData {
  payloadSize: '1KB' | '10KB' | '100KB';
  workers: number;
  redisThroughput: number;
  bullmqThroughput: number;
  redisLatency: number;
  bullmqLatency: number;
}

/** Pairs the flat per-engine rows into one row per (payload, workers) combo, which is what the UI renders. */
function pairResults(raw: RawResult[]): BenchmarkData[] {
  const byCombo = new Map<string, Partial<BenchmarkData> & { payloadSize: BenchmarkData['payloadSize']; workers: number }>();

  for (const row of raw) {
    const key = `${row.payloadLabel}:${row.workers}`;
    const entry = byCombo.get(key) ?? { payloadSize: row.payloadLabel, workers: row.workers };
    if (row.engine === 'redis-streams') {
      entry.redisThroughput = row.throughputPerSec;
      entry.redisLatency = row.avgLatencyMs;
    } else {
      entry.bullmqThroughput = row.throughputPerSec;
      entry.bullmqLatency = row.avgLatencyMs;
    }
    byCombo.set(key, entry);
  }

  return [...byCombo.values()] as BenchmarkData[];
}

const DATASET: BenchmarkData[] = pairResults(rawResults as RawResult[]);
const MAX_THROUGHPUT = Math.max(...DATASET.flatMap((d) => [d.redisThroughput, d.bullmqThroughput])) * 1.1;
const MAX_LATENCY = Math.max(...DATASET.flatMap((d) => [d.redisLatency, d.bullmqLatency])) * 1.1;

function RedisVsBullMQPage() {
  useSeo({ title: 'Benchmark: Redis Streams vs BullMQ', description: 'Interactive benchmark visualizing queue throughput and latency.' });
  
  const [payloadSize, setPayloadSize] = useState<'1KB' | '10KB' | '100KB'>('1KB');
  const [workers, setWorkers] = useState<1 | 5>(1);

  const currentData = useMemo(() => {
    return DATASET.find(d => d.payloadSize === payloadSize && d.workers === workers)!;
  }, [payloadSize, workers]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="redis-vs-bullmq" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Redis Streams (Go) vs BullMQ (Node.js)</h1>
      <p className="mt-2 text-slate-600">
        One measured run comparing raw queueing performance. Read the environment and limits below before quoting any of these numbers.
      </p>

      <ProvenanceNote labId="redis-vs-bullmq" />

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">Parameters</h2>

            <div className="block text-sm font-semibold text-slate-700">
              Payload Size
              <div className="mt-3 flex gap-2" role="group" aria-label="Payload size">
                {['1KB', '10KB', '100KB'].map(size => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={payloadSize === size}
                    onClick={() => setPayloadSize(size as '1KB' | '10KB' | '100KB')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${payloadSize === size ? 'bg-inverse text-inverse-fg border-inverse' : 'bg-surface text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="block text-sm font-semibold text-slate-700">
              Consumer Workers
              <div className="mt-3 flex gap-2" role="group" aria-label="Consumer workers">
                {[1, 5].map(w => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={workers === w}
                    onClick={() => setWorkers(w as 1 | 5)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${workers === w ? 'bg-inverse text-inverse-fg border-inverse' : 'bg-surface text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {w} Worker{w > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-sky-50 text-sky-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed mt-8">
              <Info className="w-5 h-5 shrink-0 text-sky-600" />
              <p>BullMQ relies on Lua scripts for atomic operations, adding overhead per job. Raw Redis Streams via Go (`XADD` / `XREADGROUP`) bypasses this logic for sheer speed. These numbers come from <code>benchmarks/redis-vs-bullmq/</code> in the repository &mdash; a runnable Docker Compose harness, not a fixed dataset.</p>
            </div>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-8 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Benchmark Results
          </h2>

          <div className="flex-1 grid md:grid-cols-2 gap-12">

            {/* Throughput Chart */}
            <div>
              <h3 className="text-center font-bold text-slate-800 mb-6">Throughput (Jobs/sec)</h3>
              <div className="flex items-end justify-center gap-6 h-64 border-b border-slate-200 pb-2 relative">
                {/* Redis Bar */}
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-teal-700">{Math.round(currentData.redisThroughput).toLocaleString()}</div>
                  {/* Fixed-height track: `height: N%` only resolves against a definite-height
                      ancestor, and this column (child of an `items-end`, not `stretch`, row) is
                      otherwise auto-height — without this wrapper the bar silently renders 0px. */}
                  <div className="flex h-48 w-full items-end">
                    <div className="w-full bg-teal-500 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.redisThroughput / MAX_THROUGHPUT) * 100}%` }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">Redis+Go</div>
                </div>

                {/* BullMQ Bar */}
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-700">{Math.round(currentData.bullmqThroughput).toLocaleString()}</div>
                  <div className="flex h-48 w-full items-end">
                    <div className="w-full bg-rose-400 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.bullmqThroughput / MAX_THROUGHPUT) * 100}%` }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">BullMQ+TS</div>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-4 font-mono">Higher is better &uarr;</p>
            </div>

            {/* Latency Chart */}
            <div>
              <h3 className="text-center font-bold text-slate-800 mb-6">Avg Latency (ms)</h3>
              <div className="flex items-end justify-center gap-6 h-64 border-b border-slate-200 pb-2 relative">
                {/* Redis Bar */}
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-teal-700">{currentData.redisLatency.toFixed(1)}ms</div>
                  <div className="flex h-48 w-full items-end">
                    <div className="w-full bg-teal-500 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.redisLatency / MAX_LATENCY) * 100}%` }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">Redis+Go</div>
                </div>

                {/* BullMQ Bar */}
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-700">{currentData.bullmqLatency.toFixed(1)}ms</div>
                  <div className="flex h-48 w-full items-end">
                    <div className="w-full bg-rose-400 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.bullmqLatency / MAX_LATENCY) * 100}%` }} />
                  </div>
                  <div className="text-xs font-semibold text-slate-500 mt-2">BullMQ+TS</div>
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

export default RedisVsBullMQPage;
