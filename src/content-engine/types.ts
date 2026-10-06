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
  /**
   * Opt-in multi-part grouping, independent of `collection` — a series can span collections (e.g.
   * a benchmark rewrite that's one `experiments` post and one `blog` retrospective), so it can't
   * reuse the same "sort within one collection" logic ArticleNav uses. `series` is the shared,
   * free-text group name; `seriesOrder` its 1-indexed position within that group. Both are
   * build-time enforced (scripts/build-search-index.mjs): a `series` without a valid `seriesOrder`,
   * or two parts sharing an order, fails the build. See .ai/phases/phase-5.md §5.6.
   */
  series?: string;
  seriesOrder?: number;
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
