import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import { useSeo } from '../../seo/useSeo';

function RetryStrategyVisualizerPage() {
  useSeo({ title: 'Retry Strategy Visualizer', description: 'Compare linear, exponential, and jitter backoff retry strategies.' });
  const [attempts, setAttempts] = useState(6);
  const [baseDelay, setBaseDelay] = useState(200);
  const [strategy, setStrategy] = useState<'linear' | 'exponential'>('exponential');
  const [useJitter, setUseJitter] = useState(true);

  const schedule = useMemo(() => {
    let totalTime = 0;
    return Array.from({ length: attempts }, (_, index) => {
      const attempt = index + 1;
      let delay = strategy === 'linear' ? baseDelay * attempt : baseDelay * Math.pow(2, index);
      
      if (useJitter) {
        // Full Jitter algorithm: random between 0 and current delay
        delay = Math.random() * delay;
      }
      
      totalTime += delay;
      return { attempt, delay, totalTime };
    });
  }, [attempts, baseDelay, strategy, useJitter]);

  const maxTime = Math.max(1000, schedule[schedule.length - 1]?.totalTime || 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="retry-strategy" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Retry Strategy Visualizer</h1>
      <p className="mt-2 text-slate-600">Visualize how different backoff algorithms distribute network retries over time.</p>

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>Max Attempts</span>
                <span className="text-teal-600">{attempts}</span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                value={attempts}
                onChange={(event) => setAttempts(Number(event.target.value))}
                className="mt-3 w-full accent-teal-600"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 pt-2">
              <div className="flex justify-between">
                <span>Base Delay</span>
                <span className="text-teal-600">{baseDelay} ms</span>
              </div>
              <input
                type="range"
                min={50}
                max={1000}
                step={50}
                value={baseDelay}
                onChange={(event) => setBaseDelay(Number(event.target.value))}
                className="mt-3 w-full accent-teal-600"
              />
            </label>

            <div className="pt-2">
              <span className="block text-sm font-semibold text-slate-700 mb-3">Algorithm</span>
              <div className="flex gap-2" role="group" aria-label="Backoff algorithm">
                <button
                  type="button"
                  aria-pressed={strategy === 'exponential'}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                    strategy === 'exponential' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  onClick={() => setStrategy('exponential')}
                >
                  Exponential
                </button>
                <button
                  type="button"
                  aria-pressed={strategy === 'linear'}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                    strategy === 'linear' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  onClick={() => setStrategy('linear')}
                >
                  Linear
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 pt-4 cursor-pointer">
              {/* The checkbox itself is sr-only (clipped to 1x1px) so tabbing to it left no
                  visible focus indicator — `focus-within` on the visible track (an ancestor of
                  the input) puts the ring where a keyboard user can actually see it. */}
              <div
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2 ${useJitter ? 'bg-teal-500' : 'bg-slate-200'}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={useJitter}
                  onChange={(e) => setUseJitter(e.target.checked)}
                />
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${useJitter ? 'translate-x-4' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-semibold text-slate-700">Add Full Jitter</span>
            </label>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-end mb-6">
            {/* Not a heading — it's a dynamic status readout, not a section title. */}
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Time to abandon: <span className="text-slate-800 text-lg">{(maxTime / 1000).toFixed(2)}s</span></p>
            <button 
              onClick={() => setUseJitter(!useJitter)} 
              className="text-xs font-semibold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-md hover:bg-teal-100 transition-colors"
            >
              Re-simulate Jitter
            </button>
          </div>

          <div className="flex-1 relative w-full min-h-[300px] bg-slate-50 rounded-xl border border-slate-100 overflow-hidden p-6">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="5" y1="50" x2="95" y2="50" stroke="rgb(203, 213, 225)" strokeWidth="1" strokeDasharray="2,2" />
              
              {schedule.map((step, idx) => {
                const xPos = 5 + (step.totalTime / maxTime) * 90;
                return (
                  <g key={idx} className="transition-all duration-300 ease-in-out">
                    <circle cx={xPos} cy="50" r="2.5" fill="rgb(13, 148, 136)" className="animate-bounce-slow" style={{ animationDelay: `${idx * 0.1}s` }} />
                    {/* Vertical line connector */}
                    <line x1={xPos} y1="50" x2={xPos} y2="60" stroke="rgb(13, 148, 136)" strokeWidth="0.5" />
                  </g>
                );
              })}
            </svg>
            
            {/* HTML overlays for labels */}
            {schedule.map((step, idx) => {
              const xPos = 5 + (step.totalTime / maxTime) * 90;
              return (
                <div key={idx} className="absolute top-[60%] -translate-x-1/2 flex flex-col items-center transition-all duration-300 ease-in-out" style={{ left: `${xPos}%` }}>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Try {step.attempt}</div>
                  <div className="text-[11px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 mt-1 shadow-sm">
                    {Math.round(step.delay)}ms
                  </div>
                </div>
              );
            })}
            
            <div className="absolute top-[42%] left-[2%] text-[10px] font-bold uppercase tracking-widest text-slate-400">First Request</div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default RetryStrategyVisualizerPage;
