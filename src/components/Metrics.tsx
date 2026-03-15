import { metricsData as metrics } from '../data/portfolioData';

export default function Metrics() {
  return (
    <section className="py-20 px-6 bg-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-sm uppercase tracking-widest text-teal-700 font-medium">
            Engineering Metrics
          </h2>
          <p className="text-sm text-slate-600">Evidence of reliability, performance, and efficiency.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
              <p className="text-3xl font-semibold text-slate-900 mt-2">{metric.value}</p>
              <p className="text-sm text-slate-500 mt-1">{metric.detail}</p>
              <div className="mt-4 h-1.5 rounded-full bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
