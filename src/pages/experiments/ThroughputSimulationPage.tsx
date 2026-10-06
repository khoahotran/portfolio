import { useMemo, useState, useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { useSeo } from '../../seo/useSeo';

function ThroughputSimulationPage() {
  useSeo({ title: 'Throughput Simulation', description: 'Interactive throughput and latency simulation for worker systems.' });
  const [workers, setWorkers] = useState(8);
  const [processingMs, setProcessingMs] = useState(120);
  const [failureRate, setFailureRate] = useState(2);
  const [ticks, setTicks] = useState(0);
  // The jitter ticker previously ran forever with no way to freeze the
  // animation — every parameter was live, but the chart itself was
  // "watch only". Pausing stops just the decorative noise; the sliders
  // above still recompute the chart instantly either way.
  const [isPaused, setIsPaused] = useState(false);

  // Animation ticker to simulate a moving graph
  useEffect(() => {
    if (isPaused) {
      return;
    }
    const timer = setInterval(() => setTicks(t => t + 1), 500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const result = useMemo(() => {
    const capacityPerSecond = (workers * 1000) / processingMs;
    const successRate = Math.max(0, 1 - failureRate / 100);
    const effectiveThroughput = capacityPerSecond * successRate;

    // Generate simulated data points for a chart
    const dataPoints = Array.from({ length: 20 }).map((_, i) => {
      // Add a little random noise based on the tick for visual realism
      const noise = (Math.sin(ticks + i) * 0.1) + 1;
      return {
        x: i,
        raw: Math.max(0, capacityPerSecond * noise),
        effective: Math.max(0, effectiveThroughput * noise * (1 - Math.random() * 0.05)),
      };
    });

    const maxVal = Math.max(10, capacityPerSecond * 1.5);

    return {
      capacityPerSecond,
      effectiveThroughput,
      p95Latency: processingMs * (1 + failureRate / 50),
      dataPoints,
      maxVal
    };
  }, [workers, processingMs, failureRate, ticks]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="throughput-simulation" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Throughput Simulation</h1>
      <p className="mt-2 text-slate-600">Model how worker count, latency, and failure rates impact effective throughput in an asynchronous processing pipeline.</p>

      <ProvenanceNote labId="throughput-simulation" />

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>Concurrency (Workers)</span>
                <span className="text-teal-700">{workers}</span>
              </div>
              <input
                type="range"
                min={1}
                max={64}
                value={workers}
                onChange={(event) => setWorkers(Number(event.target.value))}
                className="mt-3 w-full accent-teal-600"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 pt-2">
              <div className="flex justify-between">
                <span>Processing Latency</span>
                <span className="text-teal-700">{processingMs} ms</span>
              </div>
              <input
                type="range"
                min={20}
                max={1000}
                step={10}
                value={processingMs}
                onChange={(event) => setProcessingMs(Number(event.target.value))}
                className="mt-3 w-full accent-teal-600"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 pt-2">
              <div className="flex justify-between">
                <span>Failure Rate</span>
                <span className="text-teal-700">{failureRate}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={failureRate}
                onChange={(event) => setFailureRate(Number(event.target.value))}
                className="mt-3 w-full accent-teal-600"
              />
            </label>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Live simulation</h2>
            <button
              type="button"
              onClick={() => setIsPaused((paused) => !paused)}
              aria-pressed={isPaused}
              className="btn-pill"
            >
              {isPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
              {isPaused ? 'Resume' : 'Pause'} animation
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">Max Capacity</div>
              <div className="text-2xl font-bold text-slate-900">{result.capacityPerSecond.toFixed(1)} <span className="text-sm font-normal text-slate-500">req/s</span></div>
            </div>
            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
              <div className="text-xs uppercase tracking-widest text-teal-700 font-semibold mb-1">Effective</div>
              <div className="text-2xl font-bold text-teal-700">{result.effectiveThroughput.toFixed(1)} <span className="text-sm font-normal text-teal-700">req/s</span></div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">P95 Latency</div>
              <div className="text-2xl font-bold text-slate-900">{result.p95Latency.toFixed(0)} <span className="text-sm font-normal text-slate-500">ms</span></div>
            </div>
          </div>
          
          <div className="flex-1 relative min-h-[250px] w-full">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="effectiveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(13, 148, 136)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="rgb(13, 148, 136)" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map(val => (
                <line key={val} x1="0" y1={val} x2="100" y2={val} stroke="rgb(241, 245, 249)" strokeWidth="0.5" />
              ))}

              {/* Data paths */}
              <polyline
                fill="none"
                stroke="rgb(203, 213, 225)"
                strokeWidth="1.5"
                strokeDasharray="2,2"
                points={result.dataPoints.map(p => `${(p.x / 19) * 100},${100 - (p.raw / result.maxVal) * 100}`).join(' ')}
              />
              
              <polygon
                fill="url(#effectiveGrad)"
                points={`0,100 ${result.dataPoints.map(p => `${(p.x / 19) * 100},${100 - (p.effective / result.maxVal) * 100}`).join(' ')} 100,100`}
              />
              <polyline
                fill="none"
                stroke="rgb(13, 148, 136)"
                strokeWidth="2.5"
                points={result.dataPoints.map(p => `${(p.x / 19) * 100},${100 - (p.effective / result.maxVal) * 100}`).join(' ')}
                className="transition-all duration-300 ease-linear"
              />
            </svg>
            
            {/* Legend */}
            <div className="absolute top-2 right-2 flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-slate-500">
                <div className="w-3 border-t-[1.5px] border-dashed border-slate-400"></div> Raw Capacity
              </div>
              <div className="flex items-center gap-1.5 text-teal-700">
                <div className="w-3 border-t-[2.5px] border-teal-600"></div> Effective
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ThroughputSimulationPage;
