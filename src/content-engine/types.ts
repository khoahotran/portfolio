export type ContentCollection = 'blog' | 'research' | 'experiments' | 'system-design' | 'field-notes' | 'projects';

export interface ContentFrontmatter {
  title: string;
  date: string;
  tags: string[];
  summary: string;
  draft?: boolean;
  ogImage?: string;
  /**
   * Curated cross-links as "collection/slug" strings, e.g.
   * "blog/grpc-service-mesh-in-go-aegis-architecture". Rendered ahead of the
   * tag-scored algorithmic suggestions in RelatedContent. Validated against
   * the real index at build time (build-search-index.mjs) — a bad reference
   * fails the build rather than silently rendering nothing.
   */
  related?: string[];
}

export interface ContentIndexItem extends ContentFrontmatter {
  slug: string;
  collection: ContentCollection;
  readingMinutes: number;
  readingText: string;
}

export interface SearchIndexItem extends ContentIndexItem {
  searchableText: string;
}

export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export interface ContentDetail extends ContentIndexItem {
  html: string;
  toc: TocItem[];
  body: string;
}
