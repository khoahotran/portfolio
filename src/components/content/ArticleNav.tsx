import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getContentIndex, peekCollectionIndex } from '../../content-engine/content-service';
import { routeForCollection } from '../../content-engine/format';
import type { ContentCollection, ContentIndexItem } from '../../content-engine/types';

interface Props {
  collection: ContentCollection;
  slug: string;
}

/**
 * Previous/next links within the current collection, ordered chronologically
 * (Previous = older, Next = newer) rather than by the index's internal
 * newest-first sort order.
 */
type Neighbours = [previous: ContentIndexItem | null, next: ContentIndexItem | null];

function neighbours(items: ContentIndexItem[], slug: string): Neighbours {
  const currentIndex = items.findIndex((item) => item.slug === slug);
  // items are sorted newest-first: the following entry is older (Previous),
  // the preceding entry is newer (Next).
  return currentIndex === -1 ? [null, null] : [items[currentIndex + 1] ?? null, items[currentIndex - 1] ?? null];
}

function ArticleNav({ collection, slug }: Props) {
  const [[previous, next], setNeighbours] = useState<Neighbours>(() => {
    const items = peekCollectionIndex(collection);
    return items ? neighbours(items, slug) : [null, null];
  });

  useEffect(() => {
    let active = true;

    void getContentIndex(collection).then((items) => {
      if (active) setNeighbours(neighbours(items, slug));
    }).catch(() => {
      // Prev/next is a non-critical enhancement - degrade silently rather
      // than surfacing an error for a missing navigation widget.
    });

    return () => {
      active = false;
    };
  }, [collection, slug]);

  if (!previous && !next) {
    return null;
  }

  const base = routeForCollection(collection);

  return (
    <nav className="mt-10 grid gap-4 border-t border-slate-200 pt-8 sm:grid-cols-2" aria-label="Article navigation">
      {previous ? (
        <Link
          to={`${base}/${previous.slug}`}
          className="group rounded-xl border border-slate-200 bg-surface p-4 transition-colors hover:border-teal-500"
        >
          <div className="mb-1 text-nano font-bold uppercase tracking-widest text-slate-500">Previous</div>
          <div className="text-meta font-semibold text-slate-900 group-hover:text-teal-700">{previous.title}</div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          to={`${base}/${next.slug}`}
          className="group rounded-xl border border-slate-200 bg-surface p-4 text-right transition-colors hover:border-teal-500"
        >
          <div className="mb-1 text-nano font-bold uppercase tracking-widest text-slate-500">Next</div>
          <div className="text-meta font-semibold text-slate-900 group-hover:text-teal-700">{next.title}</div>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}

export default ArticleNav;
