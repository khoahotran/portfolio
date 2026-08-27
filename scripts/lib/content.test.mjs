import { describe, expect, it } from 'vitest';
import {
  estimateReading,
  parseFrontmatterBlock,
  parseScalar,
  splitFrontmatter,
  stripSearchNoise,
} from './content.mjs';

/**
 * The frontmatter parser is hand-rolled (no gray-matter — see .ai/decision-log.md Decision 1 on
 * keeping dependencies thin). That is a reasonable trade for a 33-file corpus, but it means the
 * parsing rules live only in this code, so they are pinned here: a regression would corrupt every
 * downstream artifact at once — index, sitemap, feeds and OG images are all generated from it.
 */
describe('frontmatter parsing', () => {
  it('splits the block from the body', () => {
    const { data, body } = splitFrontmatter('---\ntitle: "A"\n---\n\nBody text.\n');
    expect(data.title).toBe('A');
    expect(body.trim()).toBe('Body text.');
  });

  it('returns an empty block and the whole input when there is no frontmatter', () => {
    const { data, body } = splitFrontmatter('# Just a heading\n');
    expect(data).toEqual({});
    expect(body).toBe('# Just a heading\n');
  });

  it('parses the array syntax used by tags and related', () => {
    const data = parseFrontmatterBlock('tags: ["go", "grpc"]\nrelated: ["blog/a", "projects/b"]');
    expect(data.tags).toEqual(['go', 'grpc']);
    expect(data.related).toEqual(['blog/a', 'projects/b']);
  });

  it('parses booleans, so `draft: true` actually excludes a post', () => {
    expect(parseScalar('true')).toBe(true);
    expect(parseScalar('false')).toBe(false);
    expect(parseFrontmatterBlock('draft: true').draft).toBe(true);
  });

  it('strips surrounding quotes from scalars', () => {
    expect(parseScalar('"quoted"')).toBe('quoted');
    expect(parseScalar("'quoted'")).toBe('quoted');
    expect(parseScalar('unquoted')).toBe('unquoted');
  });

  it('keeps colons inside a quoted value', () => {
    // Titles like `"Aegis: High-Performance Auth"` are common; splitting on every colon would
    // truncate them at the first one.
    expect(parseFrontmatterBlock('title: "Aegis: High-Performance Auth"').title).toBe(
      'Aegis: High-Performance Auth'
    );
  });
});

/**
 * `searchableText` is what /search matches against. Leaving code fences in it means a query for a
 * common identifier matches nearly every article — and it roughly doubles the index the page has
 * to download.
 */
describe('search-noise stripping', () => {
  it('removes fenced code blocks', () => {
    const out = stripSearchNoise('Before\n\n```go\nfunc main() { unique_token_abc }\n```\n\nAfter');
    expect(out).not.toContain('unique_token_abc');
    expect(out).toContain('Before');
    expect(out).toContain('After');
  });

  it('removes mermaid diagram source', () => {
    const out = stripSearchNoise('Text\n\n```mermaid\nflowchart TD\n  A --> B\n```\n');
    expect(out).not.toContain('flowchart');
  });

  it('removes inline code and raw HTML', () => {
    const out = stripSearchNoise('Use `XREADGROUP` here.\n<a class="lab-cta">Open</a>\n');
    expect(out).not.toContain('XREADGROUP');
    expect(out).not.toContain('lab-cta');
  });
});

/**
 * Reading time is computed rather than read from frontmatter, because the hand-written
 * `reading_time` values had drifted to roughly 2.6x the real figure (305 declared minutes against
 * ~118 computed across the corpus). These pin the properties that made the computed value
 * trustworthy in the first place.
 */
describe('reading-time estimation', () => {
  const minutes = (body) => estimateReading(body).readingMinutes;

  it('never returns less than a minute', () => {
    expect(minutes('Three words here.')).toBeGreaterThanOrEqual(1);
  });

  it('scales with prose length', () => {
    expect(minutes('word '.repeat(2200))).toBeGreaterThan(minutes('word '.repeat(220)));
  });

  it('charges a code block far less than the same volume of prose', () => {
    // A 400-line code block is scanned, not read. Counting it at prose speed is what inflated the
    // old hand-written frontmatter values to ~2.6x reality.
    const code = minutes('```go\n' + 'x := 1\n'.repeat(400) + '```\n');
    const prose = minutes('word '.repeat(400 * 3));
    expect(code).toBeLessThan(prose);
  });

  it('returns a display string matching the computed minutes', () => {
    const result = estimateReading('word '.repeat(1100));
    expect(result.readingText).toBe(`${result.readingMinutes} min read`);
  });

  it('excludes table rows, LaTeX and raw HTML from the prose count', () => {
    const noisy = [
      '| a | b |',
      '| --- | --- |',
      '<a class="lab-cta">Open the lab</a>',
      '$$ \\sum_{i=0}^{n} x_i $$',
    ].join('\n');
    expect(minutes(noisy)).toBe(1);
  });
});
