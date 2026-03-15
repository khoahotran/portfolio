import { skillCategoriesData as skillCategories } from '../data/portfolioData';

export default function Skills() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-12 font-medium italic">
          / Capabilities
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {skillCategories.map((category, index) => (
            <div key={index} className="space-y-4 rounded-2xl border border-slate-200 p-6 bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-900">
                {category.category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-white text-slate-700 rounded-full border border-slate-200 text-sm"
                  >
                    {skill}
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
