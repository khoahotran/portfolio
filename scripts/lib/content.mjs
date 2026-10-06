// Pure content helpers shared by the build scripts and covered by unit tests.
//
// These used to live inside build-search-index.mjs, which is a top-level script: importing it to
// test anything would have run the whole build. They are extracted here so the parsing and slug
// logic can be asserted directly — in particular `slugify`, which is duplicated in
// src/content-engine/content-source.ts and MUST stay byte-identical to it. When those two diverge,
// an article stays in the index and the sitemap but stops resolving at its own URL, which is the
// same failure mode .ai/decision-log.md Decision 5 already had to fix once.

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Finds any slug used in more than one collection. Slugs only need to be unique *within* a
 * collection for routing (`/collection/:slug`), but several places in src/ (getRelatedArticles's
 * and ArticleNav's self-exclusion, prefetchNextArticle, getIndexItem) compare by bare `item.slug`
 * across the whole cross-collection index rather than `collection/slug` — cheaper than threading a
 * `currentCollection` through every call site, but only safe if slugs are unique across the entire
 * corpus. `build-search-index.mjs` fails the build on any collision this returns; extracted here
 * (rather than left inline in that script) so the check itself is unit-testable.
 *
 * Returns an array of `{ slug, collections }` for each colliding slug, empty if none collide.
 */
export function findCrossCollectionSlugCollisions(docs) {
  const collectionsBySlug = new Map();
  for (const doc of docs) {
    if (!collectionsBySlug.has(doc.slug)) {
      collectionsBySlug.set(doc.slug, []);
    }
    collectionsBySlug.get(doc.slug).push(doc.collection);
  }

  return [...collectionsBySlug.entries()]
    .filter(([, collections]) => collections.length > 1)
    .map(([slug, collections]) => ({ slug, collections }));
}

export function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function parseScalar(raw) {
  const cleaned = raw.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  if (cleaned === 'true') {
    return true;
  }

  if (cleaned === 'false') {
    return false;
  }

  return cleaned;
}

export function parseFrontmatterBlock(block) {
  const parsed = {};

  block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        parsed[key] = value
          .slice(1, -1)
          .split(',')
          .map((item) => parseScalar(item))
          .map(String)
          .map((item) => item.trim())
          .filter(Boolean);
        return;
      }

      parsed[key] = parseScalar(value);
    });

  return parsed;
}

export function splitFrontmatter(raw) {
  if (!raw.startsWith('---')) {
    return { data: {}, body: raw };
  }

  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: raw };
  }

  return {
    data: parseFrontmatterBlock(match[1]),
    body: match[2],
  };
}

export function stripSearchNoise(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks, incl. Mermaid source
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/<[^>]+>/g, ' ') // raw HTML (CTA buttons, etc.)
    .replace(/^\s*\|.*$/gm, ' ') // table rows
    .replace(/\s+/g, ' ')
    .trim();
}

// Reading time is derived from the article, not from the hand-written
// `reading_time` frontmatter, which was removed from the schema entirely in 2026-08
// once it was clear nothing read it and the declared values had drifted ~2.6x
// (see .ai/audit-followups.md item 1). Prose reads
// at 220 wpm; a code block adds ~20s (skimming, not executing); a Mermaid
// diagram adds ~30s (reading the shape). Measured across the corpus: this
// produces ~107 total minutes vs. 305 declared and 72 for prose-only, which
// better reflects that a diagram-heavy or code-heavy article genuinely takes
// longer to read than its prose word count alone implies.
export function estimateReading(body) {
  let codeBlocks = 0;
  let mermaidBlocks = 0;

  const prose = body
    .replace(/```(\w*)\n[\s\S]*?```/g, (_match, lang) => {
      if (lang.trim().toLowerCase() === 'mermaid') {
        mermaidBlocks += 1;
      } else {
        codeBlocks += 1;
      }
      return ' ';
    })
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/<[^>]+>/g, ' ') // raw HTML (CTA buttons, etc.)
    .replace(/^\s*\|.*$/gm, ' ') // table rows
    .replace(/\$\$[\s\S]*?\$\$/g, ' ') // block LaTeX
    .replace(/\$[^$\n]+\$/g, ' ') // inline LaTeX
    .replace(/^#{1,6}\s+/gm, '') // heading markers (keep the heading text)
    .replace(/[*_>[\]()#-]/g, ' '); // remaining markdown punctuation

  const proseWords = prose.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(proseWords / 220 + codeBlocks * (20 / 60) + mermaidBlocks * (30 / 60)));

  return { readingMinutes: minutes, readingText: `${minutes} min read` };
}
