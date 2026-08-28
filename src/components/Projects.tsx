import { ExternalLink, Github, Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import TagPill from './TagPill';
import { caseStudiesData as caseStudies } from '../data/portfolioData';
import type { ProjectProvenance } from '../data/portfolioData';

/**
 * Badge copy + styling per provenance. The label spells out what the category
 * actually means ("Shipped at work", not "Professional") because the whole point
 * is that a reader shouldn't have to interpret it — see
 * `.ai/portfolio-context.md` "Provenance Is Mandatory".
 *
 * Text is at the -700 level on a -50 surface throughout: these badges are
 * primary information, not decoration, so they have to clear WCAG AA rather
 * than sit at the borderline -400 level flagged in `.ai/audit-followups.md`
 * item 2.
 */
const PROVENANCE_META: Record<ProjectProvenance, { label: string; className: string }> = {
  professional: {
    label: 'Shipped at work',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  'self-directed': {
    label: 'Self-directed build',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  academic: {
    label: 'Academic research',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  coursework: {
    label: 'University coursework',
    className: 'bg-slate-100 text-slate-700 border-slate-300',
  },
};

function ProvenanceBadge({ provenance }: { provenance: ProjectProvenance }) {
  const meta = PROVENANCE_META[provenance];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

interface ProjectsProps {
  /**
   * Restricts rendering to these section ids. Omit to render all — kept as
   * the default so this stays a drop-in replacement for the previous
   * no-props usage. The homepage now renders two instances of this
   * component (flagship near the top, personal+university further down);
   * this is what lets it do that without duplicating the card markup below.
   * `'experience'` (SeensioGO/Jujuja) is deliberately never requested by
   * either homepage instance — that data now lives only in Experience.tsx's
   * timeline, which already covers the same facts. caseStudiesData itself
   * is untouched; the entries are just no longer selected for rendering.
   */
  sectionIds?: string[];
  /** Section id for the outer <section> — see the anchor-preservation note in PortfolioHome.tsx. */
  id?: string;
  /**
   * The "/ Projects & Case Studies" header only makes sense once per page.
   * The second homepage instance (personal+university) suppresses it rather
   * than repeating the same heading text a second time further down.
   */
  showHeader?: boolean;
}

export default function Projects({ sectionIds, id = 'projects', showHeader = true }: ProjectsProps) {
  // Flagship case studies (Aegis, Core Banking, QuantAlpha — each with its own
  // content/projects/*.md deep dive) lead, ahead of Professional Experience:
  // they're the strongest evidence of architectural depth in the portfolio,
  // and were previously filed under "Personal Projects" below the resume-style
  // work history, which undersold them relative to what they actually are.
  const allSections = [
    { id: 'flagship', label: 'Flagship Case Studies' },
    { id: 'experience', label: 'Professional Experience' },
    { id: 'personal', label: 'Personal Projects' },
    { id: 'university', label: 'University' },
  ];
  const sections = sectionIds ? allSections.filter((s) => sectionIds.includes(s.id)) : allSections;

  return (
    <section id={id} className="py-24 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {showHeader && (
          <div className="flex items-baseline justify-between mb-12">
            <h2 className="text-sm uppercase tracking-widest text-teal-700 font-medium italic">
              / Projects & Case Studies
            </h2>
            <div className="text-sm text-slate-500 font-light">Technical breakdowns and impact analysis.</div>
          </div>
        )}

        {sections.map(section => {
          const sectionProjects = caseStudies.filter(p => p.section === section.id);
          if (sectionProjects.length === 0) return null;

          // Only the flagship section gets the full evidence-card treatment
          // (metrics, architecture bullets, case-study CTA). Personal/University
          // projects render as a lighter list further down — see the row
          // branch below — so they read as supporting work, not competing
          // evidence, without losing any of their own data.
          if (section.id === 'flagship') {
            return (
              <div key={section.id} className="mb-20 last:mb-0">
                <h3 className="text-xl font-bold text-slate-800 mb-8 pb-2 border-b border-slate-200">
                  {section.label}
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  {sectionProjects.map((project, index) => (
                    <div
                      key={index}
                      className="group min-w-0 rounded-xl border border-slate-100 bg-surface p-8 hover:border-teal-500 hover:shadow-2xl hover:shadow-slate-100 transition-all duration-500 flex flex-col h-full"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <ProvenanceBadge provenance={project.provenance} />
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{project.role}</p>
                          </div>
                          <h4 className="text-2xl font-bold text-slate-900 mt-2">{project.title}</h4>
                          <p className="text-xs text-slate-500 mt-1 font-mono">{project.scale}</p>
                        </div>
                        <div className="flex gap-3 text-slate-300">
                          {project.links?.deck && (
                            <a
                              href={project.links?.deck}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-teal-700 transition-colors"
                              aria-label="View link"
                            >
                              <ExternalLink size={20} />
                            </a>
                          )}
                          {project.links?.live && (
                            <a
                              href={project.links?.live}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-teal-700 transition-colors"
                              aria-label="View live site"
                            >
                              <ExternalLink size={20} />
                            </a>
                          )}
                          {project.links?.github && (
                            <a
                              href={project.links?.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-teal-700 transition-colors"
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

                      <div className="mb-6 flex-grow">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">Architecture</p>
                        <ul className="space-y-2 text-slate-600 text-sm">
                          {project.architecture.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-teal-500 mt-1 opacity-50"><Network size={14} /></span>
                              <span className="font-light">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-auto pt-6 border-t border-slate-50 flex items-end justify-between">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">Stack</p>
                          <div className="flex flex-wrap gap-2">
                            {project.stack.map((tech, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-bold px-2 py-1 rounded-sm bg-inverse text-inverse-fg flex items-center gap-2"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>

                        {project.slug && (
                          <Link
                            to={`/projects/${project.slug}`}
                            className="shrink-0 bg-teal-50 text-teal-700 hover:bg-accent hover:text-accent-fg px-4 py-2 rounded-lg text-xs font-bold transition-colors border border-teal-100 hover:border-teal-600"
                          >
                            Read Case Study
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Lighter row treatment for non-flagship projects (Personal Projects,
          // University): title + summary + stack tags + repo link only — no
          // metric pills, no Architecture list, no case-study CTA, no card
          // shadow/hover-lift. Deliberately a plain divided list rather than a
          // grid of boxes, so it reads as supporting content, not competing
          // evidence, next to the flagship cards above.
          return (
            <div key={section.id} className="mb-20 last:mb-0">
              <h3 className="text-xl font-bold text-slate-800 mb-8 pb-2 border-b border-slate-200">
                {section.label}
              </h3>
              <div className="divide-y divide-slate-200">
                {sectionProjects.map((project, index) => (
                  <div key={index} className="min-w-0 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-800">{project.title}</h4>
                        <ProvenanceBadge provenance={project.provenance} />
                        <span className="text-xs text-slate-500">{project.scale}</span>
                      </div>
                      {project.links?.github && (
                        <a
                          href={project.links.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 text-xs text-slate-500 hover:text-teal-700 transition-colors"
                        >
                          <Github size={14} />
                          View code
                        </a>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 font-light">{project.summary}</p>
                    {project.stack.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {project.stack.map((tech, i) => (
                          <TagPill key={i}>{tech}</TagPill>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
