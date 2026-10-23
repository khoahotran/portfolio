import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import ErrorNotice from '../components/content/ErrorNotice';
import { getSearchIndex, peekSearchItems } from '../content-engine/content-service';
import { labs } from '../labs/registry';
import { createSiteSearch } from '../search/site-search';
import { collectionLabel, routeForCollection } from '../content-engine/format';
import type { ContentCollection, SearchIndexItem } from '../content-engine/types';
import { useSeo } from '../seo/useSeo';

const ALL_COLLECTIONS: ContentCollection[] = [
  'blog',
  'research',
  'experiments',
  'system-design',
  'field-notes',
  'projects',
];

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [docs, setDocs] = useState<SearchIndexItem[]>(() => peekSearchItems() ?? []);
  const [loading, setLoading] = useState(() => peekSearchItems() === null);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const query = params.get('q') ?? '';
  const selectedCollection = params.get('collection') as ContentCollection | null;

  useSeo({
    title: 'Search Engineering Articles',
    // Was undercounting scope (named only 3 of 6 searchable collections) -
    // aligned with the visible subhead just below, which already lists all 6.
    description: 'Search across projects, blog posts, research, system design, experiments, and field notes.',
    // Internal search-result pages are a standard noindex candidate (no
    // unique static content of their own; same reasoning as NotFoundPage.tsx).
    noindex: true,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (peekSearchItems() === null) setLoading(true);
      setError(false);

      try {
        const nextDocs = await getSearchIndex();
        if (active) {
          setDocs(nextDocs);
        }
      } catch {
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [retryToken]);

  const search = useMemo(
    () => createSiteSearch(docs.map((item) => ({ ...item, id: `${item.collection}/${item.slug}`, body: item.searchableText }))),
    [docs]
  );
  const labSearch = useMemo(() => createSiteSearch(labs.map((lab) => ({ id: lab.id, title: lab.title, summary: lab.description }))), []);
  const labMatches = useMemo(
    () => (query.trim() && !selectedCollection ? labSearch(query, 4).map((hit) => hit.doc) : []),
    [labSearch, query, selectedCollection]
  );

  const RESULT_CAP = 20;

  const matched = useMemo(() => {
    const base: SearchIndexItem[] = query.trim() ? search(query).map((hit) => hit.doc) : docs;
    return selectedCollection ? base.filter((item) => item.collection === selectedCollection) : base;
  }, [docs, search, query, selectedCollection]);

  const results = useMemo(() => {
    // The empty-query default listing shows 12 as a lighter "browse" cap; an
    // actual search shows up to 20, since a deliberate query is more likely
    // to have several genuinely relevant hits worth scrolling through.
    const cap = query.trim() ? RESULT_CAP : 12;
    return matched.slice(0, cap);
  }, [matched, query]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Search Articles</h1>
      <p className="mt-2 text-meta text-slate-600">Search across projects, blog posts, research, system design, experiments, and field notes.</p>

      <label className="mt-6 block">
        <span className="sr-only">Search query</span>
        <input
          value={query}
          onChange={(event) => {
            const next: Record<string, string> = {};
            if (event.target.value) next.q = event.target.value;
            if (selectedCollection) next.collection = selectedCollection;
            setParams(next);
          }}
          placeholder="Search architecture, retries, event-driven..."
          className="w-full rounded-xl border border-slate-300 bg-surface px-4 py-3 text-meta text-slate-900 outline-none ring-teal-500 transition focus:ring"
        />
      </label>

      <section className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by collection">
        <button
          type="button"
          aria-pressed={!selectedCollection}
          className={`rounded-full border px-3 py-1 text-micro font-semibold ${!selectedCollection ? 'border-accent bg-accent text-accent-fg' : 'border-slate-300 text-slate-700'}`}
          onClick={() => setParams(query ? { q: query } : {})}
        >
          All
        </button>
        {ALL_COLLECTIONS.map((collection) => (
          <button
            key={collection}
            type="button"
            aria-pressed={selectedCollection === collection}
            className={`rounded-full border px-3 py-1 text-micro font-semibold capitalize ${selectedCollection === collection ? 'border-accent bg-accent text-accent-fg' : 'border-slate-300 text-slate-700'}`}
            onClick={() => setParams(query ? { q: query, collection } : { collection })}
          >
            {collectionLabel(collection)}
          </button>
        ))}
      </section>

      <section className="mt-6 grid gap-4">
        {loading && !error && <LoadingState label="Loading search index…" className="py-8" />}
        {error && (
          <ErrorNotice
            message="Couldn't load the search index. Check your connection and try again."
            onRetry={() => setRetryToken((token) => token + 1)}
          />
        )}
        {!loading && !error && matched.length > 0 && (
          <p className="text-micro text-slate-500">
            {results.length < matched.length
              ? `Showing ${results.length} of ${matched.length} results`
              : `${matched.length} result${matched.length === 1 ? '' : 's'}`}
          </p>
        )}
        {labMatches.length > 0 && (
          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
            <p className="text-nano font-bold uppercase tracking-wide text-teal-700">Interactive labs</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {labMatches.map((lab) => (
                <li key={lab.id}>
                  <Link to={`/labs/${lab.id}`} className="inline-flex rounded-full border border-teal-200 bg-surface px-3 py-1 text-micro font-semibold text-teal-700 hover:border-teal-500">
                    {lab.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!loading &&
          !error &&
          results.map((item) => (
            <article key={`${item.collection}-${item.slug}`} className="rounded-xl border border-slate-200 bg-surface p-4">
              <p className="text-nano uppercase tracking-wide text-slate-500">{item.collection}</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                <Link to={`${routeForCollection(item.collection)}/${item.slug}`} className="hover:text-teal-700">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-2 text-meta text-slate-600">{item.summary}</p>
            </article>
          ))}

        {!loading && !error && results.length === 0 && (
          <p className="text-meta text-slate-500">No articles matched your query.</p>
        )}
      </section>
    </main>
  );
}

export default SearchPage;
