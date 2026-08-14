import { aboutData } from '../data/portfolioData';

export default function About() {
  return (
    <section id="about" className="py-24 px-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        {/* Not a heading — a decorative kicker above the real section title below.
            Previously an <h2>, which inverted the semantic hierarchy: a screen
            reader would announce this 12px label before the visually-dominant
            headline, which is the section's actual heading. */}
        <p className="text-sm uppercase tracking-widest text-teal-600 mb-12 font-medium italic">
          {aboutData.title}
        </p>

        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6 leading-tight">
              {aboutData.headline}
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-light">
              <p>{aboutData.paragraph1}</p>
              <p>{aboutData.paragraph2}</p>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-4">Values</p>
            <ul className="space-y-3 text-slate-700 text-sm">
              {aboutData.values.map((value, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-teal-500 font-bold">0{index + 1}</span>
                  <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

