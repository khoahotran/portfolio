import { useEffect } from 'react';

interface SeoOptions {
  title: string;
  description: string;
  type?: 'website' | 'article';
  image?: string;
  jsonLd?: Record<string, unknown>;
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

function resolveImageUrl(image?: string): string {
  if (!image) {
    return `${window.location.origin}${import.meta.env.BASE_URL}og-default.svg`;
  }

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  return `${window.location.origin}${import.meta.env.BASE_URL}${image.replace(/^\//, '')}`;
}

export function useSeo({ title, description, type = 'website', image, jsonLd }: SeoOptions) {
  useEffect(() => {
    const fullTitle = `${title} | ${siteName}`;
    const url = window.location.href;
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

    if (jsonLd) {
      upsertJsonLd(jsonLd);
    }
  }, [description, image, jsonLd, title, type]);
}
