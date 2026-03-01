import { Briefcase } from 'lucide-react';

interface ExperienceItem {
  title: string;
  company: string;
  location: string;
  period: string;
  description: string[];
}

const experiences: ExperienceItem[] = [
  {
    title: 'Senior Software Engineer',
    company: 'Tech Company Inc.',
    location: 'San Francisco, CA',
    period: '2022 - Present',
    description: [
      'Led development of core platform features serving 100k+ users',
      'Architected scalable microservices using Node.js and TypeScript',
      'Mentored junior developers and established code quality standards',
    ],
  },
  {
    title: 'Software Engineer',
    company: 'Startup Ventures',
    location: 'Remote',
    period: '2020 - 2022',
    description: [
      'Built responsive web applications using React and modern tooling',
      'Collaborated with design team to create seamless user experiences',
      'Implemented CI/CD pipelines reducing deployment time by 60%',
    ],
  },
  {
    title: 'Junior Developer',
    company: 'Digital Agency',
    location: 'New York, NY',
    period: '2019 - 2020',
    description: [
      'Developed client websites and custom WordPress solutions',
      'Worked with cross-functional teams to deliver projects on time',
      'Gained expertise in modern JavaScript frameworks and best practices',
    ],
  },
];

export default function Experience() {
  return (
    <section className="py-24 px-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-12 font-medium">
          Experience
        </h2>
        <div className="space-y-12">
          {experiences.map((exp, index) => (
            <div
              key={index}
              className="group relative pl-8 border-l-2 border-slate-200 hover:border-teal-500 transition-colors"
            >
              <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-slate-200 group-hover:bg-teal-500 transition-colors" />
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3">
                <div>
                  <h3 className="text-xl font-medium text-slate-900 mb-1">
                    {exp.title}
                  </h3>
                  <div className="flex items-center text-slate-600 mb-2">
                    <Briefcase size={16} className="mr-2" />
                    <span>{exp.company}</span>
                    <span className="mx-2">•</span>
                    <span className="text-slate-500">{exp.location}</span>
                  </div>
                </div>
                <span className="text-sm text-slate-500 whitespace-nowrap">
                  {exp.period}
                </span>
              </div>
              <ul className="space-y-2 text-slate-600">
                {exp.description.map((item, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-teal-500 mr-2">▹</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
