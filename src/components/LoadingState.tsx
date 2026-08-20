import { Loader2 } from 'lucide-react';

interface Props {
  /** What's loading, e.g. "articles", "search index". Rendered after a generic lead-in. */
  label?: string;
  /** Extra classes for the outer wrapper — use this to match a specific page's
   * container width/padding instead of duplicating the flex/icon/text markup. */
  className?: string;
}

/**
 * Shared loading indicator — a spinning icon instead of static "Loading…" text,
 * so a slow connection reads as "working" rather than a possibly-stuck page.
 * `role="status"` + `aria-live="polite"` announce the label to screen readers
 * without the icon itself (decorative, `aria-hidden`) being read out.
 */
function LoadingState({ label = 'Loading…', className = '' }: Props) {
  return (
    <div
      className={`flex items-center justify-center gap-2 py-16 text-sm text-slate-500 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default LoadingState;
