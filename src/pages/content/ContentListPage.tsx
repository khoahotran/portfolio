import { ArrowLeft } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingState from '../../components/LoadingState';
import ErrorNotice from '../../components/content/ErrorNotice';
import { getContentIndex, getContentTags } from '../../content-engine/content-service';
import { formatDate, routeForCollection } from '../../content-engine/format';
import type { ContentCollection, ContentIndexItem } from '../../content-engine/types';
import { useSeo } from '../../seo/useSeo';

interface Props {
  collection: ContentCollection;
  title: string;
  description: string;
}

const ContentCard = memo(function ContentCard({
  item,
  collection,
}: {
  item: ContentIndexItem;
  collection: ContentCollection;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-surface p-5 transition hover:-translate-y-0.5 hover:border-teal-400">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{formatDate(item.date)}</span>
        <span>{item.readingText}</span>
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">
        <Link to={`${routeForCollection(collection)}/${item.slug}`} className="hover:text-teal-700">
          {item.title}
        </Link>
      </h2>
      <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
      {item.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
});

function ContentListPage({ collection, title, description }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ContentIndexItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const selectedTag = searchParams.get('tag');
  const keyword = searchParams.get('q') ?? '';

  useSeo({
    title,
    description,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(false);

      try {
        const [nextItems, nextTags] = await Promise.all([getContentIndex(collection), getContentTags(collection)]);
        if (active) {
          setItems(nextItems);
          setTags(nextTags);
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
  }, [collection, retryToken]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return items.filter((item) => {
      const matchesTag = selectedTag ? item.tags.includes(selectedTag) : true;
      const matchesKeyword = normalizedKeyword
        ? `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLowerCase().includes(normalizedKeyword)
        : true;

      return matchesTag && matchesKeyword;
    });
  }, [items, keyword, selectedTag]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <Link to="/" className="btn-back mb-4">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Portfolio
      </Link>
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">{description}</p>
      </section>

      <section className="mb-6">
        <label className="block">
          <span className="sr-only">Search within this collection</span>
          <input
            value={keyword}
            onChange={(event) => {
              const next: Record<string, string> = {};
              const inputValue = event.target.value;
              if (inputValue) {
                next.q = inputValue;
              }
              if (selectedTag) {
                next.tag = selectedTag;
              }
              setSearchParams(next);
            }}
            placeholder="Search within this collection"
            className="w-full rounded-xl border border-slate-300 bg-surface px-4 py-2.5 text-sm text-slate-900 outline-none ring-teal-500 focus:ring"
          />
        </label>
      </section>

      <section className="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${!selectedTag ? 'border-accent bg-accent text-accent-fg' : 'border-slate-300 text-slate-700'
            }`}
          onClick={() => setSearchParams(keyword ? { q: keyword } : {})}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${selectedTag === tag ? 'border-accent bg-accent text-accent-fg' : 'border-slate-300 text-slate-700'
              }`}
            onClick={() => setSearchParams(keyword ? { tag, q: keyword } : { tag })}
          >
            #{tag}
          </button>
        ))}
      </section>

      <section className="grid gap-4">
        {loading && !error && <LoadingState label="Loading content…" className="col-span-full py-8" />}
        {error && (
          <ErrorNotice
            message="Couldn't load this collection. Check your connection and try again."
            onRetry={() => setRetryToken((token) => token + 1)}
          />
        )}
        {!loading &&
          !error &&
          filteredItems.map((item) => <ContentCard key={item.slug} item={item} collection={collection} />)}
        {!loading && !error && filteredItems.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            No article matched this filter.
          </p>
        )}
      </section>
    </main>
  );
}

export default ContentListPage;
