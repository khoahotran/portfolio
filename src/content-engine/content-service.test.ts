import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ContentIndexItem } from './types';

/**
 * `getRelatedArticles`'s curated-then-scored ordering was flagged as worth testing back in the
 * Phase 4 plan's "cross-cutting track" (alongside `slugify` parity, which did get a test) but never
 * actually landed one — found while auditing test coverage in Phase 6. It is the most
 * behaviorally complex pure-ish function in the content engine: curated links always win, are never
 * truncated by `limit` even when there are more of them than `limit`, tag-scored suggestions fill
 * remaining slots ordered by overlap then recency, and a final fallback pads out anything still
 * short — four distinct rules in one function, none covered before this file.
 *
 * `loadContentIndex()` fetches `content-index.json` and memoizes the promise at module scope, so
 * this mocks `fetch` once for the whole suite rather than per test — every test below runs its own
 * query (different tags/curated/limit) against this one fixture, which is simpler and just as valid
 * as resetting modules per test since no test needs a *different* underlying index.
 */
const FIXTURE: ContentIndexItem[] = [
  { slug: 'a', collection: 'blog', title: 'A', date: '2026-01-05', tags: ['go', 'redis'], summary: 'a' },
  { slug: 'b', collection: 'research', title: 'B', date: '2026-01-04', tags: ['go'], summary: 'b' },
  { slug: 'c', collection: 'experiments', title: 'C', date: '2026-01-03', tags: ['redis', 'queues'], summary: 'c' },
  { slug: 'd', collection: 'blog', title: 'D', date: '2026-01-02', tags: ['queues'], summary: 'd' },
  { slug: 'e', collection: 'system-design', title: 'E', date: '2026-01-01', tags: [], summary: 'e' },
].map((item) => ({ ...item, readingMinutes: 1, readingText: '1 min read' })) as ContentIndexItem[];

let getRelatedArticles: typeof import('./content-service').getRelatedArticles;

beforeAll(async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(FIXTURE), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  );
  ({ getRelatedArticles } = await import('./content-service'));
});

describe('getRelatedArticles', () => {
  it('excludes the current article from every result', async () => {
    const related = await getRelatedArticles('a', ['go', 'redis'], 10);
    expect(related.some((item) => item.slug === 'a')).toBe(false);
  });

  it('orders tag-scored matches by overlap count, then most recent for ties', async () => {
    // 'x' isn't in the fixture, so nothing is "current" here — purely testing scored ordering.
    // tags ['go', 'redis'] overlap: a=2, b=1, c=1, d=0, e=0. b and c tie at 1; b (2026-01-04) is
    // newer than c (2026-01-03), so b must come first.
    const related = await getRelatedArticles('x', ['go', 'redis'], 3);
    expect(related.map((item) => item.slug)).toEqual(['a', 'b', 'c']);
  });

  it('places curated `related` links first, even with zero tag overlap', async () => {
    const related = await getRelatedArticles('x', [], 2, ['blog/d']);
    expect(related[0].slug).toBe('d');
  });

  it('does not truncate curated links when there are more of them than `limit`', async () => {
    // limit=1 but 3 curated links — curated is a floor for padding, not a ceiling on evidence.
    const related = await getRelatedArticles('x', [], 1, ['blog/a', 'research/b', 'experiments/c']);
    expect(related.map((item) => item.slug).sort()).toEqual(['a', 'b', 'c']);
  });

  it('pads with any remaining eligible article when curated + scored are thin', async () => {
    // No tag overlap and no curated links: every fixture entry (minus current) is eligible
    // fallback padding, so the result should still reach `limit`.
    const related = await getRelatedArticles('x', [], 3, []);
    expect(related).toHaveLength(3);
  });

  it('never pads with a curated link that is also excluded as the current article', async () => {
    const related = await getRelatedArticles('a', [], 5, ['blog/a']);
    expect(related.some((item) => item.slug === 'a')).toBe(false);
  });
});
