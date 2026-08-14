import { useState, useEffect } from 'react';
import LabBackLink from '../../labs/LabBackLink';
import { useSeo } from '../../seo/useSeo';
import { Play, RotateCcw, Plus, Minus, Check } from 'lucide-react';

interface EventStoreItem {
  id: string;
  version: number;
  type: 'AccountCreated' | 'MoneyDeposited' | 'MoneyWithdrawn' | 'AccountFrozen';
  payload: Record<string, unknown>;
  timestamp: string;
}

const SAMPLE_EVENTS: EventStoreItem[] = [
  { id: 'evt_1', version: 1, type: 'AccountCreated', payload: { owner: 'Alice' }, timestamp: '09:00:01' },
  { id: 'evt_2', version: 2, type: 'MoneyDeposited', payload: { amount: 500 }, timestamp: '09:05:12' },
  { id: 'evt_3', version: 3, type: 'MoneyWithdrawn', payload: { amount: 150 }, timestamp: '10:14:33' },
  { id: 'evt_4', version: 4, type: 'MoneyDeposited', payload: { amount: 1000 }, timestamp: '14:20:00' },
  { id: 'evt_5', version: 5, type: 'MoneyWithdrawn', payload: { amount: 2000 }, timestamp: '14:25:10' }, // Will fail/overdraft in logic or just record? Let's just say it works or it's a fraud trigger.
  { id: 'evt_6', version: 6, type: 'AccountFrozen', payload: { reason: 'Suspicious Activity' }, timestamp: '14:25:11' },
];

function EventSourcingReplayPage() {
  useSeo({ title: 'Event Sourcing Replay', description: 'Interactive visualization of Event Sourcing and read projections.' });
  
  const [currentVersion, setCurrentVersion] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // The Projection state
  const projection = SAMPLE_EVENTS.slice(0, currentVersion).reduce<{ owner: string; balance: number; status: string }>((state, evt) => {
    switch (evt.type) {
      case 'AccountCreated':
        return { ...state, owner: evt.payload.owner as string, status: 'ACTIVE' };
      case 'MoneyDeposited':
        return { ...state, balance: state.balance + (evt.payload.amount as number) };
      case 'MoneyWithdrawn':
        return { ...state, balance: state.balance - (evt.payload.amount as number) };
      case 'AccountFrozen':
        return { ...state, status: 'FROZEN' };
      default:
        return state;
    }
  }, { owner: 'Unknown', balance: 0, status: 'UNINITIALIZED' });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying && currentVersion < SAMPLE_EVENTS.length) {
      timer = setTimeout(() => {
        setCurrentVersion(v => v + 1);
      }, 1000);
    } else if (currentVersion >= SAMPLE_EVENTS.length) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentVersion]);

  const EventIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'AccountCreated': return <div className="bg-sky-100 text-sky-600 p-2 rounded-lg"><Check className="w-4 h-4" /></div>;
      case 'MoneyDeposited': return <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg"><Plus className="w-4 h-4" /></div>;
      case 'MoneyWithdrawn': return <div className="bg-rose-100 text-rose-600 p-2 rounded-lg"><Minus className="w-4 h-4" /></div>;
      case 'AccountFrozen': return <div className="bg-amber-100 text-amber-600 p-2 rounded-lg"><RotateCcw className="w-4 h-4" /></div>;
      default: return null;
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <LabBackLink labId="event-sourcing-replay" />
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Event Sourcing Replay</h1>
      <p className="mt-2 text-slate-600">Visualize how application state is derived from an immutable, append-only event log.</p>

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        
        {/* Left Col: Event Store Log */}
        <section className="min-w-0 md:col-span-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col max-h-[600px]">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Append-Only Event Log</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                disabled={currentVersion >= SAMPLE_EVENTS.length}
                className="flex items-center gap-1 bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-md text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3" /> {isPlaying ? 'Playing...' : 'Play Replay'}
              </button>
              <button 
                onClick={() => { setIsPlaying(false); setCurrentVersion(0); }} 
                className="flex items-center gap-1 bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {SAMPLE_EVENTS.map((evt, idx) => {
              const isApplied = idx < currentVersion;
              const isCurrent = idx === currentVersion - 1;
              return (
                <div key={evt.id} className={`p-4 rounded-xl border-2 transition-all duration-300 flex gap-4 items-center ${
                  isCurrent ? 'border-teal-400 bg-teal-50 shadow-md transform scale-[1.02]' : 
                  isApplied ? 'border-slate-200 bg-white opacity-70' : 
                  'border-slate-100 bg-slate-50 opacity-40'
                }`}>
                  <EventIcon type={evt.type} />
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-800">{evt.type}</span>
                      <span className="text-[10px] font-mono text-slate-400">v{evt.version}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1">
                      {JSON.stringify(evt.payload)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Col: Current Projection */}
        <section className="min-w-0 md:col-span-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col bg-gradient-to-br from-white to-slate-50">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-8">Read Projection (Current State)</h2>
          
          <div className="flex-1 flex flex-col justify-center">
            
            <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden transition-all duration-500">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex justify-between items-end mb-8">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Account Owner</div>
                  <div className="text-2xl font-bold">{projection.owner}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Status</div>
                  <div className={`text-xs font-bold px-2 py-1 rounded inline-block ${
                    projection.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                    projection.status === 'FROZEN' ? 'bg-rose-500/20 text-rose-300' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {projection.status}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Current Balance</div>
                <div className="text-5xl font-light font-mono flex items-baseline gap-2 transition-all duration-300">
                  <span className="text-3xl text-slate-500">$</span>
                  {projection.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="mt-8 bg-white p-6 rounded-xl border border-slate-100 text-sm text-slate-600 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2">Why Event Sourcing?</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Auditability:</strong> You never lose history. You can see exactly <em>how</em> a balance reached $500.</li>
                <li><strong>Time Travel:</strong> By stopping the replay at v3, you can query exactly what the system looked like at 10:14 AM.</li>
                <li><strong>CQRS:</strong> The write-side (append event) is decoupled from the read-side (calculate balance), allowing O(1) reads.</li>
              </ul>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
}

export default EventSourcingReplayPage;
