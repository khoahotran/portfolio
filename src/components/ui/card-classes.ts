/**
 * Split out of Card.tsx so that file only exports components — a module that exports both a
 * component and a helper breaks React Fast Refresh for the whole file.
 *
 * Exists because some card surfaces are <a>, <Link> or <article> rather than <div>, and wrapping
 * those in a Card just to get the class string would add a node for nothing.
 */

type Padding = 'none' | 'sm' | 'md';

const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
};

export function cardClasses({
  padding = 'md',
  interactive = false,
  className,
}: { padding?: Padding; interactive?: boolean; className?: string } = {}) {
  return [
    'rounded-card border border-slate-200 bg-surface shadow-raised',
    PADDING[padding],
    interactive && 'transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-lifted',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export type { Padding };
