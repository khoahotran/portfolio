import { useRef, useState } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import { useSeo } from '../../seo/useSeo';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Square } from 'lucide-react';

type StepStatus = 'pending' | 'active' | 'completed' | 'failed' | 'compensating' | 'compensated';

interface SagaState {
  order: StepStatus;
  payment: StepStatus;
  inventory: StepStatus;
  overall: 'idle' | 'running' | 'stopped' | 'success' | 'failed';
}

const IDLE_STATE: SagaState = { order: 'pending', payment: 'pending', inventory: 'pending', overall: 'idle' };

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function SagaStateMachinePage() {
  useSeo({ title: 'Saga State Machine', description: 'Interactive visualization of the Saga distributed transaction pattern.' });

  const [shouldFailAt, setShouldFailAt] = useState<'none' | 'payment' | 'inventory'>('none');
  const [state, setState] = useState<SagaState>(IDLE_STATE);
  // A ref (not state) so `runSaga`'s already-scheduled `await`s can check it
  // synchronously between steps — flipping it is how "Stop" actually halts an
  // in-flight run instead of just disabling the button that started it.
  const stoppedRef = useRef(false);

  const reset = () => {
    stoppedRef.current = false;
    setState(IDLE_STATE);
  };

  const stopSaga = () => {
    stoppedRef.current = true;
    setState((s) => ({ ...s, overall: 'stopped' }));
  };

  const runSaga = async () => {
    stoppedRef.current = false;
    setState({ ...IDLE_STATE, overall: 'running', order: 'active' });

    // Step 1: Order
    await wait(1000);
    if (stoppedRef.current) return;
    setState((s) => ({ ...s, order: 'completed', payment: 'active' }));

    // Step 2: Payment
    await wait(1000);
    if (stoppedRef.current) return;
    if (shouldFailAt === 'payment') {
      setState((s) => ({ ...s, payment: 'failed', order: 'compensating' }));
      await wait(1000);
      if (stoppedRef.current) return;
      setState((s) => ({ ...s, order: 'compensated', overall: 'failed' }));
      return;
    }
    setState((s) => ({ ...s, payment: 'completed', inventory: 'active' }));

    // Step 3: Inventory
    await wait(1000);
    if (stoppedRef.current) return;
    if (shouldFailAt === 'inventory') {
      setState((s) => ({ ...s, inventory: 'failed', payment: 'compensating' }));
      await wait(1000);
      if (stoppedRef.current) return;
      setState((s) => ({ ...s, payment: 'compensated', order: 'compensating' }));
      await wait(1000);
      if (stoppedRef.current) return;
      setState((s) => ({ ...s, order: 'compensated', overall: 'failed' }));
      return;
    }

    setState((s) => ({ ...s, inventory: 'completed', overall: 'success' }));
  };

  const StatusIcon = ({ status }: { status: StepStatus }) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-emerald-500 w-6 h-6" />;
      case 'failed': return <XCircle className="text-rose-500 w-6 h-6" />;
      case 'active': return <div className="w-5 h-5 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />;
      case 'compensating': return <RotateCcw className="text-amber-500 w-6 h-6 animate-reverse-spin" />;
      case 'compensated': return <RotateCcw className="text-slate-400 w-6 h-6" />;
      default: return <div className="w-3 h-3 rounded-full bg-slate-200" />;
    }
  };

  const StepBox = ({ title, status, desc }: { title: string, status: StepStatus, desc: string }) => {
    const getStyles = () => {
      switch (status) {
        case 'active': return 'border-teal-500 bg-teal-50 shadow-md';
        case 'completed': return 'border-emerald-200 bg-emerald-50';
        case 'failed': return 'border-rose-500 bg-rose-50 shadow-md';
        case 'compensating': return 'border-amber-500 bg-amber-50 shadow-md';
        case 'compensated': return 'border-slate-300 bg-slate-100 opacity-75';
        default: return 'border-slate-200 bg-white opacity-60';
      }
    };

    return (
      <div className={`relative p-6 rounded-2xl border-2 transition-all duration-500 flex flex-col items-center text-center ${getStyles()}`}>
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 rounded-full border border-slate-200 shadow-sm flex items-center justify-center">
          <StatusIcon status={status} />
        </div>
        <h3 className="font-bold text-slate-800 mt-2">{title}</h3>
        <p className="text-xs text-slate-500 mt-2">{desc}</p>

        {/* Status text badge */}
        <div className="mt-4 text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-white bg-opacity-60">
          {status}
        </div>
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="saga-state-machine" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Saga State Machine</h1>
      <p className="mt-2 text-slate-600">Visualize distributed transactions and automatic compensating rollbacks.</p>

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="min-w-0 md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Configuration</h2>

            <label className="block text-sm font-semibold text-slate-700 pt-2">
              Inject Failure At
              <select
                value={shouldFailAt}
                onChange={(e) => setShouldFailAt(e.target.value as 'none' | 'payment' | 'inventory')}
                className="mt-2 w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
              >
                <option value="none">No Failure (Happy Path)</option>
                <option value="payment">Payment Service</option>
                <option value="inventory">Inventory Service</option>
              </select>
            </label>

            {state.overall === 'running' ? (
              <button
                onClick={stopSaga}
                className="w-full mt-6 flex items-center justify-center gap-2 bg-rose-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-rose-700 transition-colors"
              >
                <Square size={16} fill="currentColor" aria-hidden="true" />
                Stop
              </button>
            ) : (
              <button
                onClick={runSaga}
                className="w-full mt-6 bg-slate-900 text-white font-bold py-3 rounded-xl shadow-md hover:bg-slate-800 transition-colors"
              >
                Execute Transaction
              </button>
            )}

            {(state.overall === 'success' || state.overall === 'failed' || state.overall === 'stopped') && (
              <div
                className={`mt-4 p-4 rounded-xl text-center text-sm font-bold ${
                  state.overall === 'success'
                    ? 'bg-emerald-100 text-emerald-800'
                    : state.overall === 'stopped'
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-rose-100 text-rose-800'
                }`}
              >
                {state.overall === 'stopped' ? 'Transaction stopped' : `Transaction ${state.overall.toUpperCase()}`}
              </div>
            )}

            {state.overall !== 'idle' && (
              <button
                onClick={reset}
                className="w-full mt-2 flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:border-slate-300 hover:text-slate-900 transition-colors"
              >
                <RotateCcw size={14} aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </section>

        <section className="min-w-0 md:col-span-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col justify-center">

          {/* Three StepBoxes + connectors are ~526px at their natural width — narrower than
              some phones. overflow-x-auto contains that as a scroll instead of a page-level
              overflow (same pattern as the /graph Mermaid diagram), but the load-bearing fix
              is `min-w-0` on this section: without it, the grid item's automatic minimum size
              is driven by this row's unshrinkable content regardless of the scroll wrapper.
              `px-1 py-4` on this wrapper gives the active/failed StepBox's shadow (which
              paints a few px outside its own border box) and the status badge's `-top-3`
              overhang room to render instead of being sliced off by the scroll clip. */}
          <div className="overflow-x-auto px-1 py-4">
            <div className="flex items-center justify-between relative">
              <StepBox
                title="Order Service"
                status={state.order}
                desc="Create Pending Order"
              />

              <div className="flex-1 flex items-center justify-center relative h-12">
                <div className="absolute w-full border-t-2 border-slate-200 border-dashed" />
                <ArrowRight className={`relative z-10 w-6 h-6 transition-colors duration-300 ${state.payment === 'active' || state.payment === 'completed' || state.payment === 'failed' ? 'text-teal-500' : 'text-slate-300'}`} />
                <RotateCcw className={`absolute top-0 right-1/2 translate-x-1/2 -translate-y-full w-4 h-4 transition-opacity duration-300 ${state.order === 'compensating' ? 'text-amber-500 opacity-100' : 'opacity-0'}`} />
              </div>

              <StepBox
                title="Payment Service"
                status={state.payment}
                desc="Charge Credit Card"
              />

              <div className="flex-1 flex items-center justify-center relative h-12">
                <div className="absolute w-full border-t-2 border-slate-200 border-dashed" />
                <ArrowRight className={`relative z-10 w-6 h-6 transition-colors duration-300 ${state.inventory === 'active' || state.inventory === 'completed' || state.inventory === 'failed' ? 'text-teal-500' : 'text-slate-300'}`} />
                <RotateCcw className={`absolute top-0 right-1/2 translate-x-1/2 -translate-y-full w-4 h-4 transition-opacity duration-300 ${state.payment === 'compensating' ? 'text-amber-500 opacity-100' : 'opacity-0'}`} />
              </div>

              <StepBox
                title="Inventory Service"
                status={state.inventory}
                desc="Reserve Stock"
              />
            </div>
          </div>

          <div className="mt-12 bg-slate-50 p-6 rounded-xl border border-slate-100 text-sm text-slate-600">
            <h4 className="font-bold text-slate-800 mb-2">How it works:</h4>
            <p>Unlike a monolithic database transaction (ACID), microservices cannot lock rows across different databases.</p>
            <p className="mt-2">The <strong>Saga Pattern</strong> splits a distributed transaction into local transactions. If a downstream service fails (e.g. Out of Stock), the orchestrator automatically fires <em>Compensating Transactions</em> upstream (e.g. Refund Credit Card, Cancel Order) to restore system consistency.</p>
          </div>

        </section>
      </div>
    </main>
  );
}

export default SagaStateMachinePage;
