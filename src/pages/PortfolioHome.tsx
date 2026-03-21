import { FlaskConical, Layers, NotebookText, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getLatestContent } from '../content-engine/content-service';
import type { ContentIndexItem } from '../content-engine/types';
import { caseStudiesData } from '../data/portfolioData';
import { useSeo } from '../seo/useSeo';

const experiments = [
  {
    title: 'Throughput Simulation',
    summary: 'Explore worker capacity and failure impact on effective throughput.',
    to: '/experiments/throughput-simulation',
  },
  {
    title: 'Retry Strategy Visualizer',
    summary: 'Compare retry windows across exponential and linear backoff.',
    to: '/experiments/retry-strategy',
  },
  {
    title: 'Failure Injection Demo',
    summary: 'Inject synthetic errors and observe circuit breaker behavior.',
    to: '/experiments/failure-injection',
  },
  {
    title: 'Queue vs Pub/Sub',
    summary: 'Compare trade-offs between queue and pub/sub under load.',
    to: '/experiments/queue-vs-pubsub',
  },
];

const architectureNotes = [
  {
    title: 'Event-Driven Boundaries',
    desc: 'Prefer explicit contracts and idempotent handlers over implicit orchestration.',
  },
  {
    title: 'Permission Model Evolution',
    desc: 'Start with role + resource matrix, then layer policy rules only when needed.',
  },
  {
    title: 'Queue Observability',
    desc: 'Track lag, retry depth, and dead-letter velocity as first-class SLO signals.',
  },
];

function routeByCollection(collection: ContentIndexItem['collection']): string {
  if (collection === 'system-design') {
    return '/system-design';
  }

  return `/${collection}`;
}

function PortfolioHome() {
  const [latest, setLatest] = useState<ContentIndexItem[]>([]);

  useSeo({
    title: 'Engineering Portfolio',
    description:
      'Backend architecture case studies, interactive engineering experiments, and system design notes.',
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      const entries = await getLatestContent(6);
      if (active) {
        setLatest(entries);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <section className="border-b border-slate-200 bg-white px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-600">Engineering Portfolio</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Building backend systems, experiments, and practical architecture notes.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-slate-600 md:text-lg">
            This portfolio is an engineering lab: case studies, system design notes, and interactive experiments.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/blog" className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white">
              Read Articles
            </Link>
            <Link to="/experiments" className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700">
              Open Experiments
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="mb-6 flex items-center gap-2">
          <Rocket size={16} className="text-teal-600" />
          <h2 className="text-xl font-bold text-slate-900">Featured Projects</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {caseStudiesData.slice(0, 4).map((project) => (
            <article key={project.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">{project.title}</h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{project.role}</p>
              <p className="mt-3 text-sm text-slate-600">{project.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-14 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center gap-2">
            <FlaskConical size={16} className="text-teal-600" />
            <h2 className="text-xl font-bold text-slate-900">Engineering Experiments</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {experiments.map((item) => (
              <Link key={item.to} to={item.to} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-500">
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="mb-6 flex items-center gap-2">
          <NotebookText size={16} className="text-teal-600" />
          <h2 className="text-xl font-bold text-slate-900">Latest Articles</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {latest.map((article) => (
            <Link
              key={`${article.collection}-${article.slug}`}
              to={`${routeByCollection(article.collection)}/${article.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-500"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">{article.collection}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{article.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{article.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-4 py-14 md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center gap-2">
            <Layers size={16} className="text-teal-600" />
            <h2 className="text-xl font-bold text-slate-900">Architecture Notes</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {architectureNotes.map((note) => (
              <article key={note.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-900">{note.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{note.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default PortfolioHome;
