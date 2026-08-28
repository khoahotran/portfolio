import { describe, expect, it } from 'vitest';
import { collectionLabel, routeForCollection } from './format';
import type { ContentCollection } from './types';

/**
 * `routeForCollection` used to be duplicated (and once inconsistent — a `system-design`-only
 * special case in SearchPage.tsx) across three call sites before being consolidated here (see the
 * file's own header comment). Nothing asserted the consolidated mapping is actually complete and
 * correct until now — this exists so a typo'd or missing collection in `routeByCollection` fails a
 * test instead of silently 404ing a whole collection's list page.
 */
describe('routeForCollection', () => {
  const cases: Array<[ContentCollection, string]> = [
    ['blog', '/blog'],
    ['research', '/research'],
    ['experiments', '/experiments'],
    ['system-design', '/system-design'],
    ['field-notes', '/field-notes'],
    ['projects', '/projects'],
  ];

  it.each(cases)('maps %s to %s', (collection, expected) => {
    expect(routeForCollection(collection)).toBe(expected);
  });
});

describe('collectionLabel', () => {
  it('replaces the hyphen in multi-word collections with a space', () => {
    expect(collectionLabel('system-design')).toBe('system design');
    expect(collectionLabel('field-notes')).toBe('field notes');
  });

  it('leaves single-word collections unchanged', () => {
    expect(collectionLabel('blog')).toBe('blog');
    expect(collectionLabel('research')).toBe('research');
    expect(collectionLabel('experiments')).toBe('experiments');
    expect(collectionLabel('projects')).toBe('projects');
  });
});
