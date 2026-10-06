// Single source of truth for the site's public identity.
//
// Before this file, `siteUrl` was hardcoded in four places — scripts/build-search-index.mjs,
// index.html (og:image and twitter:image), and public/robots.txt — which made moving the site
// a find-and-replace across unrelated files with no way to verify all copies were updated.
// Every Node-side build script now reads from here instead.
//
// `basePath` must stay in sync with `base` in vite.config.ts. Vite owns that value at bundle
// time (it is baked into asset URLs), so it can't be imported from here without making the
// TS config depend on a .mjs module; the prerender script asserts the two agree instead.

export const origin = 'https://khoahotran.github.io';

/** Must match `base` in vite.config.ts. Always has a leading and trailing slash. */
export const basePath = '/portfolio/';

export const siteTitle = 'Khoa Tran Engineering Portfolio';
export const siteDescription =
  'Case studies, system design notes, and interactive engineering experiments.';

/** Absolute site root with no trailing slash, e.g. https://khoahotran.github.io/portfolio */
export const siteUrl = `${origin}${basePath}`.replace(/\/$/, '');

/**
 * Absolute URL for a site-root-relative path.
 * `absoluteUrl('/blog/foo')` -> 'https://khoahotran.github.io/portfolio/blog/foo'
 */
export function absoluteUrl(routePath) {
  return `${siteUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`;
}
