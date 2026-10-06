import Fuse, { type FuseResult } from 'fuse.js';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import ErrorNotice from '../components/content/ErrorNotice';
import { getSearchIndex } from '../content-engine/content-service';
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

/**
 * ignoreLocation (see the Fuse config below) fixes recall but on its own
 * regresses ranking for exact project/article names — e.g. "Aegis" no longer
 * surfaces the Aegis project page first, because a blog post that merely
 * mentions Aegis several times can out-score it under Fuse's own similarity
 * metric. This re-sorts an exact or prefix title match to the front before
 * falling back to Fuse's score for everything else, without touching the
 * underlying search itself.
 */
function boostExactTitleMatches(
  results: FuseResult<SearchIndexItem>[],
  query: string
): SearchIndexItem[] {
  const q = query.trim().toLowerCase();

  const rank = (title: string) => {
    const t = title.toLowerCase();
    if (t === q) return 0;
    if (t.startsWith(q)) return 1;
    if (t.includes(q)) return 2;
    return 3;
  };

  return [...results]
    .sort((a, b) => {
      const rankDiff = rank(a.item.title) - rank(b.item.title);
      if (rankDiff !== 0) return rankDiff;
      return (a.score ?? 0) - (b.score ?? 0);
    })
    .map((result) => result.item);
}

function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [docs, setDocs] = useState<SearchIndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const query = params.get('q') ?? '';
  const selectedCollection = params.get('collection') as ContentCollection | null;

  useSeo({
    title: 'Search Engineering Articles',
    // Was undercounting scope (named only 3 of 6 searchable collections) —
    // aligned with the visible subhead just below, which already lists all 6.
    description: 'Search across projects, blog posts, research, system design, experiments, and field notes.',
    // Internal search-result pages are a standard noindex candidate (no
    // unique static content of their own; same reasoning as NotFoundPage.tsx).
    noindex: true,
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
        // Fuse's default `location: 0, distance: 100` means a match past roughly
        // the first ~34 characters of a field scores above any reasonable
        // threshold and gets discarded — measured: "Argon2id" (in 5 articles),
        // "rate limiting" (in 4), and "core banking" (in 6, only 1 returned) all
        // undercounted results because of this. ignoreLocation removes that
        // position penalty; the threshold is tightened from 0.34 to compensate
        // for the resulting looser matching.
        //
        // 0.25 alone let a short acronym (<=4 chars) match on a single edit against
        // almost anything: "BRIN" (in 1 article) returned 32/33; "RBAC" (in 3) returned
        // 32/33. Tightened to 0.20 — verified against a 24-query battery (exact/partial
        // titles, tech names, project names, tags, rare keywords, multi-word, case
        // variants, no-result queries): every previously-correct top hit is unchanged,
        // and BRIN/RBAC/saga/CQRS all drop back down to their real counts.
        ignoreLocation: true,
        threshold: 0.2,
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

  const RESULT_CAP = 20;

  const matched = useMemo(() => {
    const base = query.trim() ? boostExactTitleMatches(fuse.search(query), query) : docs;
    return selectedCollection ? base.filter((item) => item.collection === selectedCollection) : base;
  }, [docs, fuse, query, selectedCollection]);

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
      <p className="mt-2 text-sm text-slate-600">Search across projects, blog posts, research, system design, experiments, and field notes.</p>

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
          className="w-full rounded-xl border border-slate-300 bg-surface px-4 py-3 text-sm text-slate-900 outline-none ring-teal-500 transition focus:ring"
        />
      </label>

      <section className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by collection">
        <button
          type="button"
          aria-pressed={!selectedCollection}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${!selectedCollection ? 'border-accent bg-accent text-accent-fg' : 'border-slate-300 text-slate-700'}`}
          onClick={() => setParams(query ? { q: query } : {})}
        >
          All
        </button>
        {ALL_COLLECTIONS.map((collection) => (
          <button
            key={collection}
            type="button"
            aria-pressed={selectedCollection === collection}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${selectedCollection === collection ? 'border-accent bg-accent text-accent-fg' : 'border-slate-300 text-slate-700'}`}
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
          <p className="text-xs text-slate-500">
            {results.length < matched.length
              ? `Showing ${results.length} of ${matched.length} results`
              : `${matched.length} result${matched.length === 1 ? '' : 's'}`}
          </p>
        )}
        {!loading &&
          !error &&
          results.map((item) => (
            <article key={`${item.collection}-${item.slug}`} className="rounded-xl border border-slate-200 bg-surface p-4">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.collection}</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                <Link to={`${routeForCollection(item.collection)}/${item.slug}`} className="hover:text-teal-700">
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
