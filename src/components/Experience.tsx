import { Briefcase } from 'lucide-react';
import { experienceData as experiences } from '../data/portfolioData';

export default function Experience() {
  return (
    <section id="experience" className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-12 font-medium italic">
          / Experience
        </h2>
        <div className="space-y-12">
          {experiences.map((exp, index) => (
            <div
              key={index}
              className="group relative pl-8 border-l border-slate-100 hover:border-teal-500 transition-colors"
            >
              <div className="absolute -left-1 top-0 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-teal-500 transition-colors" />
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {exp.title}
                  </h3>
                  <div className="flex items-center text-slate-500 mb-2">
                    <Briefcase size={16} className="mr-2" />
                    <span className="font-medium text-slate-700">{exp.company}</span>
                    <span className="mx-2">•</span>
                    <span>{exp.location}</span>
                  </div>
                </div>
                <span className="text-sm font-mono text-slate-400">
                  {exp.period}
                </span>
              </div>
              <ul className="space-y-2 text-slate-600">
                {exp.description.map((item, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-teal-500 mr-2 opacity-50">#</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                {exp.impact.map((metric, i) => (
                  <span
                    key={i}
                    className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-sm bg-slate-50 text-slate-600 border border-slate-100"
                  >
                    {metric}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
