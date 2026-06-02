import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../seo/useSeo';

function RetryStrategyVisualizerPage() {
  useSeo({ title: 'Retry Strategy Visualizer', description: 'Compare linear and exponential backoff retry strategies.' });
  const [attempts, setAttempts] = useState(5);
  const [baseDelay, setBaseDelay] = useState(200);
  const [strategy, setStrategy] = useState<'linear' | 'exponential'>('exponential');

  const schedule = useMemo(() => {
    return Array.from({ length: attempts }, (_, index) => {
      const attempt = index + 1;
      const delay = strategy === 'linear' ? baseDelay * attempt : baseDelay * Math.pow(2, index);
      return { attempt, delay };
    });
  }, [attempts, baseDelay, strategy]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <Link to="/experiments" className="mb-4 inline-block text-xs text-teal-600 hover:underline">
        Back to Experiments
      </Link>
      <h1 className="text-3xl font-bold text-slate-900">Retry Strategy Visualizer</h1>
      <p className="mt-2 text-sm text-slate-600">Compare linear and exponential backoff windows.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block text-sm font-medium text-slate-700">
            Attempts: {attempts}
            <input
              type="range"
              min={1}
              max={8}
              value={attempts}
              onChange={(event) => setAttempts(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Base delay (ms): {baseDelay}
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={baseDelay}
              onChange={(event) => setBaseDelay(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <div className="flex gap-2">
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                strategy === 'exponential' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setStrategy('exponential')}
            >
              Exponential
            </button>
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                strategy === 'linear' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setStrategy('linear')}
            >
              Linear
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Retry Timeline</h2>
          <ul className="mt-4 space-y-3">
            {schedule.map((step) => (
              <li key={step.attempt} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Attempt {step.attempt}: wait {step.delay} ms
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

export default RetryStrategyVisualizerPage;
