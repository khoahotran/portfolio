import { AlertTriangle, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { simulateCachePolicy } from '../../labs/cacheFreshness';
import type { CachePolicy, CacheSimOptions } from '../../labs/cacheFreshness';
import { useSeo } from '../../seo/useSeo';

const TICK_COUNT = 60;
const REQUEST_TICKS = Array.from({ length: TICK_COUNT }, (_, i) => i);

const POLICY_LABEL: Record<CachePolicy, string> = {
  'ttl-blocking': 'TTL, Blocking',
  'stale-while-revalidate': 'Stale-While-Revalidate',
  'stale-if-error': 'Stale-If-Error',
};

const POLICY_BLURB: Record<CachePolicy, string> = {
  'ttl-blocking': 'Fresh: instant. Expired: blocks on a synchronous origin fetch. No fallback — an outage during that fetch is an error.',
  'stale-while-revalidate': 'Fresh: instant. Within the grace window: serves stale instantly and refreshes in the background — never blocks the request, whether or not the origin is up.',
  'stale-if-error': 'Fresh: instant. Expired: always attempts the origin. Falls back to stale only if that attempt fails and the grace window hasn\'t elapsed — otherwise errors.',
};

function CacheFreshnessPage() {
  useSeo({
    title: 'Cache Freshness Policies Visualizer',
    description: 'Run three real cache-freshness policies against the same origin outage — TTL-blocking, stale-while-revalidate, and stale-if-error.',
  });

  const [ttlTicks, setTtlTicks] = useState(8);
  const [graceWindowTicks, setGraceWindowTicks] = useState(10);
  const [originUpdateIntervalTicks, setOriginUpdateIntervalTicks] = useState(12);
  const [outageStart, setOutageStart] = useState(20);
  const [outageDuration, setOutageDuration] = useState(15);

  const baseOptions: CacheSimOptions = useMemo(
    () => ({
      ttlTicks,
      swrWindowTicks: graceWindowTicks,
      sieWindowTicks: graceWindowTicks,
      originUpdateIntervalTicks,
      outageStartTick: outageDuration > 0 ? outageStart : undefined,
      outageEndTick: outageDuration > 0 ? outageStart + outageDuration - 1 : undefined,
      requestTicks: REQUEST_TICKS,
    }),
    [ttlTicks, graceWindowTicks, originUpdateIntervalTicks, outageStart, outageDuration]
  );

  const results = useMemo(() => {
    return (['ttl-blocking', 'stale-while-revalidate', 'stale-if-error'] as const).map((policy) => simulateCachePolicy(policy, baseOptions));
  }, [baseOptions]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="cache-freshness" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cache Freshness Policies</h1>
      <p className="mt-2 text-slate-600">
        Three real cache-freshness policies run against the same origin outage. TTL-blocking has no
        fallback; SWR never blocks; stale-if-error blocks but falls back — watch which ones error and
        which ones just quietly serve stale content instead.
      </p>

      <ProvenanceNote labId="cache-freshness" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>TTL</span>
              <span className="text-teal-700">{ttlTicks} ticks</span>
            </div>
            <input type="range" min={2} max={20} value={ttlTicks} onChange={(e) => setTtlTicks(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Grace window (SWR / SIE)</span>
              <span className="text-teal-700">{graceWindowTicks} ticks</span>
            </div>
            <input type="range" min={0} max={20} value={graceWindowTicks} onChange={(e) => setGraceWindowTicks(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Origin content changes every</span>
              <span className="text-teal-700">{originUpdateIntervalTicks} ticks</span>
            </div>
            <input type="range" min={2} max={30} value={originUpdateIntervalTicks} onChange={(e) => setOriginUpdateIntervalTicks(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Outage starts at</span>
              <span className="text-teal-700">tick {outageStart}</span>
            </div>
            <input type="range" min={0} max={TICK_COUNT - 1} value={outageStart} onChange={(e) => setOutageStart(Number(e.target.value))} className="mt-3 w-full accent-rose-500" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Outage duration</span>
              <span className="text-teal-700">{outageDuration === 0 ? 'none' : `${outageDuration} ticks`}</span>
            </div>
            <input type="range" min={0} max={30} value={outageDuration} onChange={(e) => setOutageDuration(Number(e.target.value))} className="mt-3 w-full accent-rose-500" />
          </label>

          <div className="bg-sky-50 text-sky-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed">
            <Info className="w-5 h-5 shrink-0 text-sky-600" />
            <p>
              All three policies share the same origin update schedule and outage window — the only
              variable is the policy's own decision procedure, run tick by tick over {TICK_COUNT}{' '}
              simulated requests.
            </p>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 space-y-5">
          {results.map((result) => (
            <div key={result.policy} className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-slate-800">{POLICY_LABEL[result.policy]}</h2>
                <div className="flex gap-4 text-xs">
                  <span className="font-bold text-teal-700">{result.freshServedCount} fresh</span>
                  <span className="font-bold text-amber-700">{result.staleServedCount} stale</span>
                  <span className="font-bold text-rose-700">{result.errorCount} errors</span>
                  <span className="font-bold text-slate-600">{result.avgLatencyMs.toFixed(1)}ms avg</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">{POLICY_BLURB[result.policy]}</p>

              <div className="flex gap-[1px]" role="img" aria-label={`${POLICY_LABEL[result.policy]} request timeline`}>
                {result.requests.map((r) => (
                  <div
                    key={r.tick}
                    title={`Tick ${r.tick}: ${r.error ? 'error' : r.stale ? 'stale' : 'fresh'}, ${r.latencyMs}ms`}
                    className={`h-6 flex-1 ${r.error ? 'bg-rose-600' : r.stale ? 'bg-amber-400' : 'bg-teal-500'}`}
                  />
                ))}
              </div>

              {result.errorCount > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {result.errorCount} of {result.totalRequests} requests got nothing to serve at all.
                </p>
              )}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-2">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-500" aria-hidden="true" />Fresh</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />Stale (served anyway)</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />Error (nothing served)</span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default CacheFreshnessPage;
