import { AlertTriangle, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import type { BackpressurePolicy, CircuitState } from '../../labs/backpressure';
import { simulateBackpressure } from '../../labs/backpressure';
import { useSeo } from '../../seo/useSeo';

const TICK_COUNT = 24;

const POLICY_LABEL: Record<BackpressurePolicy, string> = {
  block: 'Block',
  'drop-new': 'Drop New',
  'drop-old': 'Drop Old',
  'circuit-breaker': 'Circuit Breaker',
};

const POLICY_BLURB: Record<BackpressurePolicy, string> = {
  block:
    "Producer is throttled to match the consumer. Nothing is ever lost — the excess piles up in the producer's own backlog instead, unbounded if the mismatch never resolves.",
  'drop-new':
    'The queue keeps what it already holds; incoming items that overflow capacity are discarded on arrival. FIFO order of admitted items is preserved.',
  'drop-old':
    'The queue always admits new arrivals, evicting its oldest items to make room instead. Right when only the latest value matters.',
  'circuit-breaker':
    'Occupancy-driven load shedding: once the queue crosses a threshold, reject everything for a cooldown, then probe with a trickle before resuming normal admission.',
};

const CIRCUIT_COLOR: Record<CircuitState, string> = {
  closed: 'rgb(13, 148, 136)',
  'half-open': 'rgb(217, 119, 6)',
  open: 'rgb(225, 29, 72)',
};

function BackpressurePage() {
  useSeo({
    title: 'Backpressure Strategies Visualizer',
    description: 'Run four real backpressure policies against the same producer/consumer overload — block, drop-new, drop-old, and circuit breaker.',
  });

  const [policy, setPolicy] = useState<BackpressurePolicy>('drop-new');
  const [producerRate, setProducerRate] = useState(6);
  const [consumerRate, setConsumerRate] = useState(3);
  const [capacity, setCapacity] = useState(8);
  const [openThreshold, setOpenThreshold] = useState(0.8);
  const [cooldownTicks, setCooldownTicks] = useState(3);
  const [probeRate, setProbeRate] = useState(2);

  const result = useMemo(() => {
    return simulateBackpressure(policy, producerRate, consumerRate, capacity, TICK_COUNT, {
      openThreshold,
      cooldownTicks,
      probeRate,
    });
  }, [policy, producerRate, consumerRate, capacity, openThreshold, cooldownTicks, probeRate]);

  const maxBacklog = Math.max(1, result.maxPendingBacklog);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="backpressure" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Backpressure Strategies</h1>
      <p className="mt-2 text-slate-600">
        Four real policies for a bounded queue between a producer and a slower consumer, run against
        the same overload. Drop-new and drop-old drop the same <em>number</em> of items — watch which
        ones.
      </p>

      <ProvenanceNote labId="backpressure" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Policy</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Backpressure policy">
              {(Object.keys(POLICY_LABEL) as BackpressurePolicy[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={policy === p}
                  onClick={() => setPolicy(p)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-colors ${policy === p ? 'bg-inverse text-inverse-fg border-inverse' : 'bg-surface text-slate-600 border-slate-200 hover:border-slate-400'}`}
                >
                  {POLICY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Producer rate</span>
              <span className="text-teal-700">{producerRate}/tick</span>
            </div>
            <input type="range" min={1} max={12} value={producerRate} onChange={(e) => setProducerRate(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Consumer rate</span>
              <span className="text-teal-700">{consumerRate}/tick</span>
            </div>
            <input type="range" min={1} max={12} value={consumerRate} onChange={(e) => setConsumerRate(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Queue capacity</span>
              <span className="text-teal-700">{capacity}</span>
            </div>
            <input type="range" min={3} max={15} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          {policy === 'circuit-breaker' && (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <label className="block text-xs font-semibold text-amber-800">
                <div className="flex justify-between">
                  <span>Open threshold</span>
                  <span>{Math.round(openThreshold * 100)}%</span>
                </div>
                <input type="range" min={0.5} max={1} step={0.05} value={openThreshold} onChange={(e) => setOpenThreshold(Number(e.target.value))} className="mt-2 w-full accent-amber-600" />
              </label>
              <label className="block text-xs font-semibold text-amber-800">
                <div className="flex justify-between">
                  <span>Cooldown</span>
                  <span>{cooldownTicks} ticks</span>
                </div>
                <input type="range" min={1} max={6} value={cooldownTicks} onChange={(e) => setCooldownTicks(Number(e.target.value))} className="mt-2 w-full accent-amber-600" />
              </label>
              <label className="block text-xs font-semibold text-amber-800">
                <div className="flex justify-between">
                  <span>Probe rate</span>
                  <span>{probeRate}/tick</span>
                </div>
                <input type="range" min={1} max={6} value={probeRate} onChange={(e) => setProbeRate(Number(e.target.value))} className="mt-2 w-full accent-amber-600" />
              </label>
            </div>
          )}

          <div className="bg-sky-50 text-sky-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed">
            <Info className="w-5 h-5 shrink-0 text-sky-600" />
            <p>{POLICY_BLURB[policy]}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 text-center">
            <div>
              <div className="text-lg font-bold text-rose-700">{result.totalDropped}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total dropped</div>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{result.totalProcessed}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total processed</div>
            </div>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-1">
            Queue depth over {TICK_COUNT} ticks
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {policy === 'circuit-breaker'
              ? 'Bar colour is the circuit state that tick actually ran under: teal closed, amber half-open probe, rose fully open.'
              : 'Bar height is queue depth relative to capacity. A red marker means this tick dropped at least one item.'}
          </p>

          <div className="flex items-end gap-1 h-48 border-b border-slate-200 pb-1" role="img" aria-label="Queue depth per tick">
            {result.ticks.map((t) => {
              const barColor = policy === 'circuit-breaker' && t.circuitState ? CIRCUIT_COLOR[t.circuitState] : 'rgb(13, 148, 136)';
              return (
                <div key={t.tick} className="flex-1 flex flex-col items-center gap-1" title={`Tick ${t.tick}: depth ${t.queueDepth}, dropped ${t.dropped.length}, processed ${t.processed}`}>
                  {t.dropped.length > 0 && <div className="h-1.5 w-1.5 rounded-full bg-rose-600" aria-hidden="true" />}
                  {t.dropped.length === 0 && <div className="h-1.5 w-1.5" aria-hidden="true" />}
                  <div className="flex h-40 w-full items-end">
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{ height: `${(t.queueDepth / capacity) * 100}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {policy === 'block' && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-6 mb-2">Producer backlog (never dropped, just delayed)</h3>
              <div className="flex items-end gap-1 h-16">
                {result.ticks.map((t) => (
                  <div key={t.tick} className="flex-1 flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-sm bg-amber-400 transition-all"
                      style={{ height: `${(t.pendingBacklog / maxBacklog) * 100}%` }}
                      title={`Tick ${t.tick}: backlog ${t.pendingBacklog}`}
                    />
                  </div>
                ))}
              </div>
              {result.maxPendingBacklog > capacity * 3 && (
                <p className="mt-3 flex items-start gap-2 text-xs font-semibold text-amber-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  Backlog reached {result.maxPendingBacklog} — {result.maxPendingBacklog}x the queue's own capacity
                  of {capacity}. Blocking doesn't fix a sustained rate mismatch, it just relocates where the
                  unprocessed work piles up.
                </p>
              )}
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-4 border-t border-slate-100">
            {policy === 'circuit-breaker' ? (
              <>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-600" aria-hidden="true" />Closed</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />Half-open (probing)</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-600" aria-hidden="true" />Open (rejecting)</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-600" aria-hidden="true" />Dropped at least one item this tick</span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default BackpressurePage;
