import { useMemo, useState } from 'react';
import { useSeo } from '../../seo/useSeo';

function FailureInjectionDemoPage() {
  useSeo({ title: 'Failure Injection Demo', description: 'Inject controlled failure and observe circuit breaker behavior.' });
  const [failureRate, setFailureRate] = useState(10);
  const [requestCount, setRequestCount] = useState(120);
  const [circuitThreshold, setCircuitThreshold] = useState(40);

  const simulation = useMemo(() => {
    const failed = Math.round((failureRate / 100) * requestCount);
    const success = requestCount - failed;
    const breakerOpen = failureRate >= circuitThreshold;

    return { failed, success, breakerOpen };
  }, [failureRate, requestCount, circuitThreshold]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Failure Injection Demo</h1>
      <p className="mt-2 text-sm text-slate-600">Inject synthetic failure and observe circuit breaker behavior.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block text-sm font-medium text-slate-700">
            Failure rate (%): {failureRate}
            <input
              type="range"
              min={0}
              max={100}
              value={failureRate}
              onChange={(event) => setFailureRate(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Request volume: {requestCount}
            <input
              type="range"
              min={20}
              max={300}
              step={10}
              value={requestCount}
              onChange={(event) => setRequestCount(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Circuit breaker threshold (%): {circuitThreshold}
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={circuitThreshold}
              onChange={(event) => setCircuitThreshold(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Simulation Result</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">Success: {simulation.success}</div>
            <div className="rounded-lg bg-rose-50 p-3 text-rose-700">Failed: {simulation.failed}</div>
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Circuit breaker: {simulation.breakerOpen ? 'OPEN' : 'CLOSED'}
          </p>
        </section>
      </div>
    </main>
  );
}

export default FailureInjectionDemoPage;
