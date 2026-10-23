import { describe, expect, it } from 'vitest';
import { collections, staticRoutes } from '../../scripts/lib/site-routes.mjs';
import { preloadPlan } from './preload-route';

/**
 * main.tsx renders the first commit only after the current route's preload plan has run. A route
 * App.tsx serves but this table misses would not break - it would fall back to loading after
 * mount - but it would quietly bring back the "Loading…" flash on first visit, which no gate
 * would notice. So every route the site prerenders must resolve to a plan.
 */
describe('preloadPlan', () => {
  it('has a plan for every static route the site prerenders, and /search', () => {
    for (const route of [...staticRoutes, '/search']) {
      expect(preloadPlan(route), route).not.toBeNull();
    }
  });

  it('has a plan for article routes in every collection and for tag routes', () => {
    for (const collection of collections) {
      expect(preloadPlan(`/${collection}/some-article`), collection).not.toBeNull();
    }
    expect(preloadPlan('/tags/go')).not.toBeNull();
  });

  it('tolerates a trailing slash', () => {
    expect(preloadPlan('/labs/raft/')).not.toBeNull();
    expect(preloadPlan('/writing/')).not.toBeNull();
  });

  it('returns null for paths the app answers with its 404 page', () => {
    for (const route of ['/nope', '/labs/not-a-lab', '/unknown/slug', '/blog/a/b']) {
      expect(preloadPlan(route), route).toBeNull();
    }
  });
});
