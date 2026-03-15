import { Github, PenSquare, Star } from 'lucide-react';

const oss = [
  { name: 'open-kafka-tools', stars: '1.2k⭐', role: 'Author', focus: 'Kafka consumer lag tooling + chaos scripts' },
  { name: 'otel-lambda-layer', stars: '740⭐', role: 'Maintainer', focus: 'Serverless OTel distro with batteries-included exporters' },
  { name: 'infra-runbooks', stars: '320⭐', role: 'Curator', focus: 'Incident playbooks and templates for SLO programs' },
];

const writing = [
  { title: 'Designing multi-region payments without global locks', time: '8 min', takeaway: 'How to keep idempotency without sacrificing latency.' },
  { title: 'Incident drills that actually work', time: '6 min', takeaway: 'Burn-rate alerts, roles, and fast comms beats big dashboards.' },
  { title: 'Sampling strategies for telemetry pipelines', time: '7 min', takeaway: 'Adaptive sampling while preserving rare error signals.' },
];

export default function Credibility() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10">
        <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50">
          <div className="flex items-center gap-2 mb-6">
            <Github size={18} className="text-teal-600" />
            <h2 className="text-sm uppercase tracking-widest text-teal-700 font-medium">Open Source</h2>
          </div>
          <div className="space-y-4">
            {oss.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between gap-4 rounded-xl bg-white p-4 border border-slate-200">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-600">{item.focus}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mt-2">{item.role}</p>
                </div>
                <div className="text-sm text-teal-700 flex items-center gap-1">
                  <Star size={14} />
                  {item.stars}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-8 bg-slate-50">
          <div className="flex items-center gap-2 mb-6">
            <PenSquare size={18} className="text-teal-600" />
            <h2 className="text-sm uppercase tracking-widest text-teal-700 font-medium">Writing</h2>
          </div>
          <div className="space-y-4">
            {writing.map((post, idx) => (
              <div key={idx} className="rounded-xl bg-white p-4 border border-slate-200">
                <p className="text-lg font-semibold text-slate-900">{post.title}</p>
                <p className="text-sm text-slate-600">{post.takeaway}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500 mt-2">{post.time} read</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
