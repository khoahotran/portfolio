import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllContentIndex, getLatestContent } from '../content-engine/content-service';
import { collectionLabel, formatDate, routeForCollection } from '../content-engine/format';
import type { ContentIndexItem } from '../content-engine/types';
import { contactData, educationData, heroData } from '../data/portfolioData';
import { useSeo } from '../seo/useSeo';
import Hero from '../components/Hero';
import HowIThink from '../components/HowIThink';
import BackgroundStrip from '../components/BackgroundStrip';
import Projects from '../components/Projects';
import Contact from '../components/Contact';
import { Section, SectionHeader } from '../components/ui/Section';
import { cardClasses } from '../components/ui/card-classes';

function PortfolioHome() {
  /**
   * Person structured data for the homepage. Articles have carried JSON-LD since
   * ContentDetailPage was split out, but the homepage - the page that actually identifies
   * who this is - had none, so search engines had no structured link between the name, the
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
    // "Portfolio" is dropped here - useSeo's site-suffix already appends
    // " | Khoa Tran Engineering Portfolio", so the un-trimmed version rendered
    // the word twice in the final <title>.
    title: 'Trần Nguyễn Anh Khoa - Software Engineer',
    description:
      'Backend systems developer portfolio, featuring architecture case studies, event-driven banking systems, and technical experiments.',
    jsonLd,
  });

  /**
   * Six tiers, down from thirteen sections and roughly ten screens of scroll.
   *
   * Each tier answers one question and stops: who is this (hero), what proves it (proof strip,
   * inside the hero so it breaks the fold), what has he built (selected work), what can he defend
   * (how I think), is this still alive (latest), how do I reach him (contact).
   *
   * What left this page did not leave the site. Experience, Skills, Education, Certifications and
   * the personal/university projects move to /about, which until now duplicated the homepage's
   * identity material instead of owning it. Metrics is folded into the proof strip, which was doing
   * the same job with better attribution. The six-pill "Engineering Lab" band is deleted outright:
   * it repeated the navigation verbatim, and HowIThink does its job properly by citing labs as
   * evidence rather than listing them as destinations.
   */
  const [writingCount, setWritingCount] = useState<number | null>(null);
  const [latest, setLatest] = useState<ContentIndexItem[] | null>(null);

  useEffect(() => {
    let active = true;

    getAllContentIndex()
      .then((all) => {
        if (active) setWritingCount(all.filter((item) => item.collection !== 'projects').length);
      })
      .catch(() => {
        // Non-critical enhancement - the sentence reads correctly without the number.
      });

    getLatestContent(3)
      .then((result) => {
        if (active) setLatest(result);
      })
      .catch(() => {
        // Non-critical enhancement - degrade silently, same convention as above.
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <Hero />

      <Section id="projects" rhythm="anchor">
        <SectionHeader
          kicker="Selected work"
          title="Systems I designed and built"
          lead="Each one states whether it shipped to production or was built self-directed, and links to the reasoning behind its trade-offs."
        />
        <div className="mt-10">
          <Projects sectionIds={['flagship']} showHeader={false} bare />
        </div>
      </Section>

      <HowIThink writingCount={writingCount} />

      {/* The way through to /about. Sits after the capability claims and before the feed: a reader
          convinced by HowIThink asks "who is this person" next, and until now the homepage gave
          them nowhere to go for it. */}
      <BackgroundStrip />

      {latest !== null && latest.length > 0 && (
        <Section rhythm="quiet" className="border-t border-slate-100">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-micro font-semibold uppercase tracking-widest text-teal-700">
              Recently published
            </p>
            <Link to="/writing" className="text-micro font-semibold text-slate-500 hover:text-teal-700">
              All writing &rarr;
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {latest.map((item) => (
              <Link
                key={`${item.collection}/${item.slug}`}
                to={`${routeForCollection(item.collection)}/${item.slug}`}
                className={cardClasses({ padding: 'sm', interactive: true, className: 'group flex flex-col' })}
              >
                <span className="mb-2 text-nano font-bold uppercase tracking-widest text-slate-500">
                  {collectionLabel(item.collection)} &middot; {formatDate(item.date)}
                </span>
                <span className="text-meta font-semibold text-slate-900 group-hover:text-teal-700">
                  {item.title}
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Contact />
    </main>
  );
}

export default PortfolioHome;
