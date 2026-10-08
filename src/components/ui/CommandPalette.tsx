import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSearchIndex } from '../../content-engine/content-service';
import { collectionLabel, routeForCollection } from '../../content-engine/format';
import type { SearchIndexItem } from '../../content-engine/types';
import { labs } from '../../labs/registry';

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
 * search index is 62 entries of searchable text that most visitors never ask for.
 */

interface Entry {
  id: string;
  label: string;
  kind: string;
  to: string;
}

const STATIC_ENTRIES: Entry[] = [
  { id: 'page:about', label: 'About', kind: 'Page', to: '/about' },
  { id: 'page:work', label: 'Work', kind: 'Page', to: '/projects' },
  { id: 'page:writing', label: 'Writing', kind: 'Page', to: '/writing' },
  { id: 'page:labs', label: 'Labs', kind: 'Page', to: '/labs' },
  { id: 'page:graph', label: 'Ecosystem graph', kind: 'Page', to: '/graph' },
  { id: 'page:tags', label: 'All tags', kind: 'Page', to: '/tags' },
  { id: 'page:search', label: 'Full-text search', kind: 'Page', to: '/search' },
];

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<SearchIndexItem[] | null>(null);
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

  const entries = useMemo<Entry[]>(
    () => [
      ...STATIC_ENTRIES,
      ...labs.map((lab) => ({ id: `lab:${lab.id}`, label: lab.title, kind: 'Lab', to: `/labs/${lab.id}` })),
      ...(articles ?? []).map((item) => ({
        id: `doc:${item.collection}/${item.slug}`,
        label: item.title,
        kind: collectionLabel(item.collection),
        to: `${routeForCollection(item.collection)}/${item.slug}`,
      })),
    ],
    [articles]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries.slice(0, 8);
    return entries.filter((e) => e.label.toLowerCase().includes(q) || e.kind.toLowerCase().includes(q)).slice(0, 10);
  }, [entries, query]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      {/* A real button, not a div with a click handler: the dismiss affordance has to be reachable
          by keyboard and announced, and a bare onClick on a presentational div is neither. */}
      <button
        type="button"
        aria-label="Close search"
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
            className="w-full bg-transparent py-3.5 text-body text-slate-900 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-meta text-slate-500">Nothing matches that.</li>
          )}
          {results.map((entry, index) => (
            <li key={entry.id}>
              <button
                type="button"
                onMouseEnter={() => setCursor(index)}
                onClick={() => go(entry)}
                className={`flex w-full items-center justify-between gap-4 px-4 py-2 text-left ${
                  index === cursor ? 'bg-slate-100' : ''
                }`}
              >
                <span className="truncate text-meta text-slate-900">{entry.label}</span>
                <span className="shrink-0 text-nano font-bold uppercase tracking-widest text-slate-500">
                  {entry.kind}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default CommandPalette;
