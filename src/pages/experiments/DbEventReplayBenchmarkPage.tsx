import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { useSeo } from '../../seo/useSeo';
import { Database, Info } from 'lucide-react';
import rawResults from './db-event-replay-benchmark-results.json';

/**
 * Raw shape written by benchmarks/db-event-replay-benchmark/run.sh — one row per (database, event
 * count) combination, straight from the harness's own JSON stdout line. Byte-identical copy of
 * benchmarks/db-event-replay-benchmark/results.json; see that directory's README.md to reproduce it.
 */
interface RawResult {
  database: 'postgres' | 'firestore';
  events: 10000 | 50000 | 100000;
  fetchFoldMs: number;
  finalBalance: number;
  eventsProcessed: number;
}

interface BenchmarkData {
  events: 10000 | 50000 | 100000;
  pgTime: number;
  firestoreTime: number;
}

/** Pairs the flat per-database rows into one row per event count, which is what the UI renders. */
function pairResults(raw: RawResult[]): BenchmarkData[] {
  const byEvents = new Map<number, Partial<BenchmarkData> & { events: BenchmarkData['events'] }>();

  for (const row of raw) {
    const entry = byEvents.get(row.events) ?? { events: row.events };
    if (row.database === 'postgres') {
      entry.pgTime = row.fetchFoldMs;
    } else {
      entry.firestoreTime = row.fetchFoldMs;
    }
    byEvents.set(row.events, entry);
  }

  return [...byEvents.values()].sort((a, b) => a.events - b.events) as BenchmarkData[];
}

const DATASET: BenchmarkData[] = pairResults(rawResults as RawResult[]);
const MAX_TIME = Math.max(...DATASET.flatMap((d) => [d.pgTime, d.firestoreTime])) * 1.1;

function DbEventReplayBenchmarkPage() {
  useSeo({ title: 'Benchmark: DB Event Replay', description: 'Interactive benchmark visualizing event sourcing replay times across databases.' });
  
  const [events, setEvents] = useState<10000 | 50000 | 100000>(50000);

  const currentData = useMemo(() => {
    return DATASET.find(d => d.events === events)!;
  }, [events]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="db-event-replay-benchmark" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Event Replay: PostgreSQL vs Firestore</h1>
      <p className="mt-2 text-slate-600">Benchmarking the time to fetch and fold thousands of immutable events into a Read Projection.</p>

      <ProvenanceNote labId="db-event-replay-benchmark" />

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <div className="space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">Dataset</h2>

            <div className="block text-sm font-semibold text-slate-700">
              Total Events to Replay
              <div className="mt-3 flex gap-2" role="group" aria-label="Total events to replay">
                {[10000, 50000, 100000].map(e => (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={events === e}
                    onClick={() => setEvents(e as 10000 | 50000 | 100000)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors ${events === e ? 'bg-inverse text-inverse-fg border-inverse' : 'bg-surface text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    {e.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-sky-50 text-sky-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed mt-8">
              <Database className="w-5 h-5 shrink-0 text-sky-600" />
              <p>PostgreSQL excels at sequential reads and pulling large datasets into memory quickly. Firestore is a document store optimized for single-document reads; retrieving 50,000 documents requires significantly more network overhead and deserialization time.</p>
            </div>
            
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed mt-2">
              <Info className="w-5 h-5 shrink-0 text-amber-600" />
              <p><strong>Conclusion:</strong> For an Event Store where you routinely need to replay long streams of events, a relational DB (or dedicated event store like EventStoreDB) vastly outperforms document databases like Firestore.</p>
            </div>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-8 shadow-sm flex flex-col justify-center">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-8 flex items-center gap-2 text-center w-full justify-center">
            <Database className="w-4 h-4" /> Replay Time (milliseconds)
          </h2>
          
          <div className="w-full max-w-md mx-auto space-y-8">
            
            {/* PostgreSQL Bar */}
            <div className="relative pt-6">
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold text-slate-800">PostgreSQL</span>
                <span className="text-teal-700 font-bold">{currentData.pgTime.toFixed(1)} ms</span>
              </div>
              <div className="h-8 w-full bg-slate-100 rounded-lg overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-teal-500 transition-all duration-500 rounded-lg" style={{ width: `${(currentData.pgTime / MAX_TIME) * 100}%` }} />
              </div>
            </div>

            {/* Firestore Bar */}
            <div className="relative pt-6">
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold text-slate-800">Firestore</span>
                <span className="text-rose-700 font-bold">{currentData.firestoreTime.toFixed(1)} ms</span>
              </div>
              <div className="h-8 w-full bg-slate-100 rounded-lg overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-rose-400 transition-all duration-500 rounded-lg" style={{ width: `${(currentData.firestoreTime / MAX_TIME) * 100}%` }} />
              </div>
            </div>

          </div>
          <p className="text-center text-xs text-slate-500 mt-12 font-mono">Lower is better &darr;</p>
        </section>
      </div>
    </main>
  );
}

export default DbEventReplayBenchmarkPage;
