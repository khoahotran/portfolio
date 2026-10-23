import { Search } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSearchIndex, peekSearchItems } from '../../content-engine/content-service';
import { collectionLabel, routeForCollection } from '../../content-engine/format';
import type { SearchIndexItem } from '../../content-engine/types';
import { labs } from '../../labs/registry';
import { createSiteSearch } from '../../search/site-search';

/**
 * Keyboard-first jump to anything on the site.
 *
 * This is what lets the header drop from eleven entries to four without burying anything: a reader
 * who knows what they want types two letters, and a reader who does not still has four labelled
 * destinations. It is deliberately an addition to the header, never a replacement for it - a
 * recruiter does not know that Cmd-K opens anything, which is why `/search` keeps its own route and
 * the trigger renders as a visible button rather than a bare shortcut hint.
 *
 * The index is fetched on first open, not on mount: this component renders on every page, and the
 * search index is searchable text that most visitors never ask for. Matching is the same scorer
 * /search uses (src/search/site-search.ts), so the two never disagree about what exists.
 */

interface Entry {
  id: string;
  title: string;
  kind: string;
  to: string;
  summary?: string;
  tags?: string[];
  body?: string;
}

const STATIC_ENTRIES: Entry[] = [
  { id: 'page:about', title: 'About', kind: 'Page', to: '/about' },
  { id: 'page:work', title: 'Work', kind: 'Page', to: '/projects' },
  { id: 'page:writing', title: 'Writing', kind: 'Page', to: '/writing' },
  { id: 'page:labs', title: 'Labs', kind: 'Page', to: '/labs' },
  { id: 'page:graph', title: 'Ecosystem graph', kind: 'Page', to: '/graph' },
  { id: 'page:tags', title: 'All tags', kind: 'Page', to: '/tags' },
  { id: 'page:search', title: 'Full-text search', kind: 'Page', to: '/search' },
];

const LAB_ENTRIES: Entry[] = labs.map((lab) => ({
  id: `lab:${lab.id}`,
  title: lab.title,
  kind: 'Lab',
  to: `/labs/${lab.id}`,
  summary: lab.description,
}));

const RESULT_LIMIT = 10;

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<SearchIndexItem[] | null>(() => peekSearchItems());
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    inputRef.current?.focus();
    if (articles === null) {
      getSearchIndex()
        .then(setArticles)
        .catch(() => setArticles([]));
    }
  }, [open, articles]);

  // Modal behaviour: the page behind does not scroll, and focus goes back where it came from.
  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const scrollbar = window.innerWidth - root.clientWidth;
    const previous = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
    root.style.overflow = 'hidden';
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
    return () => {
      root.style.overflow = previous.overflow;
      root.style.paddingRight = previous.paddingRight;
      returnTo?.focus?.();
    };
  }, [open]);

  const search = useMemo(
    () =>
      createSiteSearch<Entry>([
        ...STATIC_ENTRIES,
        ...LAB_ENTRIES,
        ...(articles ?? []).map((item) => ({
          id: `doc:${item.collection}/${item.slug}`,
          title: item.title,
          kind: collectionLabel(item.collection),
          to: `${routeForCollection(item.collection)}/${item.slug}`,
          summary: item.summary,
          tags: item.tags,
          body: item.searchableText,
        })),
      ]),
    [articles]
  );

  const trimmed = query.trim();
  const results = useMemo<Entry[]>(() => {
    if (!trimmed) return [...STATIC_ENTRIES, ...LAB_ENTRIES].slice(0, 8);
    const matches = search(trimmed, RESULT_LIMIT).map((hit) => hit.doc);
    // Always offer the way out to full-text results, so no query is a dead end.
    return [
      ...matches,
      { id: 'action:full-text', title: `Search full text for "${trimmed}"`, kind: 'Search', to: `/search?q=${encodeURIComponent(trimmed)}` },
    ];
  }, [search, trimmed]);

  // The highlighted row stays visible when ArrowDown walks past the bottom of the list.
  useLayoutEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor, results]);

  /**
   * Escape closes from anywhere in the dialog, not just from the input. Without this, moving focus
   * onto a result with ArrowDown and then pressing Escape did nothing, because the only handler
   * was the input's.
   */
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function go(entry: Entry) {
    onClose();
    navigate(entry.to);
  }

  const activeId = results[cursor] ? `palette-option-${cursor}` : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      {/* A real button, not a div with a click handler: the dismiss affordance has to be reachable
          by keyboard and announced, and a bare onClick on a presentational div is neither. */}
      <button
        type="button"
        aria-label="Close search"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-900/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search the site"
        className="relative w-full max-w-xl overflow-hidden rounded-card border border-slate-200 bg-surface shadow-lifted"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              // Combobox pattern: focus stays in the input and the arrows move the selection, so Tab
              // has nowhere inside the dialog to go - keep it from escaping to the page behind.
              if (e.key === 'Tab') e.preventDefault();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              }
              if (e.key === 'Enter' && results[cursor]) go(results[cursor]);
            }}
            placeholder="Jump to a page, lab or write-up..."
            aria-label="Search the site"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            className="w-full bg-transparent py-3.5 text-body text-slate-900 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        <ul ref={listRef} id="palette-results" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto py-2">
          {results.map((entry, index) => (
            <li
              key={entry.id}
              id={`palette-option-${index}`}
              data-index={index}
              role="option"
              aria-selected={index === cursor}
            >
              {/* tabIndex -1: the input owns focus and the arrows own selection (combobox pattern). */}
              <button
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setCursor(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(entry)}
                className={`flex w-full items-center justify-between gap-4 px-4 py-2 text-left ${
                  index === cursor ? 'bg-slate-100' : ''
                }`}
              >
                <span className="truncate text-meta text-slate-900">{entry.title}</span>
                <span className="shrink-0 text-nano font-bold uppercase tracking-widest text-slate-500">{entry.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default CommandPalette;
