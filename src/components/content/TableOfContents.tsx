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
    <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Table of contents</h2>
      <ul className="space-y-2 text-sm">
        {toc.map((item) => (
          <li key={item.id} className={item.depth === 3 ? 'pl-3' : ''}>
            <a
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                window.history.replaceState(null, '', `#${item.id}`);
                scrollToHash(item.id);
              }}
              className={`transition-colors ${
                activeId === item.id ? 'font-semibold text-teal-600' : 'text-slate-600 hover:text-teal-600'
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TableOfContents;
