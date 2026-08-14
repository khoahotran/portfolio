import type { ContentCollection, ContentIndexItem, SearchIndexItem } from './types';

let contentIndexPromise: Promise<ContentIndexItem[]> | null = null;
let searchIndexPromise: Promise<SearchIndexItem[]> | null = null;

function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

async function fetchJson<T>(fileName: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${fileName}: ${response.status}`);
  }

  return (await response.json()) as T;
}

/**
 * The lean index (~17 KB, generated alongside search-index.json by
 * build-search-index.mjs) used by every list page, detail page, and
 * related-articles lookup. It has every field except `searchableText` —
 * the full article body used only for full-text search — so navigating the
 * site never pulls down 34 articles' worth of text just to render cards.
 */
export async function loadContentIndex(): Promise<ContentIndexItem[]> {
  if (!contentIndexPromise) {
    contentIndexPromise = fetchJson<ContentIndexItem[]>('content-index.json').then(sortByDateDesc).catch((error) => {
      // Don't memoize a rejection — a transient network failure would otherwise
      // permanently break every consumer for the rest of the session.
      contentIndexPromise = null;
      throw error;
    });
  }

  return contentIndexPromise;
}

export async function loadCollectionIndex(collection: ContentCollection): Promise<ContentIndexItem[]> {
  const all = await loadContentIndex();
  return all.filter((item) => item.collection === collection);
}

/**
 * The full index (~244 KB), including `searchableText`. Fetched only by
 * /search, which is the only consumer that needs full-text matching.
 */
export async function loadSearchIndex(): Promise<SearchIndexItem[]> {
  if (!searchIndexPromise) {
    searchIndexPromise = fetchJson<SearchIndexItem[]>('search-index.json').then(sortByDateDesc).catch((error) => {
      searchIndexPromise = null;
      throw error;
    });
  }

  return searchIndexPromise;
}
