import { GraduationCap } from 'lucide-react';

interface EducationItem {
  degree: string;
  institution: string;
  location: string;
  period: string;
  highlights: string[];
}

const education: EducationItem[] = [
  {
    degree: 'Bachelor of Science in Computer Science',
    institution: 'University Name',
    location: 'City, State',
    period: '2015 - 2019',
    highlights: [
      'GPA: 3.8/4.0',
      'Dean\'s List: All semesters',
      'Relevant Coursework: Data Structures, Algorithms, Web Development, Database Systems',
    ],
  },
];

export default function Education() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-12 font-medium">
          Education
        </h2>
        <div className="space-y-8">
          {education.map((edu, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-teal-100 rounded-lg">
                  <GraduationCap className="text-teal-600" size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3">
                    <div>
                      <h3 className="text-xl font-medium text-slate-900 mb-1">
                        {edu.degree}
                      </h3>
                      <p className="text-slate-600">
                        {edu.institution} • {edu.location}
                      </p>
                    </div>
                    <span className="text-sm text-slate-500 mt-2 md:mt-0">
                      {edu.period}
                    </span>
                  </div>
                  <ul className="space-y-2 text-slate-600">
                    {edu.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-teal-500 mr-2">▹</span>
                        <span>{highlight}</span>
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
