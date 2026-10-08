import { ArrowRight, Building2, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Section } from './ui/Section';
import { educationData, experienceData } from '../data/portfolioData';

/**
 * The route to /about from the homepage.
 *
 * P4 moved Experience, Skills, Education and Certifications off the homepage and onto /about, which
 * was right - the homepage should lead with evidence, not with a resume. But it left the homepage
 * with no in-content path to any of it. A reader who wanted to know where this person works or what
 * they studied had only the word "About" in the header to go on, and nothing told them that is
 * where the work history lives. That is a dead end introduced by the redesign, reported by the
 * first person to actually read the page.
 *
 * So this is not a generic "About me" button. It states the two facts a reader is looking for -
 * current role and current degree - and the link then promises the rest by name. Naming what is
 * behind a link is what makes it clickable; "About" alone is not a reason to click.
 */
export default function BackgroundStrip() {
  const current = experienceData[0];
  const degree = educationData.items[0];

  return (
    <Section rhythm="quiet" className="border-t border-slate-100">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="grid gap-4 sm:grid-cols-2 md:flex-1">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-meta font-semibold text-slate-900">{current.company}</p>
              <p className="text-micro text-slate-600">
                {current.title} &middot; {current.period}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-meta font-semibold text-slate-900">{degree.degree}</p>
              <p className="text-micro text-slate-600">HCMUT &middot; {degree.period}</p>
            </div>
          </div>
        </div>

        <Link
          to="/about"
          className="group inline-flex shrink-0 items-center gap-2 rounded-pill border border-slate-200 px-5 py-2.5 text-meta font-semibold text-slate-900 transition-colors hover:border-teal-600 hover:text-teal-700"
        >
          Full background: experience, skills, education
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </Section>
  );
}
