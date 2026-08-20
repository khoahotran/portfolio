import { useEffect, useState } from 'react';
import type { TocItem } from '../../content-engine/types';
import { scrollToHash } from './scrollToHash';

interface Props {
  toc: TocItem[];
}

/**
 * Renders the TOC and tracks which heading is currently in view (scrollspy)
 * via IntersectionObserver. Assumes the headings referenced by `toc` are
 * already in the DOM — it mounts alongside MarkdownContent in the same React
 * commit, so by the time this effect runs, the article HTML (with
 * rehype-slug ids) has already been painted.
 */
function TableOfContents({ toc }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (toc.length === 0) {
      return;
    }

    const headings = toc
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);

    if (headings.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      // Treat a heading as "current" once it crosses just below the sticky
      // header, and stop counting it once it's past the top 30% of the viewport.
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) {
    return null;
  }

  return (
    <div className="toc sticky top-24 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">On this page</h2>
      {/* The vertical rail is one continuous line (not per-item borders) so the
          active item's teal segment reads as a moving position marker rather
          than N disconnected ticks — depth-3 items sit further right, giving
          the two heading levels a visible rank instead of just a font-weight
          difference. */}
      <ul className="toc-rail space-y-0.5 text-[0.85rem] leading-snug">
        {toc.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li key={item.id} className={item.depth === 3 ? 'toc-sub' : undefined}>
              <a
                href={`#${item.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  window.history.replaceState(null, '', `#${item.id}`);
                  scrollToHash(item.id);
                }}
                aria-current={isActive ? 'location' : undefined}
                className={isActive ? 'toc-link toc-link--active' : 'toc-link'}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default TableOfContents;
