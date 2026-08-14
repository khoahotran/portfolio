import { useEffect } from 'react';

interface SeoOptions {
  title: string;
  description: string;
  type?: 'website' | 'article';
  image?: string;
  jsonLd?: Record<string, unknown>;
  /**
   * Skip this call entirely — no meta tag is touched, including document.title.
   * For ContentDetailPage: while the article is still loading, `title`/`description`
   * would otherwise have to be a generic placeholder ("Article" / "Technical
   * article"), which briefly becomes the real first-paint meta for every one of
   * the 33 articles. Leaving whatever meta the previous page (or the static
   * index.html defaults, on a fresh load) already set is strictly more accurate
   * than overwriting it with a placeholder for that one render.
   */
  skip?: boolean;
  /** Emits <meta name="robots" content="noindex"> — for pages like the 404
   * that should never rank or appear in search results. */
  noindex?: boolean;
}

const siteName = 'Khoa Tran Engineering Portfolio';

function upsertMeta(name: string, content: string, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    if (property) {
      element.setAttribute('property', name);
    } else {
      element.setAttribute('name', name);
    }
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function removeMeta(name: string, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  document.head.querySelector(selector)?.remove();
}

function upsertCanonical(url: string) {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }

  link.href = url;
}

function upsertAlternateFeed(title: string, type: 'application/rss+xml' | 'application/feed+json', href: string) {
  const selector = `link[rel="alternate"][type="${type}"]`;
  let link = document.head.querySelector(selector) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.rel = 'alternate';
    link.type = type;
    document.head.appendChild(link);
  }

  link.title = title;
  link.href = href;
}

function upsertJsonLd(data: Record<string, unknown>) {
  const id = 'portfolio-jsonld';
  let script = document.getElementById(id) as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    document.head.appendChild(script);
  }

  script.text = JSON.stringify(data);
}

function removeJsonLd() {
  document.getElementById('portfolio-jsonld')?.remove();
}

// Exported for ContentDetailPage's JSON-LD `image` field, which needs the same
// absolute-URL resolution this hook already applies to og:image/twitter:image.
export function resolveImageUrl(image?: string): string {
  if (!image) {
    return `${window.location.origin}${import.meta.env.BASE_URL}og-default.png`;
  }

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  return `${window.location.origin}${import.meta.env.BASE_URL}${image.replace(/^\//, '')}`;
}

export function useSeo({ title, description, type = 'website', image, jsonLd, skip = false, noindex = false }: SeoOptions) {
  useEffect(() => {
    if (skip) {
      return;
    }

    const fullTitle = `${title} | ${siteName}`;
    // Query strings (e.g. /blog?tag=go) are a filtered view of the same
    // content as /blog, not a distinct page — canonical/og:url should point
    // at the clean URL so they don't register as near-duplicates.
    const url = `${window.location.origin}${window.location.pathname}`;
    const imageUrl = resolveImageUrl(image);
    const rssHref = `${window.location.origin}${import.meta.env.BASE_URL}feed.xml`;
    const jsonFeedHref = `${window.location.origin}${import.meta.env.BASE_URL}feed.json`;

    document.title = fullTitle;

    upsertMeta('description', description);
    upsertMeta('og:title', fullTitle, true);
    upsertMeta('og:description', description, true);
    upsertMeta('og:type', type, true);
    upsertMeta('og:url', url, true);
    upsertMeta('og:image', imageUrl, true);
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', fullTitle);
    upsertMeta('twitter:description', description);
    upsertMeta('twitter:image', imageUrl);
    upsertCanonical(url);
    upsertAlternateFeed('RSS Feed', 'application/rss+xml', rssHref);
    upsertAlternateFeed('JSON Feed', 'application/feed+json', jsonFeedHref);

    // Same reasoning as JSON-LD below: noindex only applies to specific pages
    // (currently just the 404), so it must be actively removed on every other
    // page rather than just never set, or it would stick from a prior route.
    if (noindex) {
      upsertMeta('robots', 'noindex');
    } else {
      removeMeta('robots');
    }

    // Unlike the meta tags above, JSON-LD is only present on some pages
    // (articles). Without the else branch, navigating from an article to a
    // page with no jsonLd left the previous article's structured data in
    // the head, now describing a page it no longer matches.
    if (jsonLd) {
      upsertJsonLd(jsonLd);
    } else {
      removeJsonLd();
    }
  }, [description, image, jsonLd, noindex, skip, title, type]);
}
