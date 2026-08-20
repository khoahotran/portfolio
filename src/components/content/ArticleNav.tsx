import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getContentIndex } from '../../content-engine/content-service';
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
function ArticleNav({ collection, slug }: Props) {
  const [previous, setPrevious] = useState<ContentIndexItem | null>(null);
  const [next, setNext] = useState<ContentIndexItem | null>(null);

  useEffect(() => {
    let active = true;

    void getContentIndex(collection).then((items) => {
      if (!active) {
        return;
      }

      const currentIndex = items.findIndex((item) => item.slug === slug);
      if (currentIndex === -1) {
        setPrevious(null);
        setNext(null);
        return;
      }

      // items are sorted newest-first: the following entry is older (Previous),
      // the preceding entry is newer (Next).
      setPrevious(items[currentIndex + 1] ?? null);
      setNext(items[currentIndex - 1] ?? null);
    }).catch(() => {
      // Prev/next is a non-critical enhancement — degrade silently rather
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
          className="group rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-teal-500"
        >
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Previous</div>
          <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-600">{previous.title}</div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          to={`${base}/${next.slug}`}
          className="group rounded-xl border border-slate-200 bg-white p-4 text-right transition-colors hover:border-teal-500"
        >
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Next</div>
          <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-600">{next.title}</div>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}

export default ArticleNav;
