import Fuse from 'fuse.js';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ErrorNotice from '../components/content/ErrorNotice';
import { getSearchIndex } from '../content-engine/content-service';
import { routeForCollection } from '../content-engine/format';
import type { ContentCollection, SearchIndexItem } from '../content-engine/types';
import { useSeo } from '../seo/useSeo';

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [docs, setDocs] = useState<SearchIndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const query = params.get('q') ?? '';

  useSeo({
    title: 'Search Engineering Articles',
    description: 'Find system design notes, research write-ups, and experiment logs.',
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
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

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        includeScore: true,
        threshold: 0.34,
        minMatchCharLength: 2,
        keys: [
          { name: 'title', weight: 0.45 },
          { name: 'summary', weight: 0.3 },
          { name: 'tags', weight: 0.15 },
          { name: 'searchableText', weight: 0.1 },
        ],
      }),
    [docs]
  );

  const results = useMemo(() => {
    if (!query.trim()) {
      return docs.slice(0, 12);
    }

    return fuse.search(query).map((item) => item.item).slice(0, 20);
  }, [docs, fuse, query]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Search Articles</h1>
      <p className="mt-2 text-sm text-slate-600">Search across blog, research, system design, and experiment notes.</p>

      <label className="mt-6 block">
        <span className="sr-only">Search query</span>
        <input
          value={query}
          onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {})}
          placeholder="Search architecture, retries, event-driven..."
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-teal-500 transition focus:ring"
        />
      </label>

      <section className="mt-6 grid gap-4">
        {loading && !error && <p className="text-sm text-slate-500">Loading search index...</p>}
        {error && (
          <ErrorNotice
            message="Couldn't load the search index. Check your connection and try again."
            onRetry={() => setRetryToken((token) => token + 1)}
          />
        )}
        {!loading &&
          !error &&
          results.map((item) => (
            <article key={`${item.collection}-${item.slug}`} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.collection}</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                <Link to={`${routeForCollection(item.collection)}/${item.slug}`} className="hover:text-teal-600">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
            </article>
          ))}

        {!loading && !error && results.length === 0 && (
          <p className="text-sm text-slate-500">No articles matched your query.</p>
        )}
      </section>
    </main>
  );
}

export default SearchPage;
