import { Network, Tags } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import TagPill from '../components/TagPill';
import ErrorNotice from '../components/content/ErrorNotice';
import { cardClasses } from '../components/ui/card-classes';
import { Section, SectionHeader } from '../components/ui/Section';
import { getAllContentIndex } from '../content-engine/content-service';
import { collectionLabel, formatDate, routeForCollection } from '../content-engine/format';
import type { ContentCollection, ContentIndexItem } from '../content-engine/types';
import { useSeo } from '../seo/useSeo';

/**
 * One browse surface over every written piece on the site.
 *
 * Replaces five top-level navigation entries - Blog, Research, Experiments, System Design, Field
 * Notes - with one entry and five filters. Those five are the author's taxonomy, not the reader's
 * intent: nobody arrives wanting "field notes", they arrive wanting to see how someone reasons
 * about a problem. Five labels is a job for a filter, not for a header.
 *
 * None of those routes are removed. 62 articles are indexed at /blog/..., /research/... and so on,
 * and the sitemap carries 137 entries; this changes what the header promotes, not where anything
 * lives. Each collection's own list page stays, stays prerendered, and stays linked from here.
 *
 * `projects` is excluded on purpose: it is the Work surface, reached from its own nav entry.
 */

const WRITING_COLLECTIONS: ContentCollection[] = [
  'blog',
  'research',
  'experiments',
  'system-design',
  'field-notes',
];

function WritingIndexPage() {
  useSeo({
    title: 'Writing',
    description:
      'Every write-up on the site in one place: engineering blog posts, applied research, experiments, system design notes and field notes - filterable by kind and by tag.',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ContentIndexItem[] | null>(null);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const activeType = searchParams.get('type');
  const activeTag = searchParams.get('tag');

  useEffect(() => {
    let active = true;
    setError(false);
    getAllContentIndex()
      .then((all) => {
        if (active) setItems(all.filter((item) => item.collection !== 'projects'));
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [retryToken]);

  const counts = useMemo(() => {
    const result: Partial<Record<ContentCollection, number>> = {};
    for (const item of items ?? []) {
      result[item.collection] = (result[item.collection] ?? 0) + 1;
    }
    return result;
  }, [items]);

  const tags = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items ?? []) for (const tag of item.tags) seen.add(tag);
    return [...seen].sort();
  }, [items]);

  const visible = useMemo(() => {
    let result = items ?? [];
    if (activeType) result = result.filter((item) => item.collection === activeType);
    if (activeTag) result = result.filter((item) => item.tags.includes(activeTag));
    return result;
  }, [items, activeType, activeTag]);

  /**
   * Filters live in the URL rather than in component state so a filtered view can be linked,
   * shared and bookmarked - and so the back button steps through filter changes the way a reader
   * expects. `replace` keeps a long filtering session from burying the previous page in history.
   */
  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <ErrorNotice message="Could not load the writing index." onRetry={() => setRetryToken((t) => t + 1)} />
      </main>
    );
  }

  return (
    <main>
      <Section rhythm="quiet">
        <SectionHeader
          kicker="Writing"
          title="Everything I have written down"
          lead="Engineering write-ups, applied research, experiments and field notes. Filter by kind, or by tag."
        />

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <FilterChip active={activeType === null} onClick={() => setParam('type', null)}>
            All <span className="tabular-figures opacity-60">{items?.length ?? 0}</span>
          </FilterChip>
          {WRITING_COLLECTIONS.map((collection) => (
            <FilterChip
              key={collection}
              active={activeType === collection}
              onClick={() => setParam('type', activeType === collection ? null : collection)}
            >
              <span className="capitalize">{collectionLabel(collection)}</span>{' '}
              <span className="tabular-figures opacity-60">{counts[collection] ?? 0}</span>
            </FilterChip>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-nano font-bold uppercase tracking-widest text-slate-500">Tag</span>
            {activeTag && (
              <button
                type="button"
                onClick={() => setParam('tag', null)}
                className="rounded-pill bg-teal-50 px-2.5 py-0.5 text-micro font-semibold text-teal-700"
              >
                #{activeTag} &times;
              </button>
            )}
            {!activeTag &&
              tags.slice(0, 12).map((tag) => (
                <button key={tag} type="button" onClick={() => setParam('tag', tag)}>
                  <TagPill>#{tag}</TagPill>
                </button>
              ))}
            <Link to="/tags" className="ml-1 inline-flex items-center gap-1 text-micro font-semibold text-slate-500 hover:text-teal-700">
              <Tags className="h-3.5 w-3.5" aria-hidden="true" /> All tags
            </Link>
            <Link to="/graph" className="inline-flex items-center gap-1 text-micro font-semibold text-slate-500 hover:text-teal-700">
              <Network className="h-3.5 w-3.5" aria-hidden="true" /> Ecosystem graph
            </Link>
          </div>
        )}
      </Section>

      <Section rhythm="quiet" className="pt-0">
        {items === null ? (
          <LoadingState />
        ) : visible.length === 0 ? (
          <p className="rounded-card border border-dashed border-slate-200 p-10 text-center text-meta text-slate-500">
            Nothing matches that combination. Clear a filter to see more.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map((item) => (
              <article key={`${item.collection}/${item.slug}`} className={cardClasses({ padding: 'sm', interactive: true })}>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-nano font-bold uppercase tracking-widest text-slate-500">
                  <span className="text-teal-700">{collectionLabel(item.collection)}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>{formatDate(item.date)}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>{item.readingText}</span>
                </div>
                <h2 className="text-d3 font-semibold text-slate-900">
                  <Link to={`${routeForCollection(item.collection)}/${item.slug}`} className="hover:text-teal-700">
                    {item.title}
                  </Link>
                </h2>
                <p className="mt-2 text-meta text-slate-600">{item.summary}</p>
              </article>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill px-3 py-1.5 text-micro font-semibold capitalize transition-colors ${
        active
          ? 'bg-inverse text-inverse-fg'
          : 'border border-slate-200 text-slate-600 hover:border-teal-400 hover:text-teal-700'
      }`}
    >
      {children}
    </button>
  );
}

export default WritingIndexPage;
