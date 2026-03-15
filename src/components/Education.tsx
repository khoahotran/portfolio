import { GraduationCap } from 'lucide-react';
import { educationData } from '../data/portfolioData';

export default function Education() {
  return (
    <section id="education" className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-12 font-medium italic">
          {educationData.title}
        </h2>
        <div className="space-y-8">
          {educationData.items.map((edu, index) => (
            <div
              key={index}
              className="group rounded-xl border border-slate-100 p-8 hover:border-teal-200 transition-colors bg-slate-50/50"
            >
              <div className="flex items-start gap-6">
                <div className="p-3 bg-white rounded-lg border border-slate-100 group-hover:border-teal-100 transition-colors shadow-sm">
                  <GraduationCap className="text-teal-600" size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-1">
                        {edu.degree}
                      </h3>
                      <p className="text-slate-500 font-medium">
                        {edu.institution}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                        {edu.location}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full mt-3 md:mt-0 uppercase tracking-widest">
                      {edu.period}
                    </span>
                  </div>
                  <ul className="space-y-3 text-slate-600 font-light">
                    {edu.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="text-teal-400 font-bold">•</span>
                        <span className="text-sm leading-relaxed">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

