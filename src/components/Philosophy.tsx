const pillars = [
  {
    title: 'Reliability > features',
    detail: 'Ship with explicit SLOs, error budgets, and rollback paths before adding complexity.',
  },
  {
    title: 'Make it observable',
    detail: 'Traces + metrics + logs with shared context; every alert links to a runbook.',
  },
  {
    title: 'Bias to idempotency',
    detail: 'Design APIs and jobs to replay safely; simplify recovery and reduce page load.',
  },
  {
    title: 'Cost-aware scaling',
    detail: 'Measure cost per 1k requests and enforce guardrails alongside performance goals.',
  },
];

export default function Philosophy() {
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-700 font-medium mb-8">
          Engineering Philosophy
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {pillars.map((pillar, idx) => (
            <div key={idx} className="rounded-2xl bg-white border border-slate-200 p-6 hover:border-teal-500 transition-colors">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{pillar.title}</h3>
              <p className="text-slate-600">{pillar.detail}</p>
              <div className="mt-4 text-sm text-teal-700 font-medium">Read essay →</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
