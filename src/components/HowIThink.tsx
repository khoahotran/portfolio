import { ArrowUpRight, FlaskConical, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Section, SectionHeader } from './ui/Section';
import { cardClasses } from './ui/card-classes';
import { expertisePillars } from '../data/expertise';
import { labs } from '../labs/registry';

/**
 * Tier 4 - the section this whole redesign exists for.
 *
 * It replaces a band of six pill buttons that repeated the navigation (Blog, Projects, Research,
 * Experiments, Labs, System Design). Those presented 91 write-ups and labs as a list of places.
 * This presents the same material as evidence: a claim about capability, with the lab that lets a
 * reader test it sitting directly underneath.
 *
 * The reason this matters more here than it would on most portfolios is that the labs run real
 * algorithms. "Run Raft log replication" is not a link to an article about Raft - it is a link to
 * the election restriction executing on the reader's own input. A claim a stranger can falsify in
 * ten seconds is worth more than a paragraph asserting seniority.
 */
/**
 * `writingCount` is fetched by the page and passed in rather than hardcoded. A number typed into
 * JSX drifts the moment an article is added - exactly what happened to the `reading_time`
 * frontmatter field, which sat in every article being read by nothing and wrong by 2.6x
 * (`.ai/audit-followups.md` item 1). The lab count comes from the registry, which is a static
 * import and cannot drift.
 */
export default function HowIThink({ writingCount }: { writingCount: number | null }) {
  return (
    <Section id="how-i-think" rhythm="standard" className="border-t border-slate-100 bg-slate-50">
      <SectionHeader
        kicker="How I think"
        title="Three things I can actually defend"
        lead="Each one links to something that runs. Open it, change the inputs, and check the claim yourself."
      />

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {expertisePillars.map((pillar) => (
          <article key={pillar.title} className={cardClasses({ className: 'flex min-w-0 flex-col' })}>
            <h3 className="text-d3 font-semibold text-slate-900">{pillar.title}</h3>
            <p className="mt-3 flex-1 text-meta text-slate-600">{pillar.summary}</p>

            <ul className="mt-5 space-y-1 border-t border-slate-100 pt-4">
              {pillar.proof.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="group flex min-w-0 items-center gap-2 rounded-control px-2 py-1.5 text-meta font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-teal-700"
                  >
                    {item.kind === 'lab' ? (
                      <FlaskConical className="h-3.5 w-3.5 shrink-0 text-teal-700" aria-hidden="true" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="mt-8 text-meta text-slate-600">
        There are{' '}
        <Link to="/labs" className="font-semibold text-teal-700 hover:underline">
          {labs.length} of these labs
        </Link>
        {writingCount !== null && (
          <>
            {' '}and{' '}
            <Link to="/writing" className="font-semibold text-teal-700 hover:underline">
              {writingCount} write-ups
            </Link>
          </>
        )}
        . Each lab states whether it runs the real algorithm, models it, or replays a measured run.
      </p>
    </Section>
  );
}
