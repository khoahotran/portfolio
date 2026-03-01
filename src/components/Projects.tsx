import { ExternalLink, Github } from 'lucide-react';

interface Project {
  title: string;
  description: string;
  technologies: string[];
  outcome: string;
  links: {
    demo?: string;
    github?: string;
  };
}

const projects: Project[] = [
  {
    title: 'E-Commerce Platform',
    description:
      'A full-stack e-commerce solution with real-time inventory management and integrated payment processing.',
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
    outcome: 'Processed $500k+ in transactions within first 6 months',
    links: {
      demo: '#',
      github: '#',
    },
  },
  {
    title: 'Task Management App',
    description:
      'Collaborative task management tool with real-time updates, team workspaces, and advanced filtering.',
    technologies: ['TypeScript', 'Supabase', 'React', 'TailwindCSS'],
    outcome: 'Adopted by 5 teams, improving productivity by 40%',
    links: {
      demo: '#',
      github: '#',
    },
  },
  {
    title: 'Analytics Dashboard',
    description:
      'Data visualization platform for business metrics with customizable widgets and automated reporting.',
    technologies: ['React', 'D3.js', 'Express', 'MongoDB'],
    outcome: 'Reduced reporting time from hours to minutes',
    links: {
      github: '#',
    },
  },
];

export default function Projects() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-sm uppercase tracking-widest text-teal-600 mb-12 font-medium">
          Featured Projects
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div
              key={index}
              className="group bg-slate-50 rounded-lg p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <h3 className="text-xl font-medium text-slate-900 mb-3">
                {project.title}
              </h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {project.technologies.map((tech, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1 bg-teal-100 text-teal-700 rounded-full"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-500 italic mb-4">
                {project.outcome}
              </p>
              <div className="flex gap-4">
                {project.links.demo && (
                  <a
                    href={project.links.demo}
                    className="text-slate-400 hover:text-teal-600 transition-colors"
                    aria-label="View demo"
                  >
                    <ExternalLink size={20} />
                  </a>
                )}
                {project.links.github && (
                  <a
                    href={project.links.github}
                    className="text-slate-400 hover:text-teal-600 transition-colors"
                    aria-label="View code"
                  >
                    <Github size={20} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
