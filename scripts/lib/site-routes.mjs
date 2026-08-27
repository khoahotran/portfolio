// Shared route enumeration for every Node-side build script.
//
// The nine lab ids used to be hand-mirrored in three files (src/labs/registry.ts,
// scripts/build-search-index.mjs, scripts/check-responsive.mjs) with a comment in each
// admitting the duplication. scripts/prerender.mjs would have been the fourth copy — and
// unlike the others, a missing id there means an article silently ships without prerendered
// metadata. So the list moved to src/labs/lab-ids.json, which every consumer reads.
//
// registry.ts still owns the lab *definitions* (title, description, lazy component) because
// those can't live in JSON. Parity between it and lab-ids.json is enforced by a unit test
// (src/labs/registry.test.ts) rather than a runtime check, so nothing extra ships to the browser.

import { readFileSync } from 'node:fs';

/** The nine interactive lab ids, in registry order. */
export const labIds = JSON.parse(readFileSync(new URL('../../src/labs/lab-ids.json', import.meta.url), 'utf8'));

/** The six markdown content collections. Each has a list route and `/:slug` detail routes. */
export const collections = ['blog', 'research', 'experiments', 'system-design', 'field-notes', 'projects'];

/**
 * Routes that exist regardless of content: pages, collection list pages, and lab pages.
 *
 * `/search` is deliberately excluded from the sitemap/prerender default — it renders nothing
 * until a query is typed, so there is no content to index. Callers that want it (the responsive
 * check does) add it explicitly.
 */
export const staticRoutes = [
  '/',
  '/about',
  '/graph',
  ...collections.map((collection) => `/${collection}`),
  '/labs',
  ...labIds.map((id) => `/labs/${id}`),
  '/tags',
];

/**
 * Article routes read from the generated lean index. Drafts are excluded, matching
 * `shouldInclude()` in src/content-engine/content-service.ts for a production build.
 *
 * Returns [] with a warning rather than throwing when the index is missing, so a stale
 * checkout doesn't hard-fail a script that can still do useful work without it. Callers that
 * cannot tolerate an empty list (prerender) must check for themselves.
 */
export function readArticleRoutes(label = 'site-routes') {
  try {
    const docs = JSON.parse(
      readFileSync(new URL('../../public/content-index.json', import.meta.url), 'utf8')
    );
    return docs.filter((doc) => !doc.draft).map((doc) => `/${doc.collection}/${doc.slug}`);
  } catch (error) {
    console.warn(
      `[${label}] Could not read public/content-index.json (${error.message}). ` +
        'Run `npm run build:search-index` first — article routes will be skipped for this run.'
    );
    return [];
  }
}

/**
 * `/tags/:tag` for every distinct tag actually in use across non-draft articles. Same
 * read-from-disk-with-a-graceful-fallback shape as readArticleRoutes, for the same reason: this is
 * consumed by scripts that run after build-search-index.mjs has already written
 * public/content-index.json (prerender.mjs, check-responsive.mjs), not by that script itself, which
 * already has every doc's tags in memory and computes its own sitemap entries directly.
 */
export function readTagRoutes(label = 'site-routes') {
  try {
    const docs = JSON.parse(
      readFileSync(new URL('../../public/content-index.json', import.meta.url), 'utf8')
    );
    const tags = new Set(docs.filter((doc) => !doc.draft).flatMap((doc) => doc.tags));
    return [...tags].sort().map((tag) => `/tags/${tag}`);
  } catch (error) {
    console.warn(
      `[${label}] Could not read public/content-index.json (${error.message}). ` +
        'Run `npm run build:search-index` first — tag routes will be skipped for this run.'
    );
    return [];
  }
}
