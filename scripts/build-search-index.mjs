import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { siteDescription, siteTitle, siteUrl } from '../site.config.mjs';
import { collections, staticRoutes } from './lib/site-routes.mjs';
import { CANONICAL_TAGS } from './lib/tag-taxonomy.mjs';
import {
  escapeXml,
  estimateReading,
  findCrossCollectionSlugCollisions,
  parseFrontmatterBlock,
  parseScalar,
  slugify,
  splitFrontmatter,
  stripSearchNoise,
} from './lib/content.mjs';

const rootDir = process.cwd();
const contentDir = path.join(rootDir, 'content');
const publicDir = path.join(rootDir, 'public');
// content-index.json (lean, no `searchableText`) is fetched by every list page,
// detail page, and related-articles lookup. search-index.json (full body text)
// is fetched only by /search. See src/content-engine/content-index.ts.
const contentIndexPath = path.join(publicDir, 'content-index.json');
const outputIndexPath = path.join(publicDir, 'search-index.json');
const sitemapPath = path.join(publicDir, 'sitemap.xml');
const robotsPath = path.join(publicDir, 'robots.txt');
const rssFeedPath = path.join(publicDir, 'feed.xml');
const jsonFeedPath = path.join(publicDir, 'feed.json');
const feedsDir = path.join(publicDir, 'feeds');
const ogDir = path.join(publicDir, 'og');

// siteUrl/siteTitle/siteDescription come from site.config.mjs, and the collection + lab-id +
// static-route lists from scripts/lib/site-routes.mjs, so this script no longer keeps its own
// copy of either. See the header comments in those two files.

// Word-wraps into at most `maxLines` lines of roughly `maxCharsPerLine` characters,
// ellipsizing the last line if there's more text than fits. Previously the title
// was a single hard `.slice(0, 90)` with no wrapping — at the 56px font size used
// below, ~90 characters is nearly 3x what fits on one 1200px-wide line, so any
// title longer than ~30 characters overflowed the canvas as a single unwrapped
// <text> element (visually: text running off the right edge of the OG image).
function wrapSvgText(text, maxCharsPerLine, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxCharsPerLine) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length === maxLines) {
    const consumedLength = lines.join(' ').length;
    if (consumedLength < text.length) {
      const last = lines[lines.length - 1];
      lines[lines.length - 1] = `${last.slice(0, Math.max(0, maxCharsPerLine - 1))}…`;
    }
  }

  return lines;
}

function buildOgSvg(title, summary) {
  // Chars-per-line figures below are measured empirically against the actual
  // rendered output (resvg-js's font fallback on the build machine turned out
  // narrower than "Inter, Arial, sans-serif" would suggest — a naive estimate
  // from font-size alone left the summary overflowing the 1200px canvas even
  // after the title was correctly wrapped), not calculated from font metrics.
  const titleLines = wrapSvgText(title, 30, 2).map(escapeXml);
  const titleLineHeight = 64;
  const titleStartY = 260;
  const summaryStartY = titleStartY + (titleLines.length - 1) * titleLineHeight + 90;
  const summaryLines = wrapSvgText(summary, 56, 2).map(escapeXml);
  const summaryLineHeight = 40;

  const titleMarkup = titleLines
    .map((line, i) => `  <text x="72" y="${titleStartY + i * titleLineHeight}" font-family="Inter, Arial, sans-serif" font-size="56" fill="#f8fafc" font-weight="700">${line}</text>`)
    .join('\n');
  const summaryMarkup = summaryLines
    .map((line, i) => `  <text x="72" y="${summaryStartY + i * summaryLineHeight}" font-family="Inter, Arial, sans-serif" font-size="30" fill="#cbd5e1">${line}</text>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#155e75" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <text x="72" y="120" font-family="Inter, Arial, sans-serif" font-size="28" fill="#99f6e4" font-weight="600">Khoa Tran Engineering Portfolio</text>
${titleMarkup}
${summaryMarkup}
</svg>`;
}

// Rasterized at build time so the emitted asset is a format social platforms
// actually render — Facebook, LinkedIn, X, and Slack all reject `image/svg+xml`
// for og:image, so every previous social preview on the site had no image at all.
function rasterizeOgPng(svg) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}

function toRssDate(date) {
  return new Date(`${date}T00:00:00.000Z`).toUTCString();
}

function articleUrl(doc) {
  return `${siteUrl}/${doc.collection}/${doc.slug}`;
}

// `docs` is always sorted newest-first (see the `docs.sort()` call in buildAssets, preserved by
// every subsequent `.filter()`), so its first entry's date is deterministic — driven by content,
// not wall-clock time. Previously this was `new Date().toUTCString()`, which dirtied every feed
// file on every build regardless of whether any content had changed (measured: 7 files under
// public/feeds/ on a zero-change rerun), defeating the point of Decision 3's chore(build)-commits-
// separately rule — a commit with no real change should diff clean, not just look small.
function lastBuildDateFor(docs) {
  return docs.length > 0 ? toRssDate(docs[0].date) : toRssDate('1970-01-01');
}

function buildRss(docs, channelTitle, channelDescription, channelLink) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeXml(channelTitle)}</title>\n    <link>${escapeXml(channelLink)}</link>\n    <description>${escapeXml(channelDescription)}</description>\n    <language>en-us</language>\n    <lastBuildDate>${lastBuildDateFor(docs)}</lastBuildDate>\n${docs
    .slice(0, 50)
    .map(
      (doc) => `    <item>\n      <title>${escapeXml(doc.title)}</title>\n      <link>${escapeXml(articleUrl(doc))}</link>\n      <guid isPermaLink="true">${escapeXml(articleUrl(doc))}</guid>\n      <pubDate>${toRssDate(doc.date)}</pubDate>\n      <description>${escapeXml(doc.summary)}</description>\n    </item>`
    )
    .join('\n')}\n  </channel>\n</rss>\n`;
}

function buildJsonFeed(docs, title, description, feedUrl) {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title,
    home_page_url: siteUrl,
    feed_url: feedUrl,
    description,
    icon: `${siteUrl}/favicon.ico`,
    favicon: `${siteUrl}/favicon.ico`,
    items: docs.slice(0, 50).map((doc) => ({
      id: articleUrl(doc),
      url: articleUrl(doc),
      title: doc.title,
      summary: doc.summary,
      date_published: new Date(`${doc.date}T00:00:00.000Z`).toISOString(),
      tags: doc.tags,
      image: `${siteUrl}${doc.ogImage}`,
    })),
  };
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function buildAssets() {
  await ensureDir(publicDir);
  await ensureDir(ogDir);
  await ensureDir(feedsDir);

  const docs = [];

  for (const collection of collections) {
    const dirPath = path.join(contentDir, collection);
    let entries = [];

    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }

      const filePath = path.join(dirPath, entry.name);
      const raw = await fs.readFile(filePath, 'utf-8');
      const { data, body } = splitFrontmatter(raw);
      const fileSlug = entry.name.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
      const slug = slugify(String(data.slug ?? fileSlug));
      const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
      const related = Array.isArray(data.related) ? data.related.map(String) : undefined;
      const series = data.series !== undefined ? String(data.series) : undefined;
      const seriesOrder = data.seriesOrder !== undefined ? Number(data.seriesOrder) : undefined;
      const reading = estimateReading(body);
      const title = String(data.title ?? fileSlug.replace(/-/g, ' '));
      const summary = String(data.summary ?? 'Engineering write-up');
      // .png, not .svg — see the comment on rasterizeOgPng(). The SVG is still
      // written alongside it (below) as the rasterization source, but nothing
      // reads it directly as og:image anymore.
      const ogImage = `/og/${slug}.png`;

      docs.push({
        title,
        date: String(data.date ?? new Date().toISOString().slice(0, 10)),
        tags,
        summary,
        draft: Boolean(data.draft),
        slug,
        collection,
        ogImage,
        related,
        series,
        seriesOrder,
        readingMinutes: reading.readingMinutes,
        // Always the computed value now, not the frontmatter override — see the
        // comment on estimateReading(). `reading_time` above still carries the
        // author's original frontmatter value through to the index for anyone
        // who wants to compare, but nothing in src/ reads it for display.
        readingText: reading.readingText,
        // Code fences (incl. Mermaid source), inline code, HTML, and table rows are
        // stripped before indexing — measured at 43.6% fenced code + 7.0% Mermaid
        // source of the raw body across the corpus. That noise was previously inert
        // (Fuse's un-set `ignoreLocation` made anything past ~34 chars unsearchable
        // anyway) but becomes live the moment ignoreLocation is enabled — see
        // src/pages/SearchPage.tsx. Stripping it also roughly halves the index
        // (measured 220 KB → 108 KB).
        searchableText: `${title} ${summary} ${tags.join(' ')} ${stripSearchNoise(body)}`,
      });

      const ogSvg = buildOgSvg(title, summary);
      await fs.writeFile(path.join(ogDir, `${slug}.svg`), ogSvg, 'utf-8');
      await fs.writeFile(path.join(ogDir, `${slug}.png`), rasterizeOgPng(ogSvg));
    }
  }

  docs.sort((a, b) => b.date.localeCompare(a.date));

  // See findCrossCollectionSlugCollisions's own doc comment (scripts/lib/content.mjs) for why this
  // has to be enforced at all: several places in src/ compare articles by bare `item.slug` across
  // collections, an assumption nothing previously guaranteed. Found while reviewing
  // getRelatedArticles's self-reference guard (Decision 20). This also would have caused a silent
  // OG-image clobber above (two colliding docs writing to the same `og/<slug>.png`) before this
  // check ever ran.
  for (const { slug, collections } of findCrossCollectionSlugCollisions(docs)) {
    throw new Error(
      `Slug "${slug}" is used in more than one collection (${collections.join(', ')}) — slugs must ` +
        'be unique across the entire corpus, not just within a collection, because several parts ' +
        'of the app (related-articles lookup, OG image generation) key by slug alone. Rename one.'
    );
  }

  // Fail the build on a typo'd `related:` reference rather than letting it
  // silently render nothing — a curated cross-link is only worth adding if
  // it's checked, and a slug rename elsewhere is exactly the kind of change
  // that would otherwise break this invisibly.
  const validSlugs = new Set(docs.map((doc) => `${doc.collection}/${doc.slug}`));
  for (const doc of docs) {
    const selfPath = `${doc.collection}/${doc.slug}`;
    for (const ref of doc.related ?? []) {
      if (!validSlugs.has(ref)) {
        throw new Error(
          `Invalid "related:" reference "${ref}" in ${doc.collection}/${doc.slug} — no article at that path. ` +
            'Expected format: "collection/slug" (e.g. "projects/aegis").'
        );
      }
      // An article referencing itself is always a mistake (a typo, or a copy-pasted frontmatter
      // block) — never a real cross-link — and would otherwise render the article in its own
      // "Read Next" section. Caught here, at the same place the same field's other authoring
      // mistakes already fail the build, rather than only guarded defensively at render time in
      // getRelatedArticles.
      if (ref === selfPath) {
        throw new Error(`"related:" in ${selfPath} references itself — remove the self-reference.`);
      }
    }
  }

  // Same enforcement, same reason, for tags: a tag outside the canonical vocabulary in
  // scripts/lib/tag-taxonomy.mjs can't group anything — that vocabulary was migrated from 92 tags
  // (56 used exactly once) down to ~35 precisely to stop that drift starting again silently. See
  // .ai/tag-taxonomy.md for the rationale and .ai/decision-log.md Decision 15.
  for (const doc of docs) {
    for (const tag of doc.tags ?? []) {
      if (!CANONICAL_TAGS.has(tag)) {
        throw new Error(
          `Unknown tag "${tag}" in ${doc.collection}/${doc.slug} — not in the canonical vocabulary. ` +
            'Either use an existing tag from .ai/tag-taxonomy.md, or add the new tag to both that ' +
            'doc and scripts/lib/tag-taxonomy.mjs in the same change.'
        );
      }
    }
  }

  // `series` is opt-in, unlike `collection` (every doc has one by construction), so a typo'd or
  // missing `seriesOrder` would otherwise fail silently — a "Part N of M" badge that just never
  // renders — rather than loudly. Same fail-the-build philosophy as the related/tag checks above.
  // See .ai/phases/phase-5.md §5.6.
  const seriesGroups = new Map();
  for (const doc of docs) {
    if (doc.series === undefined) {
      continue;
    }
    if (doc.seriesOrder === undefined || Number.isNaN(doc.seriesOrder)) {
      throw new Error(
        `"${doc.collection}/${doc.slug}" declares series "${doc.series}" but has no valid ` +
          '"seriesOrder:" — every part of a series must declare its 1-indexed position.'
      );
    }
    if (!seriesGroups.has(doc.series)) {
      seriesGroups.set(doc.series, []);
    }
    seriesGroups.get(doc.series).push(doc);
  }
  for (const [seriesName, group] of seriesGroups) {
    const orders = group.map((doc) => doc.seriesOrder);
    if (new Set(orders).size !== orders.length) {
      throw new Error(
        `Series "${seriesName}" has two parts sharing the same seriesOrder — each part needs a ` +
          `distinct position. Parts: ${group.map((doc) => `${doc.collection}/${doc.slug}`).join(', ')}.`
      );
    }
  }

  const publicDocs = docs.filter((doc) => !doc.draft);

  // Remove OG assets (both formats) left over from a renamed or deleted content
  // file — the loop above only ever writes the current doc set, so a stale
  // slug's asset would otherwise sit in public/og/ indefinitely.
  const expectedOgFiles = new Set(docs.flatMap((doc) => [`${doc.slug}.svg`, `${doc.slug}.png`]));
  for (const fileName of await fs.readdir(ogDir)) {
    if (!expectedOgFiles.has(fileName)) {
      await fs.unlink(path.join(ogDir, fileName));
    }
  }

  const defaultOg = buildOgSvg('Engineering Portfolio', siteDescription);
  await fs.writeFile(path.join(publicDir, 'og-default.svg'), defaultOg, 'utf-8');
  await fs.writeFile(path.join(publicDir, 'og-default.png'), rasterizeOgPng(defaultOg));

  const contentIndexDocs = docs.map(({ searchableText, ...doc }) => doc);

  await fs.writeFile(contentIndexPath, JSON.stringify(contentIndexDocs, null, 2), 'utf-8');
  await fs.writeFile(outputIndexPath, JSON.stringify(docs, null, 2), 'utf-8');

  const dynamicRoutes = publicDocs.map((doc) => `/${doc.collection}/${doc.slug}`);
  // One /tags/:tag per distinct tag actually in use — computed here rather than via
  // readTagRoutes() (scripts/lib/site-routes.mjs) because publicDocs is already in memory; that
  // function exists for scripts that run after this one has already written content-index.json.
  const tagRoutes = [...new Set(publicDocs.flatMap((doc) => doc.tags))].sort().map((tag) => `/tags/${tag}`);
  // Only dynamic (article) routes have a natural "last modified" date from
  // frontmatter; static routes (/, /about, /labs, /tags/:tag, ...) get no <lastmod>,
  // which is valid per the sitemap spec — it's an optional element.
  const lastmodByRoute = new Map(publicDocs.map((doc) => [`/${doc.collection}/${doc.slug}`, doc.date]));

  const urls = [...new Set([...staticRoutes, ...dynamicRoutes, ...tagRoutes])];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((route) => {
      const lastmod = lastmodByRoute.get(route);
      return (
        `  <url>\n    <loc>${escapeXml(`${siteUrl}${route}`)}</loc>\n` +
        (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '') +
        `    <changefreq>weekly</changefreq>\n    <priority>${route === '/' ? '1.0' : '0.7'}</priority>\n  </url>`
      );
    })
    .join('\n')}\n</urlset>\n`;

  const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;

  const rssXml = buildRss(publicDocs, siteTitle, siteDescription, siteUrl);
  const jsonFeed = buildJsonFeed(publicDocs, siteTitle, siteDescription, `${siteUrl}/feed.json`);

  await fs.writeFile(sitemapPath, sitemapXml, 'utf-8');
  await fs.writeFile(robotsPath, robotsTxt, 'utf-8');
  await fs.writeFile(rssFeedPath, rssXml, 'utf-8');
  await fs.writeFile(jsonFeedPath, JSON.stringify(jsonFeed, null, 2), 'utf-8');

  for (const collection of collections) {
    const collectionDocs = publicDocs.filter((doc) => doc.collection === collection);
    const collectionTitle = `${siteTitle} - ${collection}`;
    const collectionDescription = `${collection} articles from ${siteTitle}.`;

    const collectionRss = buildRss(
      collectionDocs,
      collectionTitle,
      collectionDescription,
      `${siteUrl}/${collection}`
    );
    const collectionJson = buildJsonFeed(
      collectionDocs,
      collectionTitle,
      collectionDescription,
      `${siteUrl}/feeds/${collection}.json`
    );

    await fs.writeFile(path.join(feedsDir, `${collection}.xml`), collectionRss, 'utf-8');
    await fs.writeFile(path.join(feedsDir, `${collection}.json`), JSON.stringify(collectionJson, null, 2), 'utf-8');
  }

  console.log(`Generated ${docs.length} documents at ${contentIndexPath} (lean) and ${outputIndexPath} (full)`);
  console.log(`Generated sitemap at ${sitemapPath}`);
  console.log(`Generated robots at ${robotsPath}`);
  console.log(`Generated RSS feed at ${rssFeedPath}`);
  console.log(`Generated JSON feed at ${jsonFeedPath}`);
  console.log(`Generated collection feeds in ${feedsDir}`);
  console.log(`Generated OG assets in ${ogDir}`);
}

await buildAssets();
