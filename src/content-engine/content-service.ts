import { loadCollectionIndex, loadContentIndex } from './content-index';
import { getRawContentBySlug, prefetchRawContentBySlug } from './content-source';
import type { ContentCollection, ContentDetail, ContentIndexItem, SearchIndexItem } from './types';

const detailCache = new Map<string, ContentDetail>();

function cacheKey(collection: ContentCollection, slug: string): string {
  return `${collection}:${slug}`;
}

function shouldInclude(item: ContentIndexItem): boolean {
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

function toIndex(item: SearchIndexItem): ContentIndexItem {
  return {
    title: item.title,
    date: item.date,
    tags: item.tags,
    summary: item.summary,
    reading_time: item.reading_time,
    draft: item.draft,
    ogImage: item.ogImage,
    slug: item.slug,
    collection: item.collection,
    readingMinutes: item.readingMinutes,
    readingText: item.readingText,
  };
}

async function getIndexItem(collection: ContentCollection, slug: string): Promise<SearchIndexItem | null> {
  const items = await loadCollectionIndex(collection);
  return items.find((item) => item.slug === slug) ?? null;
}

export async function getContentIndex(collection: ContentCollection): Promise<ContentIndexItem[]> {
  const items = await loadCollectionIndex(collection);
  return items.filter(shouldInclude).map(toIndex);
}

export async function getSearchIndex(): Promise<SearchIndexItem[]> {
  const items = await loadContentIndex();
  return items.filter(shouldInclude);
}

export async function getLatestContent(limit = 6): Promise<ContentIndexItem[]> {
  const items = await loadContentIndex();
  return items.filter(shouldInclude).slice(0, limit).map(toIndex);
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
    ...toIndex(indexItem),
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
