import type { ContentCollection } from './types';

const markdownLoaders = import.meta.glob('../../content/{blog,research,experiments,system-design}/*.md', {
  import: 'default',
  query: '?raw',
}) as Record<string, () => Promise<string>>;

const rawLoaderMap = new Map<string, () => Promise<string>>();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseCollection(filePath: string): ContentCollection | null {
  const match = filePath.match(/\/content\/(blog|research|experiments|system-design)\//);
  if (!match) {
    return null;
  }

  return match[1] as ContentCollection;
}

function parseSlug(filePath: string): string {
  const fileName = filePath.split('/').pop() ?? 'untitled';
  return fileName.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

Object.keys(markdownLoaders).forEach((filePath) => {
  const collection = parseCollection(filePath);
  if (!collection) {
    return;
  }

  const slug = slugify(parseSlug(filePath));
  rawLoaderMap.set(`${collection}:${slug}`, markdownLoaders[filePath]);
});

function getRawKey(collection: ContentCollection, slug: string): string {
  return `${collection}:${slug}`;
}

export async function getRawContentBySlug(
  collection: ContentCollection,
  slug: string
): Promise<string | null> {
  const loader = rawLoaderMap.get(getRawKey(collection, slug));
  if (!loader) {
    return null;
  }

  return loader();
}

export async function prefetchRawContentBySlug(collection: ContentCollection, slug: string): Promise<void> {
  const loader = rawLoaderMap.get(getRawKey(collection, slug));
  if (!loader) {
    return;
  }

  await loader();
}
