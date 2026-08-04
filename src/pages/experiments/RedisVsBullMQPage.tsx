import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../seo/useSeo';
import { BarChart3, Info } from 'lucide-react';

interface BenchmarkData {
  payloadSize: string;
  workers: number;
  redisThroughput: number;
  bullmqThroughput: number;
  redisLatency: number;
  bullmqLatency: number;
}

const DATASET: BenchmarkData[] = [
  { payloadSize: '1KB', workers: 1, redisThroughput: 18500, bullmqThroughput: 4200, redisLatency: 1.2, bullmqLatency: 5.4 },
  { payloadSize: '1KB', workers: 5, redisThroughput: 45000, bullmqThroughput: 12500, redisLatency: 2.1, bullmqLatency: 8.9 },
  { payloadSize: '10KB', workers: 1, redisThroughput: 14200, bullmqThroughput: 3100, redisLatency: 1.8, bullmqLatency: 6.2 },
  { payloadSize: '10KB', workers: 5, redisThroughput: 38000, bullmqThroughput: 9800, redisLatency: 3.4, bullmqLatency: 11.5 },
  { payloadSize: '100KB', workers: 1, redisThroughput: 5100, bullmqThroughput: 1200, redisLatency: 4.5, bullmqLatency: 18.2 },
  { payloadSize: '100KB', workers: 5, redisThroughput: 18000, bullmqThroughput: 4500, redisLatency: 8.2, bullmqLatency: 25.4 },
];

function RedisVsBullMQPage() {
  useSeo({ title: 'Benchmark: Redis Streams vs BullMQ', description: 'Interactive benchmark visualizing queue throughput and latency.' });
  
  const [payloadSize, setPayloadSize] = useState<'1KB' | '10KB' | '100KB'>('1KB');
  const [workers, setWorkers] = useState<1 | 5>(1);

  const currentData = useMemo(() => {
    return DATASET.find(d => d.payloadSize === payloadSize && d.workers === workers)!;
  }, [payloadSize, workers]);

  const maxThroughput = 50000;
  const maxLatency = 30;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <Link to="/experiments" className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 hover:text-teal-700 transition-colors">
        &larr; Back to Experiments
      </Link>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Redis Streams (Go) vs BullMQ (Node.js)</h1>
      <p className="mt-2 text-slate-600">A reproducible benchmark comparing raw queueing performance.</p>

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">Parameters</h3>
            
            <label className="block text-sm font-semibold text-slate-700">
              Payload Size
              <div className="mt-3 flex gap-2">
                {['1KB', '10KB', '100KB'].map(size => (
                  <button
                    key={size}
                    onClick={() => setPayloadSize(size as '1KB' | '10KB' | '100KB')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${payloadSize === size ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Consumer Workers
              <div className="mt-3 flex gap-2">
                {[1, 5].map(w => (
                  <button
                    key={w}
                    onClick={() => setWorkers(w as 1 | 5)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${workers === w ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {w} Worker{w > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </label>

            <div className="bg-sky-50 text-sky-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed mt-8">
              <Info className="w-5 h-5 shrink-0 text-sky-600" />
              <p>BullMQ relies on Lua scripts for atomic operations, adding overhead per job. Raw Redis Streams via Go (`XADD` / `XREADGROUP`) bypasses this logic for sheer speed.</p>
            </div>
          </div>
        </section>

        <section className="md:col-span-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Benchmark Results
          </h3>
          
          <div className="flex-1 grid md:grid-cols-2 gap-12">
            
            {/* Throughput Chart */}
            <div>
              <h4 className="text-center font-bold text-slate-800 mb-6">Throughput (Jobs/sec)</h4>
              <div className="flex items-end justify-center gap-6 h-64 border-b border-slate-200 pb-2 relative">
                {/* Redis Bar */}
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-teal-600">{currentData.redisThroughput.toLocaleString()}</div>
                  <div className="w-full bg-teal-500 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.redisThroughput / maxThroughput) * 100}%` }} />
                  <div className="text-xs font-semibold text-slate-500 mt-2">Redis+Go</div>
                </div>
                
                {/* BullMQ Bar */}
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-500">{currentData.bullmqThroughput.toLocaleString()}</div>
                  <div className="w-full bg-rose-400 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.bullmqThroughput / maxThroughput) * 100}%` }} />
                  <div className="text-xs font-semibold text-slate-500 mt-2">BullMQ+TS</div>
                </div>
              </div>
              <p className="text-center text-xs text-slate-400 mt-4 font-mono">Higher is better &uarr;</p>
            </div>

            {/* Latency Chart */}
            <div>
              <h4 className="text-center font-bold text-slate-800 mb-6">Avg Latency (ms)</h4>
              <div className="flex items-end justify-center gap-6 h-64 border-b border-slate-200 pb-2 relative">
                {/* Redis Bar */}
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-teal-600">{currentData.redisLatency.toFixed(1)}ms</div>
                  <div className="w-full bg-teal-500 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.redisLatency / maxLatency) * 100}%` }} />
                  <div className="text-xs font-semibold text-slate-500 mt-2">Redis+Go</div>
                </div>
                
                {/* BullMQ Bar */}
                <div className="w-16 flex flex-col items-center gap-2 group">
                  <div className="text-xs font-bold text-rose-500">{currentData.bullmqLatency.toFixed(1)}ms</div>
                  <div className="w-full bg-rose-400 rounded-t-sm transition-all duration-500" style={{ height: `${(currentData.bullmqLatency / maxLatency) * 100}%` }} />
                  <div className="text-xs font-semibold text-slate-500 mt-2">BullMQ+TS</div>
                </div>
              </div>
              <p className="text-center text-xs text-slate-400 mt-4 font-mono">Lower is better &darr;</p>
            </div>

          </div>
          
        </section>
      </div>
    </main>
  );
}

export default RedisVsBullMQPage;
