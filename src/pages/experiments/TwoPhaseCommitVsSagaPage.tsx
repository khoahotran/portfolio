import { AlertTriangle, CheckCircle2, Lock, Undo2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import ProvenanceNote from '../../labs/ProvenanceNote';
import { simulateSaga, simulateTwoPhaseCommit } from '../../labs/twoPhaseCommitVsSaga';
import type { ParticipantVote, SagaStepDefinition } from '../../labs/twoPhaseCommitVsSaga';
import { useSeo } from '../../seo/useSeo';

const PARTICIPANT_IDS = ['p1', 'p2', 'p3', 'p4'];
const SAGA_STEP_IDS = ['reserve-inventory', 'charge-card', 'ship-order'] as const;

function TwoPhaseCommitVsSagaPage() {
  useSeo({
    title: 'Two-Phase Commit vs. Saga Visualizer',
    description: 'Run the real 2PC blocking failure and the real Saga compensation-failure gap side by side — see exactly what atomicity costs, and exactly what giving it up costs instead.',
  });

  // Stage 1 — 2PC
  const [votes, setVotes] = useState<Record<string, 'yes' | 'no'>>({ p1: 'yes', p2: 'yes', p3: 'yes', p4: 'yes' });
  const [coordinatorCrashes, setCoordinatorCrashes] = useState(true);

  const voteList: ParticipantVote[] = useMemo(
    () => PARTICIPANT_IDS.map((id) => ({ id, vote: votes[id] })),
    [votes]
  );
  const twoPc = useMemo(() => simulateTwoPhaseCommit(voteList, coordinatorCrashes), [voteList, coordinatorCrashes]);

  function toggleVote(id: string) {
    setVotes((prev) => ({ ...prev, [id]: prev[id] === 'yes' ? 'no' : 'yes' }));
  }

  // Stage 2 — Saga
  const [failStep, setFailStep] = useState<string | null>('charge-card');
  const [compensationFailsFor, setCompensationFailsFor] = useState<string | null>(null);

  const sagaSteps: SagaStepDefinition[] = useMemo(
    () =>
      SAGA_STEP_IDS.map((id) => ({
        id,
        succeeds: id !== failStep,
        compensationSucceeds: id !== compensationFailsFor,
      })),
    [failStep, compensationFailsFor]
  );
  const saga = useMemo(() => simulateSaga(sagaSteps), [sagaSteps]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="two-phase-commit-vs-saga" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Two-Phase Commit vs. Saga</h1>
      <p className="mt-2 text-slate-600">
        Two real ways a multi-participant transaction can go wrong, run to their actual conclusion:
        2PC blocks to guarantee atomicity; Saga never blocks, and gives up that guarantee to avoid it.
      </p>

      <ProvenanceNote labId="two-phase-commit-vs-saga" />

      <div className="mt-8 space-y-10">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            <Lock className="w-4 h-4" aria-hidden="true" /> Two-Phase Commit — Blocking on a Lost Coordinator
          </h2>
          <div className="grid gap-6 md:grid-cols-12">
            <div className="min-w-0 md:col-span-4 space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
              <p className="text-xs text-slate-500">Toggle each participant's prepare-phase vote.</p>
              {PARTICIPANT_IDS.map((id) => (
                <div key={id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                  <span className="font-mono text-slate-600">{id}</span>
                  <button
                    type="button"
                    onClick={() => toggleVote(id)}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${votes[id] === 'yes' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}
                  >
                    voted {votes[id]}
                  </button>
                </div>
              ))}
              <label className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
                <span>Coordinator crashes before broadcasting the decision</span>
                <button
                  type="button"
                  onClick={() => setCoordinatorCrashes((v) => !v)}
                  className={`ml-2 shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${coordinatorCrashes ? 'bg-rose-50 text-rose-700' : 'bg-teal-50 text-teal-700'}`}
                >
                  {coordinatorCrashes ? 'crashes' : 'survives'}
                </button>
              </label>
            </div>

            <div className="min-w-0 md:col-span-8 space-y-4">
              <div
                className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
                  twoPc.blockedParticipants.length > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-teal-200 bg-teal-50 text-teal-800'
                }`}
              >
                {twoPc.blockedParticipants.length > 0 ? <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />}
                <p>
                  Decision computed: <span className="font-mono">{twoPc.decision}</span>.{' '}
                  {twoPc.decisionReachedByCoordinator
                    ? 'The coordinator broadcast it — every participant resolves.'
                    : `The coordinator never sent it. ${twoPc.blockedParticipants.length} participant${twoPc.blockedParticipants.length === 1 ? '' : 's'} that voted yes ${twoPc.blockedParticipants.length === 1 ? 'is' : 'are'} stuck holding its locks, with no rule for deciding alone — the actual cost of the atomicity guarantee.`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Per-participant state</p>
                <div className="space-y-2">
                  {PARTICIPANT_IDS.map((id) => {
                    const blocked = twoPc.blockedParticipants.includes(id);
                    return (
                      <div key={id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                        <span className="font-mono text-slate-600">{id} (voted {votes[id]})</span>
                        <span className={`font-bold ${blocked ? 'text-amber-700' : votes[id] === 'no' ? 'text-slate-500' : 'text-teal-700'}`}>
                          {votes[id] === 'no' ? 'aborted locally' : blocked ? 'blocked, holding locks' : `resolved: ${twoPc.decision}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-500">
            <Undo2 className="w-4 h-4" aria-hidden="true" /> Saga — No Blocking, No Atomicity
          </h2>
          <div className="grid gap-6 md:grid-cols-12">
            <div className="min-w-0 md:col-span-4 space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
              <p className="text-xs text-slate-500">Pick which step fails, and whether unwinding it also fails.</p>
              <label className="block text-xs font-semibold text-slate-600">
                <span>Step that fails</span>
                <select
                  value={failStep ?? ''}
                  onChange={(e) => setFailStep(e.target.value || null)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="">none — every step succeeds</option>
                  {SAGA_STEP_IDS.map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                <span>Compensation that itself fails</span>
                <select
                  value={compensationFailsFor ?? ''}
                  onChange={(e) => setCompensationFailsFor(e.target.value || null)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="">none — every compensation succeeds</option>
                  {SAGA_STEP_IDS.filter((id) => id !== failStep).map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="min-w-0 md:col-span-8 space-y-4">
              <div
                className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
                  saga.compensationsFailed.length > 0
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : saga.failedAtStep
                      ? 'border-teal-200 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {saga.compensationsFailed.length > 0 ? <XCircle className="w-5 h-5 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />}
                <p>
                  {saga.failedAtStep === null
                    ? 'Every step committed — no compensation needed.'
                    : saga.compensationsFailed.length > 0
                      ? `${saga.failedAtStep} failed, and unwinding "${saga.compensationsFailed[0]}" itself failed. Nothing here blocks — but that step's committed side effect is now stuck, uncompensated, with no fallback like 2PC's held locks to fall back on.`
                      : `${saga.failedAtStep} failed. Every earlier committed step was compensated cleanly, in reverse order — no coordinator, no blocking, just already-committed steps unwinding themselves.`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Step-by-step outcome</p>
                <div className="space-y-2">
                  {saga.steps.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                      <span className="font-mono text-slate-600">{s.id}</span>
                      <span
                        className={`font-bold ${
                          s.phase === 'compensation-failed'
                            ? 'text-rose-700'
                            : s.phase === 'failed'
                              ? 'text-rose-600'
                              : s.phase === 'skipped'
                                ? 'text-slate-400'
                                : s.phase === 'compensated'
                                  ? 'text-teal-700'
                                  : 'text-slate-700'
                        }`}
                      >
                        {s.phase.replace('-', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default TwoPhaseCommitVsSagaPage;
