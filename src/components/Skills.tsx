interface SkillCategory {
  category: string;
  skills: string[];
}

const skillCategories: SkillCategory[] = [
  {
    category: 'Languages',
    skills: ['JavaScript', 'TypeScript', 'Python', 'SQL', 'HTML/CSS'],
  },
  {
    category: 'Frameworks & Libraries',
    skills: ['React', 'Node.js', 'Express', 'Next.js', 'TailwindCSS'],
  },
  {
    category: 'Tools & Platforms',
    skills: ['Git', 'Docker', 'AWS', 'Supabase', 'PostgreSQL'],
  },
  {
    category: 'Soft Skills',
    skills: [
      'Problem Solving',
      'Team Collaboration',
      'Communication',
      'Mentorship',
      'Agile Methodologies',
    ],
  },
];

export default function Skills() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-12 font-medium">
          Skills & Expertise
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {skillCategories.map((category, index) => (
            <div key={index} className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">
                {category.category}
              </h3>
              <div className="flex flex-wrap gap-3">
                {category.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-teal-100 hover:text-teal-700 transition-colors"
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
