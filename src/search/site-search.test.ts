import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { labs } from '../labs/registry';
import { createSiteSearch, withinOneEdit } from './site-search';

/**
 * Run against the real corpus (public/search-index.json, written by build:search-index) plus the
 * lab registry, so each expectation is a query a reader actually types and the result they meant.
 */
const corpus = JSON.parse(readFileSync(new URL('../../public/search-index.json', import.meta.url), 'utf8')) as Array<{
  slug: string;
  collection: string;
  title: string;
  summary: string;
  tags: string[];
  searchableText?: string;
}>;
const docs = [
  ...labs.map((lab) => ({ id: `lab:${lab.id}`, title: lab.title, summary: lab.description })),
  ...corpus.map((item) => ({
    id: `${item.collection}/${item.slug}`,
    title: item.title,
    summary: item.summary,
    tags: item.tags,
    body: item.searchableText,
  })),
];
const search = createSiteSearch(docs);
const ids = (query: string, limit = 10) => search(query, limit).map((hit) => hit.doc.id);

describe('site search', () => {
  it('finds technologies that only appear in the body or tags', () => {
    expect(ids('kafka').length).toBeGreaterThan(3);
  });

  it('matches words in any order', () => {
    expect(ids('consensus raft')).toContain('lab:raft');
  });

  it('tolerates one typo in a longer word', () => {
    expect(ids('raftt')).toContain('lab:raft');
  });

  it('does not match short words inside longer ones', () => {
    for (const { doc } of search('go', 200)) {
      const text = [doc.title, doc.summary, (doc as { tags?: string[] }).tags?.join(' '), (doc as { body?: string }).body].join(' ');
      expect(/\bgo\b/i.test(text), doc.id).toBe(true);
    }
  });

  it('does not return documents that never mention the word', () => {
    expect(ids('raft', 50).some((id) => id.includes('designing-a-permission-system'))).toBe(false);
  });

  it('ranks an exact title match first', () => {
    const aegis = corpus.find((item) => item.collection === 'projects' && /aegis/i.test(item.title));
    expect(aegis).toBeDefined();
    expect(ids(aegis!.title)[0]).toBe(`projects/${aegis!.slug}`);
  });

  it('keeps the queries that already worked', () => {
    expect(ids('rate limit')).toContain('lab:rate-limiting-algorithms');
    expect(ids('idempotency')).toContain('lab:idempotency-store');
    expect(ids('ratelimit').length).toBeGreaterThan(0);
  });

  it('returns nothing for an empty query', () => {
    expect(search('   ')).toEqual([]);
  });
});

describe('withinOneEdit', () => {
  it('accepts one substitution, insertion or deletion and rejects two', () => {
    expect(withinOneEdit('raft', 'raft')).toBe(true);
    expect(withinOneEdit('raftt', 'raft')).toBe(true);
    expect(withinOneEdit('rqft', 'raft')).toBe(true);
    expect(withinOneEdit('rft', 'raft')).toBe(true);
    expect(withinOneEdit('rfft', 'raft')).toBe(true);
    expect(withinOneEdit('xyft', 'raft')).toBe(false);
  });
});
