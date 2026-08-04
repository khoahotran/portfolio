import type { ContentCollection, SearchIndexItem } from './types';

let indexPromise: Promise<SearchIndexItem[]> | null = null;

function getIndexUrl(): string {
  return `${import.meta.env.BASE_URL}search-index.json`;
}

export async function loadContentIndex(): Promise<SearchIndexItem[]> {
  if (!indexPromise) {
    indexPromise = fetch(getIndexUrl())
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load search index: ${response.status}`);
        }

        return (await response.json()) as SearchIndexItem[];
      })
      .then((items) => items.sort((a, b) => b.date.localeCompare(a.date)));
  }

  return indexPromise;
}

export async function loadCollectionIndex(collection: ContentCollection): Promise<SearchIndexItem[]> {
  const all = await loadContentIndex();
  return all.filter((item) => item.collection === collection);
}
