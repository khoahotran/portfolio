import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { expertisePillars, proofPoints } from './expertise';

/**
 * The homepage cites these links as evidence. A claim that points at a 404 is worse than no claim,
 * and nothing else would catch it: check:responsive visits routes from the sitemap, not routes
 * named in a data file, and check:interactions clicks a graph node, not these.
 */

const labIds: string[] = JSON.parse(
  readFileSync(new URL('../labs/lab-ids.json', import.meta.url), 'utf8')
);

interface IndexItem {
  slug: string;
  collection: string;
  draft?: boolean;
}

const contentIndex: IndexItem[] = JSON.parse(
  readFileSync(new URL('../../public/content-index.json', import.meta.url), 'utf8')
);

const articleRoutes = new Set(
  contentIndex.filter((doc) => !doc.draft).map((doc) => `/${doc.collection}/${doc.slug}`)
);

const allProof = expertisePillars.flatMap((pillar) => pillar.proof);

describe('expertise pillars', () => {
  it('names three pillars, each with proof', () => {
    expect(expertisePillars).toHaveLength(3);
    for (const pillar of expertisePillars) {
      expect(pillar.proof.length).toBeGreaterThan(0);
    }
  });

  it('every lab link resolves to a registered lab', () => {
    const missing = allProof
      .filter((p) => p.kind === 'lab')
      .filter((p) => !labIds.includes(p.to.replace('/labs/', '')));
    expect(missing.map((p) => p.to)).toEqual([]);
  });

  it('every read link resolves to a published article', () => {
    const missing = allProof.filter((p) => p.kind === 'read').filter((p) => !articleRoutes.has(p.to));
    expect(missing.map((p) => p.to)).toEqual([]);
  });

  it('cites no lab twice across pillars', () => {
    const tos = allProof.map((p) => p.to);
    expect(new Set(tos).size).toBe(tos.length);
  });
});

describe('proof points', () => {
  it('states the system every number was measured on', () => {
    for (const point of proofPoints) {
      expect(point.source.trim().length).toBeGreaterThan(0);
    }
  });

  it('links only to articles that exist', () => {
    const broken = proofPoints.filter((p) => p.to !== null && !articleRoutes.has(p.to));
    expect(broken.map((p) => p.to)).toEqual([]);
  });
});
