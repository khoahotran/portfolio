import { ExternalLink, Github, Network } from 'lucide-react';

interface CaseStudy {
  title: string;
  role: string;
  scale: string;
  summary: string;
  metrics: string[];
  stack: string[];
  architecture: string[];
  links: {
    deck?: string;
    github?: string;
  };
}

const caseStudies: CaseStudy[] = [
  {
    title: 'SeensioGO',
    role: 'Full-stack Developer',
    scale: 'Mobile + Admin dashboard',
    summary:
      'Backend services for store management and Sio in-app currency transactions; supports Unity-based mobile client and admin web.',
    metrics: ['Latency 150-300 ms (Algolia)', 'Consistency errors <1%', 'API response +20-30% via cache'],
    stack: ['NestJS', 'Firebase Functions', 'Firestore', 'Algolia', 'Next.js', 'TailwindCSS'],
    architecture: [
      'NestJS services deployed as Firebase Functions.',
      'Algolia geo-search for store discovery.',
      'Caching layer for frequently accessed store data.',
      'Audit logging and transaction tracking for balance changes.',
    ],
    links: {
      deck: 'https://apps.apple.com/app/seensiogo/id6474233078',
    },
  },
  {
    title: 'Jujuja',
    role: 'Full-stack Developer',
    scale: 'Daily quest load ~500-1,500 users/min',
    summary:
      'Store onboarding workflows, daily quest automation, and j-point loyalty system with atomic transactions; Angular/Ionic client.',
    metrics: ['500-1,500 users/min quests', 'Reporting APIs 5-7s', 'Atomic loyalty transactions'],
    stack: ['NestJS', 'Firebase Functions', 'Firestore', 'Algolia', 'Twilio', 'Angular', 'Ionic', 'Capacitor'],
    architecture: [
      'Async background jobs for daily quests and rewards.',
      'Multi-channel store registration and activation approval.',
      'Algolia geo-search in Ionic app; Twilio integration.',
      'Owner reporting APIs with Excel export.',
    ],
    links: {
      deck: 'https://apps.apple.com/app/jujuja/id6553972212',
    },
  },
  {
    title: 'Uynex',
    role: 'Full-stack Developer',
    scale: 'Personal Project',
    summary:
      'Personal expense management app with real-time tracking and cookie-based session security. Built with a modular NestJS architecture.',
    metrics: ['CRUD <200ms', 'Secure Sessions', 'Modular Design'],
    stack: ['NestJS', 'MongoDB', 'ReactJS', 'TypeScript', 'shadcn/ui'],
    architecture: [
      'RESTful API design with modular NestJS services.',
      'Cookie-based authentication with session persistence.',
      'React frontend with state-driven category tracking.',
    ],
    links: { github: 'https://github.com/MinhPham131204/expense_management' },
  },
  {
    title: 'Smart Printing Service',
    role: 'Front-end Developer',
    scale: 'Campus-wide Platform',
    summary:
      'Printing management system for HCMUT students featuring PayOS integration and strict role-based access control.',
    metrics: ['RBAC to reduce unauthorized usage (UAT)', 'Agile team of 7', 'End-to-end SDLC participation'],
    stack: ['MERN Stack', 'TypeScript', 'PayOS', 'Git'],
    architecture: [
      'PayOS payment gateway integration.',
      'Role-based authorization pages.',
      'Responsive design for student-wide accessibility.',
    ],
    links: { github: 'https://github.com/ngochidung2111/CNPM' },
  },
  {
    title: 'Tesell',
    role: 'Front-end Developer',
    scale: 'Team of 5',
    summary:
      'E-commerce platform for electronic devices; built responsive catalogue and shopping interface with consistent design tokens.',
    metrics: ['Responsive catalogue', 'Conventional Commits adopted'],
    stack: ['ReactJS', 'Tailwind CSS', 'MERN Stack', 'Git'],
    architecture: [
      'Dynamic product listing and detail pages in ReactJS.',
      'Tailwind CSS for consistent tokens across breakpoints.',
      'Conventional Commits for traceable history and changelog.',
    ],
    links: { github: 'https://github.com/HCMUT-Tesell/Tesell' },
  },
];

export default function Projects() {
  return (
    <section id="projects" className="py-24 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-baseline justify-between mb-12">
          <h2 className="text-sm uppercase tracking-widest text-teal-600 font-medium italic">
            / Projects
          </h2>
          <div className="text-sm text-slate-500 font-light">Technical breakdowns and impact analysis.</div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {caseStudies.map((project, index) => (
            <div
              key={index}
              className="group rounded-xl border border-slate-100 bg-white p-8 hover:border-teal-500 hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{project.role}</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{project.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{project.scale}</p>
                </div>
                <div className="flex gap-3 text-slate-300">
                  {project.links.deck && (
                    <a
                      href={project.links.deck}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-teal-600 transition-colors"
                      aria-label="View link"
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                  {project.links.github && (
                    <a
                      href={project.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-teal-600 transition-colors"
                      aria-label="View code"
                    >
                      <Github size={20} />
                    </a>
                  )}
                </div>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-light">{project.summary}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {project.metrics.map((metric, i) => (
                  <span
                    key={i}
                    className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-sm bg-slate-50 text-teal-700 border border-teal-50"
                  >
                    {metric}
                  </span>
                ))}
              </div>

              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">Architecture</p>
                <ul className="space-y-2 text-slate-600 text-sm">
                  {project.architecture.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-teal-500 mt-1 opacity-50"><Network size={14} /></span>
                      <span className="font-light">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">Stack</p>
                <div className="flex flex-wrap gap-2">
                  {project.stack.map((tech, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold px-2 py-1 rounded-sm bg-slate-900 text-white flex items-center gap-2"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
