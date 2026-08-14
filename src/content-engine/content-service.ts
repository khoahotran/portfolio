import { loadCollectionIndex, loadContentIndex, loadSearchIndex } from './content-index';
import { getRawContentBySlug, prefetchRawContentBySlug } from './content-source';
import type { ContentCollection, ContentDetail, ContentIndexItem, SearchIndexItem } from './types';

const detailCache = new Map<string, ContentDetail>();

function cacheKey(collection: ContentCollection, slug: string): string {
  return `${collection}:${slug}`;
}

function shouldInclude(item: { draft?: boolean }): boolean {
  if (import.meta.env.DEV) {
    return true;
  }

  return !item.draft;
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith('---')) {
    return raw;
  }

  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return raw;
  }

  return match[2];
}

async function getIndexItem(collection: ContentCollection, slug: string): Promise<ContentIndexItem | null> {
  const items = await loadCollectionIndex(collection);
  return items.find((item) => item.slug === slug) ?? null;
}

export async function getContentIndex(collection: ContentCollection): Promise<ContentIndexItem[]> {
  const items = await loadCollectionIndex(collection);
  return items.filter(shouldInclude);
}

export async function getSearchIndex(): Promise<SearchIndexItem[]> {
  const items = await loadSearchIndex();
  return items.filter(shouldInclude);
}

export async function getLatestContent(limit = 6): Promise<ContentIndexItem[]> {
  const items = await loadContentIndex();
  return items.filter(shouldInclude).slice(0, limit);
}

/**
 * Counts for the homepage's "what exists here" strip (see PortfolioHome) —
 * derived from the real index rather than hardcoded, so they can't drift out
 * of date as content is added or removed. `projects` is the flagship-case-study
 * count specifically (each has its own content/projects/*.md deep dive).
 */
export async function getContentCounts(): Promise<{ total: number; projects: number }> {
  const items = (await loadContentIndex()).filter(shouldInclude);
  return {
    total: items.length,
    projects: items.filter((item) => item.collection === 'projects').length,
  };
}

export async function getRelatedArticles(
  currentSlug: string,
  tags: string[],
  limit = 3,
  curatedRelated: string[] = []
): Promise<ContentIndexItem[]> {
  const items = await loadContentIndex();
  const eligibleItems = items.filter((item) => shouldInclude(item) && item.slug !== currentSlug);

  // Curated links (the `related:` frontmatter field) take priority over the
  // tag-scored algorithm below — they exist specifically for the relationships
  // that mattered enough for the author to name explicitly, e.g. the flagship
  // project pages that were previously totally unlinked despite every article
  // about them referencing each other in prose.
  const bySlugPath = new Map(items.map((item) => [`${item.collection}/${item.slug}`, item]));
  const curated = curatedRelated
    .map((ref) => bySlugPath.get(ref))
    .filter((item): item is ContentIndexItem => item !== undefined && shouldInclude(item));

  const curatedSlugs = new Set(curated.map((item) => item.slug));
  const tagSet = new Set(tags);

  const scored: Array<{ item: ContentIndexItem; score: number }> = [];
  for (const item of eligibleItems) {
    if (curatedSlugs.has(item.slug)) {
      continue;
    }

    let score = 0;
    for (const tag of item.tags) {
      if (tagSet.has(tag)) {
        score += 1;
      }
    }
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  // Highest tag-overlap first, then most recent.
  scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : b.item.date.localeCompare(a.item.date)));

  // `limit` is a floor for how many cards to show when curated links are thin,
  // not a ceiling on curated evidence. Curated links are explicit, author-vetted
  // relationships (see the comment above) — silently dropping one just because
  // an article happens to have more than `limit` of them would hide evidence the
  // author specifically chose to surface. Only the tag-scored/fallback padding
  // below is capped, so a thin article still gets a bounded number of suggestions.
  const related = [...curated];

  if (related.length < limit) {
    related.push(...scored.slice(0, limit - related.length).map((entry) => entry.item));
  }

  if (related.length < limit) {
    const relatedSlugs = new Set(related.map((item) => item.slug));
    relatedSlugs.add(currentSlug);

    const fill = eligibleItems.filter((item) => !relatedSlugs.has(item.slug)).slice(0, limit - related.length);

    related.push(...fill);
  }

  return related;
}

export async function getContentTags(collection: ContentCollection): Promise<string[]> {
  const index = await getContentIndex(collection);
  const tags = new Set<string>();

  index.forEach((item) => {
    item.tags.forEach((tag) => tags.add(tag));
  });

  return [...tags].sort((a, b) => a.localeCompare(b));
}

export async function getContentDetail(
  collection: ContentCollection,
  slug: string
): Promise<ContentDetail | null> {
  const key = cacheKey(collection, slug);
  const cached = detailCache.get(key);
  if (cached) {
    return cached;
  }

  const indexItem = await getIndexItem(collection, slug);
  if (!indexItem || !shouldInclude(indexItem)) {
    return null;
  }

  const raw = await getRawContentBySlug(collection, slug);
  if (!raw) {
    return null;
  }

  const body = stripFrontmatter(raw);
  const markdownModule = await import('./markdown');
  const html = await markdownModule.compileMarkdownToHtml(body);
  const toc = markdownModule.extractToc(body);

  const detail: ContentDetail = {
    ...indexItem,
    html,
    toc,
    body,
  };

  detailCache.set(key, detail);
  return detail;
}

export async function prefetchNextArticle(collection: ContentCollection, slug: string): Promise<void> {
  const index = await getContentIndex(collection);
  const currentIndex = index.findIndex((item) => item.slug === slug);

  if (currentIndex < 0 || currentIndex + 1 >= index.length) {
    return;
  }

  const next = index[currentIndex + 1];
  await prefetchRawContentBySlug(collection, next.slug);
}
