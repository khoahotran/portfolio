import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllContentIndex } from '../../content-engine/content-service';
import { routeForCollection } from '../../content-engine/format';
import type { ContentIndexItem } from '../../content-engine/types';

interface Props {
  series?: string;
  seriesOrder?: number;
  slug: string;
}

/**
 * "Part N of M in <series>" badge plus prev/next-in-series links, for the (currently unused, but
 * now build-time-enforced — see scripts/build-search-index.mjs) `series:`/`seriesOrder:`
 * frontmatter pair. See .ai/content-roadmap.md §5.6.
 *
 * Deliberately fetches the full cross-collection index (`getAllContentIndex`), not one collection's
 * — unlike `collection`, which ArticleNav's prev/next is scoped to, a `series` can span multiple
 * collections (e.g. a benchmark rewrite that's one `experiments` post and one `blog`
 * retrospective), so this can't reuse ArticleNav's single-collection fetch.
 *
 * Renders nothing when the article has no `series` — most content doesn't yet, and won't for a
 * while; this is infrastructure for when it does, not a feature with existing content behind it.
 */
function SeriesNav({ series, seriesOrder, slug }: Props) {
  const [items, setItems] = useState<ContentIndexItem[] | null>(null);

  useEffect(() => {
    if (!series) {
      setItems(null);
      return;
    }

    let active = true;

    getAllContentIndex()
      .then((all) => {
        if (!active) return;
        const inSeries = all
          .filter((item) => item.series === series)
          .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
        setItems(inSeries);
      })
      .catch(() => {
        // Non-critical enhancement — degrade silently, same convention as ArticleNav.
      });

    return () => {
      active = false;
    };
  }, [series]);

  if (!series || !items || items.length === 0) {
    return null;
  }

  const currentIndex = items.findIndex((item) => item.slug === slug);
  if (currentIndex === -1) {
    return null;
  }

  const previous = items[currentIndex - 1] ?? null;
  const next = items[currentIndex + 1] ?? null;
  // Falls back to position-in-sorted-list when `seriesOrder` itself is somehow absent on the
  // current item (shouldn't happen — the build fails on that — but this is display code, not
  // the enforcement, so it degrades to "still correct" rather than "crashes").
  const position = seriesOrder ?? currentIndex + 1;

  return (
    <div className="mt-4">
      <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
        Part {position} of {items.length} in {series}
      </span>
      {(previous || next) && (
        <nav className="mt-3 grid gap-3 sm:grid-cols-2" aria-label="Series navigation">
          {previous ? (
            <Link
              to={`${routeForCollection(previous.collection)}/${previous.slug}`}
              className="group rounded-xl border border-slate-200 bg-surface p-3 transition-colors hover:border-teal-500"
            >
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Previous in series
              </div>
              <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-700">
                {previous.title}
              </div>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              to={`${routeForCollection(next.collection)}/${next.slug}`}
              className="group rounded-xl border border-slate-200 bg-surface p-3 text-right transition-colors hover:border-teal-500"
            >
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Next in series
              </div>
              <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-700">{next.title}</div>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      )}
    </div>
  );
}

export default SeriesNav;
