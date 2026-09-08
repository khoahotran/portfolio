import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import ErrorNotice from '../components/content/ErrorNotice';
import { getAllContentIndex } from '../content-engine/content-service';
import type { ContentIndexItem } from '../content-engine/types';
import { useSeo } from '../seo/useSeo';

/**
 * `/tags` — every canonical tag actually in use, with a per-tag article count, linking to
 * `/tags/:tag`. Exists because tags previously only filtered *within* one collection
 * (`ContentListPage`'s `selectedTag` state) — there was no way to see everything tagged `go` across
 * `blog` + `research` + `system-design` at once. See `.ai/phases/phase-5.md` §5.5 and
 * `.ai/tag-taxonomy.md` for why the vocabulary itself needed cleaning up before this page was worth
 * building — a browse page over 92 tags, 56 used once, would have been noise dressed as navigation.
 *
 * Only tags that actually appear in the corpus are shown, not the full canonical vocabulary —
 * build-time enforcement (`scripts/build-search-index.mjs`) already guarantees every tag in content
 * is canonical, so deriving the list purely from `content-index.json` is sufficient and avoids
 * linking to an empty page for a tag nothing currently uses.
 */
function TagsIndexPage() {
  useSeo({
    title: 'Tags',
    description: 'Browse every write-up by topic, across all collections.',
  });

  const [items, setItems] = useState<ContentIndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    getAllContentIndex()
      .then((result) => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retryToken]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    // Most-covered topics first — a browse page should lead with what there's actually the most
    // to read about, not an alphabetical accident of tag spelling.
    return [...counts.entries()].sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])));
  }, [items]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <Link to="/" className="btn-back mb-4">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to Portfolio
      </Link>
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Tags</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Every write-up, browsable by topic across every collection &mdash; not scoped to one section
          the way each collection page&rsquo;s own tag filter is.
        </p>
      </section>

      {loading && !error && <LoadingState label="Loading tags…" className="py-8" />}
      {error && (
        <ErrorNotice
          message="Couldn't load the tag list. Check your connection and try again."
          onRetry={() => setRetryToken((token) => token + 1)}
        />
      )}
      {!loading && !error && (
        <section className="flex flex-wrap gap-3">
          {tagCounts.map(([tag, count]) => (
            <Link
              key={tag}
              to={`/tags/${tag}`}
              className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-surface px-4 py-2 text-sm transition hover:-translate-y-0.5 hover:border-teal-400"
            >
              <span className="font-semibold text-slate-800 group-hover:text-teal-700">#{tag}</span>
              {/* text-slate-600, not -500: the same bg-slate-100 pairing measured 4.34:1 (needs 4.5)
                  elsewhere on the site and was fixed then — see .ai/decision-log.md Decision 9. */}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{count}</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

export default TagsIndexPage;
