import { useMemo, useState } from 'react';
import { useSeo } from '../../seo/useSeo';

function QueueVsPubSubPage() {
  useSeo({ title: 'Queue vs Pub/Sub Comparison', description: 'Interactive comparison between queue and pub-sub delivery patterns.' });
  const [messageRate, setMessageRate] = useState(600);
  const [consumers, setConsumers] = useState(6);
  const [subscribers, setSubscribers] = useState(4);

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
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Queue vs Pub/Sub Comparison</h1>
      <p className="mt-2 text-sm text-slate-600">Compare delivery behavior under changing message rates.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <label className="block text-sm font-medium text-slate-700">
            Message rate (msg/s): {messageRate}
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={messageRate}
              onChange={(event) => setMessageRate(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Queue consumers: {consumers}
            <input
              type="range"
              min={1}
              max={20}
              value={consumers}
              onChange={(event) => setConsumers(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Pub/Sub subscribers: {subscribers}
            <input
              type="range"
              min={1}
              max={20}
              value={subscribers}
              onChange={(event) => setSubscribers(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Result</h2>
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <div className="rounded-lg bg-slate-50 p-3">
              Queue latency: <strong>{metrics.queueLatency} ms</strong>, delivery success:{' '}
              <strong>{metrics.queueDelivery.toFixed(2)}%</strong>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              Pub/Sub latency: <strong>{metrics.pubSubLatency} ms</strong>, delivery success:{' '}
              <strong>{metrics.pubSubDelivery.toFixed(2)}%</strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default QueueVsPubSubPage;
