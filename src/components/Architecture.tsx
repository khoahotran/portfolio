import { ArrowRight, Shield, Workflow } from 'lucide-react';
import { architectureData as diagrams } from '../data/portfolioData';

export default function Architecture() {
  return (
    <section id="architecture" className="py-24 px-6 bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-baseline justify-between mb-12">
          <h2 className="text-sm uppercase tracking-widest text-teal-200 font-medium">
            Architecture Gallery
          </h2>
          <p className="text-sm text-slate-300">Downloadable SVG/PNG, steady-state and failure overlays.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {diagrams.map((item, index) => (
            <div
              key={index}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm hover:border-teal-300 transition-colors"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative space-y-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-teal-200">
                  <Shield size={14} />
                  {item.mode}
                </div>
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-slate-200 leading-relaxed">{item.description}</p>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-teal-300 text-sm font-medium hover:text-teal-100 transition-colors"
                >
                  <ArrowRight size={16} />
                  Open link
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-wrap gap-4 items-center">
          <Workflow size={20} className="text-teal-200" />
          <p className="text-sm text-slate-200">
            Every diagram ships with an accompanying sequence diagram and failure-mode walkthrough to make design intent clear.
          </p>
        </div>
      </div>
    </section>
  );
}
