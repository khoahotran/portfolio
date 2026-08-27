import type { ContentCollection } from './types';

const markdownLoaders = import.meta.glob('../../content/{blog,research,experiments,system-design,field-notes,projects}/*.md', {
  import: 'default',
  query: '?raw',
}) as Record<string, () => Promise<string>>;

const rawLoaderMap = new Map<string, () => Promise<string>>();

/**
 * MUST stay byte-identical to `slugify()` in scripts/lib/content.mjs, which produces the canonical
 * slugs stored in the generated content index. If the two ever diverge, an article keeps its entry
 * in the index and the sitemap but stops resolving at its own URL — the same failure mode
 * .ai/decision-log.md Decision 5 had to fix once already.
 *
 * Exported solely so that invariant can be asserted: see src/content-engine/slugify.test.ts.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseCollection(filePath: string): ContentCollection | null {
  const match = filePath.match(/\/content\/(blog|research|experiments|system-design|field-notes|projects)\//);
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

// build-search-index.mjs honours an explicit `slug:` frontmatter field, so the
// canonical slug in the generated index can differ from the filename-derived one
// this module keys its loader map by. That only matters for the rare file that
// sets `slug:` — extracting it means reading the file's raw text, so this stays
// a fallback triggered only when the cheap filename-based lookup above misses,
// rather than parsing frontmatter for every file up front on module load.
function extractFrontmatterSlug(raw: string): string | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return null;
  }

  const slugLine = match[1].split('\n').find((line) => /^slug\s*:/.test(line.trim()));
  if (!slugLine) {
    return null;
  }

  const value = slugLine
    .slice(slugLine.indexOf(':') + 1)
    .trim()
    .replace(/^['"]|['"]$/g, '');

  return value ? slugify(value) : null;
}

async function findLoaderByFrontmatterSlug(
  collection: ContentCollection,
  slug: string
): Promise<(() => Promise<string>) | null> {
  const prefix = `${collection}:`;

  for (const [key, loader] of rawLoaderMap) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    const raw = await loader();
    if (extractFrontmatterSlug(raw) === slug) {
      return () => Promise.resolve(raw);
    }
  }

  return null;
}

async function resolveLoader(
  collection: ContentCollection,
  slug: string
): Promise<(() => Promise<string>) | null> {
  const direct = rawLoaderMap.get(getRawKey(collection, slug));
  if (direct) {
    return direct;
  }

  return findLoaderByFrontmatterSlug(collection, slug);
}

export async function getRawContentBySlug(
  collection: ContentCollection,
  slug: string
): Promise<string | null> {
  const loader = await resolveLoader(collection, slug);
  if (!loader) {
    return null;
  }

  return loader();
}

export async function prefetchRawContentBySlug(collection: ContentCollection, slug: string): Promise<void> {
  const loader = await resolveLoader(collection, slug);
  if (!loader) {
    return;
  }

  await loader();
}
