import { ArrowRight } from 'lucide-react';
import { ButtonLink } from './ui/Button';
import { Section, SectionHeader } from './ui/Section';
import { cardClasses } from './ui/card-classes';
import { backgroundFacts } from '../data/background';

/**
 * The route from the homepage to /about.
 *
 * P4 moved Experience, Skills, Education and Certifications onto /about and left the homepage with
 * no in-content path to any of them, so a reader looking for the work history had only the word
 * "About" in the header to go on. The first version of this fix was a quiet one-line strip, and the
 * reader it was built for said they still did not notice it - a link nobody sees is the same as no
 * link, so weight is part of the requirement rather than a matter of taste.
 *
 * What changed: it is a full section with a heading rather than a strip between two others, the
 * facts are cards instead of a dense row, and the call to action is the filled primary button
 * (every other button on the page below the hero is secondary, so this is the only filled one in
 * its neighbourhood and reads as the next step).
 *
 * The facts come from `backgroundFacts`, so adding or reordering one is an edit to that list and
 * not to this layout. The grid is sized from the data rather than hardcoded to four columns.
 */
export default function BackgroundStrip() {
  return (
    <Section id="background" rhythm="standard" className="border-t border-slate-100 bg-surface">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeader
          kicker="Background"
          title="Who is behind all this"
          lead="Where I work now, what I am studying, and the full record of how I got here."
        />
        <ButtonLink to="/about" className="shrink-0">
          Experience, skills and education
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </div>

      <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {backgroundFacts.map((fact) => {
          const Icon = fact.icon;
          return (
            <div key={fact.label} className={cardClasses({ padding: 'sm', className: 'min-w-0' })}>
              <dt className="flex items-center gap-2 text-nano font-bold uppercase tracking-widest text-slate-500">
                <Icon className="h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />
                {fact.label}
              </dt>
              <dd className="mt-2 text-meta font-semibold text-slate-900">{fact.value}</dd>
              <dd className="mt-1 text-micro text-slate-600">{fact.detail}</dd>
            </div>
          );
        })}
      </dl>
    </Section>
  );
}
