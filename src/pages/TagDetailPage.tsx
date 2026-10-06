import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import ErrorNotice from '../components/content/ErrorNotice';
import { getAllContentIndex } from '../content-engine/content-service';
import { collectionLabel, formatDate, routeForCollection } from '../content-engine/format';
import type { ContentIndexItem } from '../content-engine/types';
import { useSeo } from '../seo/useSeo';

/**
 * `/tags/:tag` — every article carrying this tag, across all six collections. The cross-collection
 * span is the entire point (see TagsIndexPage's doc comment) — each card therefore shows its
 * collection as a badge, which `ContentListPage`'s single-collection cards don't need to.
 */
function TagDetailPage() {
  const { tag } = useParams<{ tag: string }>();

  useSeo({
    title: tag ? `#${tag}` : 'Tag',
    description: tag ? `Every write-up tagged "${tag}", across all collections.` : 'Articles by tag.',
  });

  const [items, setItems] = useState<ContentIndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    getAllContentIndex()
      .then((result) => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryToken]);

  const matches = useMemo(() => items.filter((item) => item.tags.includes(tag ?? '')), [items, tag]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <Link to="/tags" className="btn-back mb-4">
        <ArrowLeft size={16} aria-hidden="true" />
        All Tags
      </Link>
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">#{tag}</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          {loading ? 'Loading…' : `${matches.length} write-up${matches.length === 1 ? '' : 's'} tagged "${tag}", across every collection.`}
        </p>
      </section>

      {loading && !error && <LoadingState label="Loading tagged content…" className="py-8" />}
      {error && (
        <ErrorNotice
          message="Couldn't load this tag. Check your connection and try again."
          onRetry={() => setRetryToken((token) => token + 1)}
        />
      )}
      {!loading && !error && (
        <section className="grid gap-4">
          {matches.map((item) => (
            <article
              key={`${item.collection}/${item.slug}`}
              className="min-w-0 rounded-2xl border border-slate-200 bg-surface p-5 transition hover:-translate-y-0.5 hover:border-teal-400"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold uppercase tracking-wide text-slate-600">
                  {collectionLabel(item.collection)}
                </span>
                <span>{formatDate(item.date)}</span>
                <span>{item.readingText}</span>
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                <Link to={`${routeForCollection(item.collection)}/${item.slug}`} className="hover:text-teal-700">
                  {item.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
            </article>
          ))}
          {matches.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Nothing tagged &ldquo;{tag}&rdquo; yet.
            </p>
          )}
        </section>
      )}
    </main>
  );
}

export default TagDetailPage;
