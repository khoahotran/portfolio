import { AlertTriangle, CheckCircle2, GitBranch, Info, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { simulateCanaryRollout } from '../../labs/canaryRollout';
import { useSeo } from '../../seo/useSeo';

const TRAFFIC_STAGES = [5, 25, 50, 100];
const Z_THRESHOLD = 1.96; // standard 95%-confidence one-tailed cutoff, not exposed as a slider —
// tuning the confidence level is a separate question from the one this lab demonstrates.

function CanaryRolloutPage() {
  useSeo({
    title: 'Canary Rollout Analysis Visualizer',
    description: 'Run a real two-proportion z-test canary analysis through traffic stages — see how sample size decides whether a regression is even detectable.',
  });

  const [canaryRatePercent, setCanaryRatePercent] = useState(4);
  const [baselineRatePercent, setBaselineRatePercent] = useState(2);
  const [bakeRequests, setBakeRequests] = useState(200);

  const result = useMemo(() => {
    return simulateCanaryRollout(TRAFFIC_STAGES, bakeRequests, canaryRatePercent / 100, baselineRatePercent / 100, Z_THRESHOLD);
  }, [bakeRequests, canaryRatePercent, baselineRatePercent]);

  const reachedStages = new Set(result.stages.map((s) => s.stage));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="canary-rollout" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Canary Rollout Analysis</h1>
      <p className="mt-2 text-slate-600">
        Runs a real two-proportion z-test at every traffic stage — the same class of statistical test
        real canary systems use instead of a raw error-rate threshold.
      </p>

      <ProvenanceNote labId="canary-rollout" />

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Canary error rate</span>
              <span className="text-teal-700">{canaryRatePercent}%</span>
            </div>
            <input type="range" min={0} max={15} step={0.5} value={canaryRatePercent} onChange={(e) => setCanaryRatePercent(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Baseline error rate</span>
              <span className="text-teal-700">{baselineRatePercent}%</span>
            </div>
            <input type="range" min={0} max={10} step={0.5} value={baselineRatePercent} onChange={(e) => setBaselineRatePercent(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <div className="flex justify-between">
              <span>Requests sampled per stage</span>
              <span className="text-teal-700">{bakeRequests}</span>
            </div>
            <input type="range" min={10} max={5000} step={10} value={bakeRequests} onChange={(e) => setBakeRequests(Number(e.target.value))} className="mt-3 w-full accent-teal-600" />
          </label>

          <div className="bg-sky-50 text-sky-800 p-4 rounded-xl text-xs flex gap-3 leading-relaxed mt-8">
            <Info className="w-5 h-5 shrink-0 text-sky-600" />
            <p>
              The canary and baseline error rates are the true, fixed rates each stage samples from —
              they don't change between stages. Only how much traffic is sampled changes, via "requests
              sampled per stage." Drag it down to see a real regression go undetected; drag it up to
              see the test catch the same regression.
            </p>
          </div>

          <div
            className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-bold mt-4 ${
              result.finalStatus === 'fully-promoted' ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {result.finalStatus === 'fully-promoted' ? <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" /> : <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" />}
            <p>{result.finalStatus === 'fully-promoted' ? 'Fully promoted to 100%' : `Rolled back at stage ${result.rolledBackAtStage}`}</p>
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> Traffic Stages
          </h2>

          <div className="space-y-3">
            {TRAFFIC_STAGES.map((traffic, i) => {
              const stageNum = i + 1;
              const stage = result.stages.find((s) => s.stage === stageNum);
              const reached = reachedStages.has(stageNum);

              return (
                <div
                  key={stageNum}
                  className={`rounded-xl border p-4 ${
                    !reached
                      ? 'border-slate-100 bg-slate-50 opacity-50'
                      : stage?.decision === 'rollback'
                        ? 'border-rose-200 bg-rose-50'
                        : 'border-teal-200 bg-teal-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-800">Stage {stageNum} — {traffic}% traffic</span>
                    {!reached ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Not reached</span>
                    ) : (
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${stage!.decision === 'rollback' ? 'text-rose-700' : 'text-teal-700'}`}>
                        {stage!.decision === 'rollback' ? <AlertTriangle size={11} aria-hidden="true" /> : <CheckCircle2 size={11} aria-hidden="true" />}
                        {stage!.decision}
                      </span>
                    )}
                  </div>

                  {reached && (
                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{(stage!.canaryErrorRate * 100).toFixed(2)}%</div>
                        <div className="text-slate-500">canary ({stage!.canaryErrors}/{stage!.bakeRequests})</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{(stage!.baselineErrorRate * 100).toFixed(2)}%</div>
                        <div className="text-slate-500">baseline ({stage!.baselineErrors}/{stage!.bakeRequests})</div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">z = {stage!.zScore.toFixed(2)}</div>
                        <div className="text-slate-500">threshold {Z_THRESHOLD}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

export default CanaryRolloutPage;
