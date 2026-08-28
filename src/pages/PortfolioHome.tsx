import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getContentCounts, getLatestContent } from '../content-engine/content-service';
import { collectionLabel, formatDate, routeForCollection } from '../content-engine/format';
import type { ContentIndexItem } from '../content-engine/types';
import { labs } from '../labs/registry';
import { contactData, educationData, heroData } from '../data/portfolioData';
import { useSeo } from '../seo/useSeo';
import Hero from '../components/Hero';
import About from '../components/About';
import Experience from '../components/Experience';
import Metrics from '../components/Metrics';
import Projects from '../components/Projects';
import Skills from '../components/Skills';
import Education from '../components/Education';
import Certifications from '../components/Certifications';
import Contact from '../components/Contact';

function PortfolioHome() {
  /**
   * Person structured data for the homepage. Articles have carried JSON-LD since
   * ContentDetailPage was split out, but the homepage — the page that actually identifies
   * who this is — had none, so search engines had no structured link between the name, the
   * profiles, and the site.
   *
   * `jobTitle` is the real title, not an aspirational one: see `.ai/portfolio-context.md`
   * "Career Stage". Structured data is the last place to inflate a claim, since it is machine-read
   * and trivially compared against LinkedIn.
   */
  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: heroData.name,
      alternateName: 'Khoa Tran',
      jobTitle: 'Software Developer',
      description: heroData.tagline,
      url: `${window.location.origin}${import.meta.env.BASE_URL}`,
      email: `mailto:${contactData.email}`,
      sameAs: [heroData.github, heroData.linkedin],
      knowsAbout: [
        'Distributed Systems',
        'Event Sourcing',
        'CQRS',
        'Saga Pattern',
        'Go',
        'TypeScript',
        'PostgreSQL',
        'gRPC',
      ],
      alumniOf: {
        '@type': 'CollegeOrUniversity',
        name: educationData.items[0].institution,
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Ho Chi Minh City',
        addressCountry: 'VN',
      },
    }),
    []
  );

  useSeo({
    // "Portfolio" is dropped here — useSeo's site-suffix already appends
    // " | Khoa Tran Engineering Portfolio", so the un-trimmed version rendered
    // the word twice in the final <title>.
    title: 'Trần Nguyễn Anh Khoa - Software Engineer',
    description:
      'Backend systems developer portfolio, featuring architecture case studies, event-driven banking systems, and technical experiments.',
    jsonLd,
  });

  // Article/project counts are fetched (not hardcoded) so they can't drift out
  // of date; lab count is a static import (labs.length), so it's always
  // available without waiting on a network round-trip. Null = still loading
  // or the fetch failed — the strip below just doesn't render rather than
  // showing a wrong or half-loaded number.
  const [counts, setCounts] = useState<{ total: number; projects: number } | null>(null);

  useEffect(() => {
    let active = true;

    getContentCounts()
      .then((result) => {
        if (active) {
          setCounts(result);
        }
      })
      .catch(() => {
        // Non-critical enhancement — degrade silently, same convention as ArticleNav.
      });

    return () => {
      active = false;
    };
  }, []);

  // `getLatestContent` (src/content-engine/content-service.ts) was fully implemented but imported
  // by nothing — a returning reader had no way to see what's new since their last visit short of
  // re-browsing every collection. Degrades silently (null = still loading or failed), same
  // convention as `counts` above: a missing "what's new" strip is a lost enhancement, not an error
  // worth surfacing. See .ai/content-roadmap.md §5.6.
  const [latest, setLatest] = useState<ContentIndexItem[] | null>(null);

  useEffect(() => {
    let active = true;

    getLatestContent(4)
      .then((result) => {
        if (active) setLatest(result);
      })
      .catch(() => {
        // Non-critical enhancement — degrade silently.
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <Hero />

      {/* Flagship Case Studies moved to immediately after Hero — see the Batch 1
          homepage-hierarchy fix. Keeps `id="projects"` so Hero's `href="#projects"`
          CTA still lands here. Only the flagship section id is requested; the
          "experience" (SeensioGO/Jujuja) cards are deliberately not rendered
          anywhere on the homepage anymore — that data now lives only in
          Experience.tsx's timeline below, which already covers the same facts. */}
      <Projects sectionIds={['flagship']} />

      {/* Engineering Lab Section — moved up to sit directly after Flagship
          (was previously 8th of 9 sections, far below the fold). Content and
          styling unchanged; only its position moved. */}
      <section id="engineering-lab" className="py-24 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-5xl mx-auto text-center font-light">
          {/* Decorative kicker, not a heading — see the matching note in About.tsx. */}
          <p className="text-sm uppercase tracking-widest text-teal-700 mb-6 font-medium italic">
            / Engineering Lab
          </p>
          <h2 className="text-4xl md:text-5xl text-slate-900 font-bold mb-8">
            Technical Writing & Simulators
          </h2>
          <p className="text-lg text-slate-500 mb-6 max-w-2xl mx-auto leading-relaxed">
            Explore my engineering blog posts, detailed system design research, and interactive simulators.
          </p>
          {/* Counts are fetched/static (see the useEffect above), not hardcoded. */}
          {counts !== null && (
            <p className="mb-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-medium text-slate-500">
              <span>
                <span className="font-bold text-slate-900">{counts.total}</span> write-ups
              </span>
              <span aria-hidden="true">&middot;</span>
              <span>
                <span className="font-bold text-slate-900">{labs.length}</span> interactive labs
              </span>
              <span aria-hidden="true">&middot;</span>
              <span>
                <span className="font-bold text-slate-900">{counts.projects}</span> flagship case studies
              </span>
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/blog"
              className="px-8 py-3 rounded-full bg-inverse text-inverse-fg font-semibold shadow-lg shadow-slate-200 hover:bg-inverse/90 transition-all hover:-translate-y-0.5"
            >
              Blog
            </Link>
            <Link
              to="/projects"
              className="px-8 py-3 rounded-full border border-slate-200 text-slate-900 hover:border-teal-600 hover:text-teal-700 transition-colors"
            >
              Projects
            </Link>
            <Link
              to="/research"
              className="px-8 py-3 rounded-full border border-slate-200 text-slate-900 hover:border-teal-600 hover:text-teal-700 transition-colors"
            >
              Research
            </Link>
            <Link
              to="/experiments"
              className="px-8 py-3 rounded-full border border-slate-200 text-slate-900 hover:border-teal-600 hover:text-teal-700 transition-colors"
            >
              Experiments
            </Link>
            <Link
              to="/labs"
              className="px-8 py-3 rounded-full border border-slate-200 text-slate-900 hover:border-teal-600 hover:text-teal-700 transition-colors"
            >
              Labs
            </Link>
            <Link
              to="/system-design"
              className="px-8 py-3 rounded-full border border-slate-200 text-slate-900 hover:border-teal-600 hover:text-teal-700 transition-colors"
            >
              System Design
            </Link>
          </div>
        </div>
      </section>

      {/* Recently Published — see the useEffect above. Only renders once content actually loads
          (no skeleton), matching how the counts strip above degrades: a homepage that briefly
          shows nothing here is less noticeable than one that flashes a loading placeholder. */}
      {latest !== null && latest.length > 0 && (
        <section className="border-t border-slate-100 bg-surface px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <p className="mb-8 text-sm font-medium uppercase tracking-widest text-teal-700">
              / Recently Published
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {latest.map((item) => (
                <Link
                  key={`${item.collection}/${item.slug}`}
                  to={`${routeForCollection(item.collection)}/${item.slug}`}
                  className="group flex flex-col rounded-xl border border-slate-200 bg-surface p-4 transition hover:-translate-y-0.5 hover:border-teal-400"
                >
                  <span className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {collectionLabel(item.collection)} &middot; {formatDate(item.date)}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-teal-700">
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <About />
      <Experience />

      {/* Was dead code (see todo.md's "Dead code — decision needed"). Wired in rather than deleted
          because metricsData attributes every number to the system it was measured on — which is
          exactly the evidence the repositioning in .ai/portfolio-context.md asks the site to lead
          with. Placed next to Experience, which describes the work these numbers came from. */}
      <Metrics />

      {/* Personal Projects + University — same card component and data as
          before, just no longer sharing a <section> with Flagship. Header
          suppressed (showHeader=false) so "/ Projects & Case Studies" isn't
          repeated a second time on the page; the existing "Personal Projects"
          / "University" <h3> subheadings are unchanged and still render. */}
      <Projects sectionIds={['personal', 'university']} id="other-projects" showHeader={false} />

      <Skills />
      <Education />
      <Certifications />
      <Contact />
    </main>
  );
}

export default PortfolioHome;
