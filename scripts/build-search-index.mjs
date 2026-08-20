import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

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

const siteUrl = 'https://khoahotran.github.io/portfolio';
const siteTitle = 'Khoa Tran Engineering Portfolio';
const siteDescription = 'Case studies, system design notes, and interactive engineering experiments.';
const collections = ['blog', 'research', 'experiments', 'system-design', 'field-notes', 'projects'];

// Kept in sync manually with src/labs/registry.ts (a plain Node script can't import
// TSX without an extra loader, and this list rarely changes).
const labIds = [
  'throughput-simulation',
  'retry-strategy',
  'failure-injection',
  'queue-vs-pubsub',
  'saga-state-machine',
  'event-sourcing-replay',
  'redis-vs-bullmq',
  'go-vs-ts-concurrency',
  'db-event-replay-benchmark',
];

const staticRoutes = [
  '/',
  '/about',
  '/graph',
  '/blog',
  '/research',
  '/experiments',
  '/system-design',
  '/field-notes',
  '/projects',
  '/labs',
  ...labIds.map((id) => `/labs/${id}`),
];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseScalar(raw) {
  const cleaned = raw.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  if (cleaned === 'true') {
    return true;
  }

  if (cleaned === 'false') {
    return false;
  }

  return cleaned;
}

function parseFrontmatterBlock(block) {
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

function splitFrontmatter(raw) {
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

function stripSearchNoise(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks, incl. Mermaid source
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/<[^>]+>/g, ' ') // raw HTML (CTA buttons, etc.)
    .replace(/^\s*\|.*$/gm, ' ') // table rows
    .replace(/\s+/g, ' ')
    .trim();
}

// Reading time is derived from the article, not from the hand-written
// `reading_time` frontmatter (kept in the files as authorial intent, but no
// longer read for display — see .ai/audit-followups.md item 1). Prose reads
// at 220 wpm; a code block adds ~20s (skimming, not executing); a Mermaid
// diagram adds ~30s (reading the shape). Measured across the corpus: this
// produces ~107 total minutes vs. 305 declared and 72 for prose-only, which
// better reflects that a diagram-heavy or code-heavy article genuinely takes
// longer to read than its prose word count alone implies.
function estimateReading(body) {
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

function buildRss(docs, channelTitle, channelDescription, channelLink) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>${escapeXml(channelTitle)}</title>\n    <link>${escapeXml(channelLink)}</link>\n    <description>${escapeXml(channelDescription)}</description>\n    <language>en-us</language>\n    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n${docs
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
        reading_time: data.reading_time ? String(data.reading_time) : undefined,
        draft: Boolean(data.draft),
        slug,
        collection,
        ogImage,
        related,
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

  // Fail the build on a typo'd `related:` reference rather than letting it
  // silently render nothing — a curated cross-link is only worth adding if
  // it's checked, and a slug rename elsewhere is exactly the kind of change
  // that would otherwise break this invisibly.
  const validSlugs = new Set(docs.map((doc) => `${doc.collection}/${doc.slug}`));
  for (const doc of docs) {
    for (const ref of doc.related ?? []) {
      if (!validSlugs.has(ref)) {
        throw new Error(
          `Invalid "related:" reference "${ref}" in ${doc.collection}/${doc.slug} — no article at that path. ` +
            'Expected format: "collection/slug" (e.g. "projects/aegis").'
        );
      }
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
  // Only dynamic (article) routes have a natural "last modified" date from
  // frontmatter; static routes (/, /about, /labs, ...) get no <lastmod>,
  // which is valid per the sitemap spec — it's an optional element.
  const lastmodByRoute = new Map(publicDocs.map((doc) => [`/${doc.collection}/${doc.slug}`, doc.date]));

  const urls = [...new Set([...staticRoutes, ...dynamicRoutes])];
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
