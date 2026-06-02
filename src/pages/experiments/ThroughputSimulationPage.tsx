import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../seo/useSeo';

function ThroughputSimulationPage() {
  useSeo({ title: 'Throughput Simulation', description: 'Interactive throughput and latency simulation for worker systems.' });
  const [workers, setWorkers] = useState(8);
  const [processingMs, setProcessingMs] = useState(120);
  const [failureRate, setFailureRate] = useState(2);

  const result = useMemo(() => {
    const capacityPerSecond = (workers * 1000) / processingMs;
    const successRate = Math.max(0, 1 - failureRate / 100);
    const effectiveThroughput = capacityPerSecond * successRate;

    return {
      capacityPerSecond,
      effectiveThroughput,
      p95Latency: processingMs * (1 + failureRate / 50),
    };
  }, [workers, processingMs, failureRate]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <Link to="/experiments" className="mb-4 inline-block text-xs text-teal-600 hover:underline">
        Back to Experiments
      </Link>
      <h1 className="text-3xl font-bold text-slate-900">Throughput Simulation</h1>
      <p className="mt-2 text-sm text-slate-600">Model worker count, latency, and failure impact on throughput.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block text-sm font-medium text-slate-700">
            Workers: {workers}
            <input
              type="range"
              min={1}
              max={32}
              value={workers}
              onChange={(event) => setWorkers(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Processing latency (ms): {processingMs}
            <input
              type="range"
              min={20}
              max={500}
              step={10}
              value={processingMs}
              onChange={(event) => setProcessingMs(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Failure rate (%): {failureRate}
            <input
              type="range"
              min={0}
              max={25}
              value={failureRate}
              onChange={(event) => setFailureRate(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Result</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>Raw capacity: {result.capacityPerSecond.toFixed(1)} req/s</p>
            <p>Effective throughput: {result.effectiveThroughput.toFixed(1)} req/s</p>
            <p>Estimated P95 latency: {result.p95Latency.toFixed(0)} ms</p>
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-3 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, result.capacityPerSecond)}%` }} />
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, result.effectiveThroughput)}%` }} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ThroughputSimulationPage;
