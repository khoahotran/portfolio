import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <Link to="/experiments" className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 hover:text-teal-700 transition-colors">
        &larr; Back to Experiments
      </Link>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Failure Injection Demo</h1>
      <p className="mt-2 text-slate-600">Inject synthetic failure and observe the Circuit Breaker pattern protect downstream services.</p>

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              <div className="flex justify-between">
                <span className="text-rose-600">Injected Failure Rate</span>
                <span className="text-rose-600">{failureRate}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={failureRate}
                onChange={(event) => setFailureRate(Number(event.target.value))}
                className="mt-3 w-full accent-rose-500"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 pt-2">
              <div className="flex justify-between">
                <span>Request Volume</span>
                <span className="text-teal-600">{requestCount} req/s</span>
              </div>
              <input
                type="range"
                min={20}
                max={300}
                step={10}
                value={requestCount}
                onChange={(event) => setRequestCount(Number(event.target.value))}
                className="mt-3 w-full accent-teal-600"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 pt-2">
              <div className="flex justify-between">
                <span>Breaker Threshold</span>
                <span className="text-amber-500">{circuitThreshold}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={circuitThreshold}
                onChange={(event) => setCircuitThreshold(Number(event.target.value))}
                className="mt-3 w-full accent-amber-500"
              />
            </label>
          </div>
        </section>

        <section className="md:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center relative min-h-[350px] overflow-hidden">
          
          {/* Background pulse effect when breaker opens */}
          <div className={`absolute inset-0 transition-opacity duration-1000 ${simulation.breakerOpen ? 'bg-rose-50 opacity-100' : 'opacity-0'}`} />

          <div className="z-10 w-full max-w-lg">
            <div className="flex justify-between items-center mb-8 px-4">
              <div className="text-center">
                <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Gateway</div>
                <div className="bg-white border-2 border-slate-300 w-16 h-16 rounded-xl flex items-center justify-center shadow-sm relative">
                  {/* Traffic animation */}
                  <div className={`absolute -right-4 w-3 h-3 rounded-full ${simulation.breakerOpen ? 'bg-rose-400' : 'bg-emerald-400'} animate-ping opacity-75`} />
                </div>
              </div>

              {/* Animated Circuit Breaker SVG */}
              <div className="flex-1 px-8 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[120%] text-center whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase transition-colors ${
                    simulation.breakerOpen ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    State: {simulation.breakerOpen ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
                
                <svg className="w-full h-12 overflow-visible" viewBox="0 0 100 20">
                  {/* Left wire */}
                  <line x1="0" y1="10" x2="35" y2="10" stroke={simulation.breakerOpen ? 'rgb(244 63 94)' : 'rgb(16 185 129)'} strokeWidth="3" className="transition-colors duration-300" />
                  <circle cx="35" cy="10" r="2.5" fill={simulation.breakerOpen ? 'rgb(244 63 94)' : 'rgb(16 185 129)'} className="transition-colors duration-300" />
                  
                  {/* The switch (animated) */}
                  <line 
                    x1="35" y1="10" 
                    x2="65" y2="10" 
                    stroke={simulation.breakerOpen ? 'rgb(244 63 94)' : 'rgb(16 185 129)'} 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-in-out origin-[35px_10px]"
                    style={{ transform: simulation.breakerOpen ? 'rotate(-35deg)' : 'rotate(0deg)' }}
                  />
                  
                  {/* Right wire */}
                  <circle cx="65" cy="10" r="2.5" fill="rgb(203 213 225)" />
                  <line x1="65" y1="10" x2="100" y2="10" stroke="rgb(203 213 225)" strokeWidth="3" />
                  
                  {/* Connection indicator */}
                  <line x1="65" y1="10" x2="100" y2="10" stroke="rgb(16 185 129)" strokeWidth="3" className={`transition-opacity duration-300 ${simulation.breakerOpen ? 'opacity-0' : 'opacity-100'}`} />
                </svg>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-6 text-center w-full">
                  <div className="text-[10px] font-medium text-slate-400">Current Failure Rate: {failureRate}%</div>
                  <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${simulation.breakerOpen ? 'bg-rose-500' : 'bg-amber-400'}`} 
                      style={{ width: `${failureRate}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Downstream</div>
                <div className={`border-2 w-16 h-16 rounded-xl flex items-center justify-center shadow-sm transition-colors duration-500 ${
                  simulation.breakerOpen ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-white border-slate-300'
                }`}>
                  <div className="flex flex-col gap-1 items-center">
                    <div className="w-6 h-1 bg-slate-200 rounded" />
                    <div className="w-8 h-1 bg-slate-200 rounded" />
                    <div className="w-4 h-1 bg-slate-200 rounded" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex gap-4 text-center divide-x divide-slate-100">
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Requests Sent</div>
                <div className="text-xl font-bold text-slate-700">{simulation.breakerOpen ? 0 : requestCount}</div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Success</div>
                <div className="text-xl font-bold text-emerald-600">{simulation.breakerOpen ? 0 : simulation.success}</div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">Failed</div>
                <div className="text-xl font-bold text-rose-600">{simulation.breakerOpen ? 0 : simulation.failed}</div>
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Fast Failed</div>
                <div className="text-xl font-bold text-amber-600">{simulation.breakerOpen ? requestCount : 0}</div>
              </div>
            </div>
            {simulation.breakerOpen && (
              <p className="text-center text-xs text-rose-500 mt-4 animate-pulse">
                Breaker is OPEN. All requests are short-circuited to protect downstream.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default FailureInjectionDemoPage;
