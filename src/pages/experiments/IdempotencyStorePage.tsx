import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { simulateIdempotencyStore } from '../../labs/idempotencyStore';
import type { IdempotencyMode, IdempotencyRequestInput, RequestOutcome } from '../../labs/idempotencyStore';
import { useSeo } from '../../seo/useSeo';

const OUTCOME_STYLE: Record<RequestOutcome, { bg: string; label: string }> = {
  processed: { bg: 'bg-teal-600', label: 'Processed (did the real work)' },
  'duplicate-processed': { bg: 'bg-rose-500', label: 'Duplicate-processed — the race' },
  coalesced: { bg: 'bg-sky-500', label: "Coalesced — waited for the in-flight run's result" },
  'cache-hit': { bg: 'bg-slate-400', label: 'Cache-hit — instant, no processing' },
};

const MODE_LABEL: Record<IdempotencyMode, string> = {
  'check-then-set': 'check-then-set (this article\'s own GET-then-SET pattern)',
  'atomic-claim': 'atomic-claim (the fix)',
};

function buildRequests(duplicateCount: number, spreadTicks: number, processingTicks: number, ttlTicks: number): IdempotencyRequestInput[] {
  const key = 'charge-1';
  const requests: IdempotencyRequestInput[] = [{ key, arrivalTick: 0 }];
  for (let i = 1; i <= duplicateCount; i++) {
    const arrivalTick = duplicateCount === 1 ? spreadTicks : Math.round((i - 1) * (spreadTicks / Math.max(1, duplicateCount - 1)));
    requests.push({ key, arrivalTick });
  }
  // A fixed "late repeat" after the original completes and within TTL — shows the ordinary
  // cache-hit case both designs handle identically, so the comparison isn't only about the race.
  requests.push({ key, arrivalTick: processingTicks + Math.min(5, Math.max(1, Math.floor(ttlTicks / 4))) });
  return requests;
}

function Timeline({ mode, requests, processingTicks, ttlTicks, maxTick }: {
  mode: IdempotencyMode;
  requests: IdempotencyRequestInput[];
  processingTicks: number;
  ttlTicks: number;
  maxTick: number;
}) {
  const sim = useMemo(() => simulateIdempotencyStore(mode, requests, processingTicks, ttlTicks), [mode, requests, processingTicks, ttlTicks]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">{MODE_LABEL[mode]}</h3>
        <span className={`text-xs font-bold ${sim.totalDuplicateProcessed > 0 ? 'text-rose-700' : 'text-teal-700'}`}>
          {sim.totalExecutions} execution{sim.totalExecutions === 1 ? '' : 's'}
          {sim.totalDuplicateProcessed > 0 ? ` (${sim.totalDuplicateProcessed} of them the race)` : ''}
        </span>
      </div>

      <div className="mt-4 space-y-1.5">
        {sim.results.map((result, i) => {
          const leftPct = (result.arrivalTick / maxTick) * 100;
          const widthPct = Math.max(1.5, ((result.resolvedTick - result.arrivalTick) / maxTick) * 100);
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">req {i + 1}</span>
              <div className="relative h-5 flex-1 rounded bg-slate-100">
                <div
                  className={`absolute h-5 rounded ${OUTCOME_STYLE[result.outcome].bg}`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`${result.outcome}: arrived t${result.arrivalTick}, resolved t${result.resolvedTick}`}
                />
              </div>
              <span className="w-24 shrink-0 text-[10px] text-slate-500">t{result.arrivalTick} → t{result.resolvedTick}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IdempotencyStorePage() {
  useSeo({
    title: 'Idempotency-Key Store Visualizer',
    description: 'Run the real race between a concurrent duplicate request and an in-flight one — check-then-set double-processes it, atomic-claim coalesces it instead.',
  });

  const [processingTicks, setProcessingTicks] = useState(10);
  const [ttlTicks, setTtlTicks] = useState(40);
  const [duplicateCount, setDuplicateCount] = useState(3);
  const [spreadTicks, setSpreadTicks] = useState(3);

  const requests = useMemo(
    () => buildRequests(duplicateCount, spreadTicks, processingTicks, ttlTicks),
    [duplicateCount, spreadTicks, processingTicks, ttlTicks]
  );

  const maxTick = useMemo(() => Math.max(...requests.map((r) => r.arrivalTick)) + processingTicks + ttlTicks / 4 + 2, [requests, processingTicks, ttlTicks]);

  // Timeline below re-derives its own simulation per mode; this one drives the headline banner.
  const checkThenSet = useMemo(() => simulateIdempotencyStore('check-then-set', requests, processingTicks, ttlTicks), [requests, processingTicks, ttlTicks]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="idempotency-store" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Idempotency-Key Store</h1>
      <p className="mt-2 text-slate-600">
        One key, a burst of concurrent duplicate requests, and the same TTL — run through two real
        store designs. The TTL cache alone doesn't stop a duplicate that arrives while the first
        request is still being processed; whether that duplicate gets coalesced or double-processed
        depends entirely on whether the check-and-claim is atomic.
      </p>

      <ProvenanceNote labId="idempotency-store" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Processing time</span>
              <span className="text-teal-700">{processingTicks} ticks</span>
            </div>
            <input type="range" min={3} max={20} value={processingTicks} onChange={(e) => setProcessingTicks(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Result TTL</span>
              <span className="text-teal-700">{ttlTicks} ticks</span>
            </div>
            <input type="range" min={10} max={100} value={ttlTicks} onChange={(e) => setTtlTicks(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Concurrent duplicates</span>
              <span className="text-teal-700">{duplicateCount}</span>
            </div>
            <input type="range" min={1} max={6} value={duplicateCount} onChange={(e) => setDuplicateCount(Number(e.target.value))} className="mt-3 w-full accent-rose-500" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Spread across</span>
              <span className="text-teal-700">{spreadTicks} ticks</span>
            </div>
            <input type="range" min={0} max={Math.max(1, processingTicks - 1)} value={Math.min(spreadTicks, Math.max(1, processingTicks - 1))} onChange={(e) => setSpreadTicks(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <p className="text-xs text-slate-500">
            Every request here shares one idempotency key — a real client double-click, or a retry
            of a request whose response was merely lost in transit, not one that actually failed.
            The last bar in each timeline is a fixed "late repeat" arriving well after the original
            completes, within TTL — both designs resolve it identically, as a cache-hit.
          </p>

          <div className="space-y-1.5 border-t border-slate-100 pt-4 text-xs">
            {(Object.keys(OUTCOME_STYLE) as RequestOutcome[]).map((outcome) => (
              <div key={outcome} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded ${OUTCOME_STYLE[outcome].bg}`} aria-hidden="true" />
                <span className="text-slate-600">{OUTCOME_STYLE[outcome].label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 space-y-6">
          <div
            className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
              checkThenSet.totalDuplicateProcessed > 0
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-teal-200 bg-teal-50 text-teal-800'
            }`}
          >
            {checkThenSet.totalDuplicateProcessed > 0 ? (
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
            <p>
              {checkThenSet.totalDuplicateProcessed > 0
                ? `check-then-set ran the real work ${checkThenSet.totalExecutions} times for one logical request — ${checkThenSet.totalDuplicateProcessed} of those were the same charge processed again. atomic-claim ran it exactly once for the identical arrival pattern.`
                : 'At this spread, no duplicate arrived while another was still in flight under either design — widen the spread or add more duplicates to force the overlap.'}
            </p>
          </div>

          <Timeline mode="check-then-set" requests={requests} processingTicks={processingTicks} ttlTicks={ttlTicks} maxTick={maxTick} />
          <Timeline mode="atomic-claim" requests={requests} processingTicks={processingTicks} ttlTicks={ttlTicks} maxTick={maxTick} />

          <p className="text-xs text-slate-500">
            Both designs check a completed-results cache first — that's what makes the "late repeat"
            bar identical in both rows. They differ only in what a request sees while another one for
            the same key hasn't finished yet: check-then-set has nowhere to look, because it never
            records that anything is in flight; atomic-claim does, because claiming the key and
            checking it happen as one operation instead of two.
          </p>
        </section>
      </div>
    </main>
  );
}

export default IdempotencyStorePage;
