import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const contentDir = path.join(rootDir, 'content');
const publicDir = path.join(rootDir, 'public');
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
const staticRoutes = ['/', '/blog', '/research', '/experiments', '/system-design', '/field-notes', '/projects', '/search'];

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

function estimateReading(body) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return { readingMinutes: minutes, readingText: `${minutes} min read` };
}

function buildOgSvg(title, summary) {
  const safeTitle = escapeXml(title).slice(0, 90);
  const safeSummary = escapeXml(summary).slice(0, 180);

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
  <text x="72" y="260" font-family="Inter, Arial, sans-serif" font-size="56" fill="#f8fafc" font-weight="700">${safeTitle}</text>
  <text x="72" y="350" font-family="Inter, Arial, sans-serif" font-size="30" fill="#cbd5e1">${safeSummary}</text>
</svg>`;
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
      const reading = estimateReading(body);
      const title = String(data.title ?? fileSlug.replace(/-/g, ' '));
      const summary = String(data.summary ?? 'Engineering write-up');
      const ogImage = `/og/${slug}.svg`;

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
        readingMinutes: reading.readingMinutes,
        readingText: data.reading_time ? String(data.reading_time) : reading.readingText,
        searchableText: `${title} ${summary} ${tags.join(' ')} ${body}`,
      });

      const ogSvg = buildOgSvg(title, summary);
      await fs.writeFile(path.join(ogDir, `${slug}.svg`), ogSvg, 'utf-8');
    }
  }

  docs.sort((a, b) => b.date.localeCompare(a.date));

  const publicDocs = docs.filter((doc) => !doc.draft);

  const defaultOg = buildOgSvg('Engineering Portfolio', siteDescription);
  await fs.writeFile(path.join(publicDir, 'og-default.svg'), defaultOg, 'utf-8');

  await fs.writeFile(outputIndexPath, JSON.stringify(docs, null, 2), 'utf-8');

  const dynamicRoutes = publicDocs.map((doc) => `/${doc.collection}/${doc.slug}`);

  const urls = [...new Set([...staticRoutes, ...dynamicRoutes])];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (route) =>
        `  <url>\n    <loc>${escapeXml(`${siteUrl}${route}`)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${route === '/' ? '1.0' : '0.7'}</priority>\n  </url>`
    )
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

  console.log(`Generated ${docs.length} documents at ${outputIndexPath}`);
  console.log(`Generated sitemap at ${sitemapPath}`);
  console.log(`Generated robots at ${robotsPath}`);
  console.log(`Generated RSS feed at ${rssFeedPath}`);
  console.log(`Generated JSON feed at ${jsonFeedPath}`);
  console.log(`Generated collection feeds in ${feedsDir}`);
  console.log(`Generated OG assets in ${ogDir}`);
}

await buildAssets();
