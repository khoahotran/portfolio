import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import {
  buildArrivalTimeline,
  simulateFixedWindow,
  simulateLeakyBucket,
  simulateTokenBucket,
  type RateLimitStep,
} from '../../labs/rateLimiting';
import { useSeo } from '../../seo/useSeo';

type Algorithm = 'token-bucket' | 'leaky-bucket' | 'fixed-window';

// Each algorithm's second parameter means something different (a rate for the two bucket
// algorithms, a window duration for Fixed Window) — this config drives the slider's label, unit,
// and range per algorithm, and its own default, rather than forcing one shared slider to mean
// three different things depending on which tab is active.
const ALGORITHM_CONFIG: Record<
  Algorithm,
  { label: string; paramLabel: string; paramUnit: string; paramMin: number; paramMax: number; paramStep: number; paramDefault: number }
> = {
  'token-bucket': { label: 'Token Bucket', paramLabel: 'Refill rate', paramUnit: 'req/s', paramMin: 0, paramMax: 10, paramStep: 0.5, paramDefault: 2 },
  'leaky-bucket': { label: 'Leaky Bucket', paramLabel: 'Leak rate', paramUnit: 'req/s', paramMin: 0, paramMax: 10, paramStep: 0.5, paramDefault: 2 },
  'fixed-window': { label: 'Fixed Window', paramLabel: 'Window size', paramUnit: 's', paramMin: 0.5, paramMax: 3, paramStep: 0.5, paramDefault: 1 },
};

const DURATION_SECONDS = 4;
const BURST_AT_SECOND = 2;

function runAlgorithm(algorithm: Algorithm, arrivals: number[], capacity: number, param: number): RateLimitStep[] {
  switch (algorithm) {
    case 'token-bucket':
      return simulateTokenBucket(arrivals, capacity, param);
    case 'leaky-bucket':
      return simulateLeakyBucket(arrivals, capacity, param);
    case 'fixed-window':
      // `param` is the window size here; `capacity` doubles as the per-window limit — see the
      // maxState comment below for why that reuse keeps the visualization's normalization uniform
      // across all three algorithms instead of needing a fourth, algorithm-specific axis.
      return simulateFixedWindow(arrivals, param, capacity);
  }
}

function RateLimitingAlgorithmsPage() {
  useSeo({
    title: 'Rate Limiting Algorithms',
    description: 'Token Bucket vs Leaky Bucket vs Fixed Window Counter — the real algorithms, run on a shared burst scenario.',
  });

  const [algorithm, setAlgorithm] = useState<Algorithm>('token-bucket');
  const [capacity, setCapacity] = useState(5);
  const [param, setParam] = useState(ALGORITHM_CONFIG['token-bucket'].paramDefault);
  const [sustainedRate, setSustainedRate] = useState(2);
  const [burstSize, setBurstSize] = useState(8);

  const config = ALGORITHM_CONFIG[algorithm];

  function selectAlgorithm(next: Algorithm) {
    setAlgorithm(next);
    setParam(ALGORITHM_CONFIG[next].paramDefault);
  }

  const arrivals = useMemo(
    () => buildArrivalTimeline(sustainedRate, DURATION_SECONDS, burstSize, BURST_AT_SECOND),
    [sustainedRate, burstSize]
  );

  const steps = useMemo(
    () => runAlgorithm(algorithm, arrivals, capacity, param),
    [algorithm, arrivals, capacity, param]
  );

  const stats = useMemo(() => {
    const allowed = steps.filter((s) => s.allowed).length;
    return {
      allowed,
      rejected: steps.length - allowed,
      total: steps.length,
      rate: steps.length > 0 ? (allowed / steps.length) * 100 : 100,
    };
  }, [steps]);

  // Every algorithm's `state` is normalized against `capacity` — the bucket's own ceiling for
  // Token/Leaky Bucket, and the per-window limit (reused as `capacity`, see runAlgorithm) for
  // Fixed Window — so the state chart's y-axis means "how full is the thing that gates
  // admission" consistently across all three tabs, not three differently-scaled charts.
  const maxState = Math.max(1, capacity);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="rate-limiting-algorithms" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Rate Limiting Algorithms</h1>
      <p className="mt-2 text-slate-600">
        Token Bucket, Leaky Bucket, and Fixed Window Counter, run for real against the same burst
        scenario &mdash; a sustained rate plus one burst injected at t={BURST_AT_SECOND}s &mdash; so
        the different admission decisions come from the algorithms, not from different inputs.
      </p>

      <ProvenanceNote labId="rate-limiting-algorithms" />

      <div className="mt-8 flex gap-2" role="group" aria-label="Algorithm">
        {(Object.keys(ALGORITHM_CONFIG) as Algorithm[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={algorithm === id}
            onClick={() => selectAlgorithm(id)}
            className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              algorithm === id ? 'bg-accent text-accent-fg shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {ALGORITHM_CONFIG[id].label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Sustained rate</span>
              <span className="text-teal-700">{sustainedRate} req/s</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={sustainedRate}
              onChange={(event) => setSustainedRate(Number(event.target.value))}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Burst size (at t={BURST_AT_SECOND}s)</span>
              <span className="text-teal-700">{burstSize}</span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              value={burstSize}
              onChange={(event) => setBurstSize(Number(event.target.value))}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700 pt-2 border-t border-slate-100">
            <div className="flex justify-between">
              <span>{algorithm === 'fixed-window' ? 'Limit per window' : 'Capacity'}</span>
              <span className="text-teal-700">{capacity}</span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              value={capacity}
              onChange={(event) => setCapacity(Number(event.target.value))}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>{config.paramLabel}</span>
              <span className="text-teal-700">
                {param} {config.paramUnit}
              </span>
            </div>
            <input
              type="range"
              min={config.paramMin}
              max={config.paramMax}
              step={config.paramStep}
              value={param}
              onChange={(event) => setParam(Number(event.target.value))}
              className="mt-3 w-full accent-teal-600"
            />
          </label>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center">
            <div>
              <div className="text-lg font-bold text-teal-700">{stats.allowed}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Allowed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-rose-600">{stats.rejected}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rejected</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{stats.rate.toFixed(0)}%</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Admit rate</div>
            </div>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
            {stats.total} requests over {DURATION_SECONDS}s
          </p>

          <div className="relative w-full min-h-[220px] bg-slate-50 rounded-xl border border-slate-100 overflow-hidden p-4">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Window boundary guides — only meaningful for Fixed Window, but shown for all three
                  so switching tabs doesn't jump the reader's sense of the timeline's scale. */}
              {algorithm === 'fixed-window' &&
                Array.from({ length: Math.floor(DURATION_SECONDS / param) + 1 }, (_, i) => i * param).map((boundary) => (
                  <line
                    key={boundary}
                    x1={5 + (boundary / DURATION_SECONDS) * 90}
                    y1="0"
                    x2={5 + (boundary / DURATION_SECONDS) * 90}
                    y2="100"
                    stroke="rgb(203, 213, 225)"
                    strokeWidth="0.5"
                    strokeDasharray="1,1"
                  />
                ))}

              {/* State area — how full the bucket/window is at each arrival, normalized to maxState. */}
              <polyline
                points={steps
                  .map((s) => `${5 + (s.t / DURATION_SECONDS) * 90},${85 - (s.state / maxState) * 70}`)
                  .join(' ')}
                fill="none"
                stroke="rgb(13, 148, 136)"
                strokeWidth="1"
                opacity="0.5"
              />

              {/* Each arrival, colored by the algorithm's real admit/reject decision. */}
              {steps.map((s, i) => (
                <circle
                  key={i}
                  cx={5 + (s.t / DURATION_SECONDS) * 90}
                  cy={85 - (s.state / maxState) * 70}
                  r="1.6"
                  fill={s.allowed ? 'rgb(13, 148, 136)' : 'rgb(225, 29, 72)'}
                />
              ))}

              <line x1="5" y1="85" x2="95" y2="85" stroke="rgb(203, 213, 225)" strokeWidth="0.5" />
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-600" aria-hidden="true" />
              Allowed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />
              Rejected
            </span>
            <span className="ml-auto text-slate-500">
              Height = {algorithm === 'fixed-window' ? 'requests admitted in the current window' : 'bucket fill level'}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default RateLimitingAlgorithmsPage;
