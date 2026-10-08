import { ArrowRight, Github, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonAnchor, ButtonLink } from './ui/Button';
import { proofPoints } from '../data/expertise';
import { heroData } from '../data/portfolioData';

/**
 * Hero and the proof strip under it - tiers 1 and 2 of the homepage.
 *
 * It no longer fills the viewport. `min-h-screen` meant the first screen carried a name, a generic
 * tagline and two buttons, and pushed every piece of evidence below the fold; a reader who did not
 * scroll learned nothing that distinguishes this person from any other backend engineer. At ~72vh
 * the proof strip breaks the fold, so the first thing visible after the name is a measured number
 * attached to the system it came from.
 *
 * The tagline is still the old copy. It is weak - it describes a stack, not a value - but rewriting
 * it is a content decision, and content comes after the UI architecture settles. The structure
 * around it is built so better copy drops straight in.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-100 bg-surface">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(20,184,166,0.06),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(14,165,233,0.05),transparent_35%)]" />

      <div className="relative mx-auto flex min-h-[72vh] max-w-5xl flex-col justify-center px-4 py-band-standard md:px-6">
        <p className="text-micro font-semibold uppercase tracking-[0.25em] text-teal-700">
          {heroData.role}
        </p>
        <h1 className="mt-4 text-d1 font-bold text-slate-900">{heroData.name}</h1>
        <p className="mt-5 max-w-2xl text-lead text-slate-600">{heroData.tagline}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink to="/projects">
            See the work <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
          <ButtonAnchor href="#contact" variant="secondary">
            Get in touch
          </ButtonAnchor>
          <span className="ml-1 flex items-center gap-4 text-slate-500">
            <a href={`mailto:${heroData.email}`} aria-label="Email" className="transition-colors hover:text-teal-700">
              <Mail size={20} />
            </a>
            <a
              href={heroData.github}
              aria-label="GitHub profile"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-teal-700"
            >
              <Github size={20} />
            </a>
            <a
              href={heroData.linkedin}
              aria-label="LinkedIn profile"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-teal-700"
            >
              <Linkedin size={20} />
            </a>
          </span>
        </div>

        {/* Tier 2 - the proof strip. Inside the hero on purpose: it has to break the fold, and a
            separate band below would put it back under it on a laptop. */}
        <div className="mt-14 grid gap-px overflow-hidden rounded-card border border-slate-200 bg-slate-200 sm:grid-cols-3">
          {proofPoints.map((point) => {
            const body = (
              <>
                <div className="text-d3 font-bold tabular-figures text-slate-900">{point.value}</div>
                <div className="mt-1 text-meta font-medium text-slate-700">{point.label}</div>
                <div className="mt-1 text-micro text-slate-500">{point.source}</div>
              </>
            );
            return point.to ? (
              <Link
                key={point.label}
                to={point.to}
                className="group bg-surface p-5 transition-colors hover:bg-slate-50"
              >
                {body}
                <span className="mt-2 inline-flex items-center gap-1 text-micro font-semibold text-teal-700">
                  How it was measured
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ) : (
              <div key={point.label} className="bg-surface p-5">
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
