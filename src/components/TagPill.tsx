import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * The small rounded label used for a tag or a tech-stack entry — extracted after
 * `.ai/audit-followups.md` item 8's own bar ("3+ occurrences, genuinely shared behavior") was
 * crossed by real duplication: this exact `className` (byte-for-byte, not just visually similar)
 * existed independently in `ContentListPage.tsx`, `ArticleHeader.tsx`, and `Projects.tsx` before
 * this component existed. Deliberately narrow — just a styled wrapper, no variant props — because
 * the *other* rounded-pill badges on the site (the `/tags` count badge, `TagDetailPage`'s collection
 * label, `SeriesNav`'s "Part N of M") each carry a genuinely different padding/weight/casing
 * treatment; forcing those into this component via a handful of boolean props would trade three
 * simple one-off spans for one component with a prop combinatorics problem; per that same item 8,
 * that's the "increases complexity" case it says not to force. Extract further only if a fourth
 * exact duplicate of *this* shape appears.
 */
function TagPill({ children }: Props) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{children}</span>;
}

export default TagPill;
