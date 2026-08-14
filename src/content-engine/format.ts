import type { ContentCollection } from './types';

/**
 * Single source of truth for collection -> route mapping. Previously duplicated
 * (identically) in ContentDetailPage.tsx and ContentListPage.tsx, and reimplemented
 * slightly differently (a switch on 'system-design' only) in SearchPage.tsx.
 */
const routeByCollection: Record<ContentCollection, string> = {
  blog: '/blog',
  research: '/research',
  experiments: '/experiments',
  'system-design': '/system-design',
  'field-notes': '/field-notes',
  projects: '/projects',
};

export function routeForCollection(collection: ContentCollection): string {
  return routeByCollection[collection];
}

export function collectionLabel(collection: ContentCollection): string {
  return collection.replace('-', ' ');
}

export function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
