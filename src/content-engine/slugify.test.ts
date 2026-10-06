import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { slugify as appSlugify } from './content-source';
// The build-side copy. Imported from scripts/lib/content.mjs rather than
// scripts/build-search-index.mjs because that file is a top-level script — importing it would run
// the entire build (regenerating indexes, feeds and 66 OG images) as a side effect of a unit test.
import { slugify as buildSlugify } from '../../scripts/lib/content.mjs';

/**
 * The single most important invariant in the content pipeline.
 *
 * `content-source.ts` keys its `import.meta.glob` loader map by a slug it derives in the browser;
 * `build-search-index.mjs` writes the canonical slug into content-index.json, the sitemap, the
 * feeds, and the prerender route list. Nothing at runtime reconciles the two. If they disagree for
 * any real article, that article is listed everywhere and renders nowhere — the same class of
 * silent unreachability that .ai/decision-log.md Decision 5 had to fix once already, and one that
 * neither typecheck nor the responsive sweep would catch, because the route 404s rather than errors.
 */
describe('slugify parity between the app and the build script', () => {
  const CASES = [
    'grpc-service-mesh-in-go-aegis-architecture',
    'Aegis: High-Performance Auth & Authorization Platform',
    'ADR: Firestore vs PostgreSQL for Event Sourcing',
    'Go vs TypeScript — for Backend Services',
    'Trần Nguyễn Anh Khoa',
    '  Leading and trailing whitespace  ',
    'Multiple   internal   spaces',
    'already-hyphenated--twice',
    'Punctuation!@#$%^&*()+=[]{}|;:"<>,.?/~`',
    'MiXeD CaSe 123 Numbers',
    'trailing-hyphen-',
    '',
  ];

  it.each(CASES)('agrees on %j', (input) => {
    expect(appSlugify(input)).toBe(buildSlugify(input));
  });

  /**
   * The synthetic cases above only prove agreement on inputs someone thought of. This runs both
   * implementations over every real filename in content/, which is what actually ships.
   */
  it('agrees on every real content filename', () => {
    const collections = ['blog', 'research', 'experiments', 'system-design', 'field-notes', 'projects'];
    const names = collections.flatMap((collection) =>
      (readdirSync(new URL(`../../content/${collection}`, import.meta.url)) as string[])
        .filter((name: string) => name.endsWith('.md'))
        .map((name: string) => name.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''))
    );

    expect(names.length).toBeGreaterThan(30);
    for (const name of names) {
      expect(appSlugify(name), name).toBe(buildSlugify(name));
    }
  });

  /**
   * And over every title, since `slug:` frontmatter and title-derived slugs both flow through the
   * same function.
   */
  it('agrees on every real article title', () => {
    const collections = ['blog', 'research', 'experiments', 'system-design', 'field-notes', 'projects'];
    const titles: string[] = [];
    for (const collection of collections) {
      const dir = new URL(`../../content/${collection}/`, import.meta.url);
      for (const name of (readdirSync(dir) as string[]).filter((n: string) => n.endsWith('.md'))) {
        const raw = readFileSync(new URL(name, dir), 'utf8');
        const match = raw.match(/^title:\s*"(.+)"\s*$/m);
        if (match) titles.push(match[1]);
      }
    }

    expect(titles.length).toBeGreaterThan(30);
    for (const title of titles) {
      expect(appSlugify(title), title).toBe(buildSlugify(title));
    }
  });
});

/**
 * Guards the shape the whole index depends on: every slug must be URL-safe, since it is
 * concatenated straight into routes, sitemap entries and OG image filenames.
 */
describe('slugify output shape', () => {
  it('emits only lowercase alphanumerics and single hyphens', () => {
    for (const input of ['Aegis: Auth & AuthZ', 'Ünïcödé Tïtlé', 'a  b   c']) {
      expect(appSlugify(input)).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/);
    }
  });
});
