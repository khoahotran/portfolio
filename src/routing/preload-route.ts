import { matchPath } from 'react-router-dom';
import { getAllContentIndex, getContentDetail, getRelatedArticles, getSearchIndex } from '../content-engine/content-service';
import type { ContentCollection } from '../content-engine/types';
import { getLabById } from '../labs/registry';
import * as page from './route-components';

const COLLECTIONS: readonly string[] = ['blog', 'research', 'experiments', 'system-design', 'field-notes', 'projects'];

function isCollection(value: string | undefined): value is ContentCollection {
  return value !== undefined && COLLECTIONS.includes(value);
}

type Plan = () => Promise<unknown>;

/**
 * What the route at `pathname` (relative to the router basename) needs before it can render
 * complete: its code chunk, and the data its first render reads through the `peek*` accessors in
 * content-service. Mirrors the <Routes> in App.tsx - preload-route.test.ts holds the two together
 * for every route the site prerenders. Returns null for a path App.tsx would 404.
 */
export function preloadPlan(pathname: string): Plan | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const index = () => getAllContentIndex();

  switch (path) {
    case '/':
      return () => Promise.all([page.PortfolioHome.preload(), index()]);
    case '/about':
      return () => page.AboutPage.preload();
    case '/graph':
      return () => page.KnowledgeGraphPage.preload();
    case '/writing':
      return () => Promise.all([page.WritingIndexPage.preload(), index()]);
    case '/labs':
      return () => page.LabsIndexPage.preload();
    case '/search':
      return () => Promise.all([page.SearchPage.preload(), getSearchIndex()]);
    case '/tags':
      return () => Promise.all([page.TagsIndexPage.preload(), index()]);
  }

  const lab = matchPath('/labs/:id', path);
  if (lab) {
    const definition = getLabById(lab.params.id ?? '');
    return definition ? () => definition.component.preload() : null;
  }

  if (matchPath('/tags/:tag', path)) {
    return () => Promise.all([page.TagDetailPage.preload(), index()]);
  }

  const list = matchPath('/:collection', path);
  if (list && isCollection(list.params.collection)) {
    return () => Promise.all([page.ContentListPage.preload(), index()]);
  }

  const detail = matchPath('/:collection/:slug', path);
  const collection = detail?.params.collection;
  const slug = detail?.params.slug;
  if (!isCollection(collection) || !slug) return null;

  // An old /experiments/<lab> link redirects to /labs/<lab> (App.tsx) - preload where it lands.
  const redirectedLab = collection === 'experiments' ? getLabById(slug) : undefined;
  if (redirectedLab && !redirectedLab.collidesWithArticleSlug) {
    return () => redirectedLab.component.preload();
  }

  return () =>
    Promise.all([
      page.ContentDetailPage.preload(),
      getContentDetail(collection, slug).then((found) => found && getRelatedArticles(slug, found.tags, 3, found.related)),
    ]);
}

/**
 * Runs the current route's plan before the first render. Never rejects: a failed or slow preload
 * only means the page fetches its own data after mounting, exactly as it did before preloading
 * existed - so the wait is capped rather than allowed to hold the page static indefinitely.
 */
export async function preloadRoute(pathname: string, timeoutMs = 10000): Promise<void> {
  const plan = preloadPlan(pathname);
  if (!plan) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    plan().catch(() => undefined),
    new Promise((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    }),
  ]);
  clearTimeout(timer);
}
