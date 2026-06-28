import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../seo/useSeo';

function QueueVsPubSubPage() {
  useSeo({ title: 'Queue vs Pub/Sub Comparison', description: 'Interactive comparison between queue and pub-sub delivery patterns.' });
  const [messageRate, setMessageRate] = useState(600);
  const [consumers, setConsumers] = useState(3);
  const [subscribers, setSubscribers] = useState(3);
  const [ticks, setTicks] = useState(0);

  // Animation ticker for message flow
  useEffect(() => {
    // Faster ticker based on message rate
    const interval = Math.max(50, 1000 - messageRate / 2);
    const timer = setInterval(() => setTicks(t => (t + 1) % 100), interval);
    return () => clearInterval(timer);
  }, [messageRate]);

  const metrics = useMemo(() => {
    const queueLatency = Math.max(20, Math.round(messageRate / Math.max(1, consumers)));
    const pubSubLatency = Math.max(15, Math.round((messageRate / Math.max(1, subscribers)) * 0.8));

    return {
      queueLatency,
      pubSubLatency,
      queueDelivery: Math.min(99.99, 92 + consumers * 1.1),
      pubSubDelivery: Math.min(99.99, 90 + subscribers * 1.5),
    };
  }, [messageRate, consumers, subscribers]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 animate-fade-in">
      <Link to="/experiments" className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest text-teal-600 hover:text-teal-700 transition-colors">
        &larr; Back to Experiments
      </Link>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Queue vs Pub/Sub Comparison</h1>
      <p className="mt-2 text-slate-600">Visualize the difference in message routing and delivery behavior under changing load.</p>

      <div className="mt-10 grid gap-8 md:grid-cols-12">
        <section className="md:col-span-4 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              <div className="flex justify-between">
                <span>Message Rate</span>
                <span className="text-teal-600">{messageRate} msg/s</span>
              </div>
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={messageRate}
                onChange={(event) => setMessageRate(Number(event.target.value))}
                className="mt-3 w-full accent-teal-600"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 pt-2">
              <div className="flex justify-between">
                <span className="text-sky-600">Queue Consumers</span>
                <span className="text-sky-600">{consumers}</span>
              </div>
              <input
                type="range"
                min={1}
                max={6}
                value={consumers}
                onChange={(event) => setConsumers(Number(event.target.value))}
                className="mt-3 w-full accent-sky-500"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 pt-2">
              <div className="flex justify-between">
                <span className="text-purple-600">Pub/Sub Subscribers</span>
                <span className="text-purple-600">{subscribers}</span>
              </div>
              <input
                type="range"
                min={1}
                max={6}
                value={subscribers}
                onChange={(event) => setSubscribers(Number(event.target.value))}
                className="mt-3 w-full accent-purple-500"
              />
            </label>
          </div>
        </section>

        <section className="md:col-span-8 grid md:grid-cols-2 gap-6">
          
          {/* Work Queue Animation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col relative overflow-hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-500 mb-6">Work Queue (1-to-1)</h2>
            <div className="flex-1 relative flex flex-col justify-center min-h-[250px]">
              
              <div className="flex items-center justify-between h-full px-2">
                {/* Publisher */}
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center z-10 shrink-0">
                  <div className="w-3 h-3 bg-white rounded-sm animate-pulse" />
                </div>
                
                {/* The Queue (Broker) */}
                <div className="flex-1 h-12 border-y-2 border-sky-200 bg-sky-50 mx-4 relative overflow-hidden flex items-center">
                   {/* Messages moving in queue */}
                   {[...Array(5)].map((_, i) => (
                     <div key={i} className="absolute w-4 h-4 bg-sky-500 rounded-sm"
                          style={{
                            left: `${((ticks + i * 20) % 100)}%`,
                            transition: 'left 0.1s linear'
                          }}
                     />
                   ))}
                </div>
                
                {/* Consumers */}
                <div className="flex flex-col gap-4 z-10 shrink-0">
                  {[...Array(consumers)].map((_, i) => {
                    const isReceiving = (ticks % consumers) === i; // Round-robin simulation
                    return (
                      <div key={i} className={`w-8 h-8 rounded bg-white border-2 flex items-center justify-center transition-colors duration-200 ${isReceiving ? 'border-sky-500' : 'border-slate-300'}`}>
                        <div className={`w-3 h-3 bg-sky-500 rounded-sm transition-opacity duration-200 ${isReceiving ? 'opacity-100 scale-110' : 'opacity-0 scale-50'}`} />
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="mt-8 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Latency: <span className="text-slate-700">{metrics.queueLatency}ms</span></span>
                <span>Success: <span className="text-sky-600">{metrics.queueDelivery.toFixed(2)}%</span></span>
              </div>
            </div>
          </div>

          {/* Pub/Sub Animation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col relative overflow-hidden">
            <h2 className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-6">Pub/Sub (1-to-N)</h2>
            <div className="flex-1 relative flex flex-col justify-center min-h-[250px]">
              
              <div className="flex items-center justify-between h-full px-2">
                {/* Publisher */}
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center z-10 shrink-0">
                  <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                </div>
                
                {/* The Topic (Broker) */}
                <div className="flex-1 h-2 bg-purple-200 mx-4 relative flex flex-col justify-center">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-6 px-2 py-1 bg-purple-100 text-purple-700 text-[10px] rounded font-bold uppercase">Topic</div>
                  <div className="absolute w-full flex items-center">
                    {/* Broadcast waves */}
                    <div className="absolute h-[1px] bg-purple-400 w-full animate-pulse opacity-50" />
                  </div>
                </div>
                
                {/* Subscribers */}
                <div className="flex flex-col gap-4 z-10 shrink-0 relative">
                  {/* Connecting lines from broker to subscribers */}
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 h-[calc(100%-2rem)] w-4 border-l-2 border-y-2 border-purple-200 rounded-l-md -z-10" />
                  
                  {[...Array(subscribers)].map((_, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full bg-white border-2 border-purple-400 flex items-center justify-center relative`}>
                      {/* Sub receives message simultaneously */}
                      <div className={`absolute -left-6 w-4 h-4 bg-purple-500 rounded-full`}
                           style={{
                             transform: `translateX(${(ticks % 100) > 80 ? '24px' : '0px'})`,
                             opacity: (ticks % 100) > 70 ? 1 : 0,
                             transition: 'all 0.1s linear'
                           }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Latency: <span className="text-slate-700">{metrics.pubSubLatency}ms</span></span>
                <span>Success: <span className="text-purple-600">{metrics.pubSubDelivery.toFixed(2)}%</span></span>
              </div>
            </div>
          </div>
          
        </section>
      </div>
    </main>
  );
}

export default QueueVsPubSubPage;
